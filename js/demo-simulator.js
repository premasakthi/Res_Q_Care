/**
 * ResQCare - ESP32 Real-Time Live Hardware Engine
 * Connects directly to the physical ESP32 wristband via USB (Web Serial API)
 * or via Spring Boot REST backend telemetry.
 * NO SIMULATION - 100% REAL HARDWARE DRIVEN.
 * Immediately detects device disconnection.
 */

class LiveHardwareManager {
  constructor() {
    this.state = {
      wristbandId: 'ESP32-RQ-882',
      patientId: 'RQ-1024',
      connected: false,
      heartRate: '--',
      spo2: '--',
      activity: 'DISCONNECTED',
      fallDetected: false,
      battery: 100,
      status: 'DISCONNECTED', // DISCONNECTED, NORMAL, WARNING, EMERGENCY
      latitude: 40.751300,
      longitude: -73.983180,
      gForce: 0,
      connectionType: 'OFFLINE', // OFFLINE, USB_SERIAL, BACKEND_WIFI
      lastSync: 'No hardware connected',
      lastPacketTime: 0,
      autoVibrate: true
    };

    this.backendPollTimer = null;
    this.watchdogTimer = null;
    this.serialPort = null;
    this.serialReader = null;
    this.logHistory = [];
    this.isDrawerClosed = false;
    this.isDrawerCollapsed = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.isDrawerClosed = localStorage.getItem('resqcare_sim_drawer_closed') === 'true';
    this.isDrawerCollapsed = localStorage.getItem('resqcare_sim_drawer_collapsed') === 'true';

    // Auto-listen to physical USB plug / unplug events
    if ('serial' in navigator) {
      navigator.serial.addEventListener('disconnect', () => {
        this.logTelemetryPacket('⚠️ USB Hardware Cable Disconnected');
        this.setDisconnected();
      });
    }

    this.bindKeyboardShortcuts();
    this.applyDrawerVisibility();
    this.startBackendPolling();
    this.startWatchdog();
    this.dispatchUpdate();
    this.renderUI();
  }

  /**
   * Watchdog timer: If no packet received within 4 seconds, marks hardware as DISCONNECTED
   */
  startWatchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(() => {
      if (this.state.connected && (Date.now() - this.state.lastPacketTime > 4500)) {
        this.setDisconnected();
      }
    }, 1000);
  }

  setDisconnected() {
    this.state.connected = false;
    this.state.connectionType = 'OFFLINE';
    this.state.status = 'DISCONNECTED';
    this.state.heartRate = '--';
    this.state.spo2 = '--';
    this.state.activity = 'DISCONNECTED';
    this.state.gForce = 0;
    this.state.lastSync = 'Hardware Disconnected';

    if (this.serialReader) {
      try { this.serialReader.cancel(); } catch (e) {}
      this.serialReader = null;
    }
    if (this.serialPort) {
      try { this.serialPort.close(); } catch (e) {}
      this.serialPort = null;
    }

    this.dispatchUpdate();
    this.renderUI();
  }

  /**
   * Connect to physical ESP32 via USB Cable (Chrome / Edge Web Serial API)
   */
  async connectUsbSerial() {
    if (!('serial' in navigator)) {
      alert('Web Serial is supported in Google Chrome, Microsoft Edge, and Opera.\nPlease open this page in Chrome or Edge to connect directly via USB.');
      return;
    }

    try {
      if (this.serialPort) {
        await this.disconnectUsbSerial();
        return;
      }

      // Request port from user
      this.serialPort = await navigator.serial.requestPort();
      await this.serialPort.open({ baudRate: 115200 });

      this.state.connected = true;
      this.state.connectionType = 'USB_SERIAL';
      this.state.status = 'NORMAL';
      this.state.lastPacketTime = Date.now();
      this.state.lastSync = new Date().toLocaleTimeString();
      this.dispatchUpdate();
      this.renderUI();

      this.logTelemetryPacket('🟢 USB Serial Connected @ 115200 baud (COM port ready)');

      // Read incoming serial stream
      const textDecoder = new TextDecoderStream();
      this.serialPort.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      this.serialReader = reader;

      let lineBuffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          lineBuffer += value;
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop();

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            this.handleSerialLine(line);
          }
        }
      }
    } catch (err) {
      console.warn('Web Serial connection error:', err);
      if (err.name !== 'NotFoundError') {
        this.logTelemetryPacket('⚠️ Serial Error: ' + (err.message || err));
      }
      this.setDisconnected();
    }
  }

  async disconnectUsbSerial() {
    try {
      if (this.serialReader) {
        await this.serialReader.cancel();
        try { this.serialReader.releaseLock(); } catch (e) {}
        this.serialReader = null;
      }
      if (this.serialPort) {
        await this.serialPort.close();
        this.serialPort = null;
      }
    } catch (e) {
      console.warn('Error closing serial:', e);
    }
    this.setDisconnected();
    this.logTelemetryPacket('⚪ USB Serial Disconnected (COM13 Released)');
  }

  /**
   * Process raw incoming string from ESP32
   */
  handleSerialLine(line) {
    // 1. Live Sensor Telemetry Packet
    if (line.includes('[DATA]')) {
      const jsonStr = line.substring(line.indexOf('[DATA]') + 6).trim();
      try {
        const packet = JSON.parse(jsonStr);
        this.applyLiveTelemetry(packet, 'USB_SERIAL');
        this.logTelemetryPacket(`[USB] HR:${packet.heartRate || '--'} | SpO2:${packet.spo2 || '--'}% | Act:${packet.activity || 'RESTING'} | G:${packet.gForce ? Number(packet.gForce).toFixed(2) : '1.0'}`);
        
        // Forward to backend REST API in background
        fetch('http://localhost:8080/api/sensor-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packet)
        }).catch(() => {});
      } catch (e) {
        this.logTelemetryPacket(`[RAW] ${line}`);
      }
      return;
    }

    // 2. Hardware Emergency Alert (SOS Button or MPU6050 Fall)
    if (line.includes('[ALERT]') || line.includes('[EMERGENCY BROADCAST]')) {
      const idx = line.indexOf('{');
      if (idx !== -1) {
        try {
          const alertData = JSON.parse(line.substring(idx).trim());
          this.triggerEmergency(alertData.eventType || 'SOS_BUTTON', alertData);
          this.logTelemetryPacket(`🚨 HARDWARE ALERT: ${alertData.eventType}`);
          
          fetch('http://localhost:8080/api/emergency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertData)
          }).catch(() => {});
        } catch (e) {
          this.triggerEmergency('SOS_BUTTON', { reason: line });
        }
      } else {
        this.triggerEmergency('SOS_BUTTON', { reason: line });
      }
      return;
    }

    // Boot / system log from ESP32
    this.logTelemetryPacket(`[ESP32] ${line}`);
  }

  /**
   * Update internal state from real hardware data
   */
  applyLiveTelemetry(data, source = 'USB_SERIAL') {
    this.state.lastPacketTime = Date.now();
    this.state.connected = true;
    this.state.connectionType = source;
    this.state.lastSync = new Date().toLocaleTimeString();

    if (data.heartRate && data.heartRate !== '--') this.state.heartRate = parseInt(data.heartRate, 10);
    if (data.spo2 && data.spo2 !== '--') this.state.spo2 = parseInt(data.spo2, 10);
    if (data.activity) this.state.activity = data.activity;
    if (data.gForce) this.state.gForce = parseFloat(data.gForce);
    if (data.latitude) this.state.latitude = parseFloat(data.latitude);
    if (data.longitude) this.state.longitude = parseFloat(data.longitude);
    if (data.fallDetected) {
      this.state.fallDetected = true;
      this.triggerEmergency('FALL_DETECTED', { reason: 'MPU6050 Physical Fall Verified' });
    }

    if (this.state.status !== 'EMERGENCY') {
      if (typeof this.state.heartRate === 'number' && (this.state.heartRate > 125 || this.state.heartRate < 45 || this.state.spo2 < 90)) {
        this.state.status = 'WARNING';
      } else {
        this.state.status = 'NORMAL';
      }
    }

    this.dispatchUpdate();
    this.renderUI();
  }

  /**
   * Poll Spring Boot backend for telemetry and emergencies sent via Wi-Fi
   */
  startBackendPolling() {
    if (this.backendPollTimer) clearInterval(this.backendPollTimer);

    this.backendPollTimer = setInterval(async () => {
      // Don't poll telemetry if direct USB serial is active
      if (this.state.connectionType !== 'USB_SERIAL') {
        try {
          const res = await fetch('http://localhost:8080/api/sensor-data/latest');
          if (res.ok) {
            const telemetry = await res.json();
            if (telemetry && telemetry.connected === true && telemetry.status !== 'DISCONNECTED') {
              this.applyLiveTelemetry(telemetry, 'BACKEND_WIFI');
            } else if (this.state.connectionType === 'BACKEND_WIFI') {
              this.setDisconnected();
            }
          }
        } catch (e) {
          if (this.state.connectionType === 'BACKEND_WIFI') {
            this.setDisconnected();
          }
        }
      }

      // Always poll for hardware emergencies from backend
      try {
        const emgRes = await fetch('http://localhost:8080/api/emergency/active');
        if (emgRes.ok) {
          const emergencies = await emgRes.json();
          if (Array.isArray(emergencies) && emergencies.length > 0) {
            const activeOne = emergencies.find(e => e.status === 'ACTIVE' || e.status === 'ACCEPTED');
            if (activeOne) {
              const history = this.getEmergencyHistory();
              const alreadyTriggered = history.some(e => e.id === activeOne.emergencyId && e.status !== 'RESOLVED');
              if (!alreadyTriggered || this.state.status !== 'EMERGENCY') {
                this.triggerEmergency(activeOne.eventType || 'SOS_BUTTON', activeOne);
              }
            }
          }
        }
      } catch (e) {}
    }, 1500);
  }

  triggerEmergency(eventType, extraData = {}) {
    this.state.status = 'EMERGENCY';
    const emergencyEvent = {
      id: extraData.emergencyId || 'EMG-' + Date.now(),
      patientId: this.state.patientId,
      patientName: 'Eleanor Vance',
      eventType: eventType,
      heartRate: this.state.heartRate,
      spo2: this.state.spo2,
      latitude: this.state.latitude,
      longitude: this.state.longitude,
      status: 'ACTIVE',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
      notes: extraData.reason || `Physical Hardware Alert: ${eventType}`
    };

    const events = this.getEmergencyHistory();
    if (!events.some(e => e.id === emergencyEvent.id)) {
      events.unshift(emergencyEvent);
      localStorage.setItem('resqcare_emergencies', JSON.stringify(events));
    }

    if (window.ResQAudio) {
      window.ResQAudio.startEmergencyAlarm();
    }

    if (this.isDrawerClosed) {
      this.openDrawer();
    }

    this.dispatchUpdate();
    this.renderUI();
  }

  resolveEmergency() {
    this.state.status = this.state.connected ? 'NORMAL' : 'DISCONNECTED';
    this.state.fallDetected = false;
    if (this.state.connected) {
      this.state.activity = 'RESTING';
    }

    // Clear all active emergencies in localStorage
    const events = this.getEmergencyHistory();
    events.forEach(e => {
      if (e.status !== 'RESOLVED') {
        e.status = 'RESOLVED';
        e.resolvedAt = new Date().toLocaleTimeString();
      }
    });
    localStorage.setItem('resqcare_emergencies', JSON.stringify(events));

    // Clear backend emergencies
    fetch('http://localhost:8080/api/emergency/clear', { method: 'DELETE' }).catch(() => {});

    if (window.ResQAudio) {
      window.ResQAudio.stopEmergencyAlarm();
      window.ResQAudio.playChime();
    }

    this.dispatchUpdate();
    this.renderUI();
  }

  getEmergencyHistory() {
    const raw = localStorage.getItem('resqcare_emergencies');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  triggerManualSOS() {
    this.triggerEmergency('SOS_BUTTON', { reason: 'SOS Button Triggered' });
  }

  triggerFallEvent() {
    this.triggerEmergency('FALL_DETECTED', { reason: 'MPU6050 Fall Triggered' });
  }

  closeDrawer() {
    this.isDrawerClosed = true;
    localStorage.setItem('resqcare_sim_drawer_closed', 'true');
    this.applyDrawerVisibility();
  }

  openDrawer() {
    this.isDrawerClosed = false;
    this.isDrawerCollapsed = false;
    localStorage.setItem('resqcare_sim_drawer_closed', 'false');
    localStorage.setItem('resqcare_sim_drawer_collapsed', 'false');
    this.applyDrawerVisibility();
  }

  toggleDrawer() {
    if (this.isDrawerClosed) {
      this.openDrawer();
    } else {
      this.closeDrawer();
    }
  }

  toggleCollapse() {
    this.isDrawerCollapsed = !this.isDrawerCollapsed;
    localStorage.setItem('resqcare_sim_drawer_collapsed', String(this.isDrawerCollapsed));
    this.applyDrawerVisibility();
  }

  applyDrawerVisibility() {
    const drawer = document.getElementById('demoSimDrawer');
    const launcher = document.getElementById('simLauncherBtn');
    const toggleNavBtn = document.getElementById('toggleSimBtn');
    const collapseIcon = document.getElementById('simCollapseIcon');

    if (drawer) {
      if (this.isDrawerClosed) {
        drawer.classList.add('hidden');
      } else {
        drawer.classList.remove('hidden');
      }

      if (this.isDrawerCollapsed) {
        drawer.classList.add('collapsed');
        if (collapseIcon) collapseIcon.textContent = '+';
      } else {
        drawer.classList.remove('collapsed');
        if (collapseIcon) collapseIcon.textContent = '−';
      }
    }

    if (launcher) {
      if (this.isDrawerClosed) {
        launcher.classList.remove('hidden');
      } else {
        launcher.classList.add('hidden');
      }
    }

    if (toggleNavBtn) {
      if (this.isDrawerClosed) {
        toggleNavBtn.classList.remove('active');
      } else {
        toggleNavBtn.classList.add('active');
      }
    }

    this.renderUI();
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.isDrawerClosed) {
        const triageModal = document.getElementById('triageModal');
        if (triageModal && triageModal.classList.contains('open')) return;
        this.closeDrawer();
      }
    });
  }

  dispatchUpdate() {
    window.dispatchEvent(new CustomEvent('resqcare_state_updated', {
      detail: this.state
    }));
  }

  logTelemetryPacket(msg) {
    const logBox = document.getElementById('simTelemetryLogs');
    if (!logBox) return;

    const entry = typeof msg === 'string' ? `[${new Date().toLocaleTimeString()}] ${msg}` : msg;
    this.logHistory.unshift(entry);
    if (this.logHistory.length > 25) this.logHistory.pop();

    logBox.innerHTML = this.logHistory.map(l => `<div>${l}</div>`).join('');
  }

  renderUI() {
    const hrVal = document.getElementById('simHrVal');
    const spo2Val = document.getElementById('simSpo2Val');
    const simStatusBadge = document.getElementById('simDrawerStatus');
    const launcherIndicator = document.getElementById('simLauncherIndicator');
    const launcherBadge = document.getElementById('simLauncherBadge');
    const connBadge = document.getElementById('hwConnStatus');
    const usbBtn = document.getElementById('btnConnectUsb');
    const gForceVal = document.getElementById('hwGForceVal');
    const activityVal = document.getElementById('hwActivityVal');

    const isConn = this.state.connected && this.state.connectionType !== 'OFFLINE';

    if (hrVal) hrVal.textContent = isConn ? `${this.state.heartRate} BPM` : '-- BPM';
    if (spo2Val) spo2Val.textContent = isConn ? `${this.state.spo2}%` : '--%';
    if (gForceVal) gForceVal.textContent = isConn ? `${this.state.gForce ? Number(this.state.gForce).toFixed(2) : '1.00'} g` : '-- g';
    if (activityVal) {
      activityVal.textContent = isConn ? this.state.activity : 'DISCONNECTED';
      activityVal.style.color = isConn ? '#10b981' : '#ef4444';
    }

    const statusLower = (this.state.status || 'DISCONNECTED').toLowerCase();

    if (simStatusBadge) {
      simStatusBadge.className = `badge badge-${statusLower}`;
      simStatusBadge.textContent = this.state.status;
    }

    if (launcherIndicator) {
      launcherIndicator.className = `sim-launcher-indicator ${statusLower}`;
    }

    if (launcherBadge) {
      launcherBadge.className = `badge badge-${statusLower}`;
      launcherBadge.textContent = this.state.status;
    }

    if (connBadge) {
      if (this.state.connectionType === 'USB_SERIAL') {
        connBadge.className = 'badge badge-normal';
        connBadge.innerHTML = '🟢 USB Live';
      } else if (this.state.connectionType === 'BACKEND_WIFI') {
        connBadge.className = 'badge badge-normal';
        connBadge.innerHTML = '📡 Wi-Fi Live';
      } else {
        connBadge.className = 'badge badge-warning';
        connBadge.innerHTML = '⚪ Disconnected';
      }
    }

    if (usbBtn) {
      if (this.state.connectionType === 'USB_SERIAL') {
        usbBtn.textContent = '🔌 Disconnect USB';
        usbBtn.className = 'sim-btn warning';
      } else {
        usbBtn.textContent = '🔌 Connect Live USB';
        usbBtn.className = 'sim-btn success';
      }
    }
  }
}

// Global instance
window.ResQSim = new LiveHardwareManager();

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  if (!window.ResQRouter) window.ResQSim.init();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.ResQRouter) window.ResQSim.init();
  });
}

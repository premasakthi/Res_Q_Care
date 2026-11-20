/**
 * ResQCare - Hospital Portal & Emergency Triage Command Center
 * Real-time emergency alerts, telemetry monitoring, Leaflet GPS dispatch tracking, and patient triage dossier.
 */

class HospitalPortal {
  constructor() {
    this.map = null;
    this.patientMarker = null;
    this.hospitalMarker = null;
    this.radarCircle = null;
    this.routeLine = null;
    this.isLoggedIn = true; // Pre-authenticated for demo responsiveness
  }

  init() {
    this.bindEvents();
    this.renderStats();
    this.renderAlertBanner();
    this.renderPatientDirectory();
    this.initLeafletMap();

    // Listen to hardware telemetry and emergency events
    window.addEventListener('resqcare_state_updated', (e) => {
      this.updateEmergencyState(e.detail);
    });
  }

  bindEvents() {
    // Hospital search input filter
    const searchInput = document.getElementById('hospitalPatientSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterPatients(e.target.value.toLowerCase());
      });
    }

    // Modal close button
    const closeBtn = document.getElementById('closeTriageModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('triageModal').classList.remove('open');
      });
    }
  }

  initLeafletMap() {
    const mapElement = document.getElementById('leafletMap');
    if (!mapElement || typeof L === 'undefined') return;

    const patientLat = 40.751300;
    const patientLng = -73.983180;
    const hospitalLat = 40.748817;
    const hospitalLng = -73.985428;

    this.map = L.map('leafletMap', {
      zoomControl: true
    }).setView([patientLat, patientLng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Custom Hospital Icon
    const hospitalIcon = L.divIcon({
      className: 'custom-hosp-pin',
      html: '<div style="background:#0a2540; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; border:2px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.3);">🏥</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    // Custom Patient Pulse Icon
    const patientIcon = L.divIcon({
      className: 'custom-patient-pin',
      html: '<div style="background:#dc2626; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; border:2px solid #fff; box-shadow:0 0 15px #dc2626; animation:pulseButton 1.5s infinite;">🆘</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    this.hospitalMarker = L.marker([hospitalLat, hospitalLng], { icon: hospitalIcon })
      .addTo(this.map)
      .bindPopup('<strong>Metropolitan Emergency Hospital</strong><br>Trauma Center Triage Desk');

    this.patientMarker = L.marker([patientLat, patientLng], { icon: patientIcon })
      .addTo(this.map)
      .bindPopup('<strong>Patient Eleanor Vance (RQ-1024)</strong><br>Emergency Beacon Active')
      .openPopup();

    // Red radar radius around patient
    this.radarCircle = L.circle([patientLat, patientLng], {
      color: '#dc2626',
      fillColor: '#ef4444',
      fillOpacity: 0.15,
      radius: 90
    }).addTo(this.map);

    // Direct ambulance route line
    this.routeLine = L.polyline([
      [hospitalLat, hospitalLng],
      [40.750100, -73.984200],
      [patientLat, patientLng]
    ], {
      color: '#0284c7',
      weight: 4,
      dashArray: '8, 8'
    }).addTo(this.map);
  }

  updateMapLocation(lat, lng) {
    if (!this.map || !this.patientMarker) return;
    this.patientMarker.setLatLng([lat, lng]);
    if (this.radarCircle) this.radarCircle.setLatLng([lat, lng]);
    this.map.panTo([lat, lng]);

    const coordsDisplay = document.getElementById('mapCoordsDisplay');
    if (coordsDisplay) {
      coordsDisplay.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    const mapsLink = document.getElementById('openGoogleMapsBtn');
    if (mapsLink) {
      mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
  }

  updateEmergencyState(simState) {
    this.renderStats();
    this.renderAlertBanner();
    this.updateMapLocation(simState.latitude, simState.longitude);
  }

  renderStats() {
    const events = window.ResQSim ? window.ResQSim.getEmergencyHistory() : [];
    const activeCount = events.filter(e => e.status !== 'RESOLVED').length;
    const resolvedCount = events.filter(e => e.status === 'RESOLVED').length;

    const activeEl = document.getElementById('statActiveEmergencies');
    const resolvedEl = document.getElementById('statResolvedEmergencies');
    const monitoredEl = document.getElementById('statMonitoredPatients');

    if (activeEl) activeEl.textContent = activeCount;
    if (resolvedEl) resolvedEl.textContent = resolvedCount;
    if (monitoredEl) monitoredEl.textContent = '148';
  }

  renderAlertBanner() {
    const banner = document.getElementById('emergencyAlertBanner');
    if (!banner) return;

    const events = window.ResQSim ? window.ResQSim.getEmergencyHistory() : [];
    const activeEmergency = events.find(e => e.status !== 'RESOLVED');

    if (!activeEmergency) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'block';
    banner.innerHTML = `
      <div class="alert-banner-header">
        <div class="alert-beacon">
          <span class="alert-beacon-icon">🚨</span>
          CRITICAL EMERGENCY ALERT – IMMEDIATE RESPONSE REQUIRED
        </div>
        <span class="badge" style="background:#ffffff; color:#dc2626; font-size:0.95rem; font-weight:800; padding:6px 14px;">
          STATUS: ${activeEmergency.status}
        </span>
      </div>

      <div class="alert-patient-summary">
        <div class="alert-summary-item">
          <span>Patient ID</span>
          <strong>${activeEmergency.patientId}</strong>
        </div>
        <div class="alert-summary-item">
          <span>Patient Name</span>
          <strong>${activeEmergency.patientName}</strong>
        </div>
        <div class="alert-summary-item">
          <span>Emergency Trigger</span>
          <strong style="color:#fee2e2;">${activeEmergency.eventType.replace('_', ' ')}</strong>
        </div>
        <div class="alert-summary-item">
          <span>Heart Rate</span>
          <strong>${activeEmergency.heartRate || 72} BPM</strong>
        </div>
        <div class="alert-summary-item">
          <span>SpO₂ Level</span>
          <strong>${activeEmergency.spo2 || 98}%</strong>
        </div>
        <div class="alert-summary-item">
          <span>Time Logged</span>
          <strong>${activeEmergency.timestamp}</strong>
        </div>
      </div>

      <div class="alert-actions-row">
        <button class="btn btn-outline" style="background:#ffffff; color:#dc2626; font-weight:700;" onclick="window.HospitalApp.openTriageModal('${activeEmergency.id}')">
          📋 View Full Medical Dossier
        </button>
        <button class="btn btn-outline" style="background:#ffffff; color:#0a2540; font-weight:700;" onclick="window.HospitalApp.focusOnMap()">
          📍 Track GPS Location
        </button>
        <button class="btn btn-outline" style="background:#ffffff; color:#059669; font-weight:700;" onclick="window.HospitalApp.acceptEmergency('${activeEmergency.id}')">
          ✅ Accept Emergency
        </button>
        <button class="btn btn-emergency" style="background:#1e293b; border-color:#334155;" onclick="window.HospitalApp.dispatchAmbulance('${activeEmergency.id}')">
          🚑 Dispatch Ambulance Unit
        </button>
        <button class="btn btn-success" onclick="window.ResQSim.resolveEmergency()">
          ✔ Mark Resolved
        </button>
      </div>
    `;
  }

  acceptEmergency(id) {
    const events = window.ResQSim.getEmergencyHistory();
    const ev = events.find(e => e.id === id);
    if (ev) {
      ev.status = 'ACCEPTED';
      localStorage.setItem('resqcare_emergencies', JSON.stringify(events));
      alert(`Emergency ${id} accepted by Dr. Alistair Sterling. Triage team alerted.`);
      this.renderAlertBanner();
      if (window.ResQAudio) window.ResQAudio.playChime();
    }
  }

  dispatchAmbulance(id) {
    const events = window.ResQSim.getEmergencyHistory();
    const ev = events.find(e => e.id === id);
    if (ev) {
      ev.status = 'DISPATCHED';
      localStorage.setItem('resqcare_emergencies', JSON.stringify(events));
      alert(`EMS Ambulance Unit #4 dispatched to coordinates: ${ev.latitude.toFixed(5)}, ${ev.longitude.toFixed(5)}. ETA: 4 minutes.`);
      this.renderAlertBanner();
      if (window.ResQAudio) window.ResQAudio.playChime();
    }
  }

  focusOnMap() {
    const mapContainer = document.getElementById('leafletMap');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth' });
      if (this.map) {
        this.map.invalidateSize();
        const simState = window.ResQSim ? window.ResQSim.state : null;
        if (simState) {
          this.map.setView([simState.latitude, simState.longitude], 16);
          if (this.patientMarker) this.patientMarker.openPopup();
        }
      }
    }
  }

  openTriageModal(emergencyId) {
    const modal = document.getElementById('triageModal');
    if (!modal) return;

    const data = window.ClientApp ? window.ClientApp.getMedicalData() : {};
    const simState = window.ResQSim ? window.ResQSim.state : {};

    const content = document.getElementById('triageModalContent');
    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <h2 style="font-size:1.6rem; color:var(--primary-navy);">${data.fullName}</h2>
          <span style="font-weight:700; color:var(--text-muted);">Patient ID: ${data.patientId} | Age: ${data.age} | ${data.gender}</span>
        </div>
        <span class="badge badge-emergency" style="font-size:1rem; padding:6px 16px;">Blood Group: ${data.bloodGroup}</span>
      </div>

      <div style="background:#fee2e2; border-left:4px solid #dc2626; padding:14px 18px; border-radius:6px; margin-bottom:18px;">
        <strong style="color:#b91c1c;">⚠️ CRITICAL MEDICAL ALERTS:</strong>
        <p style="color:#7f1d1d; margin-top:4px;"><strong>Allergies:</strong> ${data.allergies}</p>
        <p style="color:#7f1d1d; margin-top:2px;"><strong>High Risk Medications:</strong> ${data.criticalMeds}</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px;">
        <div style="background:var(--bg-page); padding:14px; border-radius:8px;">
          <h4 style="font-size:0.95rem; margin-bottom:6px;">Medical Conditions</h4>
          <p style="font-size:0.9rem;">${data.conditions}</p>
        </div>
        <div style="background:var(--bg-page); padding:14px; border-radius:8px;">
          <h4 style="font-size:0.95rem; margin-bottom:6px;">Major Surgeries</h4>
          <p style="font-size:0.9rem;">${data.surgeries}</p>
        </div>
      </div>

      <div style="background:var(--bg-page); padding:14px; border-radius:8px; margin-bottom:18px;">
        <h4 style="font-size:0.95rem; margin-bottom:6px;">Live Wristband Telemetry Snapshot</h4>
        <p>Heart Rate: <strong>${simState.heartRate} BPM</strong> | SpO2: <strong>${simState.spo2}%</strong> | Activity: <strong>${simState.activity}</strong></p>
        <p>GPS Position: <strong>${simState.latitude.toFixed(6)}, ${simState.longitude.toFixed(6)}</strong></p>
      </div>

      <div style="background:var(--bg-page); padding:14px; border-radius:8px;">
        <h4 style="font-size:0.95rem; margin-bottom:6px;">Primary Emergency Contacts</h4>
        <p>📞 <strong>David Vance (Son):</strong> +1 (555) 492-1084</p>
        <p>📞 <strong>Clara Vance-Hayes (Daughter):</strong> +1 (555) 773-9201</p>
      </div>
    `;

    modal.classList.add('open');
  }

  renderPatientDirectory() {
    const tbody = document.getElementById('hospitalPatientsTableBody');
    if (!tbody) return;

    const patients = [
      { id: 'RQ-1024', name: 'Eleanor Vance', age: 78, wristband: 'ESP32-RQ-882', status: 'MONITORED', hr: '74 BPM', spo2: '98%' },
      { id: 'RQ-1025', name: 'Arthur Henderson', age: 82, wristband: 'ESP32-RQ-910', status: 'STABLE', hr: '68 BPM', spo2: '97%' },
      { id: 'RQ-1026', name: 'Martha Jenkins', age: 74, wristband: 'ESP32-RQ-942', status: 'STABLE', hr: '72 BPM', spo2: '99%' },
      { id: 'RQ-1027', name: 'William Chen', age: 80, wristband: 'ESP32-RQ-993', status: 'MONITORED', hr: '76 BPM', spo2: '96%' }
    ];

    tbody.innerHTML = patients.map(p => `
      <tr data-patient-row="${p.id.toLowerCase()} ${p.name.toLowerCase()} ${p.wristband.toLowerCase()}">
        <td><strong>${p.id}</strong></td>
        <td>${p.name}</td>
        <td>${p.age}</td>
        <td><code>${p.wristband}</code></td>
        <td><span class="badge ${p.id === 'RQ-1024' && window.ResQSim && window.ResQSim.state.status === 'EMERGENCY' ? 'badge-emergency' : (p.id === 'RQ-1024' && window.ResQSim && !window.ResQSim.state.connected ? 'badge-warning' : 'badge-normal')}">${p.id === 'RQ-1024' && window.ResQSim && window.ResQSim.state.status === 'EMERGENCY' ? 'CRITICAL ALERT' : (p.id === 'RQ-1024' && window.ResQSim && !window.ResQSim.state.connected ? 'OFFLINE' : p.status)}</span></td>
        <td>${p.id === 'RQ-1024' && window.ResQSim ? (window.ResQSim.state.connected ? window.ResQSim.state.heartRate + ' BPM' : '--') : p.hr}</td>
        <td>${p.id === 'RQ-1024' && window.ResQSim ? (window.ResQSim.state.connected ? window.ResQSim.state.spo2 + '%' : '--%') : p.spo2}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="window.HospitalApp.openTriageModal('${p.id}')">Dossier</button>
        </td>
      </tr>
    `).join('');
  }

  filterPatients(query) {
    const rows = document.querySelectorAll('#hospitalPatientsTableBody tr');
    rows.forEach(r => {
      const text = r.getAttribute('data-patient-row') || '';
      r.style.display = text.includes(query) ? '' : 'none';
    });
  }
}

window.HospitalApp = new HospitalPortal();

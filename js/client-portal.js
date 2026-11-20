/**
 * ResQCare - Client / Patient Portal Logic
 * Manages Patient Dashboard, Medical Profile, Contacts, Hospital Selection, and QR Medical ID.
 */

class ClientPortal {
  constructor() {
    this.ecgCanvas = null;
    this.ecgCtx = null;
    this.ecgOffset = 0;
    this.ecgAnimationId = null;
  }

  init() {
    this.bindEvents();
    this.renderDashboard();
    this.initECG();
    this.renderProfile();
    this.renderContacts();
    this.renderHospital();
    this.generateQRBadge();

    // Listen to hardware telemetry updates from simulator
    window.addEventListener('resqcare_state_updated', (e) => {
      this.updateLiveTelemetry(e.detail);
    });
  }

  bindEvents() {
    // Sub-navigation tabs inside client portal
    const subNavBtns = document.querySelectorAll('.portal-subnav-btn[data-subview]');
    subNavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        subNavBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const target = btn.getAttribute('data-subview');
        document.querySelectorAll('.client-subview').forEach(view => {
          view.style.display = 'none';
        });
        const activeSubView = document.getElementById(`client-${target}`);
        if (activeSubView) activeSubView.style.display = 'block';

        if (target === 'qr') {
          this.generateQRBadge();
        }
      });
    });

    // Medical profile form submission
    const profileForm = document.getElementById('medicalProfileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProfile();
      });
    }

    // Add Emergency Contact Form
    const contactForm = document.getElementById('addContactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addContact();
      });
    }

    // Print / Download QR Badge
    const printBtn = document.getElementById('printQrBtn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  // Real-time telemetry updates
  updateLiveTelemetry(state) {
    const hrDisplay = document.getElementById('clientLiveHr');
    const spo2Display = document.getElementById('clientLiveSpo2');
    const activityDisplay = document.getElementById('clientLiveActivity');
    const batteryDisplay = document.getElementById('clientLiveBattery');
    const syncDisplay = document.getElementById('clientLiveSync');
    const emergencyStatusBadge = document.getElementById('clientEmergencyStatus');
    const wristbandBadge = document.getElementById('clientWristbandStatus');
    const clientHrCard = document.getElementById('clientHrCard');

    const isConnected = state.connected && state.connectionType !== 'OFFLINE' && state.status !== 'DISCONNECTED';

    if (wristbandBadge) {
      if (isConnected) {
        wristbandBadge.className = 'badge badge-normal';
        wristbandBadge.innerHTML = '<span class="badge-dot" style="background:#10b981;"></span> Wristband: ESP32-RQ-882 (Online)';
      } else {
        wristbandBadge.className = 'badge badge-warning';
        wristbandBadge.innerHTML = '<span class="badge-dot" style="background:#ef4444;"></span> Wristband: Disconnected (No Signal)';
      }
    }

    if (!isConnected) {
      if (hrDisplay) hrDisplay.textContent = '--';
      if (spo2Display) spo2Display.textContent = '--%';
      if (activityDisplay) activityDisplay.textContent = 'DISCONNECTED';
      if (batteryDisplay) batteryDisplay.textContent = '--%';
      if (syncDisplay) syncDisplay.textContent = 'Hardware Disconnected';
      if (emergencyStatusBadge) {
        emergencyStatusBadge.className = 'badge badge-warning';
        emergencyStatusBadge.innerHTML = '<span class="badge-dot" style="background:#94a3b8;"></span> NO SIGNAL';
      }
      if (clientHrCard) clientHrCard.classList.remove('alert-pulse');
      this.renderEmergencyHistory();
      return;
    }

    if (hrDisplay) hrDisplay.textContent = state.heartRate || '--';
    if (spo2Display) spo2Display.textContent = state.spo2 ? `${state.spo2}%` : '--%';
    if (activityDisplay) activityDisplay.textContent = (state.activity || 'RESTING').replace('_', ' ');
    if (batteryDisplay) batteryDisplay.textContent = `${state.battery}%`;
    if (syncDisplay) syncDisplay.textContent = state.lastSync;

    if (emergencyStatusBadge) {
      emergencyStatusBadge.className = `badge badge-${state.status.toLowerCase()}`;
      emergencyStatusBadge.innerHTML = `<span class="badge-dot"></span> ${state.status}`;
    }

    if (clientHrCard) {
      if (state.status === 'EMERGENCY') {
        clientHrCard.classList.add('alert-pulse');
      } else {
        clientHrCard.classList.remove('alert-pulse');
      }
    }

    this.renderEmergencyHistory();
  }

  // Animated ECG heart rhythm on Canvas
  initECG() {
    this.ecgCanvas = document.getElementById('clientEcgCanvas');
    if (!this.ecgCanvas) return;
    this.ecgCtx = this.ecgCanvas.getContext('2d');

    const drawECG = () => {
      const width = this.ecgCanvas.width = this.ecgCanvas.parentElement.clientWidth;
      const height = this.ecgCanvas.height = 48;
      const ctx = this.ecgCtx;

      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const midY = height / 2;
      this.ecgOffset = (this.ecgOffset + 2) % 120;

      for (let x = 0; x < width; x++) {
        let y = midY;
        const waveX = (x + this.ecgOffset) % 120;

        if (waveX > 35 && waveX < 45) {
          // P wave
          y -= 4;
        } else if (waveX >= 48 && waveX < 52) {
          // Q dip
          y += 5;
        } else if (waveX >= 52 && waveX < 58) {
          // R peak
          y -= 22;
        } else if (waveX >= 58 && waveX < 62) {
          // S dip
          y += 10;
        } else if (waveX >= 72 && waveX < 88) {
          // T wave
          y -= 7;
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      this.ecgAnimationId = requestAnimationFrame(drawECG);
    };

    drawECG();
  }

  renderDashboard() {
    const state = window.ResQSim ? window.ResQSim.state : null;
    if (state) {
      this.updateLiveTelemetry(state);
    }
    this.renderEmergencyHistory();
  }

  renderEmergencyHistory() {
    const tbody = document.getElementById('clientEmergencyTableBody');
    if (!tbody) return;

    const events = window.ResQSim ? window.ResQSim.getEmergencyHistory() : [];
    if (events.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px;">No emergency events recorded. System safe.</td></tr>`;
      return;
    }

    tbody.innerHTML = events.slice(0, 5).map(ev => `
      <tr>
        <td><strong>${ev.id}</strong></td>
        <td><span class="badge ${ev.status === 'RESOLVED' ? 'badge-normal' : 'badge-emergency'}">${ev.eventType.replace('_', ' ')}</span></td>
        <td>HR: ${ev.heartRate || '--'} | SpO2: ${ev.spo2 || '--'}%</td>
        <td>${ev.timestamp}</td>
        <td><strong>${ev.status}</strong></td>
      </tr>
    `).join('');
  }

  // Medical Profile Save & Display
  getMedicalData() {
    const saved = localStorage.getItem('resqcare_patient_profile');
    if (saved) return JSON.parse(saved);

    return {
      fullName: 'Eleanor Vance',
      patientId: 'RQ-1024',
      age: 78,
      gender: 'Female',
      bloodGroup: 'O+',
      allergies: 'Penicillin, Aspirin, Shellfish',
      conditions: 'Hypertension, Mild Congestive Heart Failure, Osteoporosis',
      surgeries: 'Coronary Artery Bypass Graft (2018), Hip Replacement (2021)',
      criticalMeds: 'Nitroglycerin sublingual PRN, Warfarin 5mg daily',
      currentMeds: 'Lisinopril 10mg, Metoprolol 25mg, Calcium + Vitamin D',
      doctorName: 'Dr. Sarah Jenkins',
      doctorContact: '+1 (555) 902-3341',
      notes: 'Patient has history of postural hypotension upon standing. Fall risk alert.'
    };
  }

  renderProfile() {
    const data = this.getMedicalData();
    const form = document.getElementById('medicalProfileForm');
    if (!form) return;

    form.elements['fullName'].value = data.fullName;
    form.elements['bloodGroup'].value = data.bloodGroup;
    form.elements['allergies'].value = data.allergies;
    form.elements['conditions'].value = data.conditions;
    form.elements['surgeries'].value = data.surgeries;
    form.elements['criticalMeds'].value = data.criticalMeds;
    form.elements['currentMeds'].value = data.currentMeds;
    form.elements['doctorName'].value = data.doctorName;
    form.elements['doctorContact'].value = data.doctorContact;
    form.elements['notes'].value = data.notes;
  }

  saveProfile() {
    const form = document.getElementById('medicalProfileForm');
    if (!form) return;

    const updated = {
      fullName: form.elements['fullName'].value,
      patientId: 'RQ-1024',
      age: 78,
      gender: 'Female',
      bloodGroup: form.elements['bloodGroup'].value,
      allergies: form.elements['allergies'].value,
      conditions: form.elements['conditions'].value,
      surgeries: form.elements['surgeries'].value,
      criticalMeds: form.elements['criticalMeds'].value,
      currentMeds: form.elements['currentMeds'].value,
      doctorName: form.elements['doctorName'].value,
      doctorContact: form.elements['doctorContact'].value,
      notes: form.elements['notes'].value
    };

    localStorage.setItem('resqcare_patient_profile', JSON.stringify(updated));
    if (window.ResQAudio) window.ResQAudio.playChime();
    alert('Medical Profile successfully updated and synchronized with Emergency QR badge.');
    this.generateQRBadge();
  }

  // Emergency Contacts
  getContacts() {
    const saved = localStorage.getItem('resqcare_patient_contacts');
    if (saved) return JSON.parse(saved);

    return [
      { id: 1, name: 'David Vance', relation: 'Son', phone: '+1 (555) 492-1084', altPhone: '+1 (555) 492-1085' },
      { id: 2, name: 'Clara Vance-Hayes', relation: 'Daughter', phone: '+1 (555) 773-9201', altPhone: '' }
    ];
  }

  renderContacts() {
    const list = document.getElementById('clientContactsList');
    if (!list) return;

    const contacts = this.getContacts();
    list.innerHTML = contacts.map(c => `
      <div class="contact-card">
        <div class="contact-info">
          <h4>${c.name}</h4>
          <span class="contact-relation">${c.relation}</span>
          <p style="margin-top:4px;"><strong>📞 ${c.phone}</strong> ${c.altPhone ? `| Alt: ${c.altPhone}` : ''}</p>
        </div>
        <div class="contact-actions">
          <a href="tel:${c.phone}" class="btn btn-outline btn-sm">Call</a>
          <button class="btn btn-outline btn-sm" onclick="window.ClientApp.deleteContact(${c.id})">Delete</button>
        </div>
      </div>
    `).join('');
  }

  addContact() {
    const form = document.getElementById('addContactForm');
    if (!form) return;

    const newContact = {
      id: Date.now(),
      name: form.elements['contactName'].value,
      relation: form.elements['relationship'].value,
      phone: form.elements['phone'].value,
      altPhone: form.elements['altPhone'].value || ''
    };

    const contacts = this.getContacts();
    contacts.push(newContact);
    localStorage.setItem('resqcare_patient_contacts', JSON.stringify(contacts));
    form.reset();
    this.renderContacts();
    if (window.ResQAudio) window.ResQAudio.playChime();
  }

  deleteContact(id) {
    let contacts = this.getContacts();
    contacts = contacts.filter(c => c.id !== id);
    localStorage.setItem('resqcare_patient_contacts', JSON.stringify(contacts));
    this.renderContacts();
  }

  // Registered Hospital
  renderHospital() {
    const container = document.getElementById('clientHospitalInfo');
    if (!container) return;

    container.innerHTML = `
      <div style="background:var(--bg-page); padding:20px; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
          <div>
            <h4 style="font-size:1.2rem; color:var(--primary-navy);">Metropolitan Emergency Hospital & Trauma Center</h4>
            <span class="badge badge-normal" style="margin-top:4px;"><span class="badge-dot"></span> Primary Triage Center Registered</span>
          </div>
          <span style="font-weight:700; color:var(--accent-cyan);">Code: HOSP-METRO-01</span>
        </div>
        <p><strong>Address:</strong> 742 Evergreen Blvd, New York, NY 10001 (1.8 miles from patient residence)</p>
        <p><strong>General Desk:</strong> +1 (555) 234-5670</p>
        <p><strong>Emergency Hotline:</strong> <span style="color:var(--emergency-crimson); font-weight:700;">+1 (555) 911-0001 (24/7 Dedicated Line)</span></p>
      </div>
    `;
  }

  // Generate QR Code Badge
  generateQRBadge() {
    const data = this.getMedicalData();
    const qrUrl = window.location.origin + window.location.pathname.replace('index.html', '') + 'qr-emergency.html?patientId=RQ-1024';

    if (window.ResQQR) {
      window.ResQQR.render(qrUrl, 'qrCanvas', 200);
    }

    const bloodBadge = document.getElementById('qrBadgeBlood');
    const allergiesBadge = document.getElementById('qrBadgeAllergies');
    const medsBadge = document.getElementById('qrBadgeMeds');
    const qrLink = document.getElementById('qrTestLink');

    if (bloodBadge) bloodBadge.textContent = data.bloodGroup;
    if (allergiesBadge) allergiesBadge.textContent = data.allergies;
    if (medsBadge) medsBadge.textContent = data.criticalMeds;
    if (qrLink) qrLink.href = qrUrl;
  }
}

window.ClientApp = new ClientPortal();

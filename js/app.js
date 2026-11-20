/**
 * ResQCare - Main Application Controller & View Router
 */

class ResQCareRouter {
  constructor() {
    this.currentView = 'landing';
  }

  init() {
    this.bindNavigation();
    this.bindSeniorMode();
    this.bindAudioToggle();
    this.setupCrossTabSync();

    // Check URL hash or default to landing
    const hash = window.location.hash.replace('#', '');
    if (['landing', 'client', 'hospital', 'analytics'].includes(hash)) {
      this.navigate(hash);
    } else {
      this.navigate('landing');
    }

    // Initialize subsystems
    if (window.ResQSim) window.ResQSim.init();
    if (window.ClientApp) window.ClientApp.init();
    if (window.HospitalApp) window.HospitalApp.init();
  }

  bindNavigation() {
    const navButtons = document.querySelectorAll('.nav-item-btn[data-view]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        this.navigate(view);
      });
    });

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (['landing', 'client', 'hospital', 'analytics'].includes(hash)) {
        this.navigate(hash);
      }
    });
  }

  navigate(viewName) {
    this.currentView = viewName;
    window.location.hash = viewName;

    // Toggle active state on navigation buttons
    document.querySelectorAll('.nav-item-btn[data-view]').forEach(btn => {
      if (btn.getAttribute('data-view') === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle page views
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });

    const activePage = document.getElementById(`view-${viewName}`);
    if (activePage) {
      activePage.classList.add('active');
    }

    // Leaflet map needs re-calculation when hospital portal view becomes visible
    if (viewName === 'hospital' && window.HospitalApp && window.HospitalApp.map) {
      setTimeout(() => {
        window.HospitalApp.map.invalidateSize();
      }, 200);
    }
  }

  bindSeniorMode() {
    const btn = document.getElementById('toggleSeniorModeBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      document.body.classList.toggle('senior-mode');
      const isSenior = document.body.classList.contains('senior-mode');
      btn.textContent = isSenior ? '👁️ Standard Mode' : '👁️ Senior Mode';
      if (window.ResQAudio) window.ResQAudio.playChime();
    });
  }

  bindAudioToggle() {
    const btn = document.getElementById('toggleAudioBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (!window.ResQAudio) return;
      window.ResQAudio.isMuted = !window.ResQAudio.isMuted;
      btn.textContent = window.ResQAudio.isMuted ? '🔇 Audio: OFF' : '🔊 Audio: ON';
      if (!window.ResQAudio.isMuted) window.ResQAudio.playChime();
    });
  }

  setupCrossTabSync() {
    // Listen for storage events (allows multi-window simulation!)
    window.addEventListener('storage', (e) => {
      if (e.key === 'resqcare_sim_state' && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          if (window.ResQSim) window.ResQSim.state = newState;
          window.dispatchEvent(new CustomEvent('resqcare_state_updated', { detail: newState }));
        } catch (err) {
          console.warn('Sync error', err);
        }
      } else if (e.key === 'resqcare_sim_drawer_closed' && window.ResQSim) {
        window.ResQSim.isDrawerClosed = e.newValue === 'true';
        window.ResQSim.applyDrawerVisibility();
      } else if (e.key === 'resqcare_sim_drawer_collapsed' && window.ResQSim) {
        window.ResQSim.isDrawerCollapsed = e.newValue === 'true';
        window.ResQSim.applyDrawerVisibility();
      }
    });
  }
}

window.ResQRouter = new ResQCareRouter();

document.addEventListener('DOMContentLoaded', () => {
  window.ResQRouter.init();
});

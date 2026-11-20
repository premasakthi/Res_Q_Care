/**
 * ResQCare - Web Audio API Alert Synthesizer
 * Generates realistic hospital emergency alerts and notification chimes
 * without external audio file dependencies.
 */

class AudioAlertSystem {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.alarmInterval = null;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Play two-tone emergency siren
  startEmergencyAlarm() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
    }

    let high = true;
    const playTone = () => {
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(high ? 960 : 720, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.38);
        high = !high;
      } catch (e) {
        console.warn('Audio synthesis warning:', e);
      }
    };

    playTone();
    this.alarmInterval = setInterval(playTone, 420);
  }

  stopEmergencyAlarm() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  // Soft notification chime for status updates
  playChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.2); // A5

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.42);
    } catch (e) {
      console.warn('Audio chime warning:', e);
    }
  }
}

window.ResQAudio = new AudioAlertSystem();

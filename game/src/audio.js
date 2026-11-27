// All sound is synthesized with the Web Audio API — no audio files, no network.
// A gobble is a burst of short descending square blips; the farm tune is a
// tiny plucked loop (triangle wave) that starts on the first player input,
// because browsers only allow audio after a gesture.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let step = 0;
  let muted = false;

  // A lazy plucked melody in A minor pentatonic, one note per beat.
  const MELODY = [220, 261.63, 329.63, 392, 329.63, 261.63, 196, 246.94];
  const BASS = [110, 110, 130.81, 98, 110, 130.81, 98, 87.31];

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function playStep() {
    if (!ctx || muted) return;
    const i = step % MELODY.length;
    tone(MELODY[i], 0.22, 'triangle', 0.10);
    if (step % 2 === 0) tone(BASS[i], 0.3, 'sine', 0.12);
    step += 1;
  }

  return {
    /** Call on the first gesture; resumes the context and starts the tune. */
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (!musicTimer) musicTimer = window.setInterval(playStep, 300);
    },
    jump() {
      tone(320, 0.16, 'square', 0.10, 0, 620);
    },
    doubleJump() {
      tone(420, 0.14, 'square', 0.10, 0, 840);
    },
    pickup() {
      tone(880, 0.1, 'sine', 0.14);
      tone(1318, 0.14, 'sine', 0.12, 0.07);
    },
    feather() {
      tone(1046, 0.1, 'sine', 0.14);
      tone(1568, 0.1, 'sine', 0.12, 0.06);
      tone(2093, 0.18, 'sine', 0.12, 0.12);
    },
    hit() {
      tone(160, 0.22, 'sawtooth', 0.18, 0, 60);
      tone(90, 0.3, 'sine', 0.2, 0.02, 45);
    },
    /** The turkey's panicked gobble: five fast descending blips. */
    gobble() {
      for (let i = 0; i < 5; i += 1) {
        tone(520 - i * 70, 0.07, 'square', 0.12, i * 0.075, 300 - i * 40);
      }
    },
    caught() {
      tone(392, 0.25, 'sawtooth', 0.16, 0, 370);
      tone(311, 0.25, 'sawtooth', 0.16, 0.22, 294);
      tone(233, 0.5, 'sawtooth', 0.18, 0.44, 180);
    },
    escaped() {
      const notes = [523, 659, 784, 1046, 784, 1046];
      notes.forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.11));
    },
    click() {
      tone(660, 0.06, 'sine', 0.1);
    },
    setMuted(value) {
      muted = value;
    },
  };
}

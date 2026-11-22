// Procedural lo-fi café music built with the Web Audio API. No audio files.
// A slow chord loop, soft electric-piano arpeggios, a round bass, a whisper of shaker and vinyl crackle.
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Warm progression in F major. Each chord: bass note, pad voicing, and notes the keys can wander through.
const CHORDS = [
  { bass: 41, pad: [53, 57, 60, 64], pool: [57, 60, 64, 65, 67, 69, 72, 76] },      // Fmaj7
  { bass: 45, pad: [57, 60, 64, 67], pool: [57, 60, 64, 67, 69, 72, 74, 76] },      // Am7
  { bass: 38, pad: [57, 60, 62, 65], pool: [57, 60, 62, 65, 67, 69, 72, 74] },      // Dm7
  { bass: 46, pad: [58, 62, 65, 69], pool: [58, 62, 65, 67, 69, 72, 74, 77] },      // Bbmaj7
  { bass: 43, pad: [55, 58, 62, 65], pool: [55, 58, 62, 65, 67, 70, 72, 74] },      // Gm7
  { bass: 36, pad: [55, 60, 62, 65], pool: [55, 60, 62, 65, 67, 69, 72, 74] },      // C7sus
  { bass: 41, pad: [53, 57, 60, 64], pool: [57, 60, 64, 65, 67, 69, 72, 76] },      // Fmaj7
  { bass: 46, pad: [58, 62, 65, 69], pool: [58, 60, 62, 65, 69, 72, 74, 77] },      // Bbmaj7
];

export class Music {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.started = false;
    this.bpm = 70;
    this.beat = 0;          // global beat counter
    this.nextTime = 0;
    this.timer = 0;
    this.lastNote = 64;
  }

  // Must be called from a user gesture (browsers block audio until then).
  start() {
    if (this.started) return;
    this.started = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.9 : 0;
    const warm = ctx.createBiquadFilter(); warm.type = "lowpass"; warm.frequency.value = 3200; warm.Q.value = 0.4;
    this.master.connect(warm).connect(ctx.destination);

    // Reverb: generated impulse response
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulse(ctx, 2.8, 2.6);
    this.reverbGain = ctx.createGain(); this.reverbGain.gain.value = 0.35;
    this.reverb.connect(this.reverbGain).connect(this.master);

    this.dry = ctx.createGain(); this.dry.gain.value = 1; this.dry.connect(this.master);

    this.noiseBuf = makeNoise(ctx, 2);
    this.startCrackle();

    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 90);
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    if (on) {
      this.master.gain.setValueAtTime(0, t);
      this.master.gain.linearRampToValueAtTime(0.9, t + 0.4);
      if (this.ctx.state !== "running") this.ctx.resume();
    } else {
      // fade quickly, then suspend the whole context so nothing can leak through
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0, t + 0.25);
      clearTimeout(this.suspendT);
      this.suspendT = setTimeout(() => { if (!this.enabled && this.ctx.state === "running") this.ctx.suspend(); }, 320);
    }
  }

  // ---- scheduling (look-ahead) ----
  schedule() {
    const ctx = this.ctx;
    const spb = 60 / this.bpm;
    while (this.nextTime < ctx.currentTime + 0.6) {
      this.playBeat(this.beat, this.nextTime, spb);
      this.beat++;
      this.nextTime += spb;
    }
  }

  playBeat(beat, t, spb) {
    const bar = Math.floor(beat / 4), b = beat % 4;
    const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
    const chordStart = bar % 2 === 0 && b === 0;

    if (chordStart) this.pad(chord.pad, t, spb * 8);
    if (b === 0 || b === 2) this.bass(chord.bass, t, spb * 1.9);
    if (b === 3 && Math.random() < 0.3) this.bass(chord.bass + (Math.random() < 0.5 ? 7 : 5), t + spb * 0.5, spb * 0.9);

    // electric-piano wandering melody: mostly on beats and the "and"s, with rests
    for (const off of [0, 0.5]) {
      const p = off === 0 ? 0.55 : 0.4;
      if (Math.random() < p) {
        const n = this.pickNote(chord.pool);
        this.key(n, t + off * spb, spb * (1.4 + Math.random()), 0.11 + Math.random() * 0.05);
      }
    }
    // occasional soft chord stab on beat 2
    if (b === 1 && Math.random() < 0.25) for (const n of chord.pad) this.key(n + 12, t + 0.02 * Math.random(), spb * 1.2, 0.035);

    // shaker on off-beats, whisper quiet, with swing
    this.shaker(t + spb * 0.5 + spb * 0.06, 0.018);
    if (b % 2 === 1) this.shaker(t, 0.012);
  }

  pickNote(pool) {
    // random walk through the pool so the melody feels connected
    const sorted = [...pool].sort((a, b) => a - b);
    let i = sorted.findIndex((n) => n >= this.lastNote);
    if (i < 0) i = sorted.length - 1;
    const step = Math.random() < 0.6 ? (Math.random() < 0.5 ? -1 : 1) : Math.floor(Math.random() * 5) - 2;
    i = Math.max(0, Math.min(sorted.length - 1, i + step));
    this.lastNote = sorted[i];
    return this.lastNote;
  }

  // ---- instruments ----
  pad(notes, t, dur) {
    const ctx = this.ctx;
    for (const n of notes) {
      for (const [type, det, g] of [["triangle", 0, 0.028], ["sine", 6, 0.02], ["sine", -5, 0.02]]) {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = midi(n); o.detune.value = det;
        const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(g, t + 1.6);
        env.gain.setValueAtTime(g, t + dur - 1.8);
        env.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(f).connect(env); env.connect(this.reverb); env.connect(this.dry);
        o.start(t); o.stop(t + dur + 0.1);
      }
    }
  }

  key(n, t, dur, vol) {
    const ctx = this.ctx;
    const f = midi(n);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.012);
    env.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.35);
    env.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(700, t + dur);
    for (const [mult, g, type] of [[1, 1, "sine"], [2, 0.28, "sine"], [3, 0.08, "triangle"]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mult;
      const og = ctx.createGain(); og.gain.value = g;
      o.connect(og).connect(lp); o.start(t); o.stop(t + dur + 0.05);
    }
    lp.connect(env); env.connect(this.dry); env.connect(this.reverb);
  }

  bass(n, t, dur) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = midi(n);
    const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = midi(n);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.16, t + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(env).connect(this.dry);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  shaker(t, vol) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 6000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
    src.connect(hp).connect(env).connect(this.dry);
    src.start(t, Math.random() * 1.5); src.stop(t + 0.12);
  }

  startCrackle() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = makeCrackle(ctx, 6); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4000;
    const g = ctx.createGain(); g.gain.value = 0.05;
    src.connect(lp).connect(g).connect(this.dry);
    src.start();
  }
}

function makeImpulse(ctx, seconds, decay) {
  const rate = ctx.sampleRate, len = rate * seconds;
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function makeNoise(ctx, seconds) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function makeCrackle(ctx, seconds) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * 0.015;                       // soft hiss
    if (Math.random() < 0.00035) { const a = Math.random() * 0.9; for (let k = 0; k < 40 && i + k < len; k++) d[i + k] += a * (1 - k / 40) * (Math.random() * 2 - 1); }
  }
  return buf;
}

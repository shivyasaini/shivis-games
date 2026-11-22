// Procedural sound effects (Web Audio). Everything is synthesized, no files.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.loops = {};       // running continuous sounds (pour, simmer)
    this.lastSwish = 0;
  }

  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 1 : 0;
    this.master.connect(ctx.destination);
    this.noise = makeNoise(ctx, 2);
    if (!this.enabled) ctx.suspend();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.enabled ? 1 : 0, t);
      if (this.enabled) { if (this.ctx.state !== "running") this.ctx.resume(); }
      else { this.stopAll(); setTimeout(() => { if (!this.enabled && this.ctx.state === "running") this.ctx.suspend(); }, 150); }
    }
    return this.enabled;
  }

  get ok() { return !!this.ctx && this.enabled; }
  now() { return this.ctx.currentTime; }

  // ---------- helpers ----------
  tone(freq, t, dur, vol, { type = "sine", to = null, lp = null } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    let node = o;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(env).connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  burst(t, dur, vol, { type = "bandpass", freq = 1000, q = 1, to = null } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(f).connect(env).connect(this.master);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
  }

  // ---------- café ----------
  // Muffled gibberish, as if a villager is mumbling the order through a cushion.
  voice(seed = Math.random()) {
    if (!this.ok) return;
    const ctx = this.ctx;
    const base = 140 + seed * 150;
    const syllables = 3 + Math.floor(seed * 2 + Math.random() * 2);
    let t = this.now() + 0.02;
    const muffle = ctx.createBiquadFilter(); muffle.type = "lowpass"; muffle.frequency.value = 850; muffle.Q.value = 0.7;
    muffle.connect(this.master);
    for (let i = 0; i < syllables; i++) {
      const dur = 0.08 + Math.random() * 0.09;
      const f0 = base * (0.85 + Math.random() * 0.4);
      const f1 = f0 * (0.9 + Math.random() * 0.25);
      const o = ctx.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur);
      const formant = ctx.createBiquadFilter(); formant.type = "bandpass"; formant.frequency.value = 350 + Math.random() * 500; formant.Q.value = 2.5;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.55, t + 0.02);
      env.gain.setValueAtTime(0.55, t + dur * 0.6);
      env.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(formant).connect(env).connect(muffle);
      o.start(t); o.stop(t + dur + 0.01);
      t += dur + 0.025 + Math.random() * 0.05;
    }
  }

  // Super soft coin chime for a tip.
  tip() {
    if (!this.ok) return;
    const t = this.now();
    this.tone(1760, t, 0.45, 0.03);
    this.tone(2349, t + 0.09, 0.6, 0.025);
    this.tone(3520, t + 0.09, 0.5, 0.008);
  }

  // ---------- kitchen ----------
  pick() { if (this.ok) this.tone(620, this.now(), 0.09, 0.07, { to: 330 }); }
  wrong() { if (this.ok) { const t = this.now(); this.tone(220, t, 0.18, 0.07, { type: "triangle", to: 160 }); this.tone(170, t + 0.16, 0.22, 0.06, { type: "triangle", to: 120 }); } }

  grind() {
    if (!this.ok) return;
    const t = this.now();
    this.burst(t, 0.14, 0.3, { type: "lowpass", freq: 520, q: 0.8 });
    this.burst(t, 0.1, 0.1, { type: "bandpass", freq: 2200, q: 2 });
    this.tone(70, t, 0.12, 0.05, { type: "sawtooth", lp: 200 });
  }

  plop() { if (this.ok) this.tone(330, this.now(), 0.13, 0.08, { to: 120 }); }

  tap(label = "") {
    const l = label.toLowerCase();
    if (l.includes("grind") || l.includes("sift")) this.grind();
    else if (l.includes("drizzle")) this.pourShort();
    else this.plop();
  }

  pourShort() { if (this.ok) this.burst(this.now(), 0.25, 0.12, { type: "bandpass", freq: 900, q: 1.2, to: 1500 }); }

  // continuous sounds for hold steps
  holdStart(label = "") {
    if (!this.ok) return;
    this.holdStop();
    const ctx = this.ctx, t = this.now();
    const steam = label.toLowerCase().includes("steam");
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = ctx.createBiquadFilter();
    if (steam) { f.type = "highpass"; f.frequency.value = 2500; }
    else { f.type = "bandpass"; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(1900, t + 2.6); f.Q.value = 1.1; }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(steam ? 0.07 : 0.16, t + 0.12);
    src.connect(f).connect(env).connect(this.master);
    src.start(t);
    this.loops.hold = { src, env };
  }
  holdStop() {
    const l = this.loops.hold; if (!l) return;
    const t = this.now();
    l.env.gain.cancelScheduledValues(t); l.env.gain.setValueAtTime(l.env.gain.value, t); l.env.gain.linearRampToValueAtTime(0, t + 0.08);
    l.src.stop(t + 0.1); this.loops.hold = null;
  }

  // simmering / oven for timer steps
  timerStart(label = "") {
    if (!this.ok) return;
    this.timerStop();
    const ctx = this.ctx, t = this.now();
    const oven = label.toLowerCase().includes("bake");
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = oven ? 180 : 420;
    const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(oven ? 0.1 : 0.06, t + 0.3);
    src.connect(f).connect(env).connect(this.master); src.start(t);
    const bubbles = setInterval(() => {
      if (!this.ok) return;
      if (Math.random() < (oven ? 0.25 : 0.7)) this.tone(300 + Math.random() * 700, this.now(), 0.06, 0.03, { to: 200 + Math.random() * 300 });
    }, 160);
    this.loops.timer = { src, env, bubbles };
  }
  timerStop(burnt = false) {
    const l = this.loops.timer; if (!l) return;
    clearInterval(l.bubbles);
    const t = this.now();
    l.env.gain.cancelScheduledValues(t); l.env.gain.setValueAtTime(l.env.gain.value, t); l.env.gain.linearRampToValueAtTime(0, t + 0.15);
    l.src.stop(t + 0.2); this.loops.timer = null;
    if (burnt) { this.burst(t, 0.6, 0.08, { type: "highpass", freq: 3000 }); this.tone(160, t, 0.4, 0.06, { type: "triangle", to: 90 }); }
    else { this.tone(1318, t, 0.7, 0.05); this.tone(2637, t, 0.5, 0.015); }  // oven ding
  }

  swish() {
    if (!this.ok) return;
    const t = this.now();
    if (t - this.lastSwish < 0.11) return;
    this.lastSwish = t;
    this.burst(t, 0.12, 0.16, { type: "bandpass", freq: 1200 + Math.random() * 800, q: 1.4 });
  }

  stepDone(score) {
    if (!this.ok) return;
    const t = this.now();
    if (score >= 0.9) { this.tone(1046, t, 0.25, 0.05); this.tone(1318, t + 0.09, 0.35, 0.05); }
    else if (score >= 0.6) this.tone(880, t, 0.3, 0.045);
    else this.tone(240, t, 0.25, 0.05, { type: "triangle", to: 180 });
  }

  recipeDone(key) {
    if (!this.ok) return;
    const t = this.now();
    const notes = key === "perfect" ? [1046, 1318, 1568, 2093] : key === "good" ? [1046, 1318, 1568] : [880, 660];
    notes.forEach((f, i) => this.tone(f, t + i * 0.1, 0.5, 0.05));
  }

  stopAll() { this.holdStop(); this.timerStop(); }
}

function makeNoise(ctx, seconds) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// The hands-on brewing & baking mini-game. One recipe at a time.
import { clamp } from "./util.js";
import { ratingFor } from "./data/drinks.js";

export function createKitchen(game, ui) {
  const $ = (id) => document.getElementById(id);
  const root = $("kitchen");
  const els = { title: $("k-title"), sub: $("k-sub"), steps: $("k-steps"), stage: $("k-stage"), hint: $("k-hint"), close: $("k-close") };

  let order = null, stepIndex = 0, scores = [], active = null;
  const sfx = () => game.sfx;

  function open(o) {
    order = o; stepIndex = 0; scores = [];
    els.title.textContent = `${o.drink.emoji} ${o.drink.name}`;
    els.sub.textContent = `for table ${game.tables.indexOf(o.customer.table) + 1}`;
    root.classList.remove("hidden");
    root.classList.toggle("baking", !!o.drink.baking);
    renderSteps();
    startStep();
  }

  function close(cancel) {
    stopActive();
    sfx()?.stopAll();
    root.classList.add("hidden");
    if (cancel && order) game.cancelBrew(order);
    order = null;
  }

  function renderSteps() {
    els.steps.innerHTML = order.drink.steps.map((s, i) =>
      `<div class="k-step ${i < stepIndex ? "done" : i === stepIndex ? "now" : ""}"><span class="dot">${i < stepIndex ? "✓" : i + 1}</span><span>${s.label}</span></div>`
    ).join("");
  }

  function stopActive() {
    if (active && active.destroy) active.destroy();
    active = null;
  }

  function startStep() {
    stopActive();
    const step = order.drink.steps[stepIndex];
    els.hint.textContent = step.hint || "";
    els.stage.innerHTML = "";
    active = BUILDERS[step.type](step, els.stage, finishStep);
  }

  function finishStep(score, note) {
    stopActive();
    sfx()?.stepDone(score);
    scores.push(clamp(score, 0, 1));
    const r = score >= 0.9 ? "perfect" : score >= 0.6 ? "good" : "meh";
    const flash = document.createElement("div");
    flash.className = `k-flash ${r}`;
    flash.textContent = note || (r === "perfect" ? "Perfect!" : r === "good" ? "Nice" : "Hmm…");
    els.stage.appendChild(flash);
    setTimeout(() => {
      stepIndex++;
      if (stepIndex >= order.drink.steps.length) return complete();
      renderSteps();
      startStep();
    }, 650);
  }

  function complete() {
    const q = scores.reduce((a, b) => a + b, 0) / scores.length;
    const o = order;
    const rating = ratingFor(q);
    sfx()?.recipeDone(rating.key);
    els.stage.innerHTML = `<div class="k-done ${rating.key}"><div class="big">${o.drink.emoji}</div><div class="stars">${rating.stars}</div><div>${rating.label}</div></div>`;
    els.hint.textContent = "";
    setTimeout(() => { root.classList.add("hidden"); order = null; game.finishBrew(o, q); }, 900);
  }

  els.close.onclick = () => close(true);

  // ---------- step builders ----------
  const BUILDERS = {
    pick(step, stage, done) {
      let answered = false;
      const wrap = el("div", "k-pick");
      for (const opt of step.options) {
        const b = el("button", "k-opt", opt);
        b.onclick = () => {
          if (answered) return;
          answered = true;
          if (opt === step.answer) { b.classList.add("right"); sfx()?.pick(); done(1); }
          else { b.classList.add("wrong"); sfx()?.wrong(); done(0.5, "Oops, wrong one"); }
        };
        wrap.appendChild(b);
      }
      stage.appendChild(el("div", "k-label", step.label));
      stage.appendChild(wrap);
      return {};
    },

    tap(step, stage, done) {
      let n = 0;
      stage.appendChild(el("div", "k-label", step.label));
      const b = el("button", "k-big", `<span class="ico">${step.icon}</span><span class="cnt">0 / ${step.count}</span>`);
      const ring = el("div", "k-ring"); ring.style.setProperty("--p", "0");
      b.onpointerdown = (e) => {
        e.preventDefault();
        n++;
        sfx()?.tap(step.label);
        b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
        b.querySelector(".cnt").textContent = `${n} / ${step.count}`;
        ring.style.setProperty("--p", String(n / step.count));
        if (n >= step.count) { b.disabled = true; done(1); }
      };
      ring.appendChild(b);
      stage.appendChild(ring);
      return {};
    },

    hold(step, stage, done) {
      stage.appendChild(el("div", "k-label", step.label));
      const bar = meter(stage, step.lo, step.hi);
      const b = el("button", "k-big k-hold", `<span class="ico">${step.icon}</span><span class="cnt">hold</span>`);
      stage.appendChild(b);
      let v = 0, holding = false, start = 0, finished = false, iv = 0;
      const tick = () => {
        if (!holding || finished) return;
        v = ((performance.now() - start) / 1000) * 42;   // time-based, so it stays fair even if frames stall
        bar.set(v);
        if (v >= 100) release();
      };
      const release = () => {
        if (!holding || finished) return;
        tick();
        holding = false; finished = true; clearInterval(iv);
        sfx()?.holdStop();
        done(zoneScore(v, step.lo, step.hi), v >= 100 ? "Overflow!" : undefined);
      };
      b.onpointerdown = (e) => { e.preventDefault(); if (finished || holding) return; holding = true; start = performance.now(); b.classList.add("down"); iv = setInterval(tick, 16); sfx()?.holdStart(step.label); };
      const up = () => { b.classList.remove("down"); release(); };
      b.onpointerup = up; b.onpointercancel = up; b.onpointerleave = () => { if (holding) up(); };
      window.addEventListener("pointerup", up);
      return { destroy: () => { finished = true; clearInterval(iv); sfx()?.holdStop(); window.removeEventListener("pointerup", up); } };
    },

    timer(step, stage, done) {
      stage.appendChild(el("div", "k-label", step.label));
      const bar = meter(stage, step.lo, step.hi);
      const b = el("button", "k-big k-stop", `<span class="ico">${step.icon}</span><span class="cnt">stop!</span>`);
      stage.appendChild(b);
      let v = 0, finished = false, start = performance.now();
      const tick = () => {
        if (finished) return;
        v = ((performance.now() - start) / 1000 / step.secs) * 100;
        bar.set(v);
        if (v >= 108) { finished = true; clearInterval(iv); sfx()?.timerStop(true); done(0.15, "Burnt! 🔥"); }
      };
      const iv = setInterval(tick, 16);
      sfx()?.timerStart(step.label);
      b.onpointerdown = (e) => { e.preventDefault(); if (finished) return; tick(); finished = true; clearInterval(iv); sfx()?.timerStop(false); done(zoneScore(v, step.lo, step.hi)); };
      return { destroy: () => { finished = true; clearInterval(iv); if (game.sfx?.loops.timer) game.sfx.timerStop(false); } };
    },

    stir(step, stage, done) {
      stage.appendChild(el("div", "k-label", step.label));
      const bowl = el("div", "k-bowl", `<div class="k-spoon">${step.icon}</div><div class="k-fill"></div>`);
      stage.appendChild(bowl);
      const spoon = bowl.querySelector(".k-spoon"), fill = bowl.querySelector(".k-fill");
      let dist = 0, down = false, lx = 0, ly = 0, finished = false;
      bowl.onpointerdown = (e) => { e.preventDefault(); down = true; lx = e.clientX; ly = e.clientY; bowl.setPointerCapture(e.pointerId); };
      bowl.onpointermove = (e) => {
        const r = bowl.getBoundingClientRect();
        spoon.style.left = `${clamp(e.clientX - r.left, 10, r.width - 10)}px`;
        spoon.style.top = `${clamp(e.clientY - r.top, 10, r.height - 10)}px`;
        if (!down || finished) return;
        const d = Math.hypot(e.clientX - lx, e.clientY - ly);
        if (d > 6) sfx()?.swish();
        dist += d; lx = e.clientX; ly = e.clientY;
        const p = clamp(dist / step.target, 0, 1);
        fill.style.height = `${p * 100}%`;
        if (p >= 1) { finished = true; done(1); }
      };
      const up = () => { down = false; };
      bowl.onpointerup = up; bowl.onpointercancel = up;
      return { destroy: () => { finished = true; } };
    },
  };

  function meter(stage, lo, hi) {
    const m = el("div", "k-meter", `<div class="zone" style="left:${lo}%;width:${hi - lo}%"></div><div class="fill"></div><div class="needle"></div>`);
    stage.appendChild(m);
    const f = m.querySelector(".fill"), n = m.querySelector(".needle");
    return { set(v) { const c = clamp(v, 0, 100); f.style.width = `${c}%`; n.style.left = `${c}%`; m.classList.toggle("hot", v > hi); } };
  }

  function zoneScore(v, lo, hi) {
    if (v >= lo && v <= hi) return 1;
    const d = v < lo ? lo - v : v - hi;
    return clamp(1 - d / 22, 0.2, 1);
  }

  function el(tag, cls, html) { const e = document.createElement(tag); e.className = cls; if (html != null) e.innerHTML = html; return e; }

  return { open, close, get isOpen() { return !!order; } };
}

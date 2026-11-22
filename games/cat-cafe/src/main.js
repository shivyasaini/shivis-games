import { Game } from "./game.js";
import { createUI } from "./ui.js";
import { createKitchen } from "./kitchen.js";
import { Music } from "./systems/music.js";
import { Sfx } from "./systems/sfx.js";
import { W, H } from "./util.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = createUI();
const game = new Game(ui);
ui.bind(game);
game.kitchen = createKitchen(game, ui);

// Music starts on the first click/tap anywhere (browsers require a gesture first).
const music = new Music();
try { music.enabled = localStorage.getItem("catcafe.music") !== "off"; } catch { /* ignore */ }
const musicBtn = document.getElementById("btn-music");
const paintMusic = () => { musicBtn.textContent = music.enabled ? "🎵" : "🔇"; musicBtn.classList.toggle("muted", !music.enabled); };
paintMusic();
const sfx = new Sfx();
game.sfx = sfx;
try { sfx.enabled = localStorage.getItem("catcafe.sfx") !== "off"; } catch { /* ignore */ }
const sfxBtn = document.getElementById("btn-sfx");
const paintSfx = () => { sfxBtn.textContent = sfx.enabled ? "🔔" : "🔕"; sfxBtn.classList.toggle("muted", !sfx.enabled); };
paintSfx();
sfxBtn.onclick = () => {
  sfx.start();
  sfx.toggle();
  try { localStorage.setItem("catcafe.sfx", sfx.enabled ? "on" : "off"); } catch { /* ignore */ }
  paintSfx();
};
window.sfx = sfx;
const kick = () => {
  music.start(); sfx.start();
  if (!music.enabled && music.ctx) music.ctx.suspend();
  window.removeEventListener("pointerdown", kick, true); window.removeEventListener("keydown", kick, true);
};
window.addEventListener("pointerdown", kick, true);
window.addEventListener("keydown", kick, true);
musicBtn.onclick = () => {
  music.start();
  music.toggle();
  try { localStorage.setItem("catcafe.music", music.enabled ? "on" : "off"); } catch { /* ignore */ }
  paintMusic();
};
window.music = music;

// ---- intro card: shown on first visit, and from the ? button ----
const intro = document.getElementById("intro");
const showIntro = () => intro.classList.remove("hidden");
const hideIntro = () => { intro.classList.add("hidden"); try { localStorage.setItem("catcafe.intro", "seen"); } catch { /* ignore */ } };
document.getElementById("intro-start").onclick = () => { music.start(); sfx.start(); hideIntro(); };
document.getElementById("btn-help").onclick = showIntro;
intro.addEventListener("pointerdown", (e) => { if (e.target === intro) hideIntro(); });
let seen = false;
try { seen = localStorage.getItem("catcafe.intro") === "seen"; } catch { /* ignore */ }
if (!seen) showIntro();

let scale = 1, ox = 0, oy = 0, dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  scale = Math.min(cw / W, ch / H);
  ox = (cw - W * scale) / 2; oy = (ch - H * scale) / 2;
}
window.addEventListener("resize", resize);
resize();

function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left - ox) / scale, y: (e.clientY - r.top - oy) / scale };
}
canvas.addEventListener("pointerdown", (e) => { const p = toWorld(e); game.click(p.x, p.y); });
canvas.addEventListener("pointermove", (e) => { const p = toWorld(e); canvas.style.cursor = game.hover(p.x, p.y); });

window.addEventListener("beforeunload", () => game.save());

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#2a1d17";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, ox * dpr, oy * dpr);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  game.draw(ctx);
  ctx.restore();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// handy for poking around in the console
window.game = game;

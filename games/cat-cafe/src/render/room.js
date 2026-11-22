import { W, H, roundRect, ellipse, shade, clamp, lerp } from "../util.js";

export const LAYOUT = {
  FLOOR_Y: 372,
  WINDOW: { x: 600, y: 72, w: 290, h: 226 },
  DOOR: { x: 1110, y: 128, w: 104, h: 244 },
  COUNTER: { x: 40, y: 318, w: 320, h: 140 },
  TABLES: [
    { x: 560, y: 548 },
    { x: 830, y: 492 },
    { x: 1040, y: 628 },
  ],
  TABLE_R: 44,
  BED: { x: 452, y: 662 },
  SUNSPOT: { x: 760, y: 585 },
  TREE: { x: 1196, y: 560, perchY: 470 },
  SPAWN: { x: 1162, y: 398 },
  WALK: { x0: 400, y0: 408, x1: 1250, y1: 690 },
  LAMPS: [{ x: 470, y: 126 }, { x: 990, y: 126 }],
};

export const seatFor = (table) => ({ x: table.x - 68, y: table.y + 8 });

// ---------- Static layer (drawn once) ----------
export function buildStaticLayer() {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const { FLOOR_Y, WINDOW, DOOR, COUNTER, TABLES, BED, TREE, LAMPS } = LAYOUT;

  // --- wall ---
  const wallG = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
  wallG.addColorStop(0, "#f3e3cf");
  wallG.addColorStop(1, "#e7cfb4");
  ctx.fillStyle = wallG;
  ctx.fillRect(0, 0, W, FLOOR_Y);
  // subtle wallpaper stripes
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let x = 0; x < W; x += 36) ctx.fillRect(x, 0, 14, FLOOR_Y);
  // crown molding
  ctx.fillStyle = "#fff7ec"; ctx.fillRect(0, 0, W, 10);
  ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fillRect(0, 10, W, 3);

  // wainscot
  const wainTop = FLOOR_Y - 78;
  const wg = ctx.createLinearGradient(0, wainTop, 0, FLOOR_Y);
  wg.addColorStop(0, "#9d6a47"); wg.addColorStop(1, "#7a4f33");
  ctx.fillStyle = wg; ctx.fillRect(0, wainTop, W, FLOOR_Y - wainTop);
  ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(0, wainTop, W, 4);
  ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 2;
  for (let x = 20; x < W; x += 90) { roundRect(ctx, x, wainTop + 14, 62, 46, 4); ctx.stroke(); }
  ctx.fillStyle = "#5e3a24"; ctx.fillRect(0, FLOOR_Y - 8, W, 8);

  // --- floor ---
  const fg = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
  fg.addColorStop(0, "#b98a61"); fg.addColorStop(1, "#8e6241");
  ctx.fillStyle = fg; ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  // planks
  for (let y = FLOOR_Y; y < H; y += 26) {
    ctx.fillStyle = `rgba(0,0,0,${0.05 + ((y / 26) % 2) * 0.03})`;
    ctx.fillRect(0, y, W, 26);
    ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(0, y, W, 1.5);
    const off = ((y / 26) % 3) * 140;
    for (let x = off; x < W; x += 420) { ctx.fillRect(x, y, 1.5, 26); }
    ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(0, y + 2, W, 1);
  }
  // floor vignette
  const vg = ctx.createRadialGradient(W / 2, H * 0.75, 200, W / 2, H * 0.75, 900);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(30,10,0,0.35)");
  ctx.fillStyle = vg; ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);

  // woven rug under the tables
  wovenRug(ctx, 790, 578, 320, 0.44);

  // --- window (frame; glass is transparent for dynamic sky) ---
  ctx.clearRect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h);
  ctx.fillStyle = "#fff8ee";
  roundRect(ctx, WINDOW.x - 14, WINDOW.y - 14, WINDOW.w + 28, WINDOW.h + 28, 8); ctx.stroke();
  ctx.lineWidth = 14; ctx.strokeStyle = "#fff8ee";
  ctx.strokeRect(WINDOW.x - 7, WINDOW.y - 7, WINDOW.w + 14, WINDOW.h + 14);
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(WINDOW.x + WINDOW.w / 2, WINDOW.y); ctx.lineTo(WINDOW.x + WINDOW.w / 2, WINDOW.y + WINDOW.h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(WINDOW.x, WINDOW.y + WINDOW.h * 0.45); ctx.lineTo(WINDOW.x + WINDOW.w, WINDOW.y + WINDOW.h * 0.45); ctx.stroke();
  // sill
  ctx.fillStyle = "#fff3e2"; roundRect(ctx, WINDOW.x - 22, WINDOW.y + WINDOW.h + 6, WINDOW.w + 44, 14, 4); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(WINDOW.x - 22, WINDOW.y + WINDOW.h + 20, WINDOW.w + 44, 6);
  // curtains
  for (const side of [-1, 1]) {
    const cx = side < 0 ? WINDOW.x - 40 : WINDOW.x + WINDOW.w + 2;
    const cg = ctx.createLinearGradient(cx, 0, cx + 38, 0);
    cg.addColorStop(0, "#f3b59a"); cg.addColorStop(0.5, "#ffd3bd"); cg.addColorStop(1, "#e89d84");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(cx, WINDOW.y - 22);
    ctx.lineTo(cx + 38, WINDOW.y - 22);
    ctx.quadraticCurveTo(cx + (side < 0 ? 44 : -6), WINDOW.y + 120, cx + 38, WINDOW.y + WINDOW.h + 40);
    ctx.lineTo(cx, WINDOW.y + WINDOW.h + 40);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = "#8a5a3c"; roundRect(ctx, WINDOW.x - 50, WINDOW.y - 30, WINDOW.w + 100, 9, 4); ctx.fill();
  // plants on sill
  potPlant(ctx, WINDOW.x + 40, WINDOW.y + WINDOW.h + 8, 0.7, "#5fa36a");
  potPlant(ctx, WINDOW.x + WINDOW.w - 50, WINDOW.y + WINDOW.h + 8, 0.6, "#7cb87a");

  // --- door ---
  ctx.fillStyle = "#6a4530"; roundRect(ctx, DOOR.x - 10, DOOR.y - 10, DOOR.w + 20, DOOR.h + 10, 6); ctx.fill();
  const dg = ctx.createLinearGradient(DOOR.x, 0, DOOR.x + DOOR.w, 0);
  dg.addColorStop(0, "#b07d52"); dg.addColorStop(1, "#8f6240");
  ctx.fillStyle = dg; ctx.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
  ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 2;
  roundRect(ctx, DOOR.x + 14, DOOR.y + 16, DOOR.w - 28, 90, 4); ctx.stroke();
  roundRect(ctx, DOOR.x + 14, DOOR.y + 124, DOOR.w - 28, 100, 4); ctx.stroke();
  // door glass
  ctx.fillStyle = "#cfe6f2"; roundRect(ctx, DOOR.x + 18, DOOR.y + 20, DOOR.w - 36, 82, 4); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.moveTo(DOOR.x + 22, DOOR.y + 98); ctx.lineTo(DOOR.x + 60, DOOR.y + 22); ctx.lineTo(DOOR.x + 78, DOOR.y + 22); ctx.lineTo(DOOR.x + 40, DOOR.y + 98); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#e9c46a"; ctx.beginPath(); ctx.arc(DOOR.x + DOOR.w - 20, DOOR.y + 130, 5, 0, Math.PI * 2); ctx.fill();
  // "OPEN" sign
  ctx.fillStyle = "#fff6ea"; roundRect(ctx, DOOR.x + 24, DOOR.y + 44, 56, 26, 6); ctx.fill();
  ctx.fillStyle = "#c95a4a"; ctx.font = "900 14px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("OPEN", DOOR.x + 52, DOOR.y + 57);
  // welcome mat
  ctx.fillStyle = "#b85f50"; roundRect(ctx, DOOR.x - 6, FLOOR_Y + 6, DOOR.w + 12, 30, 6); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2; roundRect(ctx, DOOR.x, FLOOR_Y + 11, DOOR.w, 20, 4); ctx.stroke();

  // --- shelves (left wall) ---
  for (const sy of [90, 170, 250]) {
    ctx.fillStyle = "#8a5a3c"; roundRect(ctx, 60, sy, 260, 10, 3); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(60, sy + 10, 260, 5);
  }
  jar(ctx, 90, 90, "#d5a35a"); jar(ctx, 130, 90, "#8c5a3c"); jar(ctx, 170, 90, "#b7c6a8"); mug(ctx, 220, 90, "#f2c14e"); mug(ctx, 255, 90, "#6fa8dc"); mug(ctx, 290, 90, "#e37a6b");
  books(ctx, 80, 170); potPlant(ctx, 215, 170, 0.5, "#6fb07a"); jar(ctx, 270, 170, "#e9b2a1"); jar(ctx, 300, 170, "#c6e3d4");
  mug(ctx, 90, 250, "#b48ad9"); mug(ctx, 125, 250, "#8fbf7f"); jar(ctx, 175, 250, "#f0a35a"); potPlant(ctx, 250, 250, 0.45, "#88b86d"); mug(ctx, 300, 250, "#f4a6b8");

  // --- framed cat pictures & chalkboard ---
  frame(ctx, 400, 160, 70, 84, "#f0a35a");
  frame(ctx, 490, 182, 60, 70, "#2b2a33");
  chalkboard(ctx, 940, 158, 140, 110);

  // --- pendant lamps ---
  for (const l of LAMPS) {
    ctx.strokeStyle = "#3b2a22"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(l.x, 10); ctx.lineTo(l.x, l.y - 36); ctx.stroke();
    const lg = ctx.createLinearGradient(l.x - 40, 0, l.x + 40, 0);
    lg.addColorStop(0, "#c9644f"); lg.addColorStop(0.5, "#f08d72"); lg.addColorStop(1, "#b9533f");
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(l.x - 14, l.y - 36); ctx.lineTo(l.x + 14, l.y - 36); ctx.lineTo(l.x + 44, l.y); ctx.lineTo(l.x - 44, l.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff1c9"; ellipse(ctx, l.x, l.y, 44, 6); ctx.fill();
  }

  // --- string lights ---
  ctx.strokeStyle = "#4a3a30"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 26); ctx.quadraticCurveTo(W / 2, 80, W, 26); ctx.stroke();
  for (let i = 0; i < 18; i++) {
    const t = (i + 0.5) / 18;
    const x = t * W, y = 26 + Math.sin(t * Math.PI) * 27;
    ctx.fillStyle = ["#ffd27a", "#ffb3c1", "#b3e5ff", "#c7f0b3"][i % 4];
    ctx.beginPath(); ctx.arc(x, y + 6, 4.5, 0, Math.PI * 2); ctx.fill();
  }

  // --- counter (left front) ---
  const c = COUNTER;
  // front
  const cfg = ctx.createLinearGradient(0, c.y + 30, 0, c.y + c.h);
  cfg.addColorStop(0, "#9b6a46"); cfg.addColorStop(1, "#6f4a30");
  ctx.fillStyle = cfg; roundRect(ctx, c.x, c.y + 24, c.w, c.h - 24, 8); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.22)"; ctx.lineWidth = 2;
  for (let x = c.x + 18; x < c.x + c.w - 20; x += 54) { roundRect(ctx, x, c.y + 44, 40, c.h - 76, 4); ctx.stroke(); }
  // top (marble)
  ctx.fillStyle = "#f4ede3"; roundRect(ctx, c.x - 8, c.y, c.w + 16, 34, 10); ctx.fill();
  ctx.strokeStyle = "rgba(160,140,120,0.35)"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(c.x + i * 40, c.y + 4); ctx.quadraticCurveTo(c.x + i * 40 + 30, c.y + 18, c.x + i * 40 + 50, c.y + 30); ctx.stroke(); }
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(c.x - 8, c.y + 32, c.w + 16, 5);
  // espresso machine
  espressoMachine(ctx, c.x + 60, c.y + 2);
  // cake dome
  ctx.fillStyle = "#f3c08a"; roundRect(ctx, c.x + 200, c.y - 16, 54, 18, 6); ctx.fill();
  ctx.fillStyle = "rgba(200,230,255,0.45)"; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(c.x + 227, c.y - 10, 34, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f4ede3"; roundRect(ctx, c.x + 188, c.y - 6, 78, 8, 3); ctx.fill();
  // cup stack
  for (let i = 0; i < 3; i++) { mug(ctx, c.x + 285, c.y - i * 8, ["#fff", "#ffe5e5", "#e6f3ff"][i], 0.8); }
  // register
  ctx.fillStyle = "#4d4a52"; roundRect(ctx, c.x + 10, c.y - 22, 42, 24, 5); ctx.fill();
  ctx.fillStyle = "#9bd6c6"; roundRect(ctx, c.x + 16, c.y - 17, 30, 9, 2); ctx.fill();

  // --- floor lamp, reading nook, toys ---
  floorLamp(ctx, 372, 585);
  readingNook(ctx, 950, 392);
  catToys(ctx);

  // --- chairs for tables (behind customers) ---
  for (const t of TABLES) {
    const s = seatFor(t);
    stool(ctx, s.x, s.y);
  }

  // --- cat bed ---
  ctx.save(); ctx.translate(BED.x, BED.y);
  ctx.fillStyle = "#b8706a"; ellipse(ctx, 0, 0, 46, 20); ctx.fill();
  ctx.fillStyle = "#e9a09a"; ellipse(ctx, 0, -5, 44, 18); ctx.fill();
  ctx.fillStyle = "#f6c8c3"; ellipse(ctx, 0, -4, 32, 12); ctx.fill();
  ctx.restore();

  // --- cat tree (right) ---
  catTree(ctx, TREE.x, TREE.y);

  // --- floor plant (right corner) ---
  potPlant(ctx, 1240, 420, 1.3, "#4f9a5e");

  return cv;
}

// Cushioned bentwood café chair, seen from the side (customer sits facing right).
export function stool(ctx, x, y) {
  ctx.save();
  // legs
  ctx.strokeStyle = "#6f4a30"; ctx.lineWidth = 5; ctx.lineCap = "round";
  for (const [dx, dx2] of [[-16, -19], [14, 17], [-8, -10], [20, 22]]) {
    ctx.beginPath(); ctx.moveTo(x + dx, y - 20); ctx.lineTo(x + dx2, y + 2); ctx.stroke();
  }
  // backrest: curved bentwood frame + cushion
  ctx.strokeStyle = "#8a5a3c"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x - 22, y - 22); ctx.quadraticCurveTo(x - 30, y - 60, x - 16, y - 84); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 10, y - 22); ctx.quadraticCurveTo(x - 18, y - 60, x - 4, y - 84); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 16, y - 84); ctx.quadraticCurveTo(x - 10, y - 90, x - 4, y - 84); ctx.stroke();
  const bg = ctx.createLinearGradient(x - 26, 0, x - 4, 0);
  bg.addColorStop(0, "#d98f82"); bg.addColorStop(1, "#f3b8ab");
  ctx.fillStyle = bg; roundRect(ctx, x - 24, y - 72, 20, 40, 8); ctx.fill();
  // seat cushion
  const g = ctx.createLinearGradient(0, y - 32, 0, y - 12);
  g.addColorStop(0, "#f6c5b8"); g.addColorStop(1, "#d48f82");
  ctx.fillStyle = "#8a5a3c"; ellipse(ctx, x, y - 18, 26, 11); ctx.fill();
  ctx.fillStyle = g; ellipse(ctx, x, y - 22, 25, 10); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ellipse(ctx, x - 6, y - 25, 10, 3.5); ctx.fill();
  // tufting button
  ctx.fillStyle = "#b86d60"; ctx.beginPath(); ctx.arc(x + 2, y - 21, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function wovenRug(ctx, cx, cy, r, squash) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1, squash);
  // soft shadow under the rug
  ctx.fillStyle = "rgba(40,20,10,0.18)"; ctx.beginPath(); ctx.arc(0, 8, r + 4, 0, Math.PI * 2); ctx.fill();
  // fringe
  ctx.strokeStyle = "#e9d3b0"; ctx.lineWidth = 2;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a) * (r + 12), Math.sin(a) * (r + 12)); ctx.stroke();
  }
  // bands: outer terracotta, cream, patterned field, medallion
  const bands = [
    [r, "#b85f50"], [r - 14, "#f2d8b4"], [r - 24, "#c9705f"], [r - 40, "#f2d8b4"], [r - 48, "#d98d7c"],
  ];
  for (const [rr, col] of bands) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill(); }
  // woven texture
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r - 48, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 2;
  for (let y = -r; y < r; y += 7) { ctx.beginPath(); ctx.moveTo(-r, y); ctx.lineTo(r, y); ctx.stroke(); }
  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  for (let x = -r; x < r; x += 7) { ctx.beginPath(); ctx.moveTo(x, -r); ctx.lineTo(x, r); ctx.stroke(); }
  // diamond motifs around the field
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, d = r - 95;
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    ctx.fillStyle = i % 2 ? "#f2d8b4" : "#8c4a3f";
    ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 16); ctx.lineTo(x - 12, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = i % 2 ? "#c9705f" : "#f2d8b4";
    ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.fill();
  }
  // small dots ring
  ctx.fillStyle = "#f2d8b4";
  for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, d = r - 62; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 3, 0, Math.PI * 2); ctx.fill(); }
  // center medallion
  ctx.fillStyle = "#f2d8b4"; ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c9705f"; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8c4a3f";
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - 0.25) * 52, Math.sin(a - 0.25) * 52); ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60); ctx.lineTo(Math.cos(a + 0.25) * 52, Math.sin(a + 0.25) * 52); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = "#f2d8b4"; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#d98d7c"; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
  // paw print in the middle
  ctx.fillStyle = "#8c4a3f";
  ctx.beginPath(); ctx.arc(0, 4, 7, 0, Math.PI * 2); ctx.fill();
  for (const [dx, dy] of [[-8, -5], [-3, -10], [3, -10], [8, -5]]) { ctx.beginPath(); ctx.arc(dx, dy, 3.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.restore();
}

function floorLamp(ctx, x, y) {
  // base + pole
  ctx.fillStyle = "#3b2a22"; ellipse(ctx, x, y, 20, 7); ctx.fill();
  ctx.fillStyle = "#5e4636"; ellipse(ctx, x, y - 2, 18, 6); ctx.fill();
  ctx.strokeStyle = "#5e4636"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y - 128); ctx.stroke();
  // shade
  const g = ctx.createLinearGradient(x - 34, 0, x + 34, 0);
  g.addColorStop(0, "#d9a26b"); g.addColorStop(0.5, "#ffd9a3"); g.addColorStop(1, "#c98f58");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - 20, y - 168); ctx.lineTo(x + 20, y - 168); ctx.lineTo(x + 34, y - 124); ctx.lineTo(x - 34, y - 124); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fff1c9"; ellipse(ctx, x, y - 124, 34, 6); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ellipse(ctx, x, y - 168, 20, 4); ctx.fill();
}

function readingNook(ctx, x, y) {
  // low bookshelf against the wall with a cushion on top
  ctx.fillStyle = "#6f4a30"; roundRect(ctx, x, y - 72, 132, 72, 5); ctx.fill();
  ctx.fillStyle = "#8a5a3c"; roundRect(ctx, x - 4, y - 78, 140, 10, 4); ctx.fill();
  ctx.fillStyle = "#4e3322"; ctx.fillRect(x + 6, y - 64, 120, 26); ctx.fillRect(x + 6, y - 32, 120, 26);
  const cols = ["#e37a6b", "#6fa8dc", "#f2c14e", "#8fbf7f", "#b48ad9", "#f4a6b8", "#6cc5c0", "#d8cbb0", "#c95a4a"];
  let bx = x + 10;
  for (let i = 0; i < 9 && bx < x + 118; i++) { const w = 9 + (i % 3) * 3, h = 18 + (i % 2) * 5; ctx.fillStyle = cols[i]; roundRect(ctx, bx, y - 40 - h, w, h, 2); ctx.fill(); bx += w + 2; }
  bx = x + 10;
  for (let i = 0; i < 8 && bx < x + 118; i++) { const w = 10 + ((i + 1) % 3) * 3, h = 17 + ((i + 1) % 2) * 6; ctx.fillStyle = cols[(i + 4) % cols.length]; roundRect(ctx, bx, y - 8 - h, w, h, 2); ctx.fill(); bx += w + 2; }
  // cushion + mug on top
  ctx.fillStyle = "#d48f82"; ellipse(ctx, x + 40, y - 84, 26, 8); ctx.fill();
  ctx.fillStyle = "#f6c5b8"; ellipse(ctx, x + 40, y - 86, 24, 7); ctx.fill();
  mug(ctx, x + 108, y - 80, "#f2c14e", 0.7);
  potPlant(ctx, x + 85, y - 80, 0.4, "#6fb07a");
}

function catToys(ctx) {
  // yarn ball
  ctx.save(); ctx.translate(690, 690);
  ctx.fillStyle = "#e86f8e"; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#f7a3b8"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 11, 4 + i * 2, i * 0.7, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(10, 4); ctx.quadraticCurveTo(30, 0, 44, 10); ctx.stroke();
  ctx.restore();
  // toy mouse
  ctx.save(); ctx.translate(930, 700);
  ctx.fillStyle = "#9a9aa6"; ellipse(ctx, 0, 0, 12, 7); ctx.fill();
  ctx.fillStyle = "#f3b7b7"; ctx.beginPath(); ctx.arc(-9, -5, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#7a7a86"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(12, 0); ctx.quadraticCurveTo(26, -6, 30, 4); ctx.stroke();
  ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(-7, -1, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // feather wand leaning on the counter
  ctx.save(); ctx.translate(376, 466);
  ctx.strokeStyle = "#c9955f"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -70); ctx.stroke();
  ctx.fillStyle = "#6cc5c0"; ellipse(ctx, 12, -80, 4, 12, 0.3); ctx.fill();
  ctx.fillStyle = "#f4a6b8"; ellipse(ctx, 16, -78, 3.5, 10, -0.2); ctx.fill();
  ctx.restore();
}

export function potPlant(ctx, x, y, s, leaf) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "#c9704f"; roundRect(ctx, -18, -30, 36, 32, 6); ctx.fill();
  ctx.fillStyle = "#e08a66"; roundRect(ctx, -22, -36, 44, 10, 4); ctx.fill();
  ctx.fillStyle = leaf;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.42;
    ctx.save(); ctx.translate(0, -36); ctx.rotate(a);
    ellipse(ctx, 0, -22, 9, 24); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = shade(leaf, 0.25);
  ellipse(ctx, 0, -50, 5, 14); ctx.fill();
  ctx.restore();
}

function jar(ctx, x, y, color) {
  ctx.fillStyle = "rgba(220,235,245,0.9)"; roundRect(ctx, x - 14, y - 36, 28, 36, 5); ctx.fill();
  ctx.fillStyle = color; roundRect(ctx, x - 11, y - 26, 22, 24, 3); ctx.fill();
  ctx.fillStyle = "#8a5a3c"; roundRect(ctx, x - 12, y - 42, 24, 8, 3); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)"; roundRect(ctx, x - 10, y - 32, 4, 24, 2); ctx.fill();
}

function mug(ctx, x, y, color, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = color; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(14, -12, 7, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.fillStyle = color; roundRect(ctx, -12, -24, 26, 24, 5); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)"; roundRect(ctx, -9, -21, 5, 16, 2); ctx.fill();
  ctx.restore();
}

function books(ctx, x, y) {
  const cols = ["#e37a6b", "#6fa8dc", "#f2c14e", "#8fbf7f", "#b48ad9"];
  for (let i = 0; i < 5; i++) {
    const h = 30 + (i % 3) * 6;
    ctx.fillStyle = cols[i]; roundRect(ctx, x + i * 15, y - h, 13, h, 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(x + i * 15 + 2, y - h + 6, 9, 2);
  }
}

export function frame(ctx, x, y, w, h, catColor) {
  ctx.fillStyle = "#5e3a24"; roundRect(ctx, x - 6, y - 6, w + 12, h + 12, 4); ctx.fill();
  ctx.fillStyle = "#f8f0e2"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = catColor;
  ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.6, w * 0.26, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h * 0.45); ctx.lineTo(x + w * 0.36, y + h * 0.22); ctx.lineTo(x + w * 0.48, y + h * 0.4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w * 0.7, y + h * 0.45); ctx.lineTo(x + w * 0.64, y + h * 0.22); ctx.lineTo(x + w * 0.52, y + h * 0.4); ctx.fill();
}

function chalkboard(ctx, x, y, w, h) {
  ctx.fillStyle = "#6f4a30"; roundRect(ctx, x - 8, y - 8, w + 16, h + 16, 6); ctx.fill();
  ctx.fillStyle = "#2f3d35"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#f5f0e6"; ctx.font = "900 15px Nunito, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText("~ menu ~", x + 12, y + 24);
  ctx.font = "700 12px Nunito, sans-serif";
  ["Latte ........ 6", "Matcha ..... 7", "Cocoa ....... 6", "Honey cake . 5", "Milk tea .... 8"].forEach((s, i) => ctx.fillText(s, x + 12, y + 44 + i * 13));
}

function espressoMachine(ctx, x, y) {
  const g = ctx.createLinearGradient(x, 0, x + 110, 0);
  g.addColorStop(0, "#c9ced6"); g.addColorStop(0.5, "#eef1f5"); g.addColorStop(1, "#a9b0ba");
  ctx.fillStyle = g; roundRect(ctx, x, y - 64, 110, 64, 8); ctx.fill();
  ctx.fillStyle = "#d94f3d"; roundRect(ctx, x + 8, y - 56, 94, 18, 5); ctx.fill();
  ctx.fillStyle = "#3a3f47"; roundRect(ctx, x + 20, y - 34, 70, 10, 3); ctx.fill();
  for (const dx of [30, 70]) { ctx.fillStyle = "#3a3f47"; roundRect(ctx, x + dx, y - 24, 10, 14, 2); ctx.fill(); }
  ctx.fillStyle = "#2e3238"; roundRect(ctx, x - 4, y - 8, 118, 8, 3); ctx.fill();
  ctx.fillStyle = "#fff"; roundRect(ctx, x + 24, y - 16, 22, 14, 3); ctx.fill();
  ctx.fillStyle = "#fff"; roundRect(ctx, x + 64, y - 16, 22, 14, 3); ctx.fill();
  ctx.fillStyle = "#7bd389"; ctx.beginPath(); ctx.arc(x + 100, y - 46, 3, 0, Math.PI * 2); ctx.fill();
}

export function catTree(ctx, x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "#8a5a3c"; ellipse(ctx, 0, 0, 44, 14); ctx.fill();
  ctx.fillStyle = "#c9b79c"; roundRect(ctx, -12, -92, 24, 92, 4); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(-12, -88 + i * 7); ctx.lineTo(12, -86 + i * 7); ctx.stroke(); }
  ctx.fillStyle = "#e9a09a"; ellipse(ctx, 0, -90, 40, 13); ctx.fill();
  ctx.fillStyle = "#f6c8c3"; ellipse(ctx, 0, -92, 30, 9); ctx.fill();
  // dangling toy
  ctx.strokeStyle = "#7a4a46"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(34, -88); ctx.lineTo(36, -56); ctx.stroke();
  ctx.fillStyle = "#f2c14e"; ctx.beginPath(); ctx.arc(36, -52, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------- Dynamic lighting ----------
// hour: 8 → 20 (daylight) ; returns 0..1 daylight strength
export function daylight(hour) {
  const t = clamp((hour - 6) / 14, 0, 1); // 6 → 20
  return Math.sin(t * Math.PI);
}

export function drawSky(ctx, hour) {
  const { WINDOW } = LAYOUT;
  const d = daylight(hour);
  const evening = clamp((hour - 16) / 4, 0, 1);
  const top = mix3("#8fc6f0", "#f6a86b", "#20305a", d, evening);
  const bot = mix3("#dff1ff", "#ffd1a6", "#4a5c8a", d, evening);
  const g = ctx.createLinearGradient(0, WINDOW.y, 0, WINDOW.y + WINDOW.h);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h);
  // sun / moon
  const prog = clamp((hour - 7) / 13, 0, 1);
  const sx = WINDOW.x + 30 + prog * (WINDOW.w - 60);
  const sy = WINDOW.y + 50 + Math.pow(prog - 0.5, 2) * 4 * 110;
  ctx.save();
  ctx.beginPath(); ctx.rect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h); ctx.clip();
  if (hour < 19.5) {
    const sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, 60);
    sg.addColorStop(0, "rgba(255,250,220,1)"); sg.addColorStop(0.3, "rgba(255,230,150,0.9)"); sg.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 60, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = "#fff6d6"; ctx.beginPath(); ctx.arc(WINDOW.x + 200, WINDOW.y + 60, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; for (const [a, b] of [[40, 30], [90, 70], [150, 25], [230, 110], [260, 40]]) { ctx.beginPath(); ctx.arc(WINDOW.x + a, WINDOW.y + b, 1.6, 0, Math.PI * 2); ctx.fill(); }
  }
  // distant hills + rooftops
  ctx.fillStyle = evening > 0.5 ? "#2b3550" : "#7fb088";
  ctx.beginPath(); ctx.moveTo(WINDOW.x, WINDOW.y + WINDOW.h);
  ctx.quadraticCurveTo(WINDOW.x + 80, WINDOW.y + 130, WINDOW.x + 160, WINDOW.y + 170);
  ctx.quadraticCurveTo(WINDOW.x + 230, WINDOW.y + 150, WINDOW.x + WINDOW.w, WINDOW.y + 185);
  ctx.lineTo(WINDOW.x + WINDOW.w, WINDOW.y + WINDOW.h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = evening > 0.5 ? "#1f2740" : "#5c8a63";
  ctx.beginPath(); ctx.moveTo(WINDOW.x, WINDOW.y + WINDOW.h);
  ctx.quadraticCurveTo(WINDOW.x + 120, WINDOW.y + 175, WINDOW.x + 200, WINDOW.y + 205);
  ctx.quadraticCurveTo(WINDOW.x + 260, WINDOW.y + 195, WINDOW.x + WINDOW.w, WINDOW.y + 215);
  ctx.lineTo(WINDOW.x + WINDOW.w, WINDOW.y + WINDOW.h); ctx.closePath(); ctx.fill();
  ctx.restore();
  // glass sheen
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath(); ctx.moveTo(WINDOW.x + 10, WINDOW.y + WINDOW.h - 10); ctx.lineTo(WINDOW.x + 120, WINDOW.y + 10); ctx.lineTo(WINDOW.x + 160, WINDOW.y + 10); ctx.lineTo(WINDOW.x + 50, WINDOW.y + WINDOW.h - 10); ctx.closePath(); ctx.fill();
}

export function drawSunbeam(ctx, hour) {
  const { WINDOW, SUNSPOT } = LAYOUT;
  const d = daylight(hour);
  if (d <= 0.02) return;
  const prog = clamp((hour - 7) / 13, 0, 1);
  const shift = (0.5 - prog) * 220;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(WINDOW.x, WINDOW.y + WINDOW.h, SUNSPOT.x, SUNSPOT.y);
  g.addColorStop(0, `rgba(255,236,180,${0.1 * d})`);
  g.addColorStop(1, `rgba(255,236,180,${0.22 * d})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(WINDOW.x + 20, WINDOW.y + WINDOW.h + 24);
  ctx.lineTo(WINDOW.x + WINDOW.w - 20, WINDOW.y + WINDOW.h + 24);
  ctx.lineTo(SUNSPOT.x + 190 + shift, SUNSPOT.y + 90);
  ctx.lineTo(SUNSPOT.x - 190 + shift, SUNSPOT.y + 90);
  ctx.closePath(); ctx.fill();
  // pooled light on floor
  const pg = ctx.createRadialGradient(SUNSPOT.x + shift * 0.5, SUNSPOT.y + 20, 10, SUNSPOT.x + shift * 0.5, SUNSPOT.y + 20, 200);
  pg.addColorStop(0, `rgba(255,240,190,${0.25 * d})`); pg.addColorStop(1, "rgba(255,240,190,0)");
  ctx.fillStyle = pg;
  ctx.save(); ctx.translate(0, SUNSPOT.y + 20); ctx.scale(1, 0.45); ctx.translate(0, -(SUNSPOT.y + 20));
  ctx.beginPath(); ctx.arc(SUNSPOT.x + shift * 0.5, SUNSPOT.y + 20, 200, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawLighting(ctx, hour) {
  const d = daylight(hour);
  const evening = clamp((hour - 16) / 4, 0, 1);
  // overall tint
  const tint = mix3("#ffffff", "#ffd9b8", "#8c93c9", d, evening);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.55 + 0.35 * (1 - d);
  ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // lamps glow in the evening
  const lampOn = clamp((1 - d) * 1.6 - 0.2, 0, 1);
  if (lampOn > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const l of LAYOUT.LAMPS) {
      const g = ctx.createRadialGradient(l.x, l.y + 60, 10, l.x, l.y + 60, 330);
      g.addColorStop(0, `rgba(255,190,110,${0.32 * lampOn})`);
      g.addColorStop(1, "rgba(255,190,110,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y + 60, 330, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,240,200,${0.5 * lampOn})`; ellipse(ctx, l.x, l.y, 40, 6); ctx.fill();
    }
    // string lights twinkle
    for (let i = 0; i < 18; i++) {
      const t = (i + 0.5) / 18;
      const x = t * W, y = 32 + Math.sin(t * Math.PI) * 27;
      const g = ctx.createRadialGradient(x, y, 1, x, y, 16);
      g.addColorStop(0, `rgba(255,230,160,${0.5 * lampOn})`); g.addColorStop(1, "rgba(255,230,160,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function mix3(day, dusk, night, d, evening) {
  // blend: night ← (1-d) with evening pulling toward dusk first
  const a = hex(day), b = hex(dusk), c = hex(night);
  const k = 1 - d;
  const duskW = Math.sin(Math.min(1, evening) * Math.PI) * 0.9;
  const nightW = clamp(k * k * 1.2 - 0.05, 0, 1);
  const r = lerp(lerp(a[0], b[0], duskW), c[0], nightW);
  const g = lerp(lerp(a[1], b[1], duskW), c[1], nightW);
  const bl = lerp(lerp(a[2], b[2], duskW), c[2], nightW);
  return `rgb(${r | 0},${g | 0},${bl | 0})`;
}
function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

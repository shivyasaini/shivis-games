import { ellipse, shadow, shade } from "../util.js";

// Procedural cat renderer. `c` is a live cat entity (or a lightweight portrait stub):
// { x, y, facing, pose, def, phase, blink, happy, scale }
export function drawCat(ctx, c, t) {
  const { def } = c;
  const s = c.scale ?? 1;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(s * (c.facing || 1), s);

  const pose = c.pose || "sit";
  const fur = def.fur;

  // Shadow
  const shW = pose === "walk" ? 34 : pose === "sleep" ? 34 : 26;
  shadow(ctx, 0, 1, shW, shW * 0.3, 0.3);

  if (pose === "walk") drawWalking(ctx, c, fur, def, t);
  else if (pose === "sleep") drawSleeping(ctx, c, fur, def, t);
  else if (pose === "loaf") drawLoaf(ctx, c, fur, def, t);
  else drawSitting(ctx, c, fur, def, t);

  ctx.restore();
}

function bodyGradient(ctx, fur, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.55, r * 0.1, x, y, r * 1.25);
  g.addColorStop(0, fur.light);
  g.addColorStop(0.45, fur.base);
  g.addColorStop(1, shade(fur.base, -0.28));
  return g;
}

function drawTail(ctx, fur, x0, y0, cx, cy, x1, y1, w = 9) {
  ctx.strokeStyle = shade(fur.base, -0.08);
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
  // tip
  ctx.fillStyle = fur.dark;
  ctx.beginPath(); ctx.arc(x1, y1, w / 2, 0, Math.PI * 2); ctx.fill();
}

function pattern(ctx, def, fur, clipPath, bodyBox) {
  // bodyBox: {x, y, rx, ry} used to lay out stripes/patches
  ctx.save();
  clipPath();
  ctx.clip();
  const { x, y, rx, ry } = bodyBox;
  if (def.pattern === "tabby") {
    ctx.strokeStyle = shade(fur.dark, -0.05);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.75;
    for (let i = -2; i <= 2; i++) {
      const sx = x + i * rx * 0.36;
      ctx.beginPath();
      ctx.moveTo(sx + 2, y - ry * 1.05);
      ctx.quadraticCurveTo(sx - 4, y - ry * 0.3, sx + 3, y + ry * 0.25);
      ctx.stroke();
    }
  } else if (def.pattern === "tuxedo") {
    ctx.fillStyle = "#f7f4ee";
    ellipse(ctx, x + rx * 0.45, y + ry * 0.5, rx * 0.55, ry * 0.8);
    ctx.fill();
  } else if (def.pattern === "calico") {
    ctx.fillStyle = "#e8954a";
    ellipse(ctx, x - rx * 0.4, y - ry * 0.4, rx * 0.5, ry * 0.6, 0.4);
    ctx.fill();
    ctx.fillStyle = "#3b3330";
    ellipse(ctx, x + rx * 0.35, y - ry * 0.55, rx * 0.35, ry * 0.45, -0.3);
    ctx.fill();
  }
  ctx.restore();
}

function drawHead(ctx, c, fur, def, hx, hy, r, opts = {}) {
  const t = opts.t || 0;
  // ears
  const earInner = "#f3b7b7";
  for (const side of [-1, 1]) {
    const ex = hx + side * r * 0.62;
    const ey = hy - r * 0.62;
    ctx.fillStyle = shade(fur.base, -0.05);
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.42, ey + r * 0.35);
    ctx.lineTo(ex + side * r * 0.05, ey - r * 0.75);
    ctx.lineTo(ex + r * 0.42, ey + r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = earInner;
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.22, ey + r * 0.28);
    ctx.lineTo(ex + side * r * 0.04, ey - r * 0.42);
    ctx.lineTo(ex + r * 0.22, ey + r * 0.28);
    ctx.closePath();
    ctx.fill();
  }
  // head
  ctx.fillStyle = bodyGradient(ctx, fur, hx, hy, r);
  ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fill();
  // cheeks (fluff)
  ctx.fillStyle = shade(fur.base, 0.08);
  ellipse(ctx, hx - r * 0.55, hy + r * 0.35, r * 0.42, r * 0.3);
  ctx.fill();
  ellipse(ctx, hx + r * 0.55, hy + r * 0.35, r * 0.42, r * 0.3);
  ctx.fill();
  // head pattern
  if (def.pattern === "tabby") {
    ctx.strokeStyle = fur.dark; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.globalAlpha = 0.7;
    for (const dx of [-0.28, 0, 0.28]) {
      ctx.beginPath(); ctx.moveTo(hx + dx * r, hy - r * 0.95); ctx.lineTo(hx + dx * r * 1.3, hy - r * 0.45); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (def.pattern === "tuxedo") {
    ctx.fillStyle = "#f7f4ee";
    ellipse(ctx, hx, hy + r * 0.45, r * 0.55, r * 0.4); ctx.fill();
  } else if (def.pattern === "calico") {
    ctx.fillStyle = "#e8954a";
    ellipse(ctx, hx - r * 0.5, hy - r * 0.35, r * 0.45, r * 0.5, 0.3); ctx.fill();
  }

  // eyes
  const closed = opts.closed;
  const blink = closed ? 0 : (c.blink ?? 1);
  const eyeY = hy - r * 0.05;
  for (const side of [-1, 1]) {
    const ex = hx + side * r * 0.36;
    if (blink < 0.15) {
      ctx.strokeStyle = fur.dark; ctx.lineWidth = 2.2; ctx.lineCap = "round";
      ctx.beginPath();
      if (opts.happy || closed) ctx.arc(ex, eyeY + 1, r * 0.2, Math.PI * 1.1, Math.PI * 1.9);
      else { ctx.moveTo(ex - r * 0.2, eyeY); ctx.lineTo(ex + r * 0.2, eyeY); }
      ctx.stroke();
      continue;
    }
    const ry = r * 0.27 * blink;
    ctx.fillStyle = "#fff";
    ellipse(ctx, ex, eyeY, r * 0.24, ry); ctx.fill();
    ctx.fillStyle = def.eye;
    ellipse(ctx, ex, eyeY, r * 0.19, ry * 0.9); ctx.fill();
    ctx.fillStyle = "#1c1a1f";
    const look = opts.look || 0;
    ellipse(ctx, ex + look, eyeY, r * 0.07, ry * 0.85); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath(); ctx.arc(ex - r * 0.07, eyeY - ry * 0.4, r * 0.06, 0, Math.PI * 2); ctx.fill();
  }
  // nose + mouth
  ctx.fillStyle = fur.nose;
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.1, hy + r * 0.3);
  ctx.lineTo(hx + r * 0.1, hy + r * 0.3);
  ctx.lineTo(hx, hy + r * 0.42);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = shade(fur.base, -0.45); ctx.lineWidth = 1.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hx, hy + r * 0.42);
  ctx.quadraticCurveTo(hx - r * 0.12, hy + r * 0.62, hx - r * 0.24, hy + r * 0.52);
  ctx.moveTo(hx, hy + r * 0.42);
  ctx.quadraticCurveTo(hx + r * 0.12, hy + r * 0.62, hx + r * 0.24, hy + r * 0.52);
  ctx.stroke();
  // whiskers
  ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1;
  for (const side of [-1, 1]) for (const dy of [-2, 2, 6]) {
    ctx.beginPath();
    ctx.moveTo(hx + side * r * 0.45, hy + r * 0.35 + dy * 0.5);
    ctx.lineTo(hx + side * r * 1.25, hy + r * 0.25 + dy);
    ctx.stroke();
  }
  // blush when happy
  if (opts.happy) {
    ctx.fillStyle = "rgba(255,120,140,0.35)";
    ellipse(ctx, hx - r * 0.6, hy + r * 0.3, r * 0.22, r * 0.12); ctx.fill();
    ellipse(ctx, hx + r * 0.6, hy + r * 0.3, r * 0.22, r * 0.12); ctx.fill();
  }
}

function drawSitting(ctx, c, fur, def, t) {
  const breathe = Math.sin(t * 2.2 + (c.seed || 0)) * 1.2;
  // tail curled around front
  drawTail(ctx, fur, -14, -8, -34, 4, 14, 2);
  // body (upright teardrop)
  const bx = 0, by = -24 + breathe * 0.3, rx = 22, ry = 26 + breathe * 0.5;
  const body = () => { ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2); };
  ctx.fillStyle = bodyGradient(ctx, fur, bx, by, ry);
  body(); ctx.fill();
  pattern(ctx, def, fur, body, { x: bx, y: by, rx, ry });
  // front paws
  ctx.fillStyle = shade(fur.base, 0.05);
  ellipse(ctx, 6, -2, 7, 4.5); ctx.fill();
  ellipse(ctx, 17, -2, 7, 4.5); ctx.fill();
  if (def.pattern === "tuxedo") { ctx.fillStyle = "#f7f4ee"; ellipse(ctx, 6, -2, 5, 3); ctx.fill(); ellipse(ctx, 17, -2, 5, 3); ctx.fill(); }
  // head
  drawHead(ctx, c, fur, def, 8, -56 + breathe * 0.4, 19, { t, happy: c.happy, look: 1 });
}

function drawWalking(ctx, c, fur, def, t) {
  const ph = c.phase || 0;
  const bob = Math.abs(Math.sin(ph)) * 1.5;
  // tail up with wag
  const wag = Math.sin(t * 6 + (c.seed || 0)) * 6;
  drawTail(ctx, fur, -26, -26, -46 + wag * 0.3, -46, -40 + wag, -62);
  // back legs
  const legs = [[-18, 0], [-8, Math.PI], [10, Math.PI], [20, 0]];
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const [lx, off] = legs[i];
    const swing = Math.sin(ph + off) * 7;
    ctx.strokeStyle = i < 2 ? shade(fur.base, -0.18) : shade(fur.base, -0.08);
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(lx, -18 - bob); ctx.lineTo(lx + swing, -1); ctx.stroke();
    ctx.fillStyle = def.pattern === "tuxedo" ? "#f7f4ee" : shade(fur.base, 0.05);
    ellipse(ctx, lx + swing + 1, -1, 5, 3.2); ctx.fill();
  }
  // body
  const bx = 0, by = -27 - bob, rx = 31, ry = 17;
  const body = () => { ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2); };
  ctx.fillStyle = bodyGradient(ctx, fur, bx, by, rx);
  body(); ctx.fill();
  pattern(ctx, def, fur, body, { x: bx, y: by, rx, ry });
  // head
  drawHead(ctx, c, fur, def, 28, -42 - bob, 18, { t, happy: c.happy, look: 1.5 });
}

function drawSleeping(ctx, c, fur, def, t) {
  const breathe = Math.sin(t * 1.4 + (c.seed || 0)) * 1.4;
  // curled body
  const bx = 0, by = -15, rx = 31, ry = 15 + breathe * 0.4;
  const body = () => { ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2); };
  ctx.fillStyle = bodyGradient(ctx, fur, bx, by, rx);
  body(); ctx.fill();
  pattern(ctx, def, fur, body, { x: bx, y: by, rx, ry });
  // tail wrapping the front
  drawTail(ctx, fur, -26, -6, 0, 4, 26, -4, 8);
  // head resting on paws
  drawHead(ctx, c, fur, def, 16, -22, 15, { t, closed: true });
}

function drawLoaf(ctx, c, fur, def, t) {
  const breathe = Math.sin(t * 1.8 + (c.seed || 0)) * 1.2;
  drawTail(ctx, fur, -24, -8, -38, -2, -30, 0, 8);
  const bx = 0, by = -17, rx = 29, ry = 17 + breathe * 0.4;
  const body = () => { ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2); };
  ctx.fillStyle = bodyGradient(ctx, fur, bx, by, rx);
  body(); ctx.fill();
  pattern(ctx, def, fur, body, { x: bx, y: by, rx, ry });
  drawHead(ctx, c, fur, def, 20, -34, 17, { t, happy: c.happy, look: 0.5 });
}

// Portrait for UI cards: renders into a small canvas.
export function drawPortrait(canvas, def) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  const stub = { x: size / 2 - 6, y: size * 0.92, facing: 1, pose: "sit", def, blink: 1, scale: size / 92 };
  drawCat(ctx, stub, 0);
}

import { ellipse, roundRect, shadow, shade } from "../util.js";

export const SKINS = ["#f6d3b5", "#e8b48f", "#c98c5f", "#8d5a3a", "#5c3a26", "#f0c9a7"];
export const HAIRS = ["#2d1f17", "#6b3e22", "#b57a3f", "#e3c27a", "#1b1b1f", "#a4432c", "#8e8e9e"];
export const SHIRTS = ["#e37a6b", "#6fa8dc", "#8fbf7f", "#f2c14e", "#b48ad9", "#f4a6b8", "#6cc5c0", "#d8cbb0"];
export const PANTS = ["#3f4a67", "#5b4a3e", "#2f2f38", "#7c6c5a", "#4f6b4a"];
export const HAIR_STYLES = ["short", "long", "bun", "curly", "cap"];

// c: { x, y, facing, pose: 'walk'|'sit', phase, look:{skin,hair,hairStyle,shirt,pants} }
export function drawCustomer(ctx, c, t) {
  const L = c.look;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(c.facing || 1, 1);

  const sitting = c.pose === "sit";
  const ph = c.phase || 0;
  const bob = sitting ? 0 : Math.abs(Math.sin(ph)) * 2;

  shadow(ctx, 0, 1, 24, 7, 0.28);

  const torsoTop = sitting ? -66 : -84;
  const torsoBot = sitting ? -28 : -40;
  const headY = torsoTop - 20 - bob;

  // legs
  ctx.lineCap = "round";
  ctx.strokeStyle = L.pants;
  ctx.lineWidth = 11;
  if (sitting) {
    // thighs forward, shins down
    for (const dx of [-6, 6]) {
      ctx.beginPath(); ctx.moveTo(dx, torsoBot); ctx.lineTo(dx + 16, torsoBot + 4); ctx.lineTo(dx + 16, 0); ctx.stroke();
    }
    ctx.fillStyle = shade(L.pants, -0.35);
    ellipse(ctx, 12, 1, 8, 3.5); ctx.fill(); ellipse(ctx, 24, 1, 8, 3.5); ctx.fill();
  } else {
    for (const [dx, off] of [[-6, 0], [6, Math.PI]]) {
      const swing = Math.sin(ph + off) * 9;
      ctx.beginPath(); ctx.moveTo(dx, torsoBot - bob); ctx.lineTo(dx + swing, 0); ctx.stroke();
      ctx.fillStyle = shade(L.pants, -0.35);
      ellipse(ctx, dx + swing + 2, 1, 8, 3.5); ctx.fill();
    }
  }

  // torso
  const g = ctx.createLinearGradient(-20, torsoTop, 20, torsoBot);
  g.addColorStop(0, shade(L.shirt, 0.18));
  g.addColorStop(1, shade(L.shirt, -0.2));
  ctx.fillStyle = g;
  roundRect(ctx, -19, torsoTop - bob, 38, torsoBot - torsoTop + 4, 14);
  ctx.fill();

  // arms
  ctx.strokeStyle = shade(L.shirt, -0.08);
  ctx.lineWidth = 9;
  const armSwing = sitting ? 0 : Math.sin(ph) * 6;
  ctx.beginPath(); ctx.moveTo(-16, torsoTop + 10 - bob); ctx.lineTo(-20 - armSwing * 0.5, torsoBot - 6 - bob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(16, torsoTop + 10 - bob); ctx.lineTo(sitting ? 26 : 20 + armSwing * 0.5, sitting ? torsoBot - 14 : torsoBot - 6 - bob); ctx.stroke();
  ctx.fillStyle = L.skin;
  ctx.beginPath(); ctx.arc(-20 - armSwing * 0.5, torsoBot - 4 - bob, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sitting ? 27 : 20 + armSwing * 0.5, sitting ? torsoBot - 13 : torsoBot - 4 - bob, 5, 0, Math.PI * 2); ctx.fill();

  // neck + head
  ctx.fillStyle = L.skin;
  roundRect(ctx, -5, torsoTop - 8 - bob, 10, 12, 4); ctx.fill();
  const hg = ctx.createRadialGradient(-6, headY - 8, 4, 0, headY, 22);
  hg.addColorStop(0, shade(L.skin, 0.12));
  hg.addColorStop(1, shade(L.skin, -0.12));
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, headY, 18, 0, Math.PI * 2); ctx.fill();

  // hair
  ctx.fillStyle = L.hair;
  const hs = L.hairStyle;
  if (hs === "short" || hs === "cap" || hs === "bun") {
    ctx.beginPath(); ctx.arc(0, headY - 2, 18.5, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    roundRect(ctx, -18.5, headY - 8, 8, 14, 3); ctx.fill();
  }
  if (hs === "long") {
    ctx.beginPath(); ctx.arc(0, headY - 2, 18.5, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    roundRect(ctx, -19, headY - 6, 9, 36, 4); ctx.fill();
    roundRect(ctx, 10, headY - 6, 9, 30, 4); ctx.fill();
  }
  if (hs === "bun") { ctx.beginPath(); ctx.arc(-4, headY - 21, 8, 0, Math.PI * 2); ctx.fill(); }
  if (hs === "curly") {
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 7.5, headY - 15 + Math.abs(i) * 2.2, 7.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.arc(-17, headY - 2, 6.5, 0, Math.PI * 2); ctx.fill();
  }
  if (hs === "cap") {
    ctx.fillStyle = shade(L.shirt, -0.3);
    ctx.beginPath(); ctx.arc(0, headY - 3, 19, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
    roundRect(ctx, 2, headY - 6, 24, 5, 2); ctx.fill();
  }

  // face
  ctx.fillStyle = "#2b2024";
  ctx.beginPath(); ctx.arc(5, headY + 1, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(13, headY + 1, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#7a4a46"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(9.5, headY + 5, 4, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  ctx.fillStyle = "rgba(255,120,120,0.25)";
  ellipse(ctx, 2, headY + 6, 4, 2); ctx.fill(); ellipse(ctx, 16, headY + 6, 4, 2); ctx.fill();

  ctx.restore();
}

export function drawBubble(ctx, x, y, text, opts = {}) {
  const w = opts.w || 56, h = opts.h || 44;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(255,250,242,0.96)";
  ctx.strokeStyle = "rgba(90,60,40,0.18)";
  ctx.lineWidth = 2;
  roundRect(ctx, -w / 2, -h, w, h, 14);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, 0); ctx.lineTo(0, 9); ctx.lineTo(8, 0); ctx.closePath();
  ctx.fill();
  ctx.font = `${opts.size || 24}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#333";
  ctx.fillText(text, 0, -h / 2 + 1);
  if (opts.sub) {
    ctx.font = "900 11px Nunito, sans-serif";
    ctx.fillStyle = "#6b4a3a";
    ctx.fillText(opts.sub, 0, -h / 2 + 18);
  }
  ctx.restore();
}

import { rand } from "../util.js";

export class Particles {
  constructor() { this.list = []; }

  heart(x, y, n = 5) {
    for (let i = 0; i < n; i++) {
      this.list.push({
        kind: "heart", x: x + rand(-14, 14), y: y + rand(-6, 6),
        vx: rand(-14, 14), vy: rand(-55, -35), life: 0, max: rand(1.1, 1.6),
        size: rand(7, 11), hue: rand(340, 360),
      });
    }
  }

  z(x, y) {
    this.list.push({ kind: "z", x, y, vx: rand(6, 14), vy: rand(-22, -16), life: 0, max: 1.8, size: rand(10, 14) });
  }

  steam(x, y) {
    this.list.push({ kind: "steam", x: x + rand(-5, 5), y, vx: rand(-6, 6), vy: rand(-28, -18), life: 0, max: rand(1.2, 1.8), size: rand(4, 7) });
  }

  coin(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      this.list.push({ kind: "coin", x, y, vx: rand(-60, 60), vy: rand(-170, -110), life: 0, max: 1.0, size: rand(4, 6), g: 380 });
    }
  }

  sparkle(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(30, 80);
      this.list.push({ kind: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.5, 0.8), size: rand(2, 4) });
    }
  }

  dust(x, y) {
    this.list.push({ kind: "dust", x, y, vx: rand(-4, 4), vy: rand(-3, 3), life: 0, max: rand(4, 7), size: rand(1, 2.2), drift: rand(0, Math.PI * 2) });
  }

  update(dt) {
    for (const p of this.list) {
      p.life += dt;
      if (p.g) p.vy += p.g * dt;
      if (p.kind === "dust") { p.drift += dt; p.x += (p.vx + Math.sin(p.drift) * 5) * dt; p.y += (p.vy + Math.cos(p.drift * 0.7) * 4) * dt; }
      else { p.x += p.vx * dt; p.y += p.vy * dt; }
    }
    this.list = this.list.filter((p) => p.life < p.max);
  }

  draw(ctx) {
    for (const p of this.list) {
      const t = p.life / p.max;
      ctx.save();
      if (p.kind === "heart") {
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = `hsl(${p.hue}, 85%, 68%)`;
        drawHeart(ctx, p.x, p.y, p.size * (0.7 + 0.3 * Math.sin(t * Math.PI)));
      } else if (p.kind === "z") {
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = "#8fa5c9";
        ctx.font = `900 ${p.size}px Nunito, sans-serif`;
        ctx.fillText("z", p.x, p.y);
      } else if (p.kind === "steam") {
        ctx.globalAlpha = 0.45 * (1 - t);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + t * 1.6), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "coin") {
        ctx.globalAlpha = 1 - t * t;
        ctx.fillStyle = "#ffd25a";
        ctx.strokeStyle = "#d9a026";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * Math.abs(Math.cos(p.life * 12)), 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      } else if (p.kind === "spark") {
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = "#fff2b3";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "dust") {
        ctx.globalAlpha = 0.35 * Math.sin(t * Math.PI);
        ctx.fillStyle = "#fff8e6";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

export function drawHeart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.2, y - s * 0.1, x - s * 0.6, y - s * 1.0, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.0, x + s * 1.2, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath();
  ctx.fill();
}

import { roundRect, ellipse } from "../util.js";
import { LAYOUT, seatFor, stool, potPlant, frame } from "../render/room.js";

// Each item: id, name, icon (for the shop card), cost, blurb (what it does),
// optional `table` (adds a seat), `nap` (adds a cat nap spot), and `draw(ctx)` for the room.
export const SHOP_ITEMS = [
  {
    id: "table4", name: "Corner table", icon: "🪑", cost: 150,
    blurb: "One more table, so four customers can visit at once.",
    table: { x: 660, y: 658 },
    draw(ctx) { const s = seatFor(this.table); stool(ctx, s.x, s.y); },
  },
  {
    id: "cushion", name: "Velvet cushion", icon: "🛋️", cost: 60,
    blurb: "A plush spot by the door. Cats napping here get happier.",
    nap: { x: 1062, y: 448, cozy: true },
    draw(ctx) {
      ctx.save(); ctx.translate(1062, 452);
      ctx.fillStyle = "#6b4a8a"; ellipse(ctx, 0, 0, 42, 18); ctx.fill();
      ctx.fillStyle = "#9b78c4"; ellipse(ctx, 0, -5, 40, 16); ctx.fill();
      ctx.fillStyle = "#c9b0e6"; ellipse(ctx, 0, -4, 28, 10); ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "perch", name: "Window perch", icon: "🪟", cost: 90,
    blurb: "A shelf under the window. Sunny naps make very happy cats.",
    nap: { x: 745, y: 352, sun: true, cozy: true },
    draw(ctx) {
      ctx.fillStyle = "#8a5a3c"; roundRect(ctx, 690, 352, 110, 10, 3); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(690, 362, 110, 5);
      ctx.fillStyle = "#6f4a30"; ctx.beginPath(); ctx.moveTo(700, 362); ctx.lineTo(712, 362); ctx.lineTo(700, 372); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(800, 362); ctx.lineTo(788, 362); ctx.lineTo(800, 372); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e9a09a"; roundRect(ctx, 700, 344, 90, 10, 5); ctx.fill();
    },
  },
  {
    id: "radio", name: "Vintage radio", icon: "📻", cost: 120,
    blurb: "Soft jazz on the sill. Customers wait 25% more patiently.",
    draw(ctx) {
      const x = 745, y = 304;
      ctx.fillStyle = "#b86b4b"; roundRect(ctx, x - 26, y - 30, 52, 30, 6); ctx.fill();
      ctx.fillStyle = "#f3d9b1"; roundRect(ctx, x - 20, y - 24, 22, 18, 3); ctx.fill();
      ctx.strokeStyle = "#8a5a3c"; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 18 + i * 5.5, y - 22); ctx.lineTo(x - 18 + i * 5.5, y - 8); ctx.stroke(); }
      ctx.fillStyle = "#3b2a22"; ctx.beginPath(); ctx.arc(x + 12, y - 18, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 12, y - 8, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#3b2a22"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 18, y - 30); ctx.lineTo(x + 30, y - 48); ctx.stroke();
    },
  },
  {
    id: "flowers", name: "Fresh bouquets", icon: "💐", cost: 45,
    blurb: "Big bouquets on every table. +1 coin on every tip.",
    tables: true,
    draw() {},
  },
  {
    id: "art", name: "Gallery wall", icon: "🖼️", cost: 80,
    blurb: "More cat portraits. Each happy customer gives +1 extra reputation.",
    draw(ctx) { frame(ctx, 350, 52, 54, 58, "#8d8f99"); frame(ctx, 416, 38, 50, 50, "#f6f1e8"); },
  },
  {
    id: "sign", name: "Neon cat sign", icon: "🪧", cost: 200,
    blurb: "A glowing sign by the menu. Customers arrive 20% more often.",
    draw(ctx) {
      const x = 960, y = 44, w = 120, h = 44;
      ctx.fillStyle = "#2a2230"; roundRect(ctx, x, y, w, h, 10); ctx.fill();
      ctx.save(); ctx.shadowColor = "#ff7ab8"; ctx.shadowBlur = 14;
      ctx.strokeStyle = "#ff9ccb"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(x + 26, y + 24, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 19, y + 16); ctx.lineTo(x + 17, y + 6); ctx.lineTo(x + 25, y + 13); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 33, y + 16); ctx.lineTo(x + 35, y + 6); ctx.lineTo(x + 27, y + 13); ctx.stroke();
      ctx.strokeStyle = "#8ff0ff"; ctx.shadowColor = "#5ad8ff";
      ctx.font = "900 15px Nunito, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#bff6ff"; ctx.fillText("café", x + 46, y + 23);
      ctx.restore();
    },
  },
  {
    id: "plant", name: "Hanging plant", icon: "🪴", cost: 50,
    blurb: "Trailing ivy above the door. Cats everywhere feel a little calmer.",
    draw(ctx) {
      const x = 1160, y = 60;
      ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, y - 18); ctx.stroke();
      ctx.fillStyle = "#c9704f"; roundRect(ctx, x - 16, y - 18, 32, 22, 6); ctx.fill();
      ctx.fillStyle = "#5fa36a";
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * 0.5, len = 26 + (i % 3) * 10;
        ctx.save(); ctx.translate(x, y + 2); ctx.rotate(a);
        for (let k = 0; k < 3; k++) { ellipse(ctx, 0, 8 + k * 12, 5, 7); ctx.fill(); }
        ctx.restore();
      }
    },
  },
];

export const shopItem = (id) => SHOP_ITEMS.find((i) => i.id === id);

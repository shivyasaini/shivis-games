import { W, H, rand, pick, dist, clamp, ellipse, roundRect } from "./util.js";
import { CAT_DEFS, STARTER_CATS } from "./data/cats.js";
import { DRINKS, ratingFor } from "./data/drinks.js";
import { buildStaticLayer, drawSky, drawSunbeam, drawLighting, daylight, LAYOUT, seatFor } from "./render/room.js";
import { drawCat } from "./render/cat.js";
import { drawCustomer, drawBubble } from "./render/human.js";
import { Particles } from "./systems/particles.js";
import { loadSave, writeSave } from "./systems/save.js";
import { Cat } from "./entities/cat.js";
import { Customer } from "./entities/customer.js";
import { SHOP_ITEMS, shopItem } from "./data/shop.js";

const DAY_LENGTH = 240; // real seconds from opening to closing
const OPEN = 8, CLOSE = 20;

export class Game {
  constructor(ui) {
    this.ui = ui;
    this.staticLayer = buildStaticLayer();
    this.particles = new Particles();
    this.t = 0;
    this.coins = 0; this.day = 1; this.hour = OPEN; this.rep = 0; this.served = 0;
    this.ownedIds = [...STARTER_CATS];
    this.cats = []; this.customers = []; this.orders = [];
    this.tables = LAYOUT.TABLES.map((t) => ({ ...t, occupant: null, cup: null }));
    const { BED, SUNSPOT, TREE } = LAYOUT;
    this.napSpots = [
      { x: BED.x, y: BED.y - 6, taken: null },
      { x: SUNSPOT.x, y: SUNSPOT.y, taken: null, sun: true },
      { x: TREE.x, y: TREE.perchY, taken: null },
      { x: 660, y: 445, taken: null },
    ];
    this.spawnT = 2.5;
    this.closing = false;
    this.mode = "cats"; // "cats": cats deliver drinks · "you": click the customer to serve
    this.ownedItems = [];
    this.decorLayer = null;
    const { COUNTER } = LAYOUT;
    this.pickup = { x: COUNTER.x + COUNTER.w + 42, y: COUNTER.y + COUNTER.h + 26 };
    this.counterCup = { x: COUNTER.x + COUNTER.w - 24, y: COUNTER.y - 6 };
    this.saveT = 0;
    this.dustT = 0;
    this.load();
  }

  // ---------- persistence ----------
  load() {
    const s = loadSave();
    const stats = {};
    if (s) {
      this.coins = s.coins ?? 0; this.day = s.day ?? 1; this.rep = s.rep ?? 0; this.served = s.served ?? 0;
      if (Array.isArray(s.ownedIds) && s.ownedIds.length) this.ownedIds = s.ownedIds;
      if (s.mode === "you" || s.mode === "cats") this.mode = s.mode;
      if (Array.isArray(s.ownedItems)) this.ownedItems = s.ownedItems.filter((id) => shopItem(id));
      for (const c of s.cats || []) stats[c.id] = c.happiness;
    }
    for (const id of this.ownedItems) this.applyItem(shopItem(id));
    this.rebuildDecor();
    for (const id of this.ownedIds) {
      const def = CAT_DEFS.find((d) => d.id === id);
      if (!def) continue;
      const p = this.randomWalkPoint();
      const cat = new Cat(def, p.x, p.y);
      if (stats[id] != null) cat.happiness = stats[id];
      this.cats.push(cat);
    }
  }

  save() {
    writeSave({
      coins: this.coins, day: this.day, rep: this.rep, served: this.served,
      ownedIds: this.ownedIds, cats: this.cats.map((c) => c.serialize()), mode: this.mode,
      ownedItems: this.ownedItems,
    });
  }

  // ---------- shop ----------
  has(itemId) { return this.ownedItems.includes(itemId); }

  buy(itemId) {
    const item = shopItem(itemId);
    if (!item || this.has(itemId)) return false;
    if (this.coins < item.cost) { this.ui.toast("Not enough coins yet 🪙"); return false; }
    this.coins -= item.cost;
    this.ownedItems.push(itemId);
    this.applyItem(item);
    this.rebuildDecor();
    const spot = item.table || item.nap || { x: 640, y: 300 };
    this.particles.sparkle(spot.x, spot.y - 20, 16);
    this.ui.toast(`${item.icon} ${item.name} added to the café!`);
    this.save();
    return true;
  }

  applyItem(item) {
    if (item.table) this.tables.push({ ...item.table, occupant: null, cup: null });
    if (item.nap) this.napSpots.push({ ...item.nap, taken: null });
  }

  rebuildDecor() {
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    for (const id of this.ownedItems) shopItem(id).draw(ctx);
    this.decorLayer = cv;
  }

  get daylight() { return daylight(this.hour); }

  // ---------- world helpers ----------
  randomWalkPoint() {
    const { WALK, COUNTER } = LAYOUT;
    for (let i = 0; i < 30; i++) {
      const x = rand(WALK.x0, WALK.x1), y = rand(WALK.y0, WALK.y1);
      if (x < COUNTER.x + COUNTER.w + 40 && y < COUNTER.y + COUNTER.h + 30) continue;
      if (this.tables.some((t) => dist(x, y, t.x, t.y - 20) < 70)) continue;
      if (dist(x, y, LAYOUT.TREE.x, LAYOUT.TREE.y) < 60) continue;
      return { x, y };
    }
    return { x: 700, y: 600 };
  }

  freeTable() {
    const free = this.tables.filter((t) => !t.occupant);
    return free.length ? pick(free) : null;
  }

  // ---------- customer flow ----------
  spawnCustomer() {
    const table = this.freeTable();
    if (!table) return;
    const drink = pick(DRINKS);
    const c = new Customer(table, drink);
    table.occupant = c; table.cup = null;
    this.customers.push(c);
  }

  placeOrder(customer) {
    this.orders.push({ id: customer.id, customer, drink: customer.drink, status: "new", progress: 0 });
    this.ui.renderOrders();
    this.sfx?.voice(customer.voiceSeed);
  }

  // Clicking a ticket opens the kitchen; the player performs the recipe steps by hand.
  brew(orderId) {
    const o = this.orders.find((x) => x.id === orderId);
    if (!o || o.status !== "new") return;
    if (this.orders.some((x) => x.status === "brewing")) { this.ui.toast("Finish the one you're making first ☕"); return; }
    o.status = "brewing";
    this.ui.renderOrders();
    this.kitchen.open(o);
  }

  cancelBrew(o) {
    if (o.status === "brewing") o.status = "new";
    this.ui.renderOrders();
  }

  finishBrew(o, quality) {
    if (!this.orders.includes(o)) return;
    o.status = "ready"; o.progress = 1; o.quality = quality;
    const machine = { x: LAYOUT.COUNTER.x + 115, y: LAYOUT.COUNTER.y - 20 };
    this.particles.sparkle(machine.x, machine.y - 10, quality >= 0.9 ? 16 : 8);
    for (let i = 0; i < 6; i++) this.particles.steam(this.counterCup.x, this.counterCup.y - 10);
    const r = ratingFor(quality);
    this.ui.toast(`${r.stars} ${r.label} ${o.drink.name}`);
    this.ui.renderOrders();
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === "you") {
      // cats finish what they are carrying; drinks still on the counter go back to manual
      for (const o of this.orders) if (o.cat && !o.carried) { o.cat.dropJob(); }
    }
    this.ui.renderOrders();
    this.ui.updateMode();
    this.save();
  }

  // Manual serve (mode "you"): click the customer while their drink is ready.
  serve(customer) {
    const i = this.orders.findIndex((o) => o.customer === customer && o.status === "ready");
    if (i < 0) return false;
    const o = this.orders[i];
    if (o.cat) { this.ui.toast(`${o.cat.def.name} is bringing it 🐾`); return true; }
    this.completeOrder(o, customer);
    this.ui.toast(`+${o.drink.price} 🪙  ${o.drink.name} served`);
    return true;
  }

  // Cat delivery (mode "cats"): a waiter cat reached the customer.
  deliver(order, cat) {
    if (!this.orders.includes(order)) return;
    this.completeOrder(order, order.customer);
    this.particles.heart(cat.x, cat.y - 60, 3);
    this.ui.toast(`${cat.def.name} served a ${order.drink.name} 🐾 +${order.drink.price} 🪙`);
  }

  completeOrder(o, customer) {
    this.orders.splice(this.orders.indexOf(o), 1);
    const q = o.quality ?? 0.8;
    const bonus = q >= 0.9 ? 2 : 0;
    this.coins += o.drink.price + bonus;
    if (bonus) this.particles.sparkle(customer.x + 10, customer.y - 90, 12);
    customer.quality = q;
    this.particles.coin(customer.x + 10, customer.y - 60, 5);
    this.particles.sparkle(customer.table.x, customer.table.y - 44, 10);
    customer.table.cup = o.drink.emoji;
    customer.serve();
    this.ui.renderOrders();
  }

  // Pick the best available cat for a ready drink: free cats first, then visiting cats,
  // then nappers (they wake up for it), nearest to the counter wins ties.
  chooseWaiter() {
    const rank = (c) => c.busy ? 99 : (c.state === "nap" ? 2 : c.state.startsWith("visit") || c.state === "walk-visit" ? 1 : 0);
    const cands = this.cats.filter((c) => !c.busy)
      .sort((a, b) => rank(a) - rank(b) || dist(a.x, a.y, this.pickup.x, this.pickup.y) - dist(b.x, b.y, this.pickup.x, this.pickup.y));
    return cands[0] || null;
  }

  customerGaveUp(c) {
    this.rep = Math.max(0, this.rep - 1);
    for (const o of this.orders) if (o.customer === c && o.cat) o.cat.dropJob();
    this.orders = this.orders.filter((o) => o.customer !== c);
    this.ui.renderOrders();
    this.ui.toast("A customer left hungry… 😿");
  }

  customerFinished(c) {
    const tip = Math.round(c.drink.price * (0.15 + c.catBonus * 0.6) + (c.mood === "happy" ? 1 : 0)) + (this.has("flowers") ? 1 : 0);
    this.coins += tip;
    this.sfx?.tip();
    this.rep += (c.mood === "happy" ? 2 : 1) + (c.mood === "happy" && this.has("art") ? 1 : 0);
    this.served++;
    this.particles.coin(c.table.x, c.table.y - 40, 4);
    if (c.catBonus > 0) this.particles.heart(c.table.x, c.table.y - 70, 3);
    this.ui.toast(`+${tip} 🪙 tip${c.catBonus > 0.4 ? " (cat approved 🐾)" : ""}`);
    c.table.cup = null;
  }

  adopt(defId) {
    const def = CAT_DEFS.find((d) => d.id === defId);
    if (!def || this.ownedIds.includes(defId)) return false;
    if (this.coins < def.adoptCost) { this.ui.toast("Not enough coins yet"); return false; }
    this.coins -= def.adoptCost;
    this.ownedIds.push(defId);
    const cat = new Cat(def, LAYOUT.SPAWN.x, LAYOUT.SPAWN.y + 10);
    cat.target = this.randomWalkPoint(); cat.state = "wander"; cat.pose = "walk";
    this.cats.push(cat);
    this.particles.heart(cat.x, cat.y - 50, 8);
    this.ui.toast(`${def.name} joined the café! 🎉`);
    this.save();
    return true;
  }

  // ---------- day cycle ----------
  endDay() {
    this.day++; this.hour = OPEN; this.closing = false; this.spawnT = 3;
    this.ui.toast(`🌙 Day ${this.day - 1} done · ${this.coins} coins`);
    this.save();
  }

  // ---------- input ----------
  click(x, y) {
    for (const c of this.customers) {
      if (c.hit(x, y) && this.serve(c)) return;
    }
    const cats = [...this.cats].sort((a, b) => b.sortY - a.sortY);
    for (const cat of cats) {
      if (cat.hit(x, y)) { cat.pet(this); return; }
    }
    for (const c of this.customers) {
      if (c.hit(x, y) && c.state === "waiting") { this.ui.toast(`Brew their ${c.drink.name} first`); return; }
    }
  }

  hover(x, y) {
    if (this.mode === "you" && this.customers.some((c) => c.hit(x, y) && this.orders.some((o) => o.customer === c && o.status === "ready" && !o.cat))) return "pointer";
    if (this.cats.some((c) => c.hit(x, y))) return "pointer";
    return "default";
  }

  // ---------- update ----------
  update(dt) {
    this.t += dt;
    this.hour += dt * (CLOSE - OPEN) / DAY_LENGTH;
    if (this.hour >= CLOSE && !this.closing) { this.closing = true; this.ui.toast("Closing time 🌙"); }
    if (this.closing && this.customers.length === 0 && this.hour >= CLOSE + 0.3) this.endDay();

    if (!this.closing) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const busy = clamp(1 - this.rep * 0.012, 0.45, 1) * (this.has("sign") ? 0.8 : 1);
        this.spawnT = rand(9, 16) * busy;
        this.spawnCustomer();
      }
    }

    for (const c of this.customers) c.update(dt, this);
    for (const c of this.customers) if (c.done) { c.table.occupant = null; c.table.cup = null; }
    this.customers = this.customers.filter((c) => !c.done);

    for (const cat of this.cats) {
      cat.update(dt, this, this.t);
      if (this.has("plant")) cat.happiness = clamp(cat.happiness + dt * 0.15, 0, 100);
    }

    const machine = { x: LAYOUT.COUNTER.x + 115, y: LAYOUT.COUNTER.y - 20 };
    for (const o of this.orders) {
      if (o.status === "brewing" && Math.random() < 0.4) this.particles.steam(machine.x, machine.y);
      if (o.status === "ready" && !o.cat && this.mode === "cats") {
        const cat = this.chooseWaiter();
        if (cat) { cat.assignDelivery(o, this); this.ui.renderOrders(); }
      }
    }

    this.dustT -= dt;
    if (this.dustT <= 0 && this.daylight > 0.2) {
      this.dustT = 0.25;
      const { SUNSPOT, WINDOW } = LAYOUT;
      const k = Math.random();
      this.particles.dust(WINDOW.x + 40 + k * (WINDOW.w - 80) + (SUNSPOT.x - WINDOW.x - WINDOW.w / 2) * k * 0.4, WINDOW.y + WINDOW.h + k * (SUNSPOT.y - WINDOW.y - WINDOW.h));
    }
    this.particles.update(dt);

    this.saveT += dt;
    if (this.saveT > 10) { this.saveT = 0; this.save(); }

    this.ui.update();
  }

  // ---------- draw ----------
  draw(ctx) {
    drawSky(ctx, this.hour);
    ctx.drawImage(this.staticLayer, 0, 0);
    if (this.decorLayer) ctx.drawImage(this.decorLayer, 0, 0);
    drawSunbeam(ctx, this.hour);

    // drinks waiting on the counter for pickup
    const waiting = this.orders.filter((o) => o.status === "ready" && !o.carried);
    waiting.forEach((o, i) => this.drawCounterDrink(ctx, o, i));

    const items = [];
    for (const t of this.tables) items.push({ sortY: t.y, draw: () => this.drawTable(ctx, t) });
    for (const c of this.cats) items.push({ sortY: c.sortY, draw: () => { drawCat(ctx, c, this.t); if (c.carrying) this.drawCarried(ctx, c); } });
    for (const c of this.customers) items.push({ sortY: c.pose === "sit" ? c.y - 12 : c.y, draw: () => drawCustomer(ctx, c, this.t) });
    items.sort((a, b) => a.sortY - b.sortY);
    for (const it of items) it.draw();

    this.particles.draw(ctx);
    drawLighting(ctx, this.hour);

    // speech bubbles above lighting so they stay crisp
    for (const c of this.customers) {
      if (c.state === "waiting") {
        const bob = Math.sin(this.t * 3 + c.id) * 2;
        drawBubble(ctx, c.x + 8, c.y - 122 + bob, c.drink.emoji, { w: 58, h: 50 });
        // patience ring
        ctx.save();
        ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.strokeStyle = c.patience > 0.4 ? "#7bd389" : c.patience > 0.2 ? "#ffd27a" : "#ff7a7a";
        ctx.beginPath(); ctx.arc(c.x + 8, c.y - 122 + bob - 25, 31, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.patience); ctx.stroke();
        ctx.restore();
      } else if (c.state === "served" && c.mood === "happy" && Math.sin(this.t * 2 + c.id) > 0.6) {
        drawBubble(ctx, c.x + 8, c.y - 122, "💗", { w: 44, h: 40, size: 18 });
      }
    }
    for (const cat of this.cats) {
      if (cat.state === "visit" && Math.sin(this.t * 2 + cat.seed) > 0.3) {
        drawBubble(ctx, cat.x, cat.y - 84, "🐾", { w: 40, h: 36, size: 16 });
      }
    }
  }

  drawCounterDrink(ctx, o, i) {
    const x = this.counterCup.x - i * 26, y = this.counterCup.y;
    const bob = Math.sin(this.t * 4 + i) * 1.5;
    ctx.save();
    ctx.font = "24px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji'"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(o.drink.emoji, x, y - 12 + bob);
    if (!o.cat) {
      ctx.font = "900 11px Nunito, sans-serif"; ctx.fillStyle = "#6b4a3a";
      ctx.fillText(this.mode === "cats" ? "waiting for a cat…" : "ready!", x, y - 36);
    }
    ctx.restore();
  }

  drawCarried(ctx, c) {
    const f = c.facing || 1;
    const hop = Math.abs(Math.sin(c.hop)) * 2;
    const hx = c.x + f * 26, hy = c.y - 66 - hop;
    ctx.save();
    // tray balanced on the head
    ctx.fillStyle = "#5e3a24"; ellipse(ctx, hx, hy + 2, 15, 5); ctx.fill();
    ctx.fillStyle = "#c9955f"; ellipse(ctx, hx, hy, 15, 5); ctx.fill();
    ctx.font = "22px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji'"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(c.carrying, hx, hy - 13);
    ctx.restore();
  }

  drawTable(ctx, t) {
    const R = LAYOUT.TABLE_R;
    ctx.save();
    // base + pedestal
    ctx.fillStyle = "#5e3a24"; ellipse(ctx, t.x, t.y, 22, 8); ctx.fill();
    ctx.fillStyle = "#7a4f33"; roundRect(ctx, t.x - 6, t.y - 42, 12, 42, 3); ctx.fill();
    // top
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ellipse(ctx, t.x, t.y - 36, R, R * 0.42); ctx.fill();
    const g = ctx.createRadialGradient(t.x - 14, t.y - 50, 4, t.x, t.y - 42, R);
    g.addColorStop(0, "#e8c89c"); g.addColorStop(1, "#b98556");
    ctx.fillStyle = "#7a4f33"; ellipse(ctx, t.x, t.y - 38, R, R * 0.42); ctx.fill();   // table edge
    ctx.fillStyle = g; ellipse(ctx, t.x, t.y - 42, R, R * 0.42); ctx.fill();
    ctx.save(); ellipse(ctx, t.x, t.y - 42, R, R * 0.42); ctx.clip();
    ctx.strokeStyle = "rgba(120,70,30,0.18)"; ctx.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(t.x, t.y - 42, R * 0.9 - Math.abs(i) * 6, (R * 0.9 - Math.abs(i) * 6) * 0.42 + i * 1.5, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = "rgba(90,60,30,0.4)"; ctx.lineWidth = 2; ellipse(ctx, t.x, t.y - 42, R, R * 0.42); ctx.stroke();
    // doily + candle jar
    ctx.fillStyle = "rgba(255,250,240,0.75)"; ellipse(ctx, t.x - 4, t.y - 44, 22, 9); ctx.fill();
    ctx.fillStyle = "rgba(255,220,150,0.9)"; roundRect(ctx, t.x - 6, t.y - 60, 10, 12, 3); ctx.fill();
    ctx.fillStyle = "#ffb347"; ellipse(ctx, t.x - 1, t.y - 62, 2.2, 4); ctx.fill();
    // little vase (or a full bouquet once bought)
    ctx.fillStyle = "#9bd6c6"; roundRect(ctx, t.x + 14, t.y - 58, 9, 14, 3); ctx.fill();
    if (this.has("flowers")) {
      const cols = ["#ff8fa3", "#ffd27a", "#b48ad9", "#ff9d6b", "#8fd18a"];
      for (let i = 0; i < 5; i++) {
        const a = (i - 2) * 0.55, fx = t.x + 18.5 + Math.sin(a) * 9, fy = t.y - 64 - Math.cos(a) * 6;
        ctx.strokeStyle = "#5fa36a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(t.x + 18.5, t.y - 56); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(fx, fy, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff3b0"; ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = "#ff8fa3"; ctx.beginPath(); ctx.arc(t.x + 18.5, t.y - 62, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.arc(t.x + 18.5, t.y - 62, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    if (t.cup) {
      ctx.font = "22px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji'"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(t.cup, t.x - 12, t.y - 52);
    }
    ctx.restore();
  }
}

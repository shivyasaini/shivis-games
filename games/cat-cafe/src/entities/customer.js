import { rand, pick, clamp } from "../util.js";
import { LAYOUT, seatFor } from "../render/room.js";
import { SKINS, HAIRS, SHIRTS, PANTS, HAIR_STYLES } from "../render/human.js";

let nextId = 1;

export function randomLook() {
  return { skin: pick(SKINS), hair: pick(HAIRS), hairStyle: pick(HAIR_STYLES), shirt: pick(SHIRTS), pants: pick(PANTS) };
}

export class Customer {
  constructor(table, drink) {
    this.id = nextId++;
    this.table = table;
    this.drink = drink;
    this.look = randomLook();
    const seat = seatFor(table);
    this.seat = seat;
    this.x = LAYOUT.SPAWN.x; this.y = LAYOUT.SPAWN.y;
    this.facing = -1;
    this.pose = "walk";
    this.phase = 0;
    this.state = "enter";  // enter → sit → waiting → served → leave
    this.timer = 0;
    this.patience = 1;      // 1 → 0
    this.patienceRate = 1 / rand(40, 55);
    this.catVisitor = null;
    this.catBonus = 0;      // 0..1, boosts tip
    this.done = false;
    this.left = false;
    this.mood = "ok";       // ok | happy | grumpy
    this.speed = rand(85, 110);
    this.voiceSeed = Math.random();
    // path: walk left along the back, then down to the seat
    this.path = [{ x: seat.x + 10, y: LAYOUT.SPAWN.y + rand(0, 20) }, { x: seat.x, y: seat.y }];
  }

  get sortY() { return this.y + (this.pose === "sit" ? 2 : 0); }

  hit(px, py) { return px > this.x - 28 && px < this.x + 30 && py > this.y - 110 && py < this.y + 8; }

  walkTo(target, dt) {
    const dx = target.x - this.x, dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const step = Math.min(d, this.speed * dt);
    this.x += (dx / d) * step; this.y += (dy / d) * step;
    if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
    this.phase += dt * 10;
    return false;
  }

  onCatArrive(cat, world) {
    this.catBonus = clamp(this.catBonus + 0.5, 0, 1);
    this.patience = clamp(this.patience + 0.25, 0, 1);
    world.particles.heart(this.x + 10, this.y - 120, 3);
  }

  update(dt, world) {
    switch (this.state) {
      case "enter":
        if (this.walkTo(this.path[0], dt)) {
          this.path.shift();
          if (!this.path.length) { this.sitDown(); }
        }
        break;
      case "sit":
        this.timer -= dt;
        if (this.timer <= 0) { this.state = "waiting"; world.placeOrder(this); }
        break;
      case "waiting":
        this.patience -= dt * this.patienceRate * (this.catVisitor ? 0.5 : 1) * (world.has && world.has("radio") ? 0.75 : 1);
        if (this.patience <= 0) { this.mood = "grumpy"; world.customerGaveUp(this); this.startLeaving(); }
        break;
      case "served":
        this.timer -= dt;
        if (this.catVisitor) this.catBonus = clamp(this.catBonus + dt * 0.04, 0, 1);
        if (this.timer <= 0) { world.customerFinished(this); this.startLeaving(); }
        break;
      case "leave":
        if (this.walkTo(this.path[0], dt)) {
          this.path.shift();
          if (!this.path.length) { this.done = true; }
        }
        break;
    }
  }

  sitDown() {
    this.state = "sit"; this.pose = "sit"; this.facing = 1;
    this.x = this.seat.x; this.y = this.seat.y;
    this.timer = rand(0.8, 1.6);
  }

  serve() {
    this.state = "served"; this.timer = rand(7, 11);
    const q = this.quality ?? 0.8;
    // a perfect drink always delights; a poor one never does
    this.mood = q >= 0.9 ? "happy" : q < 0.65 ? "ok" : this.patience > 0.5 ? "happy" : "ok";
    if (q < 0.5) this.catBonus *= 0.5;
  }

  startLeaving() {
    this.state = "leave"; this.pose = "walk";
    this.path = [{ x: this.seat.x + 10, y: LAYOUT.SPAWN.y + 10 }, { x: LAYOUT.SPAWN.x, y: LAYOUT.SPAWN.y }];
  }
}

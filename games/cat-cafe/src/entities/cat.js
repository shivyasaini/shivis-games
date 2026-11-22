import { rand, randi, pick, dist, clamp } from "../util.js";
import { LAYOUT, seatFor } from "../render/room.js";

let nextId = 1;

export class Cat {
  constructor(def, x, y) {
    this.id = nextId++;
    this.def = def;
    this.x = x; this.y = y;
    this.facing = 1;
    this.pose = "sit";
    this.state = "idle";
    this.timer = rand(1, 3);
    this.target = null;
    this.phase = 0;
    this.blink = 1;
    this.blinkT = rand(2, 5);
    this.happiness = 60;
    this.happy = false;
    this.happyT = 0;
    this.petCooldown = 0;
    this.seed = rand(0, 10);
    this.zT = 0;
    this.spot = null;   // current nap spot (so two cats don't share)
    this.visiting = null; // customer being visited
    this.job = null;      // order this cat is fetching / delivering
    this.carrying = null; // drink emoji while delivering
    this.hop = 0;
  }

  get busy() { return this.state === "fetch" || this.state === "deliver"; }

  // Called by the game when a drink is ready and this cat is the chosen waiter.
  assignDelivery(order, world) {
    this.releaseSpot();
    this.endVisit();
    this.job = order;
    order.cat = this;
    this.target = { x: world.pickup.x + rand(-6, 6), y: world.pickup.y + rand(-4, 4) };
    this.state = "fetch"; this.pose = "walk";
    this.timer = 0;
  }

  dropJob() {
    if (this.job && this.job.cat === this) this.job.cat = null;
    this.job = null; this.carrying = null;
    this.state = "idle"; this.pose = "sit"; this.timer = rand(1, 2);
  }

  get sortY() { return this.y; }
  get radius() { return 36; }

  hit(px, py) {
    const dy = this.pose === "walk" ? 58 : this.pose === "sit" ? 76 : 40;
    return px > this.x - 40 && px < this.x + 40 && py > this.y - dy && py < this.y + 10;
  }

  pet(world) {
    if (this.petCooldown > 0) return false;
    this.petCooldown = 0.5;
    this.happiness = clamp(this.happiness + 6, 0, 100);
    this.happy = true; this.happyT = 1.6;
    world.particles.heart(this.x, this.y - 60, 4);
    if (this.state === "nap") {
      // wake up gently into a loaf
      this.state = "loaf"; this.pose = "loaf"; this.timer = rand(3, 6); this.releaseSpot();
    } else if (this.state === "wander") {
      this.state = "idle"; this.pose = "sit"; this.timer = rand(2, 4);
    }
    return true;
  }

  releaseSpot() {
    if (this.spot) { this.spot.taken = null; this.spot = null; }
  }

  chooseNext(world) {
    const d = this.def;
    const weights = [
      ["wander", 1.0],
      ["nap", 0.8 * d.napLove],
      ["loaf", 0.5],
      ["visit", d.trait === "Curious" ? 1.5 : d.trait === "Cuddly" ? 1.2 : 0.5],
      ["idle", 0.4],
    ];
    // slow-drifting happiness
    this.happiness = clamp(this.happiness - 0.4, 0, 100);
    let total = weights.reduce((s, w) => s + w[1], 0);
    let r = rand(0, total);
    let choice = "idle";
    for (const [k, w] of weights) { r -= w; if (r <= 0) { choice = k; break; } }

    if (choice === "visit") {
      const seated = world.customers.filter((c) => c.pose === "sit" && !c.catVisitor && c.state !== "leave");
      if (seated.length) {
        const cust = pick(seated);
        cust.catVisitor = this;
        this.visiting = cust;
        this.target = { x: cust.x + 28 + rand(0, 10), y: cust.y + 14 };
        this.state = "walk-visit"; this.pose = "walk";
        return;
      }
      choice = "wander";
    }
    if (choice === "nap") {
      const spots = world.napSpots.filter((s) => !s.taken);
      if (spots.length) {
        const s = pick(spots);
        s.taken = this; this.spot = s;
        this.target = { x: s.x + rand(-6, 6), y: s.y };
        this.state = "walk-nap"; this.pose = "walk";
        return;
      }
      choice = "loaf";
    }
    if (choice === "wander") {
      this.target = world.randomWalkPoint();
      this.state = "wander"; this.pose = "walk";
      return;
    }
    if (choice === "loaf") { this.state = "loaf"; this.pose = "loaf"; this.timer = rand(5, 10); return; }
    this.state = "idle"; this.pose = "sit"; this.timer = rand(2, 5);
  }

  moveToward(dt) {
    const spd = this.def.speed * (this.busy ? 1.35 : 1);
    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const step = Math.min(d, spd * dt);
    this.x += (dx / d) * step; this.y += (dy / d) * step;
    if (Math.abs(dx) > 1) this.facing = dx > 0 ? 1 : -1;
    this.phase += dt * 9;
    return false;
  }

  update(dt, world, t) {
    // blink
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blinkT = rand(2.5, 6); this.blinkAnim = 0.18; }
    if (this.blinkAnim > 0) { this.blinkAnim -= dt; this.blink = this.blinkAnim > 0.05 && this.blinkAnim < 0.13 ? 0 : 1; }
    else this.blink = 1;

    if (this.petCooldown > 0) this.petCooldown -= dt;
    if (this.happyT > 0) { this.happyT -= dt; if (this.happyT <= 0) this.happy = false; }

    switch (this.state) {
      case "idle":
      case "loaf":
        this.timer -= dt;
        if (this.timer <= 0) this.chooseNext(world);
        break;
      case "wander":
        if (this.moveToward(dt)) { this.state = "idle"; this.pose = "sit"; this.timer = rand(2, 5); }
        break;
      case "walk-nap":
        if (this.moveToward(dt)) {
          this.state = "nap"; this.pose = "sleep"; this.timer = rand(12, 26) * this.def.napLove;
          this.facing = rand() < 0.5 ? 1 : -1;
        }
        break;
      case "nap":
        this.timer -= dt;
        this.zT -= dt;
        if (this.zT <= 0) { this.zT = 1.3; world.particles.z(this.x + this.facing * 22, this.y - 40); }
        // sunbeam naps are extra cozy
        if (this.spot && this.spot.sun && world.daylight > 0.3) this.happiness = clamp(this.happiness + dt * 0.8, 0, 100);
        if (this.spot && this.spot.cozy) this.happiness = clamp(this.happiness + dt * 0.6, 0, 100);
        if (this.timer <= 0) { this.releaseSpot(); this.state = "loaf"; this.pose = "loaf"; this.timer = rand(3, 6); }
        break;
      case "walk-visit": {
        const c = this.visiting;
        if (!c || c.state === "leave" || c.done) { this.endVisit(); this.state = "idle"; this.pose = "sit"; this.timer = 1; break; }
        if (this.moveToward(dt)) {
          this.state = "visit"; this.pose = "sit"; this.facing = -1; this.timer = rand(8, 16);
          c.onCatArrive(this, world);
        }
        break;
      }
      case "visit": {
        const c = this.visiting;
        this.timer -= dt;
        if (!c || c.state === "leave" || c.done || this.timer <= 0) { this.endVisit(); this.chooseNext(world); }
        else this.happiness = clamp(this.happiness + dt * 0.5, 0, 100);
        break;
      }
      case "fetch": {
        const o = this.job;
        if (!o || !world.orders.includes(o)) { this.dropJob(); break; }
        if (this.moveToward(dt)) {
          // pick up the drink from the counter
          this.carrying = o.drink.emoji;
          o.carried = true;
          world.particles.sparkle(this.x, this.y - 60, 6);
          const c = o.customer;
          this.target = { x: c.x + 34, y: c.y + 12 };
          this.state = "deliver";
        }
        break;
      }
      case "deliver": {
        const o = this.job;
        if (!o || !world.orders.includes(o)) { this.dropJob(); break; }
        this.hop += dt * 12;
        if (this.moveToward(dt)) {
          this.facing = -1;
          world.deliver(o, this);
          this.carrying = null; this.job = null;
          this.happiness = clamp(this.happiness + 4, 0, 100);
          this.happy = true; this.happyT = 1.4;
          this.state = "idle"; this.pose = "sit"; this.timer = rand(1.5, 3);
        }
        break;
      }
    }
  }

  endVisit() {
    if (this.visiting && this.visiting.catVisitor === this) this.visiting.catVisitor = null;
    this.visiting = null;
  }

  serialize() { return { id: this.def.id, happiness: Math.round(this.happiness) }; }
}

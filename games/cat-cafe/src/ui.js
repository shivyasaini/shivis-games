import { CAT_DEFS } from "./data/cats.js";
import { DRINKS } from "./data/drinks.js";
import { SHOP_ITEMS } from "./data/shop.js";
import { drawPortrait } from "./render/cat.js";

export function createUI() {
  const $ = (id) => document.getElementById(id);
  const els = {
    coins: $("coins-val"), clock: $("clock-val"), clockIcon: $("clock").querySelector(".icon"),
    day: $("day-val"), rep: $("rep-val"), orders: $("orders"), toast: $("toast"),
    panel: $("panel"), panelTitle: $("panel-title"), panelBody: $("panel-body"), hint: $("hint"),
  };
  let game = null;
  let toastT = null;
  let panelKind = null;
  let lastRenderedCoins = -1;

  const api = {
    bind(g) {
      game = g;
      $("btn-cats").onclick = () => api.openPanel(panelKind === "cats" ? null : "cats");
      $("btn-menu").onclick = () => api.openPanel(panelKind === "menu" ? null : "menu");
      $("btn-shop").onclick = () => api.openPanel(panelKind === "shop" ? null : "shop");
      $("panel-close").onclick = () => api.openPanel(null);
      $("btn-mode").onclick = () => game.setMode(game.mode === "cats" ? "you" : "cats");
      api.updateMode();
      setTimeout(() => els.hint.classList.add("fade"), 14000);
    },

    updateMode() {
      const cats = game.mode === "cats";
      $("btn-mode").textContent = cats ? "Waiters: Cats 🐾" : "Waiters: You 🙋";
      els.hint.textContent = cats
        ? "Click an order ticket to brew · your cats carry it to the table · Click a cat to pet it"
        : "Click an order ticket to brew · Click the customer to serve · Click a cat to pet it";
      els.hint.classList.remove("fade");
      clearTimeout(api._hintT);
      api._hintT = setTimeout(() => els.hint.classList.add("fade"), 9000);
    },

    update() {
      if (!game) return;
      if (Math.round(game.coins) !== lastRenderedCoins) {
        lastRenderedCoins = Math.round(game.coins);
        els.coins.textContent = lastRenderedCoins;
        if (panelKind === "cats" || panelKind === "shop") api.renderPanel();
      }
      const h = Math.floor(game.hour), m = Math.floor((game.hour % 1) * 60 / 10) * 10;
      const h12 = ((h + 11) % 12) + 1;
      els.clock.textContent = `${h12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
      els.clockIcon.textContent = game.hour >= 18.5 ? "🌙" : game.hour >= 16.5 ? "🌇" : "☀️";
      els.day.textContent = game.day;
      els.rep.textContent = game.rep;
      // progress bars
      for (const o of game.orders) {
        if (!o.el) continue;
        o.el.querySelector(".bar > i").style.width = `${Math.round(o.progress * 100)}%`;
      }
    },

    renderOrders() {
      els.orders.innerHTML = "";
      for (const o of game.orders) {
        const el = document.createElement("div");
        el.className = `ticket ${o.status}`;
        el.innerHTML = `
          <div class="drink">${o.drink.emoji}</div>
          <div class="name">${o.drink.name}</div>
          <div class="for">table ${game.tables.indexOf(o.customer.table) + 1}</div>
          <div class="bar"><i style="width:${Math.round(o.progress * 100)}%"></i></div>
          ${o.status === "new" ? '<div class="tag">MAKE</div>'
            : o.status === "brewing" ? '<div class="tag">👩‍🍳 making</div>'
            : o.status === "ready" ? (o.cat ? `<div class="tag">🐾 ${o.cat.def.name}</div>` : game.mode === "cats" ? '<div class="tag">WAITING</div>' : '<div class="tag">SERVE ➜</div>')
            : ""}
        `;
        el.onclick = () => {
          if (o.status === "new") game.brew(o.id);
          else if (o.status === "brewing") api.toast("You're making it right now");
          else if (o.status === "ready") api.toast(o.cat ? `${o.cat.def.name} is on it 🐾` : game.mode === "cats" ? "A cat will grab it soon" : "Click the customer to serve it");
        };
        o.el = el;
        els.orders.appendChild(el);
      }
    },

    toast(msg) {
      els.toast.textContent = msg;
      els.toast.classList.add("show");
      clearTimeout(toastT);
      toastT = setTimeout(() => els.toast.classList.remove("show"), 2200);
    },

    openPanel(kind) {
      panelKind = kind;
      els.panel.classList.toggle("hidden", !kind);
      if (kind) api.renderPanel();
    },

    renderPanel() {
      const body = els.panelBody;
      body.innerHTML = "";
      if (panelKind === "cats") {
        els.panelTitle.textContent = "Your cats";
        for (const cat of game.cats) {
          const card = document.createElement("div");
          card.className = "cat-card";
          card.innerHTML = `
            <canvas width="128" height="128"></canvas>
            <div style="flex:1">
              <div class="cname">${cat.def.name} <span style="font-weight:600;opacity:.6">· ${cat.def.trait}</span></div>
              <div class="ctrait">${cat.def.desc}</div>
              <div class="meter"><i style="width:${Math.round(cat.happiness)}%"></i></div>
            </div>`;
          drawPortrait(card.querySelector("canvas"), cat.def);
          body.appendChild(card);
        }
        const adoptable = CAT_DEFS.filter((d) => d.adoptCost && !game.ownedIds.includes(d.id));
        if (adoptable.length) {
          const h = document.createElement("h3");
          h.textContent = "Strays looking for a home";
          h.style.cssText = "margin:16px 0 0;font-size:14px;opacity:.75";
          body.appendChild(h);
          for (const def of adoptable) {
            const card = document.createElement("div");
            card.className = "cat-card";
            card.innerHTML = `
              <canvas width="128" height="128"></canvas>
              <div style="flex:1">
                <div class="cname">${def.name} <span style="font-weight:600;opacity:.6">· ${def.trait}</span></div>
                <div class="ctrait">${def.desc}</div>
                <button class="btn" style="margin-top:8px;padding:6px 12px;font-size:13px">Adopt · ${def.adoptCost} 🪙</button>
              </div>`;
            drawPortrait(card.querySelector("canvas"), def);
            card.querySelector("button").onclick = () => { if (game.adopt(def.id)) api.renderPanel(); };
            body.appendChild(card);
          }
        }
      } else if (panelKind === "shop") {
        els.panelTitle.textContent = `Shop · ${Math.round(game.coins)} 🪙`;
        for (const item of SHOP_ITEMS) {
          const owned = game.has(item.id);
          const card = document.createElement("div");
          card.className = "shop-card" + (owned ? " owned" : "");
          card.innerHTML = `
            <div class="sicon">${item.icon}</div>
            <div style="flex:1">
              <div class="cname">${item.name}</div>
              <div class="ctrait">${item.blurb}</div>
            </div>
            ${owned ? '<div class="owned-tag">✓ placed</div>' : `<button class="btn" ${game.coins < item.cost ? 'disabled' : ''}>${item.cost} 🪙</button>`}`;
          const btn = card.querySelector("button");
          if (btn) btn.onclick = () => { if (game.buy(item.id)) api.renderPanel(); };
          body.appendChild(card);
        }
      } else if (panelKind === "menu") {
        els.panelTitle.textContent = "Menu & stats";
        for (const d of DRINKS) {
          const row = document.createElement("div");
          row.className = "menu-row";
          row.innerHTML = `<span><span class="d">${d.emoji}</span>${d.name}</span><span>${d.price} 🪙 · ${d.steps.length} steps</span>`;
          body.appendChild(row);
        }
        const stats = document.createElement("div");
        stats.style.cssText = "margin-top:12px;font-size:13px;opacity:.8;line-height:1.6";
        stats.innerHTML = `Drinks served: <b>${game.served}</b><br>Reputation: <b>${game.rep}</b> ⭐ (more reputation = more customers)<br>A ★★★ drink earns +2 coins and always delights the customer.<br>Cats sitting with a customer raise their tip and patience.`;
        body.appendChild(stats);
      }
    },
  };
  return api;
}

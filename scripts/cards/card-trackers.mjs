import { RESOURCE_DECK_SUFFIX } from "./shared-draw.mjs";

const MODULE_ID = "aventuria-helpers";
const ENEMIES = new Set(["aventuria.leader", "aventuria.wildcard", "aventuria.henchman", "aventuria.demon"]);
const overlays = new Map();
const writes = new Map();
const label = key => game.i18n.localize(`AVENTURIA_HELPERS.CardTracker.${key}`);

/** Enlarge controls only while there is enough room inside the card width. */
export function trackerScale(zoom = 1, cardWidth = Infinity) {
  return Math.min(Math.max(1, 0.8 / Math.max(0.05, zoom)), cardWidth / 150);
}

function resizeOverlay(object, container) {
  const scale = trackerScale(canvas.stage?.scale?.x, object.document.width);
  container.trackerZoom = canvas.stage?.scale?.x;
  for (const [index, row] of container.children.entries()) {
    row.scale.set(scale);
    row.position.set(-row.trackerWidth * scale / 2, object.document.height / 2 + 4 + index * 42 * scale);
  }
}

export function initialTrackers(card, { resource = false, reset = false } = {}) {
  const tracker = foundry.utils.deepClone(card.flags?.[MODULE_ID]?.tracker ?? {});
  const life = Number(card.system?.life);
  if (ENEMIES.has(card.type) && life > 0 && !tracker.hp) tracker.hp = { value: life, max: life };
  if (resource && !tracker.marker) tracker.marker = { value: 0 };
  if (reset) {
    if (tracker.hp) tracker.hp.value = tracker.hp.max;
    if (tracker.marker) tracker.marker.value = 0;
  }
  return tracker;
}

function write(card, callback) {
  const task = (writes.get(card.uuid) ?? Promise.resolve()).then(async () => {
    if (!card.isOwner) return;
    await callback();
  });
  const settled = task.catch(error => ui.notifications.error(error.message));
  writes.set(card.uuid, settled);
  settled.finally(() => { if (writes.get(card.uuid) === settled) writes.delete(card.uuid); });
  return settled;
}

async function promptValue(card, kind, { activate = false } = {}) {
  const current = card.getFlag(MODULE_ID, "tracker")?.[kind];
  const value = await foundry.applications.api.Dialog.input({
    window: { title: label(kind === "hp" ? "HP" : "Marker") },
    content: `<label>${label(activate && kind === "hp" ? "Maximum" : "Value")} <input type="number" name="value" min="0" step="1" value="${Number(current?.value) || 0}"></label>`,
  });
  if (!value || value.value === "") return;
  const number = Number(value.value);
  if (!Number.isInteger(number) || number < 0) return;
  await write(card, async () => {
    const state = card.getFlag(MODULE_ID, "tracker")?.[kind];
    if (activate) await card.update({ [`flags.${MODULE_ID}.tracker.${kind}`]: kind === "hp" ? { value: number, max: number } : { value: number } });
    else if (state) await card.update({ [`flags.${MODULE_ID}.tracker.${kind}.value`]: kind === "hp" ? Math.min(number, state.max) : number });
  });
}

function adjust(card, kind, delta) {
  return write(card, async () => {
    const state = card.getFlag(MODULE_ID, "tracker")?.[kind];
    if (!state) return;
    const value = Math.max(0, Math.min(kind === "hp" ? state.max : Infinity, state.value + delta));
    await card.update({ [`flags.${MODULE_ID}.tracker.${kind}.value`]: value });
  });
}

function removeOverlay(object) {
  const container = overlays.get(object);
  if (!container) return;
  overlays.delete(object);
  container.destroy({ children: true });
}

function renderOverlay(object) {
  removeOverlay(object);
  const card = object.document?.card;
  if (card?.documentName !== "Card") return;
  const tracker = card.getFlag(MODULE_ID, "tracker");
  const kinds = ["hp", "marker"].filter(kind => tracker?.[kind]);
  if (!kinds.length || object.destroyed) return;
  const { x, y, width, height, rotation } = object.document;
  const container = new PIXI.Container();
  // CCM hides its interaction objects when another canvas tool is selected.
  // Render alongside the persistent card meshes instead of inside those objects.
  container.position.set((x ?? 0) + width / 2, (y ?? 0) + height / 2);
  container.angle = rotation ?? 0;
  container.visible = object.isVisible !== false;
  container.alpha = object.document.hidden ? 0.5 : 1;
  container.zIndex = (canvas.cards?.getZIndex?.() ?? 0) + 1;
  canvas.interface.addChild(container);
  overlays.set(object, container);
  const scale = trackerScale(canvas.stage?.scale?.x, width);
  // Reserve the border as well: the complete bar stays inside the card edges.
  const rowWidth = width / scale - 4;
  kinds.forEach((kind, index) => {
    const state = tracker[kind];
    const row = new PIXI.Container();
    row.trackerWidth = rowWidth;
    container.addChild(row);
    row.addChild(new PIXI.Graphics().beginFill(0x171512, 0.98).lineStyle(2, 0xb98651).drawRoundedRect(0, 0, rowWidth, 38, 6).endFill());
    if (kind === "hp") {
      const ratio = state.max > 0 ? Math.max(0, Math.min(1, state.value / state.max)) : 0;
      const color = ratio > 0.5 ? 0x287342 : ratio > 0.25 ? 0x98701d : 0x9c3030;
      const fillWidth = (rowWidth - 8) * ratio;
      if (fillWidth > 0) {
        const fill = new PIXI.Graphics().beginFill(color, 0.9)
          .drawRoundedRect(4, 4, fillWidth, 30, Math.min(4, fillWidth / 2)).endFill();
        fill.eventMode = "none";
        row.addChild(fill);
      }
    }
    row.eventMode = "static";
    row.hitArea = new PIXI.Rectangle(0, 0, rowWidth, 38);
    if (kind === "hp") {
      const medallion = new PIXI.Graphics().beginFill(0x171512, 1)
        .lineStyle(1, 0xd8c39b).drawCircle(51, 19, 16).endFill();
      medallion.eventMode = "none";
      row.addChild(medallion);
    }
    const icon = PIXI.Sprite.from(`modules/aventuria/assets/icons/${kind === "hp" ? "life-point" : "adventure-token"}.webp`);
    icon.anchor.set(0.5);
    icon.position.set(51, 19);
    icon.width = icon.height = 26;
    icon.eventMode = "none";
    row.addChild(icon);
    const text = new PIXI.Text(`${state.value}${kind === "hp" ? `/${state.max}` : ""}`, { fontFamily: "Arial", fontSize: 23, fontWeight: "bold", fill: 0xfff4d9, stroke: 0x171512, strokeThickness: 3 });
    text.anchor.set(0.5);
    text.position.set((rowWidth + 28) / 2, 19);
    if (text.width > rowWidth - 108) text.scale.set((rowWidth - 108) / text.width);
    row.addChild(text);
    if (!card.isOwner) return;
    text.eventMode = "static";
    text.hitArea = new PIXI.Rectangle(-(rowWidth + 28) / 2 + 38, -19, rowWidth - 76, 38);
    text.cursor = "pointer";
    text.on("pointerdown", event => { event.stopPropagation(); if (event.button === 0) void promptValue(card, kind); });
    for (const [symbol, delta, x] of [["−", -1, 19], ["+", 1, rowWidth - 19]]) {
      const button = new PIXI.Text(symbol, { fontFamily: "Arial", fontSize: 28, fontWeight: "bold", fill: 0xfff4d9 });
      button.anchor.set(0.5);
      button.position.set(x, 19);
      button.eventMode = "static";
      button.hitArea = new PIXI.Rectangle(-19, -19, 38, 38);
      button.cursor = "pointer";
      button.on("pointerdown", event => { event.stopPropagation(); if (event.button === 0) void adjust(card, kind, delta); });
      row.addChild(button);
    }
  });
  resizeOverlay(object, container);
}

export function registerCardTrackers() {
  // Core supplies mutable creation data before Cards#pass writes the drawn copy.
  Hooks.on("passCards", (from, to, data) => {
    if (from.type !== "deck" || to.type === "deck") return;
    const resource = from._stats?.compendiumSource?.endsWith(RESOURCE_DECK_SUFFIX);
    for (const card of data.toCreate) {
      const tracker = initialTrackers(card, { resource, reset: true });
      if (!Object.keys(tracker).length) continue;
      card.flags ??= {};
      card.flags[MODULE_ID] ??= {};
      card.flags[MODULE_ID].tracker = tracker;
    }
  });
  Hooks.on("drawCard", object => {
    renderOverlay(object);
    const card = object.document?.card;
    if (game.user !== game.users.activeGM || card?.documentName !== "Card") return;
    const tracker = initialTrackers(card);
    if (JSON.stringify(tracker) !== JSON.stringify(card.getFlag(MODULE_ID, "tracker") ?? {})) {
      void write(card, () => card.setFlag(MODULE_ID, "tracker", tracker));
    }
  });
  Hooks.on("refreshCard", renderOverlay);
  Hooks.on("destroyCard", removeOverlay);
  Hooks.on("canvasPan", () => {
    for (const [object, container] of [...overlays]) {
      if (container.trackerZoom !== canvas.stage?.scale?.x) renderOverlay(object);
    }
  });
  Hooks.on("canvasTearDown", () => {
    for (const object of [...overlays.keys()]) removeOverlay(object);
  });
  Hooks.on("updateCard", card => {
    for (const object of [...overlays.keys()]) if (object.document?.card?.uuid === card.uuid) renderOverlay(object);
    for (const object of canvas.cards?.placeables ?? []) {
      if (!overlays.has(object) && object.document?.card?.uuid === card.uuid) renderOverlay(object);
    }
  });
  Hooks.on("renderCardHud", hud => {
    const card = hud.card;
    if (card?.documentName !== "Card" || !card.isOwner) return;
    const column = hud.element.querySelector(".col.right");
    if (!column) return;
    column.querySelectorAll(".aventuria-tracker-control").forEach(element => element.remove());
    for (const kind of ["hp", "marker"]) {
      const active = !!card.getFlag(MODULE_ID, "tracker")?.[kind];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "control-icon aventuria-tracker-control";
      button.title = `${label(active ? "Deactivate" : "Activate")}: ${label(kind === "hp" ? "HP" : "Marker")}`;
      button.textContent = kind === "hp" ? "♥" : "◆";
      button.classList.toggle("active", active);
      button.addEventListener("click", event => {
        event.stopPropagation();
        if (active) void write(card, () => card.unsetFlag(MODULE_ID, `tracker.${kind}`));
        else void promptValue(card, kind, { activate: true });
      });
      column.append(button);
    }
  });
}

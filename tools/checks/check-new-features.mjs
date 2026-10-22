import assert from "node:assert/strict";
const hooks = new Map();
globalThis.Hooks = { on(name, fn) { hooks.set(name, fn); }, once(name, fn) { hooks.set(name, fn); } };
globalThis.foundry = {
  utils: { deepClone: structuredClone, randomID: () => "request" },
  applications: { apps: { ImagePopout: class { constructor(data) { shown.push(data); } render() {} } } },
};
const shown = [], notices = [], emitted = [];
globalThis.ui = { notifications: { warn: message => notices.push(message) } };
const gm = { id: "gm", active: true };
let cards = [{ name: "A", currentFace: { img: "a.webp" } }, { name: "B", currentFace: { img: "b.webp" } }];
let inFlight = 0, peak = 0;
const deck = { type: "deck", _stats: { compendiumSource: "Cards.Zm7y7aet1pUirikV" }, get availableCards() { return cards; } };
const pile = { async draw() { inFlight++; peak = Math.max(peak, inFlight); await new Promise(resolve => setTimeout(resolve, 5)); inFlight--; return [cards.shift()]; } };
globalThis.game = {
  user: gm, users: { activeGM: gm, get: () => gm },
  cards: { find: predicate => predicate(deck) ? deck : undefined, get: () => pile },
  i18n: { localize: key => key },
  socket: { emit: (...args) => emitted.push(args), on() {} },
};
globalThis.canvas = {};
const { drawSharedCard } = await import("../../scripts/cards/shared-draw.mjs");
await Promise.all([drawSharedCard("fate"), drawSharedCard("fate")]);
assert.equal(peak, 1, "Shared draws must be serialized");
assert.equal(shown.length, 2);
assert.equal(emitted.length, 2);
await drawSharedCard("fate");
assert.match(notices.pop(), /EmptyDeck/);
const { initialTrackers, registerCardTrackers, trackerScale } = await import("../../scripts/cards/card-trackers.mjs");
for (const zoom of [1, 0.5, 0.2, 0.1]) {
  assert.ok(38 * trackerScale(zoom) * zoom >= 30, "Trackers must retain at least 30 screen pixels in height");
}
assert.equal(trackerScale(2), 1, "Zooming in keeps the natural tracker size");
for (const type of ["aventuria.henchman", "aventuria.leader", "aventuria.wildcard", "aventuria.demon"]) {
  assert.deepEqual(initialTrackers({ type, system: { life: 12 } }), { hp: { value: 12, max: 12 } });
}
assert.deepEqual(initialTrackers({ type: "aventuria.special", system: {} }, { resource: true }), { marker: { value: 0 } });
const source = { flags: { "aventuria-helpers": { tracker: { hp: { value: 2, max: 20 }, marker: { value: 8 } } } } };
assert.deepEqual(initialTrackers(source, { reset: true }), { hp: { value: 20, max: 20 }, marker: { value: 0 } });
assert.equal(source.flags["aventuria-helpers"].tracker.marker.value, 8, "Reset must not mutate original data");
registerCardTrackers();
class DisplayObject {
  constructor() {
    this.children = [];
    this.position = { set: (x, y) => { this.x = x; this.y = y; } };
    this.scale = { set: value => { this.scaleValue = value; } };
    this.anchor = { set() {} };
  }
  addChild(child) { child.parent = this; this.children.push(child); }
  on() {}
  destroy() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.destroyed = true; }
}
class Graphics extends DisplayObject {
  beginFill() { return this; } lineStyle() { return this; } drawRoundedRect() { return this; } drawCircle() { return this; } endFill() { return this; }
}
globalThis.PIXI = { Container: DisplayObject, Graphics, Text: DisplayObject, Sprite: { from: () => new DisplayObject() }, Rectangle: class {} };
canvas.stage = { scale: { x: 0.2 } };
canvas.interface = new DisplayObject();
const object = new DisplayObject();
object.visible = false; // Simulate the inactive CCM interaction layer.
object.document = { width: 200, height: 300, card: { documentName: "Card", isOwner: true, getFlag: () => ({ hp: { value: 7, max: 10 } }) } };
hooks.get("refreshCard")(object);
assert.equal(canvas.interface.children.length, 1);
assert.equal(canvas.interface.children[0].visible, true, "Trackers remain visible independently of the interaction object");
assert.equal(canvas.interface.children[0].children[0].scaleValue, 200 / 150);
assert.ok(canvas.interface.children[0].children[0].trackerWidth * canvas.interface.children[0].children[0].scaleValue <= object.document.width, "Zoomed-out bars must not exceed the card width");
canvas.stage.scale.x = 0.5;
hooks.get("canvasPan")();
assert.equal(canvas.interface.children[0].children[0].scaleValue, 200 / 150);
assert.ok(canvas.interface.children[0].children[0].trackerWidth * canvas.interface.children[0].children[0].scaleValue <= object.document.width);
hooks.get("refreshCard")(object);
assert.equal(canvas.interface.children.length, 1, "Refreshing must replace the overlay without duplicates");
hooks.get("destroyCard")(object);
assert.equal(canvas.interface.children.length, 0, "Destroying the card cleans up its overlay");
const created = { type: "aventuria.henchman", system: { life: 15 } };
hooks.get("passCards")({ type: "deck" }, { type: "pile" }, { toCreate: [created] });
assert.equal(created.flags["aventuria-helpers"].tracker.hp.value, 15);
cards = [{ id: "r", name: "R" }];
deck._stats.compendiumSource = "Cards.gfvCoW3ld3KzepFK";
globalThis.canvas.scene = { id: "board", getFlag: (scope, key) => key === "gameBoard" ? true : { x: "invalid" } };
game.scenes = { get: () => canvas.scene };
await drawSharedCard("resource", "r");
assert.match(notices.pop(), /MissingPosition/);
assert.equal(cards.length, 1, "Missing coordinates must not consume a resource card");
let updates, placed, returned = false;
canvas.scene.getFlag = (scope, key) => key === "gameBoard" ? true : { x: 100, y: 200 };
game.modules = { get: () => ({ active: true }) };
pile.draw = async () => [{ id: "r", update: async data => { updates = data; }, parent: { pass: async () => { returned = true; } } }];
deck.pass = async (target, ids) => { assert.deepEqual(ids, ["r"]); return pile.draw(); };
globalThis.ccm = { api: { placeCard: async (card, data) => { placed = data; } } };
await drawSharedCard("resource", "r");
assert.deepEqual(placed, { x: 100, y: 200, sceneId: "board" });
assert.equal(updates["flags.aventuria-helpers.tracker.marker.value"], 0);
canvas.scene.getFlag = (scope, key) => key === "gameBoard" ? true : undefined;
await drawSharedCard("resource", "r");
assert.deepEqual(placed, { x: 5526, y: 3573, sceneId: "board" }, "Use the captured midpoint without scene configuration");
ccm.api.placeCard = async () => { throw new Error("placement failed"); };
await drawSharedCard("resource", "r");
assert.equal(returned, true, "Failed placement returns the card to its deck");
console.log("Passed: serialized draws, broadcast, empty deck, four enemy types, resource markers, draw reset, missing-coordinate guard.");

const beforeInvalid = placed;
await drawSharedCard("resource", "not-in-deck");
assert.match(notices.pop(), /UnavailableCard/);
assert.equal(placed, beforeInvalid);
foundry.applications.api = { HandlebarsApplicationMixin: base => base, ApplicationV2: class { async _prepareContext() { return {}; } } };
const { ResourcePicker } = await import("../../scripts/apps/resource-picker.mjs");
game.i18n.lang = "de";
cards = [{ id: "z", name: "Zelt", faces: [{ img: "z.webp" }] }, { id: "a", name: "Axt", faces: [{ img: "a.webp" }] }];
const context = await new ResourcePicker()._prepareContext({});
assert.deepEqual(context.cards.map(card => card.name), ["Axt", "Zelt"]);
assert.equal(context.cards[0].img, "a.webp");
console.log("Passed: chosen card ID, stale selection rejection, alphabetical resource list.");

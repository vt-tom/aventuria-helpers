const MODULE_ID = "aventuria-helpers";
export const FATE_DECK_SUFFIX = ".Zm7y7aet1pUirikV";
export const RESOURCE_DECK_SUFFIX = ".gfvCoW3ld3KzepFK";
// Card center captured on the Aventuria gameboard by the user (2026-10-05).
export const RESOURCE_POSITION = Object.freeze({ x: 5526, y: 3573 });
const pending = new Map();
let queue = Promise.resolve();

export function resolveSharedDeck(kind) {
  const suffix = kind === "fate" ? FATE_DECK_SUFFIX : RESOURCE_DECK_SUFFIX;
  return game.cards.find(c => c.type === "deck" && c._stats?.compendiumSource?.endsWith(suffix));
}

/** Store resource-card center coordinates on the currently viewed gameboard. */
export async function setResourcePosition(x, y) {
  if (!game.user.isGM || !canvas.scene?.getFlag("aventuria", "gameBoard")) warn("WrongScene");
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) warn("MissingPosition");
  await canvas.scene.setFlag(MODULE_ID, "resourcePosition", { x, y });
}

function showCard(data) {
  if (!data.src) return;
  new foundry.applications.apps.ImagePopout({ src: data.src, window: { title: data.name } }).render({ force: true });
}

function warn(key) {
  throw new Error(game.i18n.localize(`AVENTURIA_HELPERS.SharedDraw.${key}`));
}

async function performDraw(kind, sceneId, cardId) {
  const deck = resolveSharedDeck(kind);
  if (!deck) warn("MissingDeck");
  if (!deck.availableCards.length) warn("EmptyDeck");
  const target = game.cards.get(kind === "fate" ? "fateDiscard00000" : "adventureInPlay0");
  if (!target) warn("MissingPile");
  let scene, position;
  if (kind === "resource") {
    if (!deck.availableCards.some(card => card.id === cardId)) warn("UnavailableCard");
    scene = game.scenes.get(sceneId);
    if (!scene || scene !== canvas.scene || !scene.getFlag("aventuria", "gameBoard")) warn("WrongScene");
    position = scene.getFlag(MODULE_ID, "resourcePosition") ?? RESOURCE_POSITION;
    if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) warn("MissingPosition");
    if (!game.modules.get("complete-card-management")?.active) warn("MissingCcm");
  }
  const options = { chatNotification: false, updateData: { face: 0 } };
  const [card] = kind === "resource"
    ? await deck.pass(target, [cardId], options)
    : await target.draw(deck, 1, options);
  if (!card) return;
  if (kind === "fate") {
    const data = { type: "showFate", src: card.currentFace?.img ?? card.img, name: card.name };
    showCard(data);
    game.socket.emit(`module.${MODULE_ID}`, data);
  } else {
    try {
      await card.update({ [`flags.${MODULE_ID}.tracker.marker.value`]: 0 });
      await ccm.api.placeCard(card, { x: position.x, y: position.y, sceneId: scene.id });
    } catch (error) {
      await card.parent.pass(deck, [card.id], { chatNotification: false });
      throw error;
    }
  }
}

/** All shared draws run sequentially on the active GM, including player requests. */
export async function drawSharedCard(kind, cardId) {
  if (!["fate", "resource"].includes(kind)) return;
  if (!game.users.activeGM) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.SharedDraw.NoGM"));
    return;
  }
  if (kind === "resource" && !cardId) {
    const { openResourcePicker } = await import("../apps/resource-picker.mjs");
    return openResourcePicker();
  }
  const request = { type: "drawShared", kind, cardId, sceneId: canvas.scene?.id, userId: game.user.id, id: foundry.utils.randomID() };
  try {
    if (game.user === game.users.activeGM) await enqueue(request);
    else await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(request.id);
        reject(new Error(game.i18n.localize("AVENTURIA_HELPERS.SharedDraw.Timeout")));
      }, 15000);
      pending.set(request.id, { resolve, reject, timeout });
      game.socket.emit(`module.${MODULE_ID}`, request);
    });
    return true;
  } catch (error) {
    ui.notifications.warn(error.message);
    return false;
  }
}

function enqueue(request) {
  const result = queue.then(() => performDraw(request.kind, request.sceneId, request.cardId));
  queue = result.catch(() => {});
  return result;
}

export function registerSharedDraw() {
  Hooks.once("ready", () => {
    game.socket.on(`module.${MODULE_ID}`, async data => {
      if (!data || typeof data !== "object") return;
      if (data.type === "showFate") return showCard(data);
      if (data.type === "drawResult" && data.userId === game.user.id) {
        const request = pending.get(data.id);
        if (!request) return;
        clearTimeout(request.timeout);
        pending.delete(data.id);
        if (data.error) request.reject(new Error(data.error));
        else request.resolve();
        return;
      }
      if (data.type !== "drawShared" || game.user !== game.users.activeGM) return;
      if (!["fate", "resource"].includes(data.kind) || !game.users.get(data.userId)?.active) return;
      let error;
      try { await enqueue(data); } catch (cause) { error = cause.message; }
      game.socket.emit(`module.${MODULE_ID}`, { type: "drawResult", id: data.id, userId: data.userId, error });
    });
  });
}

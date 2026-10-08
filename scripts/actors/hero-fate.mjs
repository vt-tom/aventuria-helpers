const MODULE_ID = "aventuria-helpers";
const CHANNEL = `module.${MODULE_ID}`;
const pending = new Map();
let queue = Promise.resolve();
const text = key => game.i18n.localize(`AVENTURIA_HELPERS.HeroTray.${key}`);
export function fateState() { return game.settings.get(MODULE_ID, "fatePool"); }
export function heroFate(actor) {
  return fateState().heroes?.[actor.id] ?? (Number(actor.getFlag(MODULE_ID, "fatePoints")) || 0);
}

async function perform(request) {
  const user = game.users.get(request.userId);
  if (!user?.active) throw new Error(text("FateInvalid"));
  const state = foundry.utils.deepClone(fateState());
  state.heroes ??= {};
  if (request.kind === "pool") {
    if (!Number.isSafeInteger(request.value) || request.value < 0) throw new Error(text("FateInvalid"));
    state.pool = request.value;
  } else if (request.kind === "start") {
    // Count connected users with assigned heroes, including GM users; deduplicate actors.
    const heroes = new Set(game.users.filter(u => u.active && u.character?.type === "aventuria.hero").map(u => u.character.id));
    state.pool = heroes.size * 2;
  } else if (request.kind === "returnAll") {
    if (!user.isGM) throw new Error(text("FateInvalid"));
    for (const actor of game.actors.filter(actor => actor.type === "aventuria.hero")) {
      const points = state.heroes[actor.id] ?? (Number(actor.getFlag(MODULE_ID, "fatePoints")) || 0);
      if (!Number.isSafeInteger(points) || points < 0) throw new Error(text("FateInvalid"));
      state.pool += points;
      state.heroes[actor.id] = 0;
    }
    if (!Number.isSafeInteger(state.pool)) throw new Error(text("FateInvalid"));
  } else if (request.kind === "hero") {
    const actor = game.actors.get(request.actorId);
    if (actor?.type !== "aventuria.hero" || !actor.testUserPermission(user, "OWNER")) throw new Error(text("FateInvalid"));
    const current = state.heroes[actor.id] ?? (Number(actor.getFlag(MODULE_ID, "fatePoints")) || 0);
    const value = request.delta == null ? request.value : Math.max(0, current + request.delta);
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(text("FateInvalid"));
    const gained = value - current;
    if (gained > state.pool) throw new Error(text("FatePoolEmpty"));
    state.pool -= gained;
    if (!Number.isSafeInteger(state.pool)) throw new Error(text("FateInvalid"));
    state.heroes[actor.id] = value;
  } else throw new Error(text("FateInvalid"));
  await game.settings.set(MODULE_ID, "fatePool", state);
}
function enqueue(request) {
  const task = queue.then(() => perform(request));
  queue = task.catch(() => {});
  return task;
}
async function requestChange(data) {
  if (!game.users.activeGM) { ui.notifications.warn(text("FateNoGM")); return false; }
  const request = { ...data, type: "fateChange", userId: game.user.id, id: foundry.utils.randomID() };
  try {
    if (game.user === game.users.activeGM) await enqueue(request);
    else await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { pending.delete(request.id); reject(new Error(text("FateTimeout"))); }, 15000);
      pending.set(request.id, { resolve, reject, timeout });
      game.socket.emit(CHANNEL, request);
    });
    return true;
  } catch (error) { ui.notifications.warn(error.message); return false; }
}
export function changeFate(actor, options) {
  if (!actor?.isOwner) return Promise.resolve();
  return requestChange({ kind: "hero", actorId: actor.id, ...options });
}
export function setFatePool(value) { return requestChange({ kind: "pool", value }); }
export function startFatePool() { return requestChange({ kind: "start" }); }
export function returnAllFatePoints() { return requestChange({ kind: "returnAll" }); }
export function registerFatePool() {
  game.settings.register(MODULE_ID, "fatePool", {
    scope: "world", config: false, type: Object, default: { pool: 0, heroes: {} },
    onChange: () => Hooks.callAll("aventuriaHelpersFateUpdate"),
  });
  Hooks.once("ready", () => game.socket.on(CHANNEL, async data => {
    if (!data || typeof data !== "object") return;
    if (data.type === "fateResult" && data.userId === game.user.id) {
      const task = pending.get(data.id);
      if (!task) return;
      clearTimeout(task.timeout); pending.delete(data.id);
      if (data.error) task.reject(new Error(data.error)); else task.resolve();
    }
    if (data.type !== "fateChange" || game.user !== game.users.activeGM) return;
    let error;
    try { await enqueue(data); } catch (cause) { error = cause.message; }
    game.socket.emit(CHANNEL, { type: "fateResult", id: data.id, userId: data.userId, error });
  }));
}

const MODULE_ID = "aventuria-helpers";
const PROGRESS_SETTING = "activeAdventure";
const LOCK_SETTING = "adventureToolLock";

/**
 * Registers the two world settings backing the Adventure Tool (`apps/adventure-tool.mjs`):
 * which adventure is currently active (and how far into it), and who currently holds the
 * one-person-at-a-time lock. Both default to an empty object rather than `null` - same
 * "empty object means unset" convention as `playerSlotAssignments` (`player-slots.mjs`),
 * since `game.settings.register()`'s `Object` type isn't guaranteed to tolerate `null`.
 * Called once from the module's `init` hook.
 */
export function registerAdventureState() {
  game.settings.register(MODULE_ID, PROGRESS_SETTING, { scope: "world", config: false, type: Object, default: {} });
  game.settings.register(MODULE_ID, LOCK_SETTING, { scope: "world", config: false, type: Object, default: {} });
}

/**
 * The currently active adventure, if any.
 * @returns {{entryUuid: string, pageId: string, visited: string[]}|null}
 */
export function getActiveAdventure() {
  const state = game.settings.get(MODULE_ID, PROGRESS_SETTING);
  return state?.entryUuid ? state : null;
}

/**
 * Starts a fresh adventure at the given page (normally its first page).
 * @param {string} entryUuid
 * @param {string} pageId
 * @returns {Promise<void>}
 */
export async function startAdventure(entryUuid, pageId) {
  await game.settings.set(MODULE_ID, PROGRESS_SETTING, { entryUuid, pageId, visited: [pageId] });
}

/**
 * Moves the active adventure's "current page" forward - via a followed `@UUID` link or a
 * click in the visited-history list. No-ops if no adventure is active.
 * @param {string} pageId
 * @returns {Promise<void>}
 */
export async function goToPage(pageId) {
  const state = getActiveAdventure();
  if (!state) return;
  const visited = state.visited.includes(pageId) ? state.visited : [...state.visited, pageId];
  await game.settings.set(MODULE_ID, PROGRESS_SETTING, { ...state, pageId, visited });
}

/** Clears the active adventure - back to the picker. */
export async function endAdventure() {
  await game.settings.set(MODULE_ID, PROGRESS_SETTING, {});
}

/** @returns {User|null} Whoever currently holds the Adventure Tool lock, if anyone. */
export function getAdventureLockHolder() {
  const lock = game.settings.get(MODULE_ID, LOCK_SETTING);
  return lock?.userId ? (game.users.get(lock.userId) ?? null) : null;
}

/**
 * Claims the lock for the current user - a no-op success if they already hold it, a no-op
 * failure if someone else does. Never steals an active lock; the holder has to release it
 * (explicitly, or by closing the tool) first.
 * @returns {Promise<boolean>}
 */
export async function acquireAdventureLock() {
  const holder = getAdventureLockHolder();
  if (holder && holder.id !== game.user.id) return false;
  await game.settings.set(MODULE_ID, LOCK_SETTING, { userId: game.user.id });
  return true;
}

/** Releases the lock - only has an effect if the current user actually holds it. */
export async function releaseAdventureLock() {
  const holder = getAdventureLockHolder();
  if (holder?.id !== game.user.id) return;
  await game.settings.set(MODULE_ID, LOCK_SETTING, {});
}

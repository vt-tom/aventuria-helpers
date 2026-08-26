/**
 * Toggling a hero's shared equipment-exhaust status ("erschöpft") from outside the character
 * sheet - a "Held erschöpfen"/"Held bereitmachen" macro pair (project/TODO.md Features,
 * 2026-08-24, matching aventuria's own reference macro names `Exhaust`/`Ready` - see
 * CLAUDE.md's macro list), plus the automatic ready-up every hero gets at the start of a new
 * combat round, alongside the existing "Karten zurückdrehen" card-rotation reset
 * (`documents/combat.mjs`) - same underlying rule (whatever a hero used last round becomes
 * available again). `AventuriaHelpersHeroSheet#toggleExhaust` (sheets/hero-sheet.mjs) and
 * `probe-roll.mjs#rollEquipment()` reuse `setHeroExhausted()` below instead of duplicating the
 * two-field update, so all three entry points stay in sync. Since 2026-08-26, `setHeroExhausted()`
 * also rotates the hero's token(s) on the current Scene (`rotateHeroToken()`), so all of the
 * above - including the round-end auto-ready - visually mirror the exhaust state on the board too.
 */

const HERO_TYPE = "aventuria.hero";
const EXHAUSTED_TOKEN_ROTATION = 90;
const READY_TOKEN_ROTATION = 0;

/**
 * Whether either of a hero's two equipment slots is currently marked exhausted. Per Aventuria's
 * rules using either weapon exhausts the whole hero card, so both fields are always kept in
 * sync as a single conceptual state (see `setHeroExhausted()`) - checking either one is enough.
 * @param {Actor} actor
 * @returns {boolean}
 */
export function isHeroExhausted(actor) {
  return !!(actor.system.basicEquipment?.exhaust || actor.system.secondEquipment?.exhaust);
}

/**
 * Sets both equipment slots' exhaust flag at once. `aventuria`'s data model still tracks
 * `exhaust` as two separate booleans (`basicEquipment.exhaust`/`secondEquipment.exhaust`, its
 * schema can't be changed here), so both are updated together instead of independently.
 * @param {Actor} actor
 * @param {boolean} exhausted
 * @returns {Promise<Actor>}
 */
export async function setHeroExhausted(actor, exhausted) {
  const result = await actor.update({
    "system.basicEquipment.exhaust": exhausted,
    "system.secondEquipment.exhaust": exhausted,
  });
  await rotateHeroToken(actor, exhausted);
  return result;
}

/**
 * Mirrors the equipment-exhaust state on the board: rotates every one of the hero's tokens on
 * the currently viewed Scene 90° clockwise while exhausted, back to the upright 0° `place-hero-
 * stacks.mjs`/`HERO_PLACEMENTS` default once readied (project/TODO.md, 2026-08-26 - matches
 * Aventuria's own reference "Exhaust Hero" macro naming, see module doc comment above). A no-op
 * if the hero has no token on the current scene yet (canvas not ready, or never placed) -
 * `Actor#getActiveTokens()` already returns an empty array in that case.
 * @param {Actor} actor
 * @param {boolean} exhausted
 * @returns {Promise<void>}
 */
async function rotateHeroToken(actor, exhausted) {
  const rotation = exhausted ? EXHAUSTED_TOKEN_ROTATION : READY_TOKEN_ROTATION;
  const tokens = actor.getActiveTokens(false, true).filter((t) => t.rotation !== rotation);
  await Promise.all(tokens.map((t) => t.update({ rotation })));
}

/**
 * Resolves the hero Actor a macro should act on: the acting user's single selected/controlled
 * hero token, if exactly one is selected, else their assigned character
 * (`game.user.character`) - same fallback a player clicking their own portrait elsewhere in
 * the module already gets.
 * @returns {Actor|null}
 */
function resolveMacroHero() {
  const controlled = (canvas.tokens?.controlled ?? [])
    .map((t) => t.actor)
    .filter((a) => a?.type === HERO_TYPE);
  if (controlled.length === 1) return controlled[0];
  if (game.user.character?.type === HERO_TYPE) return game.user.character;
  return null;
}

/**
 * "Held erschöpfen" macro entry point - marks the acting user's hero (see
 * `resolveMacroHero()`) exhausted, same effect as the sheet's own erschöpfen button.
 * @returns {Promise<void>}
 */
export async function exhaustHero() {
  const actor = resolveMacroHero();
  if (!actor) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Macros.ExhaustHero.NoHero"));
    return;
  }
  await setHeroExhausted(actor, true);
}

/**
 * "Held bereitmachen" macro entry point - counterpart to `exhaustHero()`.
 * @returns {Promise<void>}
 */
export async function readyHero() {
  const actor = resolveMacroHero();
  if (!actor) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Macros.ReadyHero.NoHero"));
    return;
  }
  await setHeroExhausted(actor, false);
}

/**
 * Readies every hero Actor's equipment at once - used by the automatic round-end reset in
 * `documents/combat.mjs`, alongside the existing card-rotation reset.
 * @returns {Promise<number>} How many heroes were actually exhausted and got readied.
 */
export async function readyAllHeroes() {
  const exhausted = game.actors.filter((a) => a.type === HERO_TYPE && isHeroExhausted(a));
  await Promise.all(exhausted.map((a) => setHeroExhausted(a, false)));
  return exhausted.length;
}

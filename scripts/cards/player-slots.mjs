const MODULE_ID = "aventuria-helpers";
const AVENTURIA_ID = "aventuria";
const CCM_ID = "complete-card-management";
const SETTING = "playerSlotAssignments";

/**
 * Registers the world setting backing `resolvePlayerSlotOccupant()`/
 * `recordPlayerSlotAssignment()`: `{ [playerNumber]: userId }`. Called once from
 * the module's `init` hook, same pattern as `registerWelcomeScreenReopen()`.
 *
 * Originally this derived occupancy purely from state `preparePlayer()` wires up
 * (Im-Spiel-Stapel canvas region → its target Cards stack → Hand sibling → owning
 * user), no separate stored mapping. Nutzerfeedback 2026-08-14 after a live test:
 * that chain only reflects the *board-position* "Spielernummer" the GM happens to
 * type into aventuria's own "Bereite Spieler vor" dialog during "Held auswählen" -
 * if that number doesn't match the slot actually picked on the visual picker (an
 * easy mismatch, since it's a second, unrelated manual entry - see
 * `welcome-screen.mjs#onOpenPreparePlayer()`), occupancy silently reads back wrong
 * even though the assignment/placement themselves worked correctly. A world
 * setting we write ourselves, exactly when `placeHeroStacks()` actually succeeds,
 * is the authoritative source instead.
 */
export function registerPlayerSlotAssignments() {
  game.settings.register(MODULE_ID, SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: {},
  });
}

/**
 * Records that `user` now occupies board player slot `playerNumber` - called by
 * `placeHeroStacks()` right after a successful placement.
 * @param {number} playerNumber
 * @param {User} user
 * @returns {Promise<void>}
 */
export async function recordPlayerSlotAssignment(playerNumber, user) {
  const assignments = { ...game.settings.get(MODULE_ID, SETTING) };
  assignments[playerNumber] = user.id;
  await game.settings.set(MODULE_ID, SETTING, assignments);
}

/**
 * Resolves which user currently occupies a given board player slot (1-6), per the
 * world setting `recordPlayerSlotAssignment()` writes. Used by the "Held wählen"
 * assignment picker to block picking a slot that belongs to a different player.
 * @param {number} playerNumber
 * @returns {User|null}
 */
export function resolvePlayerSlotOccupant(playerNumber) {
  const assignments = game.settings.get(MODULE_ID, SETTING) ?? {};
  const userId = assignments[playerNumber];
  return userId ? (game.users.get(userId) ?? null) : null;
}

/**
 * Resolves which board player slot (if any) a given user currently occupies - the
 * reverse lookup of `resolvePlayerSlotOccupant()`. Used to auto-select a player's
 * own slot in the assignment picker as soon as they're chosen (Nutzerwunsch
 * 2026-08-16: replacing a player's hero should only ever be possible at their own
 * slot, not at one belonging to someone else).
 * @param {string} userId
 * @returns {number|null}
 */
export function resolvePlayerSlot(userId) {
  const assignments = game.settings.get(MODULE_ID, SETTING) ?? {};
  const entry = Object.entries(assignments).find(([, uid]) => uid === userId);
  return entry ? Number(entry[0]) : null;
}

/**
 * Wires `playerSlot`'s "In Play" region (the one Aventuria's own Gameboard scene tags with
 * `flags.aventuria.player` and `flags.aventuria.pileType === "play"`) to `playPile`, so cards
 * dropped on that region - manually or via `playCardAsEndurance()` (`cards/endurance.mjs`) -
 * land in the right hero's Im-Spiel-Stapel. Idempotent: safe to call every time a hero's
 * stacks get (re-)placed on the board, not just once at assignment time.
 *
 * Root cause confirmed 2026-08-16 (live-verified with the user, `typeof
 * region.getFlag("aventuria","player")` → `"string"`): Aventuria's own Gameboard scene data
 * stores this flag as a **string** (`"1"`, not `1`), while every call site here passed
 * `playerSlot` as a `Number` - the original `scene.regions.filter((r) => r.getFlag(...) ===
 * playerSlot)` therefore matched **zero** regions for every player, always, via `prepareAndAssignHero()`
 * (silent - `behavior?.update()` never even ran). Whatever wiring looked correct earlier in
 * testing turned out to be leftover from before this module's own "Held zuweisen" flow
 * existed, not evidence this comparison ever worked. Fixed by normalizing both sides to
 * `Number(...)` before comparing. Kept as a second, redundant call from `placeHeroStacks()`
 * (in addition to the fixed call in `prepareAndAssignHero()`) as a self-heal for any hero
 * assigned before this fix, or any other future drift - re-running "Auf der Spielbrett-Szene
 * platzieren" now repairs the wiring regardless of cause.
 * @param {Scene} scene
 * @param {number} playerSlot
 * @param {Cards} playPile
 * @returns {Promise<void>}
 */
export async function wirePlayRegion(scene, playerSlot, playPile) {
  const regions = scene.regions.filter((r) => Number(r.getFlag(AVENTURIA_ID, "player")) === Number(playerSlot));
  for (const region of regions) {
    if (region.getFlag(AVENTURIA_ID, "pileType") !== "play") continue;
    const behavior = region.behaviors.find((b) => b.type === `${CCM_ID}.moveCard`);
    await behavior?.update({ "system.targetStack": playPile.id });
  }
}

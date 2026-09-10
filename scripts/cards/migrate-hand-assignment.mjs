/**
 * One-time cleanup for `flags.complete-card-management.playerHand` pointing at the wrong Cards
 * document - the effect of a bug in `prepareAndAssignHero()` (`cards/prepare-hero.mjs`, fixed
 * 2026-09-10, see `project/CHANGELOG.md`): the four Cards documents created for a new hero
 * (Deck/Hand/Ablage/Im-Spiel-Stapel) were resolved positionally from `Cards.createDocuments()`'s
 * return array, which assumes the server echoes them back in the exact order submitted. On at
 * least one real remote server that assumption didn't hold, and `playerHand` ended up pointing at
 * the discard pile ("Ablage") instead of the actual Hand document - the module (and
 * `complete-card-management` itself) then treated that pile as if it were the player's hand.
 * Live-diagnosed 2026-09-10 via a console snippet for the affected hero ("Brutack Parinor"), not
 * guessed.
 *
 * Only repairs the flag itself. A hero affected by this bug also has an *additional*, orphaned
 * `type:"hand"` Cards document left over from an earlier reassignment (its Folder got deleted by
 * `deleteExistingHero()`, which itself trusted the already-broken flag and thus never included the
 * real Hand document in what it deleted) - same "don't auto-fix data problems, just don't
 * perpetuate them" stance as `migrate-card-placements.mjs`/the Aktionskarten-Dubletten note in
 * `CLAUDE.md`: that orphan is left alone here, the affected GM/player has to remove it by hand.
 */

const MODULE_ID = "aventuria-helpers";
const CCM_MODULE_ID = "complete-card-management";
const FIXED_SETTING = "fixedMisassignedPlayerHands";

/**
 * Scans every user's `playerHand` flag and repoints it at the real `type:"hand"` sibling in the
 * same Folder, if the flag currently resolves to a Cards document of a different type. Safe to
 * run repeatedly - a user whose flag already resolves to a real Hand document (the normal case)
 * is left untouched.
 * @returns {Promise<number>} How many users' assignment was fixed.
 */
export async function fixMisassignedPlayerHands() {
  let fixed = 0;
  for (const user of game.users) {
    const handId = user.getFlag(CCM_MODULE_ID, "playerHand");
    if (!handId) continue;

    const current = game.cards.get(handId);
    if (!current || current.type === "hand") continue;

    const realHand = current.folder
      ? game.cards.find((c) => (c.folder === current.folder) && (c.type === "hand"))
      : null;
    if (!realHand) continue;

    await user.setFlag(CCM_MODULE_ID, "playerHand", realHand.id);
    fixed += 1;
  }
  return fixed;
}

/**
 * Registers the world setting that records the one-time run and schedules it on `ready`, gated
 * to the single active GM (same pattern as `registerCardPlacementCleanup()`/
 * `registerExperienceStackMigration()`) - per CLAUDE.md, every player at this table has the
 * Gamemaster role, so a plain `isGM` check would run this concurrently on every connected client.
 */
export function registerPlayerHandAssignmentFix() {
  game.settings.register(MODULE_ID, FIXED_SETTING, {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  Hooks.once("ready", async () => {
    if (game.settings.get(MODULE_ID, FIXED_SETTING)) return;
    if (game.user !== game.users.activeGM) return;

    const fixed = await fixMisassignedPlayerHands();
    await game.settings.set(MODULE_ID, FIXED_SETTING, true);
    if (fixed > 0) {
      ui.notifications.info(game.i18n.format("AVENTURIA_HELPERS.Migration.PlayerHand", { count: fixed }));
    }
  });
}

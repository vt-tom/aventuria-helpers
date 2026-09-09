/**
 * One-time cleanup for cards left with a broken complete-card-management
 * placement flag by the pre-fix card-return bug (see
 * `cards/played-cards.mjs`'s `detachCardForReturn()` and
 * `project/CHANGELOG.md` 0.3.0).
 *
 * Before the fix, returning a played card to the hand/discard/deck handed a
 * `flags.-=complete-card-management` key to `Cards#pass()`, which doesn't
 * action it - the copied card ended up carrying either a retained
 * `ForcedDeletion` operator or a scene-placement entry pointing nowhere.
 * Either way the canvas placeable is orphaned and throws on interaction
 * ("The card doesn't have location data for the current scene").
 *
 * This scans every card in the world once and strips only entries under
 * `flags.complete-card-management` whose value is **not** a real
 * `{x, y, ...}` placement object (retained operator / null / empty). Genuine
 * placements - cards actually lying on a scene, whichever scene - are left
 * untouched. Safe to run repeatedly; runs automatically once per world, and is
 * also on the module API for a manual re-run
 * (`game.modules.get("aventuria-helpers").api.cleanUpBrokenCardPlacements()`).
 */

const MODULE_ID = "aventuria-helpers";
const CCM_MODULE_ID = "complete-card-management";

/**
 * @param {unknown} value
 * @returns {boolean} Whether `value` looks like a real CCM scene-placement record.
 */
function isRealPlacement(value) {
  return !!value
    && (typeof value === "object")
    && (typeof value.x === "number")
    && (typeof value.y === "number");
}

/**
 * Removes broken `complete-card-management` placement entries from every card
 * in the world.
 * @returns {Promise<number>} How many cards were fixed.
 */
export async function cleanUpBrokenCardPlacements() {
  let fixed = 0;
  for (const stack of game.cards) {
    for (const card of stack.cards) {
      const placements = card.flags?.[CCM_MODULE_ID];
      if (!placements || (typeof placements !== "object")) continue;
      const badKeys = Object.keys(placements).filter((sceneId) => !isRealPlacement(placements[sceneId]));
      if (!badKeys.length) continue;
      const update = {};
      for (const sceneId of badKeys) {
        foundry.utils.setProperty(update, `flags.${CCM_MODULE_ID}.${sceneId}`, new foundry.data.operators.ForcedDeletion());
      }
      await card.update(update);
      fixed += 1;
    }
  }
  return fixed;
}

/**
 * Registers the world setting that records the one-time run and schedules it
 * on `ready`, gated to the single active GM (same pattern as
 * `registerExperienceStackMigration()` in `cards/experience-stack.mjs`).
 */
export function registerCardPlacementCleanup() {
  game.settings.register(MODULE_ID, "cleanedBrokenCardPlacements", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  Hooks.once("ready", async () => {
    if (game.settings.get(MODULE_ID, "cleanedBrokenCardPlacements")) return;
    if (game.user !== game.users.activeGM) return;
    const fixed = await cleanUpBrokenCardPlacements();
    await game.settings.set(MODULE_ID, "cleanedBrokenCardPlacements", true);
    if (fixed > 0) {
      ui.notifications.info(
        game.i18n.format("AVENTURIA_HELPERS.Migration.CardPlacements", { count: fixed }),
      );
    }
  });
}

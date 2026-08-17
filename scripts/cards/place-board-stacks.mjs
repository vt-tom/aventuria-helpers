const MODULE_ID = "aventuria-helpers";
const CCM_MODULE_ID = "complete-card-management";

/**
 * Canvas placements for the shared GM stacks that aventuria's "Prepare Board" macro
 * creates as world Cards documents. Coordinates were captured by placing each stack by
 * hand on the Aventuria `Spielbrett`/`Gameboard` scene and reading back the resulting
 * `flags.complete-card-management.<sceneId>` data - see CHANGELOG.md for how they were
 * obtained. Two of Prepare Board's piles (`adventureInPlay0`, `henchmanInPlay00`) are
 * intentionally not placed on the scene at all (per Nutzerentscheidung 2026-08-14 - the
 * board layout has no drop zone for them), so they're not listed here.
 *
 * The three piles have fixed IDs (`Cards.createDocuments` used `keepId: true` with an
 * explicit `_id` in Prepare Board's source). The two decks don't - they're matched via
 * `_stats.compendiumSource`, which `fromCompendium()` stamps with the origin compendium
 * UUID regardless of `keepId` (see `world-collection.mjs`), so this works for both the
 * German and English aventuria card compendiums.
 *
 * `shuffle: true` marks the fate deck (formerly its own guide step, "Schicksalsstapel
 * mischen") - folded in here on Nutzerwunsch 2026-08-14, same as locking (see below).
 */
const PLACEMENTS = [
  { id: "eventDiscard0000", x: 6929, y: 3878 },
  { id: "fateDiscard00000", x: 6926, y: 3379 },
  { id: "henchmanDiscard0", x: 5803.2, y: 4563.8 },
  { compendiumSourceSuffix: ".Zm7y7aet1pUirikV", x: 6528, y: 3379, shuffle: true },
  { compendiumSourceSuffix: ".gfvCoW3ld3KzepFK", x: 4963, y: 3377 },
];

/**
 * Resolves the `PLACEMENTS` entries to their actual `Cards` documents, whichever currently
 * exist in the world.
 * @returns {{placement: object, card: Cards}[]}
 */
function resolvePlacements() {
  return PLACEMENTS.map((placement) => ({
    placement,
    card: placement.id
      ? game.cards.get(placement.id)
      : game.cards.find((c) => c._stats?.compendiumSource?.endsWith(placement.compendiumSourceSuffix)),
  })).filter((r) => r.card);
}

/**
 * Places the shared GM stacks (event/fate/henchman discard, fate deck, resource deck)
 * created by aventuria's "Prepare Board" macro onto the currently viewed scene, at the
 * spots matching the Spielbrett/Gameboard board art (see `PLACEMENTS`), locked so they
 * aren't moved by accident, and shuffles the fate deck - folding the former "Decks und
 * Stapel verankern" and "Schicksalsstapel mischen" guide steps into this one on
 * Nutzerwunsch 2026-08-14 (the guide now ends after this step). Writes the same
 * `complete-card-management` flags that dragging a stack onto the canvas would, plus this
 * module's own `permanentStack` flag (see `cleanup-board.mjs`) - tagged directly at placement
 * time instead of re-derived later by ID/`compendiumSource` matching (which turned out
 * unreliable for the fate deck in practice, Nutzerfeedback 2026-08-17: it still got swept up
 * by "Board aufräumen" despite being one of `PLACEMENTS`). Deliberately two separate
 * `setFlag()` calls per card, not one combined `update()` - a first attempt merged both flag
 * paths into a single `update()` call, which broke the Ablage/Hand placement in
 * `placeHeroStacks()` (Nutzerfeedback 2026-08-17, exact mechanism not confirmed) - reverted to
 * the previously-working two-call shape here too, for the same reason and to keep both
 * functions consistent.
 * @returns {Promise<void>}
 */
export async function placeBoardStacks() {
  if (!game.modules.get(CCM_MODULE_ID)?.active) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.PlaceStacks.MissingCcm"));
    return;
  }

  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.PlaceStacks.GmOnly"));
    return;
  }

  const scene = canvas.scene;
  if (!scene) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.PlaceStacks.NoScene"));
    return;
  }

  if (!scene.getFlag("aventuria", "gameBoard")) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.PlaceStacks.WrongScene"));
    return;
  }

  const resolved = resolvePlacements();

  if (!resolved.length) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.PlaceStacks.NotPrepared"));
    return;
  }

  const cardCollection = new Set(scene.getFlag(CCM_MODULE_ID, "cardCollection") ?? []);
  for (const { card } of resolved) cardCollection.add(card.uuid);
  await scene.setFlag(CCM_MODULE_ID, "cardCollection", Array.from(cardCollection));

  await Promise.all(
    resolved.map(async ({ card, placement }) => {
      await card.setFlag(CCM_MODULE_ID, scene.id, {
        x: placement.x,
        y: placement.y,
        rotation: 0,
        sort: card.sort,
        locked: true,
      });
      await card.setFlag(MODULE_ID, "permanentStack", true);
    }),
  );

  await Promise.all(resolved.filter(({ placement }) => placement.shuffle).map(({ card }) => card.shuffle()));

  ui.notifications.info(
    game.i18n.format("AVENTURIA_HELPERS.GettingStarted.Steps.PlaceStacks.Done", {
      count: resolved.length,
      total: PLACEMENTS.length,
    }),
  );
}

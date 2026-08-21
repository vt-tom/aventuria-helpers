import { placeBoardTokens, TOKEN_FOLDER_NAME } from "../actors/import-board-tokens.mjs";
import { resolveStacks } from "./stacks.mjs";
import { returnAllPlayedCardsToDeck } from "./played-cards.mjs";

const MODULE_ID = "aventuria-helpers";
const CCM_MODULE_ID = "complete-card-management";

/**
 * Resets the Aventuria Gameboard scene after an adventure: removes every *adventure-specific*
 * card currently placed on it (back to their decks/stacks - see below for why that needs no
 * extra move) while leaving permanent board furniture untouched, and moves the 12 board marker
 * tokens (life points, Fertigkeit, etc.) back to their starting spot via `placeBoardTokens()`
 * (`actors/import-board-tokens.mjs`), reused wholesale instead of duplicating its placement
 * logic - already idempotent create-or-move. Hero tokens and the "Startspielermarke" are
 * deliberately untouched (same exclusion `placeBoardTokens()` itself already makes, see
 * `TOKEN_PLACEMENTS`).
 *
 * "Permanent furniture" (the "Erste Schritte" GM stacks from `placeBoardStacks()`, every
 * hero's Deck/Ablage/Hand from `placeHeroStacks()`) is identified by this module's own
 * `flags.aventuria-helpers.permanentStack` flag, set directly by those two functions at
 * placement time - **not** re-derived here later by matching IDs/`compendiumSource`/folder
 * against the current world state. An earlier version tried exactly that re-derivation and
 * turned out unreliable for the fate deck in practice (Nutzerfeedback 2026-08-17: it still
 * got swept up despite being one of `place-board-stacks.mjs`'s own `PLACEMENTS`) - tagging
 * once at the moment a stack is actually placed, instead of guessing its identity back from
 * scratch, sidesteps that whole class of bug.
 *
 * A card "on the scene" is just an extra `flags.complete-card-management.<sceneId>` position
 * flag on the `Card`/`Cards` document, independent of which Cards stack (deck/discard/hand/play
 * pile) it actually belongs to (confirmed for the adventure-card placement in 0.1.4.1, see
 * `project/CHANGELOG.md`) - clearing that flag is already "back in its stack", no separate move
 * needed. Same iteration approach as the existing `resetCardRotations()` macro
 * (`macros/reset-card-rotations.mjs`, iterates `canvas.cards.placeables`) - deliberately
 * rebuilt instead of calling Complete Card Management's own equivalent scene-control action
 * (`deleteAll()` in `ccm.mjs`), which shows its own confirmation dialog not tailored to this
 * combined cards+tokens cleanup and has no concept of "permanent" stacks to skip either.
 *
 * Two Live-Test-Funde 2026-08-21, both fixed here:
 * (1) The scene-clearing loop below used to iterate `canvas.cards.placeables` directly - that
 * getter returns `PlaceablesLayer#objects.children` (local v14 core source), the CardsLayer's
 * *live* PIXI children array. Clearing a card's scene-position flag mid-loop makes its
 * placeable disappear from that same live array immediately, shifting every later index down
 * by one - a classic mutate-while-iterating bug that silently skipped whichever placeable
 * happened to shift into the just-vacated slot of the `for...of` loop. Reproducible as "1
 * leftover played card after cleanup" whenever exactly two of a hero's played cards ended up
 * adjacent in iteration order. Fixed by iterating a plain-array snapshot instead.
 * (2) Clearing a played hero card's scene-position flag removed it from the canvas but left it
 * a "ghost" member of the hero's Im-Spiel-Stapel - still logically played, just invisible.
 * Nutzer-Vorschlag: reset every hero's play pile wholesale, same mechanism as the
 * "Ausgespielte Karten" sheet's own "Zurück ins Deck mischen" (`returnAllPlayedCardsToDeck()`,
 * `cards/played-cards.mjs`) - handled separately from the generic scene loop below (skipped
 * there via `playPileIds`) so each played card is only ever passed back once.
 * @returns {Promise<boolean>} Whether the cleanup actually ran (false on any guard failure or cancel).
 */
export async function cleanUpBoard() {
  if (!game.modules.get(CCM_MODULE_ID)?.active) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.CleanUpBoard.MissingCcm"));
    return false;
  }

  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.CleanUpBoard.GmOnly"));
    return false;
  }

  const scene = canvas.scene;
  if (!scene) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.CleanUpBoard.NoScene"));
    return false;
  }

  if (!scene.getFlag("aventuria", "gameBoard")) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.CleanUpBoard.WrongScene"));
    return false;
  }

  const proceed = await foundry.applications.api.Dialog.confirm({
    window: { title: game.i18n.localize("AVENTURIA_HELPERS.CleanUpBoard.ConfirmTitle") },
    content: `<p>${game.i18n.localize("AVENTURIA_HELPERS.CleanUpBoard.ConfirmBody")}</p>`,
  });
  if (!proceed) return false;

  const heroStacks = game.users.map((user) => resolveStacks(user)).filter(Boolean);
  const playPileIds = new Set(heroStacks.map((s) => s.playPile?.id).filter(Boolean));

  const removedUuids = [];
  for (const cardObject of [...canvas.cards.placeables]) {
    const card = cardObject.document.card;
    if (!card || card.getFlag(MODULE_ID, "permanentStack")) continue;
    if (playPileIds.has(card.parent?.id)) continue; // handled below via returnAllPlayedCardsToDeck
    await card.unsetFlag(CCM_MODULE_ID, scene.id);
    removedUuids.push(card.uuid);
  }
  if (removedUuids.length) {
    const remaining = new Set(scene.getFlag(CCM_MODULE_ID, "cardCollection") ?? []);
    for (const uuid of removedUuids) remaining.delete(uuid);
    await scene.setFlag(CCM_MODULE_ID, "cardCollection", Array.from(remaining));
  }

  let returnedCount = 0;
  for (const stacks of heroStacks) {
    if (!stacks.playPile?.cards?.size || !stacks.deck) continue;
    returnedCount += stacks.playPile.cards.size;
    await returnAllPlayedCardsToDeck(stacks.playPile, stacks.deck);
  }

  const tokenFolder = game.folders.find((f) => f.type === "Actor" && f.name === TOKEN_FOLDER_NAME);
  if (tokenFolder) await placeBoardTokens(tokenFolder);

  ui.notifications.info(
    game.i18n.format("AVENTURIA_HELPERS.CleanUpBoard.Done", { count: removedUuids.length + returnedCount }),
  );
  return true;
}

import { placeBoardTokens, TOKEN_FOLDER_NAME } from "../actors/import-board-tokens.mjs";

const CCM_MODULE_ID = "complete-card-management";

/**
 * Resets the Aventuria Gameboard scene after an adventure: removes every card currently
 * placed on it (back to their decks/stacks - see below for why that needs no extra move),
 * and moves the 12 board marker tokens (life points, Fertigkeit, etc.) back to their starting
 * spot via `placeBoardTokens()` (`actors/import-board-tokens.mjs`), reused wholesale instead
 * of duplicating its placement logic - already idempotent create-or-move. Hero tokens and the
 * "Startspielermarke" are deliberately untouched (same exclusion `placeBoardTokens()` itself
 * already makes, see `TOKEN_PLACEMENTS`).
 *
 * A card "on the scene" is just an extra `flags.complete-card-management.<sceneId>` position
 * flag on the `Card` document, independent of which Cards stack (deck/discard/hand/play pile)
 * it actually belongs to (confirmed for the adventure-card placement in 0.1.4.1, see
 * `CHANGELOG.md`) - clearing that flag is already "back in its stack", no separate move
 * needed. Same iteration approach as the existing `resetCardRotations()` macro
 * (`macros/reset-card-rotations.mjs`, iterates `canvas.cards.placeables`) - deliberately
 * rebuilt instead of calling Complete Card Management's own equivalent scene-control action
 * (`deleteAll()` in `ccm.mjs`), which shows its own confirmation dialog not tailored to this
 * combined cards+tokens cleanup.
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

  let cardsRemoved = 0;
  for (const cardObject of canvas.cards.placeables) {
    await cardObject.document.card.unsetFlag(CCM_MODULE_ID, scene.id);
    cardsRemoved++;
  }
  if (cardsRemoved) await scene.unsetFlag(CCM_MODULE_ID, "cardCollection");

  const tokenFolder = game.folders.find((f) => f.type === "Actor" && f.name === TOKEN_FOLDER_NAME);
  if (tokenFolder) await placeBoardTokens(tokenFolder);

  ui.notifications.info(game.i18n.format("AVENTURIA_HELPERS.CleanUpBoard.Done", { count: cardsRemoved }));
  return true;
}

import { placeBoardTokens, TOKEN_FOLDER_NAME } from "../actors/import-board-tokens.mjs";
import { resolveBoardStacks } from "./place-board-stacks.mjs";
import { resolveStacks } from "./stacks.mjs";

const CCM_MODULE_ID = "complete-card-management";

/**
 * The Cards documents that count as permanent board furniture, not adventure debris -
 * `cleanUpBoard()` leaves these placed exactly where they are instead of sweeping them off
 * the scene along with everything else. Two sources (Nutzerfeedback 2026-08-17, after the
 * first live test removed the heroes' decks/stacks too):
 * - The shared GM stacks "Erste Schritte" Schritt 6 anchors (`resolveBoardStacks()`,
 *   `place-board-stacks.mjs`).
 * - Every currently-assigned hero's Deck/Ablage/Hand (`resolveStacks()`, `cards/stacks.mjs`) -
 *   the Im-Spiel-Stapel itself isn't included since it was never placed as its own stack in
 *   the first place (wired via a canvas Region instead, see `place-hero-stacks.mjs`); the
 *   individual Ausdauer/played cards *inside* it are still adventure-specific and do get
 *   cleaned up.
 * @returns {Set<string>} Cards document UUIDs to skip.
 */
function resolvePermanentStackUuids() {
  const uuids = new Set(resolveBoardStacks().map((stack) => stack.uuid));
  for (const user of game.users) {
    const stacks = resolveStacks(user);
    if (!stacks) continue;
    for (const stack of [stacks.deck, stacks.discard, stacks.hand]) {
      if (stack) uuids.add(stack.uuid);
    }
  }
  return uuids;
}

/**
 * Resets the Aventuria Gameboard scene after an adventure: removes every *adventure-specific*
 * card currently placed on it (back to their decks/stacks - see below for why that needs no
 * extra move) while leaving permanent board furniture (the "Erste Schritte" GM stacks, every
 * hero's Deck/Ablage/Hand - see `resolvePermanentStackUuids()`) untouched, and moves the 12
 * board marker tokens (life points, Fertigkeit, etc.) back to their starting spot via
 * `placeBoardTokens()` (`actors/import-board-tokens.mjs`), reused wholesale instead of
 * duplicating its placement logic - already idempotent create-or-move. Hero tokens and the
 * "Startspielermarke" are deliberately untouched (same exclusion `placeBoardTokens()` itself
 * already makes, see `TOKEN_PLACEMENTS`).
 *
 * A card "on the scene" is just an extra `flags.complete-card-management.<sceneId>` position
 * flag on the `Card`/`Cards` document, independent of which Cards stack (deck/discard/hand/play
 * pile) it actually belongs to (confirmed for the adventure-card placement in 0.1.4.1, see
 * `CHANGELOG.md`) - clearing that flag is already "back in its stack", no separate move
 * needed. Same iteration approach as the existing `resetCardRotations()` macro
 * (`macros/reset-card-rotations.mjs`, iterates `canvas.cards.placeables`) - deliberately
 * rebuilt instead of calling Complete Card Management's own equivalent scene-control action
 * (`deleteAll()` in `ccm.mjs`), which shows its own confirmation dialog not tailored to this
 * combined cards+tokens cleanup and has no concept of "permanent" stacks to skip either.
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

  const permanentUuids = resolvePermanentStackUuids();
  const removedUuids = [];
  for (const cardObject of canvas.cards.placeables) {
    const card = cardObject.document.card;
    if (!card || permanentUuids.has(card.uuid)) continue;
    await card.unsetFlag(CCM_MODULE_ID, scene.id);
    removedUuids.push(card.uuid);
  }
  if (removedUuids.length) {
    const remaining = new Set(scene.getFlag(CCM_MODULE_ID, "cardCollection") ?? []);
    for (const uuid of removedUuids) remaining.delete(uuid);
    await scene.setFlag(CCM_MODULE_ID, "cardCollection", Array.from(remaining));
  }

  const tokenFolder = game.folders.find((f) => f.type === "Actor" && f.name === TOKEN_FOLDER_NAME);
  if (tokenFolder) await placeBoardTokens(tokenFolder);

  ui.notifications.info(game.i18n.format("AVENTURIA_HELPERS.CleanUpBoard.Done", { count: removedUuids.length }));
  return true;
}

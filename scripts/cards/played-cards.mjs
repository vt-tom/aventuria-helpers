/**
 * Card actions for the "Ausgespielte Karten" sheet
 * (scripts/sheets/played-cards-sheet.mjs) - moving a played card out of the
 * hero's Im-Spiel-Stapel, back onto the hand, into the discard pile, or back
 * into the deck (shuffled in), plus toggling a card's own exhausted state
 * (`toggleCardExhausted()` below, added 2026-08-24). The Heldenablage's
 * Ausdauer ready/spent counters (cards/endurance.mjs) remain a separate,
 * count-based mechanism for Ausdauer cards specifically - Nutzerentscheidung
 * 2026-08-17: this sheet only shows non-Ausdauer played cards
 * (project/PROJECT.md 2.2), a dedicated view for Ausdauer cards is a possible
 * later idea, not built here.
 */

import { getCardRotation, setCardRotation } from "./card-rotation.mjs";

const MODULE_ID = "aventuria-helpers";
const CCM_MODULE_ID = "complete-card-management";

/**
 * Detaches a card from every scene it's placed on - and, with `alsoModuleFlags`,
 * drops this module's `usedAsEndurance` flag / re-reveals it (`resetFace`) - via
 * a real `card.update()` **before** the card is handed to `Cards#pass()`.
 *
 * Both details matter, both learned the hard way (Live-Test-Funde 2026-08-31):
 *
 *  - **Per scene key** (`flags.complete-card-management.<sceneId>` set to a
 *    `ForcedDeletion`), never the whole `complete-card-management` namespace.
 *    Per-scene deletion is the exact shape CCM's own `unsetFlag(scope, sceneId)`
 *    produces (`ccm.mjs`), and its `updateCard` / `CanvasCard.update` only tears
 *    the canvas placeable down when it sees `flatChanges["flags.complete-card-
 *    management.<sceneId>"] instanceof ForcedDeletion`. Deleting the whole
 *    namespace leaves the placeable orphaned - and dragging that ghost then
 *    throws "The card doesn't have location data for the current scene" from
 *    CCM's `CanvasCard` constructor.
 *
 *  - **Before `pass()`, not after.** `pass()` builds the new card with
 *    `foundry.utils.mergeObject(card.toObject(), updateData)` and default
 *    `applyOperators: false`, so a `ForcedDeletion` handed to it via `updateData`
 *    is *retained un-applied* on `flags[<ns>]` rather than actioned
 *    (`common/utils/helpers.mjs`), which then clobbers a fresh placement the
 *    next time the card is played. Cleaning the *source* first means
 *    `card.toObject()` carries no scene data, so the copy `pass()` creates never
 *    spins up a placeable of its own and needs no post-fix.
 *
 * Uses `foundry.data.operators.ForcedDeletion` directly (same as core
 * `Document#unsetFlag`) rather than the legacy `flags.-=<key>` string form,
 * which logs a deprecation warning on every call in v14.
 * @param {Card} card
 * @param {{alsoModuleFlags?: boolean, resetFace?: boolean}} [options]
 * @returns {Promise<void>}
 */
export async function detachCardForReturn(card, { alsoModuleFlags = false, resetFace = false } = {}) {
  const del = () => new foundry.data.operators.ForcedDeletion();
  const update = {};
  const placements = card.flags?.[CCM_MODULE_ID];
  if (placements && (typeof placements === "object")) {
    for (const sceneId of Object.keys(placements)) {
      foundry.utils.setProperty(update, `flags.${CCM_MODULE_ID}.${sceneId}`, del());
    }
  }
  if (alsoModuleFlags) foundry.utils.setProperty(update, `flags.${MODULE_ID}.usedAsEndurance`, del());
  if (resetFace) update.face = 0;
  if (Object.keys(update).length) await card.update(update);
}

/**
 * Moves a played card from the Im-Spiel-Stapel into the discard pile.
 * @param {Card} card       The played card, currently embedded in the hero's Im-Spiel-Stapel.
 * @param {Cards} discard   The hero's discard pile (`resolveStacks().discard`).
 * @returns {Promise<Card[]>}
 */
export async function discardPlayedCard(card, discard) {
  await detachCardForReturn(card);
  return card.parent.pass(discard, [card.id]);
}

/**
 * Moves a played card back into the deck and shuffles it in.
 * @param {Card} card    The played card, currently embedded in the hero's Im-Spiel-Stapel.
 * @param {Cards} deck   The hero's deck (`resolveStacks().deck`).
 * @returns {Promise<Card[]>}
 */
export async function returnPlayedCardToDeck(card, deck) {
  await detachCardForReturn(card);
  const result = await card.parent.pass(deck, [card.id]);
  await deck.shuffle();
  return result;
}

/**
 * Moves a played card back onto the hero's hand - the primary "undo a play"
 * action (Nutzerwunsch 2026-08-19: more common than shuffling back into the
 * deck, so this replaces "Zurück ins Deck mischen" as the sheet's own button;
 * that action moved to a right-click context menu instead of being removed,
 * see `played-cards-sheet.mjs`).
 * @param {Card} card    The played card, currently embedded in the hero's Im-Spiel-Stapel.
 * @param {Cards} hand   The hero's hand (`resolveStacks().hand`).
 * @returns {Promise<Card[]>}
 */
export async function returnPlayedCardToHand(card, hand) {
  await detachCardForReturn(card);
  return card.parent.pass(hand, [card.id]);
}

/**
 * Moves an Ausdauer card (`cards/endurance.mjs`) back onto the hero's hand - the
 * "undo playing it as Ausdauer" action for the "Ausdauerkarten"-Sheet
 * (`sheets/endurance-cards-sheet.mjs`). Unlike `returnPlayedCardToHand()` it
 * also drops the `usedAsEndurance` flag (so the card stops counting towards
 * `getEnduranceStatus()` if later played normally) and re-reveals the card
 * (`face: 0` - Ausdauer play sets `face: null`).
 * @param {Card} card    The Ausdauer card, currently embedded in the hero's Im-Spiel-Stapel.
 * @param {Cards} hand   The hero's hand.
 * @returns {Promise<Card[]>}
 */
export async function returnEnduranceCardToHand(card, hand) {
  await detachCardForReturn(card, { alsoModuleFlags: true, resetFace: true });
  return card.parent.pass(hand, [card.id]);
}

/**
 * Moves an Ausdauer card into the discard pile (right-click menu on the
 * "Ausdauerkarten"-Sheet). Same flag/face cleanup as
 * `returnEnduranceCardToHand()`.
 * @param {Card} card       The Ausdauer card, currently embedded in the hero's Im-Spiel-Stapel.
 * @param {Cards} discard   The hero's discard pile.
 * @returns {Promise<Card[]>}
 */
export async function discardEnduranceCard(card, discard) {
  await detachCardForReturn(card, { alsoModuleFlags: true, resetFace: true });
  return card.parent.pass(discard, [card.id]);
}

/**
 * Whether a played card is currently exhausted (i.e. rotated) on the canvas - see
 * `toggleCardExhausted()` below for what "exhausted" means here.
 * @param {Card} card
 * @returns {boolean}
 */
export function isCardExhausted(card) {
  return getCardRotation(card).rotation !== 0;
}

/**
 * Toggles whether a played card is exhausted, using the same canvas-rotation mechanism
 * `cards/endurance.mjs` uses for a hero's Ausdauer cards and "Karten zurückdrehen"
 * (macros/reset-card-rotations.mjs) resets at round end (0° ready, 90° exhausted) - a manual
 * per-card "Karte erschöpfen" toggle on the played-cards sheet (project/TODO.md), independent
 * of a hero's Ausdauer ready/spent count, for cards exhausted by use (e.g. Aventuria's rule
 * that using a weapon exhausts the whole hero card) without an automated trigger for it yet.
 * @param {Card} card    The played card, currently embedded in the hero's Im-Spiel-Stapel.
 * @returns {Promise<boolean>} Whether the card had a canvas placement to toggle.
 */
export async function toggleCardExhausted(card) {
  return setCardRotation(card, isCardExhausted(card) ? 0 : 90);
}

/**
 * Moves every card currently in a hero's Im-Spiel-Stapel back into their deck in one batch
 * and shuffles once - used by "Board aufräumen" (`cards/cleanup-board.mjs`, Live-Test-Fund
 * 2026-08-21) to reset a hero's play pile wholesale after an adventure, instead of looping
 * `returnPlayedCardToDeck()` per card (which would shuffle once per card and, worse, leave a
 * "ghost" placeable on the canvas mid-loop the same way `cleanup-board.mjs`'s own generic
 * scene loop used to - see the fix there for that specific bug).
 *
 * Also drops the `usedAsEndurance` flag per card (`detachCardForReturn`'s `alsoModuleFlags`) -
 * `returnPlayedCardToDeck()`/`discardPlayedCard()`/`returnPlayedCardToHand()` above never had to
 * (those never run against an Ausdauer card), but board cleanup deliberately resets *every*
 * played card including Ausdauer ones, so a leftover flag here would make a reshuffled card
 * wrongly count towards `getEnduranceStatus()` (`cards/endurance.mjs`) if it's later drawn and
 * played normally instead of as Ausdauer again.
 * @param {Cards} playPile
 * @param {Cards} deck
 * @returns {Promise<Card[]>}
 */
export async function returnAllPlayedCardsToDeck(playPile, deck) {
  const cards = [...playPile.cards];
  if (!cards.length) return [];
  await Promise.all(cards.map((c) => detachCardForReturn(c, { alsoModuleFlags: true })));
  const created = await playPile.pass(deck, cards.map((c) => c.id));
  await deck.shuffle();
  return created;
}

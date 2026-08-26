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
 * Clears every complete-card-management scene-placement flag from the
 * `updateData` merged into a `Cards#pass()`-created card copy - `pass()`
 * copies the source card's *entire* data (`card.toObject()`, confirmed in
 * the local v14 core source, `client/documents/cards.mjs`) into the new
 * embedded Card it creates in the destination stack, flags included. Without
 * this, a played card - which is always placed on a scene, see
 * `cards/endurance.mjs`'s header comment on the shared placement mechanism -
 * would leave behind a "ghost" placeable: a brand new Card document
 * inheriting the old one's scene-position flag, rendered on the canvas even
 * though it's now sitting in the discard pile or shuffled into the deck.
 * Same underlying flag `cleanup-board.mjs`'s "Board aufräumen" already has to
 * account for, just via a different API (`unsetFlag()` there vs. a merged
 * deletion key here, since `pass()` builds the new card in one step).
 *
 * Exported (not just used locally) since `cards/upgrade-card.mjs`'s Erfahrungsschatz
 * card-swap needs the exact same cleanup for the same reason, even though its cards
 * are never actually scene-placed in practice (deck/Erfahrungsschatz cards, unlike
 * played ones) - defensive reuse instead of a second, near-duplicate implementation.
 * @returns {object}
 */
export function clearPlacementUpdateData() {
  return { [`flags.-=${CCM_MODULE_ID}`]: null };
}

/**
 * Moves a played card from the Im-Spiel-Stapel into the discard pile.
 * @param {Card} card       The played card, currently embedded in the hero's Im-Spiel-Stapel.
 * @param {Cards} discard   The hero's discard pile (`resolveStacks().discard`).
 * @returns {Promise<Card[]>}
 */
export async function discardPlayedCard(card, discard) {
  return card.parent.pass(discard, [card.id], { updateData: clearPlacementUpdateData() });
}

/**
 * Moves a played card back into the deck and shuffles it in.
 * @param {Card} card    The played card, currently embedded in the hero's Im-Spiel-Stapel.
 * @param {Cards} deck   The hero's deck (`resolveStacks().deck`).
 * @returns {Promise<Card[]>}
 */
export async function returnPlayedCardToDeck(card, deck) {
  const result = await card.parent.pass(deck, [card.id], { updateData: clearPlacementUpdateData() });
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
  return card.parent.pass(hand, [card.id], { updateData: clearPlacementUpdateData() });
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
 * Also strips the *entire* `aventuria-helpers` flag namespace, not just the
 * `complete-card-management` one `clearPlacementUpdateData()` already covers - a card played
 * `usedAsEndurance` (`cards/endurance.mjs`) still carries that flag afterwards, which
 * `returnPlayedCardToDeck()`/`discardPlayedCard()`/`returnPlayedCardToHand()` above never had
 * to account for (`played-cards-sheet.mjs` filters Ausdauer cards out of its own list, so
 * those three never actually run against one in practice) - but board cleanup deliberately
 * resets *every* played card including Ausdauer ones, so a leftover flag here would make a
 * reshuffled card wrongly count towards `getEnduranceStatus()` (`cards/endurance.mjs`) if it's
 * later drawn and played normally instead of as Ausdauer again.
 * @param {Cards} playPile
 * @param {Cards} deck
 * @returns {Promise<Card[]>}
 */
export async function returnAllPlayedCardsToDeck(playPile, deck) {
  const ids = playPile.cards.map((c) => c.id);
  if (!ids.length) return [];
  const updateData = { ...clearPlacementUpdateData(), [`flags.-=${MODULE_ID}`]: null };
  const result = await playPile.pass(deck, ids, { updateData });
  await deck.shuffle();
  return result;
}

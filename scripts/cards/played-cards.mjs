/**
 * Card actions for the "Ausgespielte Karten" sheet
 * (scripts/sheets/played-cards-sheet.mjs) - moving a played card out of the
 * hero's Im-Spiel-Stapel, back onto the hand, into the discard pile, or back
 * into the deck (shuffled in). Exhaust/Ready for a specific Ausdauer card
 * intentionally isn't here - Nutzerentscheidung 2026-08-17: the new sheet
 * only shows non-Ausdauer played cards for now (PROJECT.md 2.2), Ausdauer
 * stays exclusively in the Heldenablage's own ready/spent counters
 * (cards/endurance.mjs), a separate view for those is a possible later idea.
 */

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
 * @returns {object}
 */
function clearPlacementUpdateData() {
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

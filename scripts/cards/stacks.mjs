/**
 * Resolves a hero's `preparePlayer()`-created sibling stacks from their Hand.
 * Only the Hand is tracked directly (via the `complete-card-management`
 * "Player Hand" user flag, read by callers) - Deck/Ablage/Im-Spiel-Stapel are
 * found as its siblings in the same Folder, exactly as `preparePlayer()` (in
 * `aventuria/dist/index.js`) itself created them. Module-level so both the
 * Heldenablage (`apps/hero-tray.mjs`) and the Hand-Sheet ("Als Ausdauer
 * spielen", `sheets/hand-sheet.mjs`, `cards/endurance.mjs`) can resolve the
 * same stacks from a Hand document without duplicating this lookup.
 * @param {Cards|null} hand
 * @returns {{hand: Cards, deck: Cards|null, discard: Cards|null, playPile: Cards|null}|null}
 */
export function resolveHandStacks(hand) {
  if (!hand) return null;

  const siblings = hand.folder ? game.cards.filter((c) => c.folder === hand.folder) : [];
  const deck = siblings.find((c) => c.type === "deck") ?? null;
  // aventuria's preparePlayer() flags exactly one of the two "pile"-type
  // stacks as the Im-Spiel-Stapel ("aventuria.pileType" === "play"); the
  // other, unflagged one is the discard pile.
  const playPile = siblings.find((c) => c.type === "pile" && c.getFlag("aventuria", "pileType") === "play") ?? null;
  const discard = siblings.find((c) => c.type === "pile" && c !== playPile) ?? null;

  return { hand, deck, discard, playPile };
}

/**
 * Resolves a user's hero and the four Cards stacks `preparePlayer()` creates for
 * them, without duplicating any of that macro's own bookkeeping: only the Hand is
 * tracked via a user flag, so `resolveHandStacks()` finds Deck/Ablage/Im-Spiel-Stapel
 * as its siblings. Defaults to the current user so existing call sites (the
 * Heldenablage) don't need to change; the Guide's "Helden auswählen" section passes
 * an explicit `user` when a GM is placing another player's stacks on the board.
 * @param {User} [user]
 * @returns {{actor: Actor, hand: Cards, deck: Cards|null, discard: Cards|null}|null}
 */
export function resolveStacks(user = game.user) {
  const actor = user.character;
  const handId = user.getFlag("complete-card-management", "playerHand");
  const hand = handId ? game.cards.get(handId) : null;
  if (!actor || !hand) return null;

  const stacks = resolveHandStacks(hand);
  return stacks && { actor, ...stacks };
}

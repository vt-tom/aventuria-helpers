/**
 * Resolves a hero's `preparePlayer()`-created sibling stacks from their Hand.
 * Only the Hand is tracked directly (via the `complete-card-management`
 * "Player Hand" user flag, read by callers) - Deck/Ablage/Im-Spiel-Stapel are
 * found as its siblings in the same Folder, exactly as `preparePlayer()` (in
 * `aventuria/dist/index.js`) itself created them. Module-level so both the
 * Heldenablage (`apps/hero-tray.mjs`) and the Hand-Sheet ("Als Ausdauer
 * spielen", `sheets/hand-sheet.mjs`, `cards/endurance.mjs`) can resolve the
 * same stacks from a Hand document without duplicating this lookup.
 *
 * `experience` (the "Erfahrungsschatz", `cards/upgrade-card.mjs`) is this
 * module's own addition, not part of `preparePlayer()`'s output - it's the
 * other `type:"deck"` sibling in the same Folder, distinguished from the main
 * Deck by `flags.aventuria-helpers.stackType === "experience"` (same
 * disambiguation-by-flag idea as the PlayPile/Discard split below). `null` for
 * heroes assigned before this feature existed, until `ensureExperienceStack()`
 * (`cards/prepare-hero.mjs`) backfills it.
 * @param {Cards|null} hand
 * @returns {{hand: Cards, deck: Cards|null, discard: Cards|null, playPile: Cards|null, experience: Cards|null}|null}
 */
export function resolveHandStacks(hand) {
  if (!hand) return null;

  const siblings = hand.folder ? game.cards.filter((c) => c.folder === hand.folder) : [];
  const experience = siblings.find((c) => c.type === "deck" && c.getFlag("aventuria-helpers", "stackType") === "experience") ?? null;
  const deck = siblings.find((c) => c.type === "deck" && c !== experience) ?? null;
  // aventuria's preparePlayer() flags exactly one of the two "pile"-type
  // stacks as the Im-Spiel-Stapel ("aventuria.pileType" === "play"); the
  // other, unflagged one is the discard pile.
  const playPile = siblings.find((c) => c.type === "pile" && c.getFlag("aventuria", "pileType") === "play") ?? null;
  const discard = siblings.find((c) => c.type === "pile" && c !== playPile) ?? null;

  return { hand, deck, discard, playPile, experience };
}

/**
 * Resolves a user's hero and the Cards stacks `preparePlayer()` (plus this module's
 * own Erfahrungsschatz addition) creates for them, without duplicating any of that
 * macro's own bookkeeping: only the Hand is tracked via a user flag, so
 * `resolveHandStacks()` finds Deck/Ablage/Im-Spiel-Stapel/Erfahrungsschatz as its
 * siblings. Defaults to the current user so existing call sites (the Heldenablage)
 * don't need to change; the Guide's "Helden auswählen" section passes an explicit
 * `user` when a GM is placing another player's stacks on the board.
 * @param {User} [user]
 * @returns {{actor: Actor, hand: Cards, deck: Cards|null, discard: Cards|null, experience: Cards|null}|null}
 */
export function resolveStacks(user = game.user) {
  const actor = user.character;
  const handId = user.getFlag("complete-card-management", "playerHand");
  const hand = handId ? game.cards.get(handId) : null;
  if (!actor || !hand) return null;

  const stacks = resolveHandStacks(hand);
  return stacks && { actor, ...stacks };
}

/**
 * Resolves all four `preparePlayer()` sibling stacks starting from *any* one
 * of them (Deck/Hand/Ablage/Im-Spiel-Stapel), purely by Folder membership -
 * unlike `resolveHandStacks()`, which trusts the document it's handed to be
 * the Hand. Used where the starting point is the Im-Spiel-Stapel (the
 * "Ausgespielte Karten" sheet), especially once the Heldenablage can be
 * pointed at another player's hero (feature 2.5): a bare `resolveStacks()`
 * there would resolve the *viewer's* stacks, not the sheet's actual hero.
 * @param {Cards|null} stack
 * @returns {{deck: Cards|null, hand: Cards|null, discard: Cards|null, playPile: Cards|null}|null}
 */
export function resolveSiblingStacks(stack) {
  if (!stack?.folder) return null;
  const siblings = game.cards.filter((c) => c.folder === stack.folder);
  const deck = siblings.find((c) => c.type === "deck") ?? null;
  const hand = siblings.find((c) => c.type === "hand") ?? null;
  const playPile = siblings.find((c) => c.type === "pile" && c.getFlag("aventuria", "pileType") === "play") ?? null;
  const discard = siblings.find((c) => c.type === "pile" && c !== playPile) ?? null;
  return { deck, hand, discard, playPile };
}

/**
 * Resolves an actor's own stacks regardless of which user is currently viewing their
 * sheet - `resolveStacks()` alone only ever looks at `game.user`, which breaks for a
 * GM opening a player's hero sheet (or a player opening someone else's, if permitted).
 * Finds the owning user the same way `prepareAndAssignHero()` assigns one
 * (`user.character`), then delegates to `resolveStacks(user)`.
 * @param {Actor} actor
 * @returns {{actor: Actor, hand: Cards, deck: Cards|null, discard: Cards|null, experience: Cards|null}|null}
 */
export function resolveStacksForActor(actor) {
  const owner = game.users.find((u) => u.character === actor);
  return owner ? resolveStacks(owner) : null;
}

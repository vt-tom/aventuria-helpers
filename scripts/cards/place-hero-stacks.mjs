import { resolveStacks } from "./stacks.mjs";
import { recordPlayerSlotAssignment } from "./player-slots.mjs";

const CCM_MODULE_ID = "complete-card-management";

/**
 * Canvas placements for a hero's Deck/Ablage/Hand and Token, one entry per player
 * slot (1-6, matching the "Spielernummer" `preparePlayer()` already asks for).
 * Deliberately excludes the Im-Spiel-Stapel - that one is already wired via a
 * canvas region inside `preparePlayer()` itself, no separate placement needed.
 * Captured the same way `place-board-stacks.mjs`'s `PLACEMENTS` were: place each
 * stack/the token by hand on the Aventuria `Spielbrett`/`Gameboard` scene at the
 * slot's spot, then read back the resulting position - Cards via
 * `flags.complete-card-management.<sceneId>`, the Token directly via its own
 * `x`/`y`/`rotation`. See CHANGELOG.md for how these were obtained.
 */
const HERO_PLACEMENTS = {
  1: {
    deck: { x: 3399, y: 2499 },
    discard: { x: 3052, y: 2504 },
    hand: { x: 4267, y: 2503 },
    token: { x: 3762, y: 2502, rotation: 0 },
  },
  2: {
    deck: { x: 3403, y: 4015 },
    discard: { x: 3053, y: 4009 },
    hand: { x: 4262, y: 4013 },
    token: { x: 3762, y: 4015, rotation: 0 },
  },
  3: {
    deck: { x: 3398, y: 5622 },
    discard: { x: 3049, y: 5624 },
    hand: { x: 4255, y: 5618 },
    token: { x: 3766, y: 5624, rotation: 0 },
  },
  4: {
    deck: { x: 7989, y: 2504 },
    discard: { x: 7640, y: 2505 },
    hand: { x: 8836, y: 2502 },
    token: { x: 8351, y: 2505, rotation: 0 },
  },
  5: {
    deck: { x: 7982, y: 4009 },
    discard: { x: 7642, y: 4011 },
    hand: { x: 8860, y: 4014 },
    token: { x: 8357, y: 4001, rotation: 0 },
  },
  6: {
    deck: { x: 7984, y: 5620 },
    discard: { x: 7644, y: 5618 },
    hand: { x: 8854, y: 5627 },
    token: { x: 8351, y: 5620, rotation: 0 },
  },
};

/**
 * Places a hero's Deck, Ablage (discard pile), Hand and their Token onto the
 * currently viewed scene, at the spot matching the given player slot, locked so
 * they aren't moved by accident. The Cards part mirrors `placeBoardStacks()`'s
 * mechanism exactly (same `complete-card-management` per-scene flag, same
 * `cardCollection` registration), just parameterized by player slot instead of a
 * fixed board-wide layout. The Token is created via the standard core
 * `Actor#getTokenDocument()` + `TokenDocument.create()` pair (same pair core's own
 * drag-from-sidebar flow uses, `client/pixi/layers/placeables/tokens.js` in the
 * local Foundry installation) if none exists yet for this actor on the scene, or
 * just moved there via `update()` if one already does - always GM-only, since
 * writing `scene.cardCollection` needs Scene update rights a regular player
 * doesn't have.
 * Also shuffles the Deck (Nutzerwunsch 2026-08-14: folds the guide's former separate
 * "Deck mischen" step into this one, same "fold a small step into a bigger one"
 * precedent as the fate deck shuffle already folded into `placeBoardStacks()`).
 * @param {User} user - The player whose stacks should be placed.
 * @param {number} playerNumber - Player slot (1-6) whose board position to use.
 * @returns {Promise<boolean>} Whether the placement actually happened - lets
 *   callers (the guide wizard) only auto-advance to the next step on success.
 */
export async function placeHeroStacks(user, playerNumber) {
  if (!game.modules.get(CCM_MODULE_ID)?.active) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.PickHero.Steps.PlaceStacks.MissingCcm"));
    return false;
  }

  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.PickHero.Steps.PlaceStacks.GmOnly"));
    return false;
  }

  const scene = canvas.scene;
  if (!scene) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.PickHero.Steps.PlaceStacks.NoScene"));
    return false;
  }

  if (!scene.getFlag("aventuria", "gameBoard")) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.PickHero.Steps.PlaceStacks.WrongScene"));
    return false;
  }

  const spot = HERO_PLACEMENTS[playerNumber];
  if (!spot) {
    ui.notifications.warn(
      game.i18n.format("AVENTURIA_HELPERS.PickHero.Steps.PlaceStacks.NotConfigured", { player: playerNumber }),
    );
    return false;
  }

  const stacks = resolveStacks(user);
  if (!stacks?.deck || !stacks?.discard) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.PickHero.Steps.PlaceStacks.NotPrepared"));
    return false;
  }

  const resolved = [
    { card: stacks.deck, position: spot.deck },
    { card: stacks.discard, position: spot.discard },
    { card: stacks.hand, position: spot.hand },
  ].filter((r) => r.position);

  const cardCollection = new Set(scene.getFlag(CCM_MODULE_ID, "cardCollection") ?? []);
  for (const { card } of resolved) cardCollection.add(card.uuid);
  await scene.setFlag(CCM_MODULE_ID, "cardCollection", Array.from(cardCollection));

  await Promise.all(
    resolved.map(({ card, position }) =>
      card.setFlag(CCM_MODULE_ID, scene.id, {
        x: position.x,
        y: position.y,
        rotation: 0,
        sort: card.sort,
        locked: true,
      }),
    ),
  );

  if (spot.token) await placeHeroToken(stacks.actor, scene, spot.token);

  await stacks.deck.shuffle();
  await recordPlayerSlotAssignment(playerNumber, user);

  ui.notifications.info(
    game.i18n.format("AVENTURIA_HELPERS.PickHero.Steps.PlaceStacks.Done", { player: playerNumber }),
  );
  return true;
}

/**
 * Creates a Token for `actor` on `scene` at `position`, or - if one already
 * exists there from a previous run - just moves it, so re-running "Verankern"
 * for the same hero doesn't pile up duplicate tokens. Left unlocked (unlike the
 * Cards stacks above) - Nutzerwunsch 2026-08-14: the hero's own token needs to
 * stay draggable during play, only the administrative card stacks should be
 * locked in place.
 * @param {Actor} actor
 * @param {Scene} scene
 * @param {{x: number, y: number, rotation: number}} position
 * @returns {Promise<void>}
 */
async function placeHeroToken(actor, scene, position) {
  const existing = scene.tokens.find((t) => t.actorId === actor.id);
  if (existing) {
    await existing.update({ x: position.x, y: position.y, rotation: position.rotation });
    return;
  }

  const tokenDoc = await actor.getTokenDocument(
    { x: position.x, y: position.y, rotation: position.rotation },
    { parent: scene },
  );
  await tokenDoc.constructor.create(tokenDoc, { parent: scene });
}

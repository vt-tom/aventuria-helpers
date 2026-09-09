/**
 * "Als Ausdauer spielen": lets a player decide, from their Hand, that a card
 * is spent as Ausdauer rather than played normally - without touching
 * `aventuria`'s own single "Im Spiel Stapel" flow (can't edit that module).
 * Both kinds of card still end up in the same Im-Spiel-Stapel via the same
 * scene region/`moveCard` behavior `aventuria`'s own `preparePlayer()` wires
 * up - only a flag on the Card tells them apart afterwards, and the card's
 * existing canvas rotation (already used for the "reset card rotations at
 * round end" macro) doubles as its ready/spent state, so no extra tracking
 * of our own is needed for that part.
 */

import { getCardRotation, setCardRotation } from "./card-rotation.mjs";

const MODULE_ID = "aventuria-helpers";
const CCM_MOVE_CARD_TYPE = "complete-card-management.moveCard";

/**
 * Plays a card from hand as Ausdauer: flips it face-down, tags it, and places
 * it on the hero's own drop zone on the currently viewed scene - the same
 * `placeCard()` call CCM itself uses for a manual canvas drag, so the
 * region's existing `moveCard` behavior picks it up and passes it into the
 * Im-Spiel-Stapel exactly like a normally played card would be.
 * @param {Cards} playPile   The hero's Im-Spiel-Stapel (`resolveHandStacks(hand).playPile`).
 * @param {Card} card        The card being played, currently in the hero's hand.
 * @returns {Promise<boolean>} Whether the card was placed.
 */
export async function playCardAsEndurance(playPile, card) {
  if (!canvas.scene) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.HeroTray.NoScene"));
    return false;
  }

  const region = findPlayRegion(playPile);
  if (!region?.object) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.HeroTray.NoPlayRegion"));
    return false;
  }

  const { x, y } = region.object.center;
  await card.update({ face: null, [`flags.${MODULE_ID}.usedAsEndurance`]: true });
  await ccm.api.placeCard(card, { x, y, sceneId: canvas.scene.id });
  return true;
}

/**
 * Plays a card from hand normally (not as Ausdauer): places it on the hero's
 * own drop zone like `playCardAsEndurance` does, but keeps its current face
 * (so the played card is revealed, not hidden) and pays its Ausdauer cost -
 * an Aktionskarte's `system.cost` ("Ausdauer Kosten", see `aventuria`'s own
 * `AventuriaAction` schema) - by exhausting that many ready Ausdauer cards.
 * Replaces core Foundry's `Cards#playDialog` (the "which stack?" prompt CCM's
 * own play button opens) - Aventuria only ever has one legal target, the
 * hero's Im-Spiel-Stapel, so that prompt is just friction here. Cards without
 * a `cost` field (i.e. not an Aktionskarte) play for free.
 * @param {Cards} playPile   The hero's Im-Spiel-Stapel (`resolveHandStacks(hand).playPile`).
 * @param {Card} card        The card being played, currently in the hero's hand.
 * @param {{free?: boolean}} [options] `free: true` plays the card without paying (or even
 *   checking) its Ausdauer cost - the "ohne Ausdauer spielen" escape hatch a player picks
 *   per play via `promptPlayCost()` in `scripts/sheets/hand-sheet.mjs`, chosen deliberately
 *   over a persistent toggle (Nutzerentscheidung 2026-08-14).
 * @returns {Promise<boolean>} Whether the card was played.
 */
export async function playCard(playPile, card, { free = false } = {}) {
  if (!canvas.scene) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.HeroTray.NoScene"));
    return false;
  }

  const cost = free ? 0 : (card.system?.cost ?? 0);
  if (cost > getEnduranceStatus(playPile).ready) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.HeroTray.NotEnoughEndurance"));
    return false;
  }

  const region = findPlayRegion(playPile);
  if (!region?.object) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.HeroTray.NoPlayRegion"));
    return false;
  }

  const { x, y } = region.object.center;
  await ccm.api.placeCard(card, { x, y, sceneId: canvas.scene.id });
  for (let i = 0; i < cost; i++) await exhaustEndurance(playPile);
  return true;
}

/**
 * Finds the scene region wired - via CCM's `moveCard` behavior - to the given
 * pile, i.e. the hero's own drop zone on the currently viewed scene.
 * @param {Cards} pile
 * @returns {RegionDocument|null}
 */
function findPlayRegion(pile) {
  for (const region of canvas.scene.regions) {
    const wired = region.behaviors.some(
      (b) => b.type === CCM_MOVE_CARD_TYPE && b.system.targetStack?.id === pile.id,
    );
    if (wired) return region;
  }
  return null;
}

/**
 * Resolves every Ausdauer card currently sitting in the Im-Spiel-Stapel, each with its
 * normalized rotation (`getCardRotation()`, cards/card-rotation.mjs) - rather than assuming the
 * currently viewed scene is the one it was placed on.
 *
 * Exported (not just used locally) since the "Ausdauerkarten"-Sheet
 * (`sheets/endurance-cards-sheet.mjs`) shows this exact per-card list, not just
 * the ready/spent counts `getEnduranceStatus()` derives from it.
 * @param {Cards} playPile
 * @returns {{card: Card, sceneId: string|undefined, rotation: number}[]}
 */
export function getEnduranceCards(playPile) {
  const cards = [];
  for (const card of playPile.cards) {
    if (!card.getFlag(MODULE_ID, "usedAsEndurance")) continue;
    cards.push({ card, ...getCardRotation(card) });
  }
  return cards;
}

/**
 * Counts the hero's Ausdauer cards, split into ready (rotation 0°) and spent
 * (anything else).
 * @param {Cards} playPile
 * @returns {{ready: number, spent: number}}
 */
export function getEnduranceStatus(playPile) {
  const cards = getEnduranceCards(playPile);
  return {
    ready: cards.filter((c) => c.rotation === 0).length,
    spent: cards.filter((c) => c.rotation !== 0).length,
  };
}

/**
 * Exhausts one ready Ausdauer card (rotates it 90°) - the Heldenablage
 * equivalent of physically turning a card sideways on the table. Which
 * specific card (when several are ready) is arbitrary; only the count
 * matters for tracking purposes.
 * @param {Cards} playPile
 * @returns {Promise<boolean>} Whether a card was exhausted (false if none were ready).
 */
export async function exhaustEndurance(playPile) {
  const target = getEnduranceCards(playPile).find((c) => c.rotation === 0);
  if (!target) return false;
  return setCardRotation(target.card, 90);
}

/**
 * Makes one spent Ausdauer card ready again (rotates it back to 0°) -
 * independent of `resetCardRotations()` (which resets every card on the
 * scene, endurance or not, typically run once at round end); this lets a
 * player free up a single Ausdauer card on demand.
 * @param {Cards} playPile
 * @returns {Promise<boolean>} Whether a card was made ready (false if none were spent).
 */
export async function readyEndurance(playPile) {
  const target = getEnduranceCards(playPile).find((c) => c.rotation !== 0);
  if (!target) return false;
  return setCardRotation(target.card, 0);
}

/**
 * Shared canvas-rotation helpers for cards placed via Complete Card Management. Both a hero's
 * Ausdauer cards (cards/endurance.mjs) and the generic "Karte erschöpfen" toggle on the
 * played-cards sheet (cards/played-cards.mjs) model ready/spent as the same underlying
 * per-scene `rotation` flag CCM's own card HUD rotate control writes (0° ready, anything else
 * spent) - extracted here instead of duplicated once the played-cards sheet grew its own
 * generic exhaust toggle (project/TODO.md).
 */

const CCM_MODULE_ID = "complete-card-management";

/**
 * Reads a card's current canvas rotation, normalized into [0, 360) - CCM's own rotate control
 * just adds/subtracts 90° without wrapping, so a full turn can land on 360 rather than back at 0.
 * @param {Card} card
 * @returns {{sceneId: string|undefined, rotation: number}}
 */
export function getCardRotation(card) {
  const placements = card.flags?.[CCM_MODULE_ID] ?? {};
  const sceneId = Object.keys(placements).find((key) => placements[key]?.rotation !== undefined);
  const rawRotation = sceneId ? placements[sceneId].rotation : 0;
  return { sceneId, rotation: ((rawRotation % 360) + 360) % 360 };
}

/**
 * Sets a card's canvas rotation directly (bypassing the +/-90° stepping CCM's own HUD control
 * does) - a no-op if the card has no canvas placement to update.
 * @param {Card} card
 * @param {number} rotation
 * @returns {Promise<boolean>} Whether the card had a placement to update.
 */
export async function setCardRotation(card, rotation) {
  const { sceneId } = getCardRotation(card);
  if (!sceneId) return false;
  await card.update({ [`flags.${CCM_MODULE_ID}.${sceneId}.rotation`]: rotation });
  return true;
}

const CCM_MODULE_ID = "complete-card-management";

/**
 * Resets the rotation of every card currently placed on the viewed scene back to 0°.
 * Requires Complete Card Management (cards are placed on the canvas by that module,
 * which stores their rotation as a per-scene flag on the Card/Cards document).
 * @returns {Promise<void>}
 */
export async function resetCardRotations() {
  if (!game.modules.get(CCM_MODULE_ID)?.active) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Macros.ResetCardRotations.MissingCcm"));
    return;
  }

  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Macros.ResetCardRotations.GmOnly"));
    return;
  }

  if (!canvas.cards) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Macros.ResetCardRotations.NoScene"));
    return;
  }

  const sceneId = canvas.scene.id;
  const updates = [];
  for (const cardObject of canvas.cards.placeables) {
    const card = cardObject.document.card;
    const flagData = card.getFlag(CCM_MODULE_ID, sceneId);
    if (flagData?.rotation) updates.push(card.update({ [`flags.${CCM_MODULE_ID}.${sceneId}.rotation`]: 0 }));
  }

  if (!updates.length) {
    ui.notifications.info(game.i18n.localize("AVENTURIA_HELPERS.Macros.ResetCardRotations.NoneRotated"));
    return;
  }

  await Promise.all(updates);
  ui.notifications.info(game.i18n.format("AVENTURIA_HELPERS.Macros.ResetCardRotations.Done", { count: updates.length }));
}

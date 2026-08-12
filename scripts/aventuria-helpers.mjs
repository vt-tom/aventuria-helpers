import { AventuriaHelpersHeroSheet } from "./sheets/hero-sheet.mjs";
import { resetCardRotations } from "./macros/reset-card-rotations.mjs";
import { openWelcomeScreen } from "./macros/open-welcome-screen.mjs";
import { registerCombat, registerEnemyPhaseCombatant } from "./documents/combat.mjs";
import { registerHeroTray } from "./apps/hero-tray.mjs";
import { registerHandSheet } from "./sheets/hand-sheet.mjs";

const MODULE_ID = "aventuria-helpers";

Hooks.once("init", () => {
  foundry.documents.collections.Actors.registerSheet(MODULE_ID, AventuriaHelpersHeroSheet, {
    types: ["aventuria.hero"],
    makeDefault: false,
    label: "AVENTURIA_HELPERS.HeroSheet.Label",
  });

  registerCombat();
  registerEnemyPhaseCombatant();
  // Depends on globalThis.ccm, which complete-card-management's own init hook
  // sets up - safe here since relationships.requires guarantees it ran first.
  registerHandSheet();
  registerHeroTray();

  game.modules.get(MODULE_ID).api = { resetCardRotations, openWelcomeScreen };
});

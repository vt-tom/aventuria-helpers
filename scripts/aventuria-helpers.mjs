import { AventuriaHelpersHeroSheet } from "./sheets/hero-sheet.mjs";
import { resetCardRotations } from "./macros/reset-card-rotations.mjs";
import { openWelcomeScreen } from "./macros/open-welcome-screen.mjs";
import { registerCombat, registerEnemyPhaseCombatant } from "./documents/combat.mjs";

const MODULE_ID = "aventuria-helpers";

Hooks.once("init", () => {
  foundry.documents.collections.Actors.registerSheet(MODULE_ID, AventuriaHelpersHeroSheet, {
    types: ["aventuria.hero"],
    makeDefault: false,
    label: "AVENTURIA_HELPERS.HeroSheet.Label",
  });

  registerCombat();
  registerEnemyPhaseCombatant();

  game.modules.get(MODULE_ID).api = { resetCardRotations, openWelcomeScreen };
});

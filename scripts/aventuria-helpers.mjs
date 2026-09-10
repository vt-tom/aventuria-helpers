import { AventuriaHelpersHeroSheet } from "./sheets/hero-sheet.mjs";
import { AventuriaHelpersCardHeroSheet } from "./sheets/card-hero-sheet.mjs";
import { registerWelcomeScreenReopen } from "./apps/welcome-screen.mjs";
import { registerChangelogAutoOpen } from "./apps/changelog.mjs";
import { resetCardRotations } from "./macros/reset-card-rotations.mjs";
import { openWelcomeScreen } from "./macros/open-welcome-screen.mjs";
import { cleanUpBoard } from "./cards/cleanup-board.mjs";
import { exhaustHero, readyHero } from "./actors/hero-exhaust.mjs";
import {
  registerCombat, registerEnemyPhaseCombatant, registerRoundEndCombatant, registerHideRotationInitiative,
} from "./documents/combat.mjs";
import { registerHeroTray } from "./apps/hero-tray.mjs";
import { registerHandSheet } from "./sheets/hand-sheet.mjs";
import { registerPlayedCardsSheet } from "./sheets/played-cards-sheet.mjs";
import { registerEnduranceCardsSheet } from "./sheets/endurance-cards-sheet.mjs";
import { registerPlayerSlotAssignments } from "./cards/player-slots.mjs";
import { registerAdventureState } from "./cards/adventure-state.mjs";
import { registerExperienceStackMigration, migrateExperienceStacks } from "./cards/experience-stack.mjs";
import { registerCardPlacementCleanup, cleanUpBrokenCardPlacements } from "./cards/migrate-card-placements.mjs";
import { registerPlayerHandAssignmentFix, fixMisassignedPlayerHands } from "./cards/migrate-hand-assignment.mjs";

const MODULE_ID = "aventuria-helpers";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "cardSheetNavigationSide", {
    scope: "client",
    config: false,
    type: String,
    default: "left",
  });

  // Manually-moved position of the Hand/Ausgespielte-Karten sheets, so it survives fully
  // closing and reopening them - see DockableSheetMixin's own doc comment (TODO.md Bugs,
  // 2026-08-24). `{}` means "no override, stay docked".
  for (const key of ["handSheetPosition", "playedCardsSheetPosition", "enduranceCardsSheetPosition"]) {
    game.settings.register(MODULE_ID, key, {
      scope: "client",
      config: false,
      type: Object,
      default: {},
    });
  }

  foundry.documents.collections.Actors.registerSheet(MODULE_ID, AventuriaHelpersHeroSheet, {
    types: ["aventuria.hero"],
    makeDefault: false,
    label: "AVENTURIA_HELPERS.HeroSheet.Label",
  });
  foundry.documents.collections.Actors.registerSheet(MODULE_ID, AventuriaHelpersCardHeroSheet, {
    types: ["aventuria.hero"],
    makeDefault: true,
    label: "AVENTURIA_HELPERS.CardHeroSheet.Label",
  });

  registerWelcomeScreenReopen();
  registerChangelogAutoOpen();
  registerPlayerSlotAssignments();
  registerAdventureState();
  registerExperienceStackMigration();
  registerCardPlacementCleanup();
  registerPlayerHandAssignmentFix();
  registerCombat();
  registerEnemyPhaseCombatant();
  registerRoundEndCombatant();
  registerHideRotationInitiative();
  // Depends on globalThis.ccm, which complete-card-management's own init hook
  // sets up - safe here since relationships.requires guarantees it ran first.
  registerHandSheet();
  registerPlayedCardsSheet();
  registerEnduranceCardsSheet();
  registerHeroTray();

  game.modules.get(MODULE_ID).api = {
    resetCardRotations, openWelcomeScreen, cleanUpBoard, exhaustHero, readyHero, migrateExperienceStacks,
    cleanUpBrokenCardPlacements, fixMisassignedPlayerHands,
  };
});

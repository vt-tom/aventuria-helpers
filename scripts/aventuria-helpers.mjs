import { AventuriaHelpersHeroSheet } from "./sheets/hero-sheet.mjs";

const MODULE_ID = "aventuria-helpers";

Hooks.once("init", () => {
  foundry.documents.collections.Actors.registerSheet(MODULE_ID, AventuriaHelpersHeroSheet, {
    types: ["aventuria.hero"],
    makeDefault: false,
    label: "AVENTURIA_HELPERS.HeroSheet.Label",
  });
});

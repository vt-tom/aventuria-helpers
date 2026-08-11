const { api, sheets } = foundry.applications;

/** Rows of tiered categories ("leicht/mittel/schwer" etc.) shown as toggle-pips. */
const CATEGORY_ROWS = [
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Close", keys: ["lightClose", "mediumClose", "heavyClose"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Ranged", keys: ["lightRanged", "mediumRanged", "heavyRanged"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Armor", keys: ["lightArmor", "mediumArmor", "heavyArmor"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Spell", keys: ["lightSpell", "complexSpell"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Chant", keys: ["lightChant", "complexChant"] },
];

/** Untiered categories, shown as labelled toggle-chips. */
const OTHER_CATEGORIES = ["equipment", "advantage", "disadvantage", "talent", "companion"];

/**
 * Alternative actor sheet for the Aventuria `hero` actor subtype: a "Held" card and
 * a "Talente" card shown side by side (echoing the physical hero/skill card pair)
 * in a clean, flat "Almanach" palette rather than a literal parchment replica.
 * Registered as a selectable (non-default) sheet so the generic Universal Tabletop
 * System sheet remains available.
 */
export class AventuriaHelpersHeroSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["aventuria-helpers", "hero-sheet"],
    position: { width: 760, height: 780 },
    window: { resizable: true },
    actions: {
      rollTest: AventuriaHelpersHeroSheet.#rollTest,
      rollDamage: AventuriaHelpersHeroSheet.#rollDamage,
      toggleCategory: AventuriaHelpersHeroSheet.#toggleCategory,
    },
    form: { submitOnChange: true },
  };

  /** @inheritdoc */
  static PARTS = {
    sheet: {
      template: "modules/aventuria-helpers/templates/hero-sheet.hbs",
      scrollable: [""],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    Object.assign(context, {
      actor: this.actor,
      system,
      editable: this.isEditable,
      owner: this.actor.isOwner,
      config: CONFIG.Aventuria,
      levelChoices: { 1: "I", 2: "II", 3: "III" },
      categoryRows: CATEGORY_ROWS.map((row) => ({
        label: row.label,
        cells: row.keys.map((key) => ({
          key,
          label: CONFIG.Aventuria.cardCategories[key],
          active: system.categories.has(key),
        })),
      })),
      otherCategories: OTHER_CATEGORIES.map((key) => ({
        key,
        label: CONFIG.Aventuria.cardCategories[key],
        active: system.categories.has(key),
      })),
      enrichedSpecialAbility: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.specialAbility.description,
        { relativeTo: this.actor, secrets: this.actor.isOwner },
      ),
    });

    return context;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Opens the standard Aventuria "Probe würfeln" dialog for this hero.
   * @this AventuriaHelpersHeroSheet
   */
  static async #rollTest() {
    await this.actor.system.rollTest();
  }

  /**
   * Opens the standard Aventuria "Schadenswurf" dialog for this hero.
   * @this AventuriaHelpersHeroSheet
   */
  static async #rollDamage() {
    await this.actor.system.rollDamage();
  }

  /**
   * Toggles one allowed action-card category on/off.
   * @this AventuriaHelpersHeroSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #toggleCategory(event, target) {
    if (!this.isEditable) return;
    const key = target.dataset.category;
    const categories = new Set(this.actor.system.categories);
    if (categories.has(key)) categories.delete(key);
    else categories.add(key);
    await this.actor.update({ "system.categories": Array.from(categories) });
  }
}

const { api, sheets } = foundry.applications;

const AVENTURIA_ICONS = "modules/aventuria/assets/icons/";

/** Icon file (relative to AVENTURIA_ICONS) for each Aventuria card category, or null if no matching icon ships with the base module. */
const CATEGORY_ICONS = {
  lightClose: "light-close-combat-weapon.webp",
  mediumClose: "medium-close-combat-weapon.webp",
  heavyClose: "heavy-close-combat-weapon.webp",
  lightRanged: "light-ranged-combat-weapon.webp",
  mediumRanged: "medium-ranged-combat-weapon.webp",
  heavyRanged: "heavy-ranged-combat-weapon.webp",
  lightArmor: "light-armor.webp",
  mediumArmor: "medium-armor.webp",
  heavyArmor: "heavy-armor.webp",
  equipment: "equipment.webp",
  advantage: "advantage.webp",
  disadvantage: null,
  talent: "talent.webp",
  lightSpell: "light-spell.webp",
  complexSpell: "complex-spell.webp",
  lightChant: "light-liturgical-chant.webp",
  complexChant: "complex-liturgical-chant.webp",
  companion: "companion.webp",
};

/** Rows of the "erlaubte Aktionskarten" table, in physical-card reading order. */
const CATEGORY_ROWS = [
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Close", keys: ["lightClose", "mediumClose", "heavyClose"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Ranged", keys: ["lightRanged", "mediumRanged", "heavyRanged"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Armor", keys: ["lightArmor", "mediumArmor", "heavyArmor"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Spell", keys: ["lightSpell", "complexSpell"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Chant", keys: ["lightChant", "complexChant"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Other", keys: ["equipment", "advantage", "disadvantage", "talent", "companion"] },
];

/**
 * Alternative actor sheet for the Aventuria `hero` actor subtype, styled after the
 * physical hero/skill cards. Registered as a selectable (non-default) sheet so the
 * generic Universal Tabletop System sheet remains available.
 */
export class AventuriaHelpersHeroSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["aventuria-helpers", "hero-sheet"],
    position: { width: 760, height: 860 },
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
      icons: {
        close: AVENTURIA_ICONS + "close-combat.webp",
        ranged: AVENTURIA_ICONS + "ranged-combat.webp",
        magic: AVENTURIA_ICONS + "magic.webp",
        dodge: AVENTURIA_ICONS + "dodge.webp",
        life: AVENTURIA_ICONS + "life-point.webp",
        endurance: AVENTURIA_ICONS + "endurance.webp",
        exhaust: AVENTURIA_ICONS + "exhaust-card.webp",
        chalice: AVENTURIA_ICONS + "magic-chalice.webp",
        talent: AVENTURIA_ICONS + "talent.webp",
        level: `${AVENTURIA_ICONS}level-${system.level ?? 1}.webp`,
      },
      categoryRows: CATEGORY_ROWS.map((row) => ({
        label: row.label,
        cells: row.keys.map((key) => ({
          key,
          label: CONFIG.Aventuria.cardCategories[key],
          icon: CATEGORY_ICONS[key] ? AVENTURIA_ICONS + CATEGORY_ICONS[key] : null,
          active: system.categories.has(key),
        })),
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

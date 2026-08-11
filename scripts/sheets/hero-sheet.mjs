const { api, sheets } = foundry.applications;

const ICONS = "modules/aventuria/assets/icons/";

/** Icon file (relative to ICONS) for each Aventuria card category, or null if the base module ships no matching icon. */
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

/** Rows of the "erlaubte Aktionskarten" table, padded to a common column count so they line up. */
const CATEGORY_ROWS = [
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Close", keys: ["lightClose", "mediumClose", "heavyClose"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Ranged", keys: ["lightRanged", "mediumRanged", "heavyRanged"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Armor", keys: ["lightArmor", "mediumArmor", "heavyArmor"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Spell", keys: ["lightSpell", "complexSpell"] },
  { label: "AVENTURIA_HELPERS.HeroSheet.Categories.Chant", keys: ["lightChant", "complexChant"] },
];
const CATEGORY_COLUMNS = 3;
const OTHER_CATEGORIES = ["equipment", "advantage", "disadvantage", "talent", "companion"];

const ATTACK_TYPE_ICONS = { close: "close-combat.webp", ranged: "ranged-combat.webp", magic: "magic.webp" };

/**
 * Alternative actor sheet for the Aventuria `hero` actor subtype: a two-tab "Held"/
 * "Talente" sheet with a side icon rail, styled in the physical card's colors
 * (solid jewel-tone fills for contrast) and using the original Aventuria icon set.
 * Registered as a selectable (non-default) sheet so the generic Universal Tabletop
 * System sheet remains available.
 */
export class AventuriaHelpersHeroSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheet) {
  /** Currently active tab; persists across re-renders (e.g. after a field edit). */
  tab = "held";

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["aventuria-helpers", "hero-sheet"],
    position: { width: 660, height: 800 },
    window: { resizable: true },
    actions: {
      rollTest: AventuriaHelpersHeroSheet.#rollTest,
      rollDamage: AventuriaHelpersHeroSheet.#rollDamage,
      toggleCategory: AventuriaHelpersHeroSheet.#toggleCategory,
      switchTab: AventuriaHelpersHeroSheet.#switchTab,
    },
    form: { submitOnChange: true },
  };

  /** @inheritdoc */
  static PARTS = {
    sheet: {
      template: "modules/aventuria-helpers/templates/hero-sheet.hbs",
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
      tabs: {
        held: { active: this.tab === "held" },
        talente: { active: this.tab === "talente" },
      },
      icons: {
        close: ICONS + "close-combat.webp",
        ranged: ICONS + "ranged-combat.webp",
        magic: ICONS + "magic.webp",
        dodge: ICONS + "dodge.webp",
        life: ICONS + "life-point.webp",
        endurance: ICONS + "endurance.webp",
        exhaust: ICONS + "exhaust-card.webp",
        chalice: ICONS + "magic-chalice.webp",
        talent: ICONS + "talent.webp",
        level: `${ICONS}level-${system.level ?? 1}.webp`,
      },
      basicEquipmentIcon: this.#attackTypeIcon(system.basicEquipment.attackType),
      secondEquipmentIcon: this.#attackTypeIcon(system.secondEquipment.attackType),
      categoryRows: CATEGORY_ROWS.map((row) => ({
        label: row.label,
        cells: [
          ...row.keys.map((key) => ({
            key,
            label: CONFIG.Aventuria.cardCategories[key],
            icon: CATEGORY_ICONS[key] ? ICONS + CATEGORY_ICONS[key] : null,
            active: system.categories.has(key),
          })),
          ...Array(Math.max(0, CATEGORY_COLUMNS - row.keys.length)).fill({ blank: true }),
        ],
      })),
      otherCategories: OTHER_CATEGORIES.map((key) => ({
        key,
        label: CONFIG.Aventuria.cardCategories[key],
        icon: CATEGORY_ICONS[key] ? ICONS + CATEGORY_ICONS[key] : null,
        active: system.categories.has(key),
      })),
      enrichedSpecialAbility: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.specialAbility.description,
        { relativeTo: this.actor, secrets: this.actor.isOwner },
      ),
    });

    return context;
  }

  /**
   * @param {string} attackType
   * @returns {string|null}
   */
  #attackTypeIcon(attackType) {
    const file = ATTACK_TYPE_ICONS[attackType];
    return file ? ICONS + file : null;
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

  /**
   * Switches between the "Held" and "Talente" tabs.
   * @this AventuriaHelpersHeroSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #switchTab(event, target) {
    this.tab = target.dataset.tab;
    await this.render();
  }
}

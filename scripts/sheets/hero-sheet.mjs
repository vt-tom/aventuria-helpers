import { rollAttribute, rollSkill, rollEquipment } from "../probe-roll.mjs";

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
 * Groups an actor's Active Effects into temporary/passive/inactive buckets, same
 * split UTSActorSheet uses for its own effects tab.
 * @param {Iterable<ActiveEffect>} effects
 */
function prepareActiveEffectCategories(effects) {
  const categories = {
    temporary: { type: "temporary", label: game.i18n.localize("UTS.Effect.Temporary"), effects: [] },
    passive: { type: "passive", label: game.i18n.localize("UTS.Effect.Passive"), effects: [] },
    inactive: { type: "inactive", label: game.i18n.localize("UTS.Effect.Inactive"), effects: [] },
  };
  for (const e of effects) {
    if (!e.active) categories.inactive.effects.push(e);
    else if (e.isTemporary) categories.temporary.effects.push(e);
    else categories.passive.effects.push(e);
  }
  for (const c of Object.values(categories)) {
    c.effects.sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }
  return categories;
}

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
    position: { width: 660, height: 680 },
    window: { resizable: true },
    actions: {
      rollTest: AventuriaHelpersHeroSheet.#rollTest,
      rollDamage: AventuriaHelpersHeroSheet.#rollDamage,
      rollAttribute: AventuriaHelpersHeroSheet.#rollAttribute,
      rollSkill: AventuriaHelpersHeroSheet.#rollSkill,
      rollEquipment: AventuriaHelpersHeroSheet.#rollEquipment,
      toggleCategory: AventuriaHelpersHeroSheet.#toggleCategory,
      toggleExhaust: AventuriaHelpersHeroSheet.#toggleExhaust,
      switchTab: AventuriaHelpersHeroSheet.#switchTab,
      toggleLock: AventuriaHelpersHeroSheet.#toggleLock,
      toggleAbilityUsed: AventuriaHelpersHeroSheet.#toggleAbilityUsed,
      viewDoc: AventuriaHelpersHeroSheet.#viewDoc,
      createDoc: AventuriaHelpersHeroSheet.#createDoc,
      deleteDoc: AventuriaHelpersHeroSheet.#deleteDoc,
      toggleEffect: AventuriaHelpersHeroSheet.#toggleEffect,
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

  /** Whether the "Spielmodus" lock is currently on for this actor. */
  get locked() {
    return !!this.actor.getFlag("aventuria-helpers", "locked");
  }

  /**
   * Whether the special ability has been marked "verwendet" this session. Not part
   * of the aventuria data model (can't add fields there), so it's a module flag
   * instead - and, like the lock switch, meant to stay usable during play regardless
   * of the Spielmodus lock.
   */
  get abilityUsed() {
    return !!this.actor.getFlag("aventuria-helpers", "specialAbilityUsed");
  }

  /**
   * Whether this hero's data can be edited from this sheet. Combines Foundry's own
   * permission check with the module's own "Spielmodus"/lock flag, which lets an
   * owner freeze the sheet against accidental changes during play without affecting
   * their actual document permissions.
   * @inheritdoc
   */
  get isEditable() {
    return super.isEditable && !this.locked;
  }

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
      locked: this.locked,
      abilityUsed: this.abilityUsed,
      config: CONFIG.Aventuria,
      levelChoices: { 1: "I", 2: "II", 3: "III" },
      tabs: {
        held: { active: this.tab === "held" },
        talente: { active: this.tab === "talente" },
        images: { active: this.tab === "images" },
        items: { active: this.tab === "items" },
        effects: { active: this.tab === "effects" },
      },
      itemTypes: this.#getItems(),
      effects: prepareActiveEffectCategories(this.actor.allApplicableEffects()),
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

  /**
   * Groups the actor's embedded Items by subtype, same shape UTSActorSheet's own
   * items tab uses.
   * @returns {object}
   */
  #getItems() {
    const types = Object.fromEntries(
      game.documentTypes.Item.map((t) => [t, { label: game.i18n.localize(CONFIG.Item.typeLabels[t]), items: [] }]),
    );
    for (const item of this.actor.items) {
      types[item.type].items.push(item);
    }
    if (types.base?.items.length === 0) delete types.base;
    return types;
  }

  /**
   * Fetches the embedded Item or ActiveEffect represented by a `[data-document-class]`
   * row, for the shared viewDoc/deleteDoc/toggleEffect actions.
   * @param {HTMLElement} target
   * @returns {Item|ActiveEffect}
   */
  #getEmbeddedDocument(target) {
    const docRow = target.closest("[data-document-class]");
    if (docRow.dataset.documentClass === "Item") {
      return this.actor.items.get(docRow.dataset.itemId);
    } else if (docRow.dataset.documentClass === "ActiveEffect") {
      const parent =
        docRow.dataset.parentId === this.actor.id ? this.actor : this.actor.items.get(docRow.dataset.parentId);
      return parent.effects.get(docRow.dataset.effectId);
    }
    console.warn("Aventuria Helfer | Could not find document class for", docRow);
  }

  /**
   * When the sheet isn't editable (e.g. "Spielmodus" active), the framework disables
   * every form-associated element it finds, including plain action buttons. Re-enable
   * the ones that must stay usable regardless of the lock (switching the lock itself
   * back off, changing tabs, rolling, marking the special ability used, tracking life
   * points) - anything carrying the shared `always-active` class. Gated on the real
   * Foundry permission (`super.isEditable`, ignoring our own lock flag) so a user with
   * no actual edit rights on this actor doesn't get these re-enabled too.
   * @inheritdoc
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!super.isEditable) return;
    for (const el of this.element.querySelectorAll(".always-active")) {
      el.disabled = false;
    }
    // Life points intentionally have no `name` attribute (see hero-sheet.hbs): the
    // form's own submitOnChange handling re-checks `this.isEditable` - which is
    // false during Spielmodus by design - so a normal bound field would never
    // actually submit even once re-enabled above. Updating the actor directly here
    // sidesteps that and always works as long as the user has real edit rights.
    for (const el of this.element.querySelectorAll(".lp-input")) {
      el.addEventListener("change", (event) => {
        const field = event.currentTarget.dataset.field;
        this.actor.update({ [`system.lifePoints.${field}`]: Number(event.currentTarget.value) || 0 });
      });
    }
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
   * Rolls a Probe for one of the four attribute chips.
   * @this AventuriaHelpersHeroSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #rollAttribute(event, target) {
    await rollAttribute(this.actor, target.dataset.attribute);
  }

  /**
   * Rolls a Probe for one of the eight Talente.
   * @this AventuriaHelpersHeroSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #rollSkill(event, target) {
    await rollSkill(this.actor, target.dataset.skill);
  }

  /**
   * Rolls a piece of equipment (attack Probe + damage), then auto-exhausts it.
   * @this AventuriaHelpersHeroSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #rollEquipment(event, target) {
    await rollEquipment(this.actor, target.dataset.equipment);
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
   * Toggles whether a piece of equipment is "erschöpft". A plain action button
   * instead of a bound checkbox so it can reliably stay usable during Spielmodus
   * (see `always-active`), same as marking the special ability used.
   * @this AventuriaHelpersHeroSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #toggleExhaust(event, target) {
    const key = target.dataset.equipment;
    const current = this.actor.system[key]?.exhaust;
    await this.actor.update({ [`system.${key}.exhaust`]: !current });
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

  /**
   * Toggles the "Spielmodus" lock, which makes the sheet read-only without touching
   * the actor's actual ownership/permissions.
   * @this AventuriaHelpersHeroSheet
   */
  static async #toggleLock() {
    const locked = this.actor.getFlag("aventuria-helpers", "locked");
    await this.actor.setFlag("aventuria-helpers", "locked", !locked);
  }

  /**
   * Toggles whether the special ability is marked "verwendet".
   * @this AventuriaHelpersHeroSheet
   */
  static async #toggleAbilityUsed() {
    const used = this.actor.getFlag("aventuria-helpers", "specialAbilityUsed");
    await this.actor.setFlag("aventuria-helpers", "specialAbilityUsed", !used);
  }

  /**
   * Opens an embedded Item's or ActiveEffect's own sheet.
   * @this AventuriaHelpersHeroSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #viewDoc(event, target) {
    this.#getEmbeddedDocument(target)?.sheet.render(true);
  }

  /**
   * Deletes an embedded Item or ActiveEffect.
   * @this AventuriaHelpersHeroSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #deleteDoc(event, target) {
    if (!this.isEditable) return;
    await this.#getEmbeddedDocument(target)?.delete();
  }

  /**
   * Creates a new embedded Item or ActiveEffect using the initial data encoded in
   * the triggering button's dataset (same convention as UTSActorSheet).
   * @this AventuriaHelpersHeroSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #createDoc(event, target) {
    if (!this.isEditable) return;
    const docCls = getDocumentClass(target.dataset.documentClass);
    const docData = { name: docCls.defaultName({ type: target.dataset.type, parent: this.actor }) };
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      if (["action", "documentClass"].includes(dataKey)) continue;
      foundry.utils.setProperty(docData, dataKey, value);
    }
    await docCls.create(docData, { parent: this.actor });
  }

  /**
   * Toggles an ActiveEffect's disabled state.
   * @this AventuriaHelpersHeroSheet
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #toggleEffect(event, target) {
    if (!this.isEditable) return;
    const effect = this.#getEmbeddedDocument(target);
    await effect?.update({ disabled: !effect.disabled });
  }
}

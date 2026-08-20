import { AventuriaHelpersHeroSheet } from "./hero-sheet.mjs";

const MODULE_ID = "aventuria-helpers";
const ICONS = "modules/aventuria/assets/icons/";

/**
 * Card-shaped hero sheet, the primary/default sheet for `aventuria.hero` since
 * 2026-08-20 ("Aventuria Helpers Charactersheet", makeDefault: true). It
 * deliberately inherits all document and roll actions from the established
 * `AventuriaHelpersHeroSheet` ("Aventuria Helpers (old)", still selectable);
 * only presentation-specific actions live here.
 */
export class AventuriaHelpersCardHeroSheet extends AventuriaHelpersHeroSheet {
  /** Card sheet windows always start in play/view mode; unlocking lasts for this window instance only. */
  _cardLocked = true;

  static DEFAULT_OPTIONS = {
    classes: ["aventuria-helpers", "card-hero-sheet"],
    position: { width: 640, height: 760 },
    window: { resizable: true },
    actions: {
      toggleNavigationSide: AventuriaHelpersCardHeroSheet._toggleNavigationSide,
      adjustLife: AventuriaHelpersCardHeroSheet._adjustLife,
      toggleLock: AventuriaHelpersCardHeroSheet._toggleLock,
      removeSecondEquipment: AventuriaHelpersCardHeroSheet._removeSecondEquipment,
    },
  };

  /** The card sheet deliberately keeps its lock local so each newly opened window starts in view mode. */
  get locked() {
    return this._cardLocked;
  }

  /**
   * Foundry concatenates `DEFAULT_OPTIONS.classes` across the inheritance chain rather than
   * letting a subclass replace it, so inheriting from `AventuriaHelpersHeroSheet` (for its
   * roll/document/lock logic) would otherwise also drag that sheet's own `hero-sheet` CSS
   * scoping class onto this window. Strip it back out so only `card-hero-sheet`'s own rules
   * apply.
   * @inheritdoc
   */
  _initializeApplicationOptions(options) {
    const applicationOptions = super._initializeApplicationOptions(options);
    applicationOptions.classes = applicationOptions.classes.filter((cls) => cls !== "hero-sheet");
    return applicationOptions;
  }

  static PARTS = {
    sheet: {
      template: "modules/aventuria-helpers/templates/card-hero-sheet.hbs",
      scrollable: [".card-page-stack"],
    },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.tabs = {
      held: { active: this.tab === "held" },
      skills: { active: this.tab === "skills" },
      categories: { active: this.tab === "categories" },
      images: { active: this.tab === "images" },
      items: { active: this.tab === "items" },
      effects: { active: this.tab === "effects" },
    };
    context.navigationSide = game.settings.get(MODULE_ID, "cardSheetNavigationSide");
    context.navLeft = context.navigationSide === "left";
    context.navIcons = {
      skills: `${ICONS}talent.webp`,
    };
    context.icons.abilityToken = `${ICONS}ability-token.webp`;
    return context;
  }

  static async _toggleNavigationSide() {
    const current = game.settings.get(MODULE_ID, "cardSheetNavigationSide");
    await game.settings.set(MODULE_ID, "cardSheetNavigationSide", current === "left" ? "right" : "left");
    await this.render();
  }

  static async _adjustLife(event, target) {
    if (!this.actor.isOwner) return;
    const current = Number(this.actor.system.lifePoints.value) || 0;
    const maximum = Number(this.actor.system.lifePoints.max) || 0;
    const delta = Number(target.dataset.delta) || 0;
    await this.actor.update({ "system.lifePoints.value": Math.max(0, Math.min(maximum, current + delta)) });
  }

  static async _toggleLock() {
    this._cardLocked = !this._cardLocked;
    await this.render();
  }

  /**
   * Clears the second equipment slot back to its blank/never-had-one state. `system.secondEquipment.name`
   * is a plain bound field like any other, so simply typing it back to empty already works - but the row
   * offers no visible affordance for that, and clearing the name alone leaves stale attackType/endurance/
   * damage values behind. This gives the slot an explicit, discoverable "remove" control that resets all
   * four fields together.
   * @this AventuriaHelpersCardHeroSheet
   */
  static async _removeSecondEquipment() {
    if (!this.isEditable) return;
    await this.actor.update({
      "system.secondEquipment.name": "",
      "system.secondEquipment.damage": "",
      "system.secondEquipment.attackType": "",
      "system.secondEquipment.endurance": 0,
      "system.secondEquipment.exhaust": false,
    });
  }
}

import { LEVEL_UP_AP_COST, getAdventurePoints, getLevelUpPreview, applyLevelUp } from "../cards/level-up-hero.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

/**
 * Confirmation dialog for steigern one of a hero's two independent tracks (Heldenkarte/
 * Talentkarte) by one level: shows the "Feld: alt -> neu" preview from `getLevelUpPreview()`
 * plus the AP cost/balance, and only calls the actual mutation (`applyLevelUp()`) after an
 * explicit confirm - same dialog/mutation-function split as `assign-hero.mjs`/`prepare-hero.mjs`,
 * but without that dialog's promise-request wrapper since no caller needs the result back (it's
 * opened directly from the hero sheet's own "Steigern" button).
 */
export class AventuriaHelpersLevelUpDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Guards `#onConfirm()` against a second click re-running while the first is still mid-flight. */
  #busy = false;

  /**
   * @param {Actor} actor
   * @param {"hero"|"skill"} track
   */
  constructor(actor, track) {
    super({ id: `aventuria-helpers-level-up-${actor.id}-${track}` });
    this.actor = actor;
    this.track = track;
  }

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["aventuria-helpers", "level-up-dialog"],
    window: { icon: "fa-solid fa-arrow-up-right-dots" },
    position: { width: 480, height: "auto" },
    actions: {
      close: AventuriaHelpersLevelUpDialog.#onClose,
      confirm: AventuriaHelpersLevelUpDialog.#onConfirm,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    content: { template: "modules/aventuria-helpers/templates/level-up-dialog.hbs" },
  };

  /** @inheritdoc */
  get title() {
    return game.i18n.localize(
      this.track === "hero" ? "AVENTURIA_HELPERS.LevelUp.TitleHero" : "AVENTURIA_HELPERS.LevelUp.TitleSkill",
    );
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.track = this.track;
    context.preview = getLevelUpPreview(this.actor, this.track);
    context.currentAp = getAdventurePoints(this.actor);
    context.cost = LEVEL_UP_AP_COST;
    context.canConfirm =
      context.preview.known &&
      !context.preview.atMax &&
      !context.preview.dataMissing &&
      context.currentAp >= LEVEL_UP_AP_COST;
    return context;
  }

  /* -------------------------------------------------- */

  static #onClose() {
    this.close();
  }

  /**
   * Re-derives `canConfirm` straight from the source state (not by re-running the full
   * `_prepareContext()` render pipeline, which expects framework-internal render options this
   * handler doesn't have) instead of trusting the template's already-rendered state, then
   * performs the actual mutation via `applyLevelUp()` - mirrors `assign-hero.mjs#onConfirm()`'s
   * try/catch/finally + busy-guard shape.
   */
  static async #onConfirm() {
    if (this.#busy) return;
    const preview = getLevelUpPreview(this.actor, this.track);
    const canConfirm =
      preview.known && !preview.atMax && !preview.dataMissing && getAdventurePoints(this.actor) >= LEVEL_UP_AP_COST;
    if (!canConfirm) return;

    this.#busy = true;
    try {
      await applyLevelUp(this.actor, this.track);
    } catch (err) {
      console.error("aventuria-helpers | applyLevelUp failed", err);
      ui.notifications.error(game.i18n.localize("AVENTURIA_HELPERS.LevelUp.Failed"));
      return;
    } finally {
      this.#busy = false;
    }

    await this.close();
  }
}

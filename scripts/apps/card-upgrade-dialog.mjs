import { CARD_UPGRADE_AP_COST, getCardLevelChanges, applyCardLevelChanges } from "../cards/upgrade-card.mjs";
import { ensureExperienceStack } from "../cards/experience-stack.mjs";
import { resolveStacksForActor } from "../cards/stacks.mjs";
import { showCardPreview, hideCardPreview } from "../sheets/card-hover-preview.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const MODULE_ID = "aventuria-helpers";

/**
 * "Aktionskarten verbessern" dialog: lists every currently possible upgrade (Deck-Karte -> gleichnamige
 * höherstufige Erfahrungsschatz-Karte) and downgrade (umgekehrt, volle AP-Erstattung) as one row per
 * pair, lets the player mark several at once (Nutzerentscheidung 2026-08-26: Mehrfachauswahl mit
 * Sammel-Bestätigung statt einer Aktion pro Karte), and only spends/erstattet AP when the whole
 * selection is confirmed together - mirrors `assign-hero.mjs`'s dialog/mutation-function split, but
 * (like `AventuriaHelpersLevelUpDialog`) without its promise-request wrapper since no caller needs a
 * result back. Stays open after a successful confirm (list/AP refresh in place) so further batches can
 * follow without reopening; a separate "Fertig" button closes it.
 */
export class AventuriaHelpersCardUpgradeDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Composite `"<deckCardId>|<direction>"` keys of the currently marked rows. */
  #selected = new Set();

  /** Guards `#onConfirm()`/`#onEnsureExperience()` against a second click mid-flight. */
  #busy = false;

  /** @param {Actor} actor */
  constructor(actor) {
    super({ id: `aventuria-helpers-card-upgrade-${actor.id}` });
    this.actor = actor;
  }

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["aventuria-helpers", "card-upgrade-dialog"],
    window: { icon: "fa-solid fa-cards", resizable: true },
    // Fixed height instead of "auto" - Nutzerfeedback 2026-08-26: mit mehreren Verbessern-/
    // Zurückstufen-Zeilen wurde das Fenster auf kleinen Bildschirmen zu hoch. Core misst "auto"
    // vermutlich über `scrollHeight`, das die volle (durch `max-height`/`overflow-y` auf
    // `.window-content` eigentlich schon geclampte) Inhaltshöhe liefert statt der sichtbaren -
    // dieselbe Art Messproblem, die `card-hero-sheet.hbs`s Vorgänger (Ausgespielte-Karten-Sheet,
    // siehe CLAUDE.md) schon einmal von "auto" auf eine feste Höhe umziehen ließ. Mit fester Höhe
    // greift der bereits vorhandene interne Scrollbalken (`.window-content { max-height: 80vh;
    // overflow-y: auto; }`) zuverlässig, `resizable` erlaubt bei Bedarf mehr Platz.
    position: { width: 640, height: 600 },
    actions: {
      close: AventuriaHelpersCardUpgradeDialog.#onClose,
      toggleSelection: AventuriaHelpersCardUpgradeDialog.#onToggleSelection,
      ensureExperience: AventuriaHelpersCardUpgradeDialog.#onEnsureExperience,
      confirm: AventuriaHelpersCardUpgradeDialog.#onConfirm,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    content: { template: "modules/aventuria-helpers/templates/card-upgrade-dialog.hbs" },
  };

  /** @inheritdoc */
  get title() {
    return game.i18n.localize("AVENTURIA_HELPERS.CardUpgrade.Title");
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const result = getCardLevelChanges(this.actor);
    const currentAp = Number(this.actor.getFlag(MODULE_ID, "adventurePoints")) || 0;

    for (const change of result.changes) {
      change.key = `${change.deckCardId}|${change.direction}`;
      change.selected = this.#selected.has(change.key);
    }

    const selectedChanges = result.changes.filter((c) => c.selected);
    const netDelta = selectedChanges.reduce((sum, c) => sum + c.apDelta, 0);
    const resultingAp = currentAp + netDelta;

    context.cost = CARD_UPGRADE_AP_COST;
    context.available = result.available;
    context.missingExperience = result.missingExperience;
    context.changesUp = result.changes.filter((c) => c.direction === "up");
    context.changesDown = result.changes.filter((c) => c.direction === "down");
    context.currentAp = currentAp;
    context.selectedCount = selectedChanges.length;
    context.netDelta = netDelta;
    context.netDeltaLabel = netDelta > 0 ? `+${netDelta}` : `${netDelta}`;
    context.resultingAp = resultingAp;
    context.canConfirm = selectedChanges.length > 0 && resultingAp >= 0;
    return context;
  }

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const cardEl of this.element.querySelectorAll(".upgrade-card")) {
      cardEl.addEventListener("mouseenter", () => showCardPreview(cardEl, this.element));
      cardEl.addEventListener("mouseleave", hideCardPreview);
    }
  }

  /** @inheritdoc */
  async _onClose(options) {
    hideCardPreview();
    return super._onClose(options);
  }

  /* -------------------------------------------------- */

  static #onClose() {
    this.close();
  }

  /**
   * A Stufe-2-Karte can offer both an "up" and a "down" row at once - selecting both together
   * would be contradictory (the same physical card can't leave the Deck in two directions in one
   * batch) and would leave `applyCardLevelChanges()`'s second `pass()` call for whichever change
   * applies second trying to move a card that the first change already moved away. Checking one
   * direction therefore always clears the other for the same card, so the two stay mutually
   * exclusive by construction instead of needing a runtime guard in the mutation function.
   */
  static async #onToggleSelection(event, target) {
    const deckCardId = target.dataset.deckCardId;
    const direction = target.dataset.direction;
    if (target.checked) {
      this.#selected.add(`${deckCardId}|${direction}`);
      this.#selected.delete(`${deckCardId}|${direction === "up" ? "down" : "up"}`);
    } else {
      this.#selected.delete(`${deckCardId}|${direction}`);
    }
    await this.render();
  }

  /** Backfills a missing Erfahrungsschatz for heroes assigned before this feature existed. */
  static async #onEnsureExperience() {
    if (this.#busy) return;
    const stacks = resolveStacksForActor(this.actor);
    if (!stacks?.deck?.folder) return;

    this.#busy = true;
    try {
      await ensureExperienceStack(this.actor, stacks.deck.folder);
    } catch (err) {
      console.error("aventuria-helpers | ensureExperienceStack failed", err);
      ui.notifications.error(game.i18n.localize("AVENTURIA_HELPERS.CardUpgrade.Failed"));
    } finally {
      this.#busy = false;
    }
    await this.render();
  }

  static async #onConfirm() {
    if (this.#busy) return;
    const result = getCardLevelChanges(this.actor);
    const selectedChanges = result.changes.filter((c) => this.#selected.has(`${c.deckCardId}|${c.direction}`));
    const currentAp = Number(this.actor.getFlag(MODULE_ID, "adventurePoints")) || 0;
    const netDelta = selectedChanges.reduce((sum, c) => sum + c.apDelta, 0);
    if (!selectedChanges.length || currentAp + netDelta < 0) return;

    this.#busy = true;
    try {
      await applyCardLevelChanges(
        this.actor,
        selectedChanges.map((c) => ({ deckCardId: c.deckCardId, direction: c.direction })),
      );
    } catch (err) {
      console.error("aventuria-helpers | applyCardLevelChanges failed", err);
      ui.notifications.error(game.i18n.localize("AVENTURIA_HELPERS.CardUpgrade.Failed"));
      return;
    } finally {
      this.#busy = false;
    }

    this.#selected.clear();
    await this.render();
  }
}

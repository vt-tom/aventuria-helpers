/**
 * Own visual skin for the Hand sheet, built by subclassing Complete Card
 * Management's `DockedHandSheet` instead of writing one from scratch: reusing it
 * keeps its drag-drop and right-click context menu (flip/next/previous face)
 * working exactly as before - only the template and CSS are ours.
 *
 * Docked to the right of the Heldenablage (`#aventuria-helpers-hero-tray`) by
 * default, but still freely draggable if the user wants it elsewhere -
 * Nutzerentscheidung 2026-08-17 (project/PROJECT.md 2.1, refined after the first,
 * permanently-pinned version). The docking/drag/reset behavior itself lives in
 * `DockableSheetMixin` (`dockable-sheet-mixin.mjs`) - shared with
 * `AventuriaHelpersPlayedCardsSheet`, which needs the exact same thing (see
 * that file for the full reasoning). The inherited `.docked` positioning CSS
 * (`ccm.css`, `left`/`bottom`/`width`) still needs neutralizing - see the CSS
 * comment on `.hand-sheet` for why.
 *
 * Like `AventuriaHelpersCombat` in documents/combat.mjs, this class body can only
 * be built once `globalThis.ccm` exists, which happens inside Complete Card
 * Management's own `init` hook - so it's built lazily in `registerHandSheet()`,
 * called from this module's `init` hook after that dependency has already run
 * (guaranteed by `relationships.requires` in module.json).
 *
 * Also overrides the inherited `playCard` action - `DockedHandSheet`'s own version
 * opens core Foundry's `Cards#playDialog` ("which stack?") prompt, which is pure
 * friction here since Aventuria only ever has one legal target; this instead plays
 * straight into the hero's Im-Spiel-Stapel and pays its Ausdauer cost, see
 * `playCard()` in `cards/endurance.mjs`. Adds a second play action alongside it,
 * "Als Ausdauer spielen" - `DEFAULT_OPTIONS.actions` merges (rather than replaces)
 * across the inherited class chain, so both keys coexist on the final actions map.
 */

import { resolveHandStacks } from "../cards/stacks.mjs";
import { playCard, playCardAsEndurance, getEnduranceStatus } from "../cards/endurance.mjs";
import { DockableSheetMixin } from "./dockable-sheet-mixin.mjs";
import { showCardPreview, hideCardPreview } from "./card-hover-preview.mjs";

/** The lazily-built class; null until `registerHandSheet()` runs. */
export let AventuriaHelpersHandSheet = null;

/**
 * Asks how to pay for a costed Aktionskarte before playing it: pay its Ausdauer cost
 * normally, or play it "ohne Ausdauer" - skipping the cost entirely, regardless of how much
 * Ausdauer is currently ready. Styled like the module's other small dialogs (reuses
 * `.probe-dialog`'s CSS wholesale, same as `promptCardAmount()` in `apps/hero-tray.mjs`).
 * @param {Card} card
 * @param {number} cost
 * @param {number} ready
 * @returns {Promise<"pay"|"free"|null>} null if the dialog was cancelled/dismissed.
 */
async function promptPlayCost(card, cost, ready) {
  const enough = ready >= cost;
  return foundry.applications.api.DialogV2.wait({
    window: {
      title: game.i18n.format("AVENTURIA_HELPERS.HeroTray.PlayCostTitle", { name: card.name }),
      icon: "fa-solid fa-hand-sparkles",
    },
    classes: ["aventuria-helpers", "probe-dialog"],
    content: `
      <div class="probe-dialog-body">
        <p class="probe-target">${game.i18n.format("AVENTURIA_HELPERS.HeroTray.PlayCostBody", { cost, ready })}</p>
      </div>
    `,
    buttons: [
      {
        action: "pay",
        label: game.i18n.localize("AVENTURIA_HELPERS.HeroTray.PlayPayCost"),
        icon: "fa-solid fa-hand-sparkles",
        default: enough,
        disabled: !enough,
      },
      {
        action: "free",
        label: game.i18n.localize("AVENTURIA_HELPERS.HeroTray.PlayWithoutEndurance"),
        icon: "fa-solid fa-hand",
        default: !enough,
      },
    ],
    rejectClose: false,
  });
}

export function registerHandSheet() {
  AventuriaHelpersHandSheet = class extends DockableSheetMixin(
    ccm.apps.CardsSheets.DockedHandSheet,
    (trayRect) => ({ left: trayRect.right + 16, top: trayRect.top }),
  ) {
    /** @inheritdoc */
    static DEFAULT_OPTIONS = {
      classes: ["aventuria-helpers", "hand-sheet"],
      // `DockableSheetMixin` already sets `position: { width: "auto" }` (see
      // the CSS comment on `.hand-sheet` for why) - it's merged in
      // inheritance-chain order, so that already overrides CardsSheet's own
      // `position: { width: 620 }` further up the chain without repeating it
      // here.
      actions: {
        // `this` (not the outer `AventuriaHelpersHandSheet` binding) - this is
        // an anonymous class expression, so its own name isn't available
        // inside its body yet at this point (the outer assignment only
        // happens once the whole expression finishes evaluating); `this` in a
        // static field initializer is bound to the class itself regardless.
        playCard: this.#onPlayCard,
        playAsEndurance: this.#onPlayAsEndurance,
      },
    };

    /**
     * Plays a card straight into the hero's Im-Spiel-Stapel, paying its
     * Ausdauer cost - see `playCard()` in `cards/endurance.mjs`. Overrides
     * `DockedHandSheet`'s own `playCard` action (the "which stack?" dialog).
     *
     * Costed cards go through `promptPlayCost()` first (Nutzerentscheidung
     * 2026-08-14: cards should stay playable even without enough ready
     * Ausdauer, via a per-play "ohne Ausdauer spielen" choice rather than a
     * persistent switch) - free cards (no `system.cost`) skip the dialog and
     * play immediately, same as before.
     * @this AventuriaHelpersHandSheet
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onPlayCard(event, target) {
      if (!this.isEditable) return;
      const id = target.closest("[data-card-id]").dataset.cardId;
      const card = this.document.cards.get(id);
      const stacks = resolveHandStacks(this.document);
      if (!stacks?.playPile) {
        ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.HeroTray.NoPlayPile"));
        return;
      }

      const cost = card.system?.cost ?? 0;
      let free = false;
      if (cost > 0) {
        const choice = await promptPlayCost(card, cost, getEnduranceStatus(stacks.playPile).ready);
        if (!choice) return;
        free = choice === "free";
      }
      await playCard(stacks.playPile, card, { free });
    }

    /**
     * Plays a card as Ausdauer instead of playing it normally - see
     * `cards/endurance.mjs` for what that actually means (face-down placement
     * on the hero's own scene region, tagged so the Heldenablage can tell it
     * apart from a normally played card sharing the same Im-Spiel-Stapel).
     * @this AventuriaHelpersHandSheet
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onPlayAsEndurance(event, target) {
      if (!this.isEditable) return;
      const id = target.closest("[data-card-id]").dataset.cardId;
      const card = this.document.cards.get(id);
      const stacks = resolveHandStacks(this.document);
      if (!stacks?.playPile) {
        ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.HeroTray.NoPlayPile"));
        return;
      }
      await playCardAsEndurance(stacks.playPile, card);
    }

    /** @inheritdoc */
    static PARTS = {
      cardList: {
        template: "modules/aventuria-helpers/templates/hand-sheet.hbs",
      },
    };

    /**
     * Re-docks the sheet (see `DockableSheetMixin`, no-op if manually moved)
     * and wires the hover-preview listeners onto every card row. Runs after
     * every render (not just the first), since the card list part is fully
     * re-rendered whenever the hand's contents change.
     * @inheritdoc
     */
    async _onRender(context, options) {
      await super._onRender(context, options);
      this.updateDockPosition();
      for (const cardEl of this.element.querySelectorAll(".cards .card")) {
        cardEl.addEventListener("mouseenter", () => showCardPreview(cardEl, this.element));
        cardEl.addEventListener("mouseleave", hideCardPreview);
      }
    }

    /** @inheritdoc */
    async _onClose(options) {
      hideCardPreview();
      return super._onClose(options);
    }
  };
}

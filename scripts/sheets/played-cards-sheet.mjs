/**
 * Own sheet for the hero's "ausgespielte Karten" - the non-Ausdauer cards
 * currently sitting in the Im-Spiel-Stapel (`playPile`), i.e. cards played
 * from the Hand that aren't just spent Ausdauer. Lets the player clean up
 * their own play area: discard a resolved card, or take it back onto their
 * hand (the primary "undo a play" action, Nutzerwunsch 2026-08-19 - shuffling
 * back into the deck is comparatively rare, so that moved to a right-click
 * context menu on the card instead of its own button, same mechanism CCM's
 * own `DockedHandSheet` already uses for flip/next-face/previous-face -
 * `this._createContextMenu()`, a core `ApplicationV2` method, so no CCM
 * internals needed). PROJECT.md 2.2 - built on the same docking mixin as the Hand sheet
 * (`DockableSheetMixin`, `dockable-sheet-mixin.mjs`), docked below the Hand
 * sheet (same right-of-tray column, Nutzerfeedback 2026-08-17: not below the
 * tray itself, which felt like the wrong place) when it's open, falling back
 * to the Hand sheet's own default spot (right of the tray) otherwise - see
 * `registerPlayedCardsSheet()`'s `getOffset` callback below. Also shares the
 * Hand sheet's hover card preview (`card-hover-preview.mjs`, Nutzerwunsch
 * 2026-08-19).
 *
 * Deliberately excludes Ausdauer cards (`flags.aventuria-helpers.usedAsEndurance`)
 * even though they live in the very same `playPile` - Nutzerentscheidung
 * 2026-08-17: keep this sheet focused on played cards for now, Ausdauer stays
 * in the Heldenablage's own ready/spent counters (`cards/endurance.mjs`); a
 * dedicated view for exhausted/spent Ausdauer cards is a possible later idea,
 * not built here.
 *
 * Like `AventuriaHelpersHandSheet`, this class body can only be built once
 * `globalThis.ccm` exists (Complete Card Management's own `init` hook) - see
 * `hand-sheet.mjs` for the full reasoning, same lazy-build pattern here.
 */

import { resolveStacks } from "../cards/stacks.mjs";
import { discardPlayedCard, returnPlayedCardToHand, returnPlayedCardToDeck } from "../cards/played-cards.mjs";
import { DockableSheetMixin } from "./dockable-sheet-mixin.mjs";
import { showCardPreview, hideCardPreview } from "./card-hover-preview.mjs";

const MODULE_ID = "aventuria-helpers";

/** The lazily-built class; null until `registerPlayedCardsSheet()` runs. */
export let AventuriaHelpersPlayedCardsSheet = null;

export function registerPlayedCardsSheet() {
  AventuriaHelpersPlayedCardsSheet = class extends DockableSheetMixin(
    ccm.apps.CardsSheets.PileSheet,
    /**
     * Docks below the Hand sheet's live element (found directly in the DOM,
     * same lookup style `DockableSheetMixin` already uses for the tray -
     * avoids needing a cross-module reference to hero-tray.mjs's own
     * `handSheet` instance variable) if it's currently open and visible;
     * falls back to the Hand sheet's own default spot (right of the tray) if
     * it isn't, rather than leaving this sheet with nowhere sensible to dock.
     * Vertical gap is wider than the horizontal tray gap (28px vs. 16px) -
     * Nutzerfeedback 2026-08-19: 16px read as touching/overlapping once both
     * sheets got their own window chrome (border, drop shadow) right up
     * against each other.
     */
    (trayRect) => {
      const handEl = document.querySelector(".hand-sheet");
      if (handEl?.getClientRects().length) {
        const handRect = handEl.getBoundingClientRect();
        return { left: handRect.left, top: handRect.bottom + 28 };
      }
      return { left: trayRect.right + 16, top: trayRect.top };
    },
  ) {
    /** @inheritdoc */
    static DEFAULT_OPTIONS = {
      classes: ["aventuria-helpers", "played-cards-sheet"],
      actions: {
        // `this` (not the outer `AventuriaHelpersPlayedCardsSheet` binding) -
        // see the identical comment in hand-sheet.mjs for why.
        discardCard: this.#onDiscardCard,
        returnToHand: this.#onReturnToHand,
      },
    };

    /** @inheritdoc */
    static PARTS = {
      cardList: {
        template: "modules/aventuria-helpers/templates/played-cards-sheet.hbs",
      },
    };

    /**
     * Filters `this.document.cards` (the Im-Spiel-Stapel) down to non-Ausdauer
     * played cards - see the class doc comment for why Ausdauer is excluded.
     * @inheritdoc
     */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.cards = this.document.cards.filter((card) => !card.getFlag(MODULE_ID, "usedAsEndurance"));
      context.empty = !context.cards.length;
      return context;
    }

    /**
     * Moves a played card into the discard pile - see `discardPlayedCard()`
     * in `cards/played-cards.mjs`.
     * @this AventuriaHelpersPlayedCardsSheet
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onDiscardCard(event, target) {
      if (!this.isEditable) return;
      const id = target.closest("[data-card-id]").dataset.cardId;
      const card = this.document.cards.get(id);
      const stacks = resolveStacks();
      if (!stacks?.discard) return;
      await discardPlayedCard(card, stacks.discard);
    }

    /**
     * Takes a played card back onto the hand - see `returnPlayedCardToHand()`
     * in `cards/played-cards.mjs`. The sheet's own button action (primary
     * "undo a play"); shuffling back into the deck is the rarer action, moved
     * to the right-click context menu instead (`_getCardContextOptions()`
     * below).
     * @this AventuriaHelpersPlayedCardsSheet
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onReturnToHand(event, target) {
      if (!this.isEditable) return;
      const id = target.closest("[data-card-id]").dataset.cardId;
      const card = this.document.cards.get(id);
      const stacks = resolveStacks();
      if (!stacks?.hand) return;
      await returnPlayedCardToHand(card, stacks.hand);
    }

    /**
     * Right-click context menu entries for a played card - currently just
     * "Zurück ins Deck mischen" (`returnPlayedCardToDeck()`), demoted here
     * from its own button (Nutzerwunsch 2026-08-19: rare enough not to need
     * a permanent button next to "Ablegen"/"Zurück auf die Hand nehmen").
     * Same `_createContextMenu()`/`ContextMenuEntry` mechanism CCM's own
     * `DockedHandSheet._getCardContextOptions()` uses for flip/next-face/
     * previous-face (`ccm.mjs`) - a core `ApplicationV2` method, not
     * something specific to that class, so usable here without depending on
     * any CCM internals.
     * @returns {import("@client/applications/ux/context-menu.mjs").ContextMenuEntry[]}
     */
    _getCardContextOptions() {
      if (!this.isEditable) return [];
      return [{
        name: "AVENTURIA_HELPERS.HeroTray.ReturnToDeck",
        icon: "<i class=\"fa-solid fa-fw fa-shuffle\"></i>",
        callback: async (li) => {
          const card = this.document.cards.get(li.dataset.cardId);
          const stacks = resolveStacks();
          if (!stacks?.deck) return;
          await returnPlayedCardToDeck(card, stacks.deck);
        },
      }];
    }

    /**
     * Re-docks below the Hand sheet whenever the Hand sheet itself re-docks
     * (`ahb:dockable-repositioned`, dispatched from `DockableSheetMixin`'s
     * `updateDockPosition()`) - otherwise resetting the Hand sheet alone
     * (e.g. "Position zurücksetzen" there) left this sheet still docked to
     * the Hand sheet's stale pre-reset position until something else
     * happened to re-render this sheet. Ignores its own dispatches (`sheet
     * === this`) to avoid re-triggering itself.
     * @param {CustomEvent<{sheet: object}>} event
     */
    #onDockEvent = (event) => {
      if (event.detail.sheet !== this) this.updateDockPosition();
    };

    /**
     * Re-docks the sheet (see `DockableSheetMixin`, no-op if manually moved)
     * and wires the hover-preview listeners onto every card row, same as
     * `AventuriaHelpersHandSheet` (`card-hover-preview.mjs`).
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
    async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);
      document.addEventListener("ahb:dockable-repositioned", this.#onDockEvent);
      this._createContextMenu(this._getCardContextOptions, "[data-application-part=cardList] .cards .card", {
        hookName: "getPlayedCardContextOptions",
        parentClassHooks: false,
        fixed: true,
      });
    }

    /** @inheritdoc */
    async _onClose(options) {
      document.removeEventListener("ahb:dockable-repositioned", this.#onDockEvent);
      hideCardPreview();
      return super._onClose(options);
    }
  };
}

/**
 * Own sheet for the hero's Ausdauer cards - the cards in the Im-Spiel-Stapel
 * (`playPile`) that were played face-down as Ausdauer
 * (`flags.aventuria-helpers.usedAsEndurance`, `cards/endurance.mjs`), i.e. the
 * exact opposite selection of the "Ausgespielte Karten" sheet
 * (`played-cards-sheet.mjs`), which filters those same cards *out*. Lets the
 * player manage their own Ausdauer row: toggle a single card between
 * ready/exhausted, take one back onto the hand, or discard one.
 *
 * Built on the same docking mixin as the Hand / Played-Cards sheets
 * (`DockableSheetMixin`), but docked *above* the Heldenablage rather than to
 * its right / below it - see the `getOffset` callback in
 * `registerEnduranceCardsSheet()`. Shares almost all of its look with the
 * Played-Cards sheet by also carrying its `played-cards-sheet` CSS class (an
 * Ausdauer view really is a specialised played-cards view - same pile, same
 * row layout); only a narrower default width and the exhausted-corner badge
 * are its own (`.endurance-cards-sheet` in `aventuria-helpers.css`).
 *
 * Like `AventuriaHelpersHandSheet` / `AventuriaHelpersPlayedCardsSheet`, this
 * class body can only be built once `globalThis.ccm` exists (Complete Card
 * Management's own `init` hook) - same lazy-build pattern, see `hand-sheet.mjs`
 * for the full reasoning.
 */

import { resolveSiblingStacks } from "../cards/stacks.mjs";
import {
  isCardExhausted,
  toggleCardExhausted,
  returnEnduranceCardToHand,
  discardEnduranceCard,
} from "../cards/played-cards.mjs";
import { DockableSheetMixin } from "./dockable-sheet-mixin.mjs";
import { showCardPreview, hideCardPreview } from "./card-hover-preview.mjs";

const MODULE_ID = "aventuria-helpers";

/** The lazily-built class; null until `registerEnduranceCardsSheet()` runs. */
export let AventuriaHelpersEnduranceCardsSheet = null;

export function registerEnduranceCardsSheet() {
  AventuriaHelpersEnduranceCardsSheet = class extends DockableSheetMixin(
    ccm.apps.CardsSheets.PileSheet,
    /**
     * Docks just above the Heldenablage, bottom-anchored to the tray's top
     * edge (unlike the Hand/Played-Cards sheets, which sit right of / below the
     * tray). Measures its own rendered height via a DOM lookup - same lookup
     * style `DockableSheetMixin`/`played-cards-sheet.mjs` already use - so it
     * keeps sitting flush above the tray even after being resized taller.
     * Falls back to the mixin's fixed 190px default before the first render has
     * a measurable box, and floors `top` at 8 so it never leaves the viewport.
     */
    (trayRect) => {
      const el = document.querySelector(".endurance-cards-sheet");
      const height = el?.getClientRects().length ? el.getBoundingClientRect().height : 190;
      return { left: trayRect.left, top: Math.max(8, trayRect.top - height - 12) };
    },
    "enduranceCardsSheetPosition",
  ) {
    /**
     * One deferred first-render docking pass - Foundry applies its initial
     * ApplicationV2 position late in the render cycle and can otherwise
     * overwrite `_onRender()`'s already-correct position. Same fix as
     * `played-cards-sheet.mjs`.
     * @type {number|null}
     */
    #initialDockFrame = null;

    /** @inheritdoc */
    static DEFAULT_OPTIONS = {
      // `played-cards-sheet` too: reuse its full CSS (header, card rows, action
      // buttons, exhausted grey-out, hide-with-tray) instead of duplicating
      // every selector. `.endurance-cards-sheet` only adds the narrower width
      // and the corner badge.
      classes: ["aventuria-helpers", "played-cards-sheet", "endurance-cards-sheet"],
      // Narrower than the 600px Hand/Played-Cards default (DockableSheetMixin) -
      // Nutzerentscheidung: tray-width-ish, sitting above the 320px Heldenablage.
      position: { width: 340, height: 190 },
      actions: {
        // `this` (not the outer binding) - see the identical comment in
        // hand-sheet.mjs for why.
        toggleExhaust: this.#onToggleExhaust,
        returnEndurance: this.#onReturnEndurance,
      },
    };

    /** @inheritdoc */
    static PARTS = {
      cardList: {
        template: "modules/aventuria-helpers/templates/endurance-cards-sheet.hbs",
      },
    };

    /**
     * Filters `this.document.cards` (the Im-Spiel-Stapel) down to the Ausdauer
     * cards - the mirror image of `played-cards-sheet.mjs`'s own filter.
     * `frontImg` is passed alongside the (face-down) `card.img` so the hover
     * preview can show the card front - see `card-hover-preview.mjs`.
     * @inheritdoc
     */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.cards = this.document.cards
        .filter((card) => card.getFlag(MODULE_ID, "usedAsEndurance"))
        .map((card) => ({
          card,
          exhausted: isCardExhausted(card),
          frontImg: card.faces?.[0]?.img ?? card.img,
        }));
      context.empty = !context.cards.length;
      return context;
    }

    /**
     * Click on the card art toggles its exhausted state (canvas rotation
     * 0°/90°, `toggleCardExhausted()` in `cards/played-cards.mjs`) - the same
     * mechanism the Heldenablage's own ready/spent counters read from, so those
     * update along with it.
     * @this AventuriaHelpersEnduranceCardsSheet
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onToggleExhaust(event, target) {
      if (!this.isEditable) return;
      const id = target.closest("[data-card-id]").dataset.cardId;
      const card = this.document.cards.get(id);
      await toggleCardExhausted(card);
    }

    /**
     * Button below the card - takes the Ausdauer card back onto the hero's
     * hand (undo playing it as Ausdauer), `returnEnduranceCardToHand()`.
     * @this AventuriaHelpersEnduranceCardsSheet
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onReturnEndurance(event, target) {
      if (!this.isEditable) return;
      const id = target.closest("[data-card-id]").dataset.cardId;
      const card = this.document.cards.get(id);
      const stacks = resolveSiblingStacks(this.document);
      if (!stacks?.hand) return;
      await returnEnduranceCardToHand(card, stacks.hand);
    }

    /**
     * Right-click context menu: one entry, "Auf den Ablagestapel legen".
     * Resolves the discard pile from `this.document`'s own folder siblings
     * (`resolveSiblingStacks()`), not `resolveStacks()` - so it stays correct
     * when the Heldenablage is pointed at another player's hero (feature 2.5).
     * Same `_createContextMenu()` mechanism as `played-cards-sheet.mjs`.
     * @returns {import("@client/applications/ux/context-menu.mjs").ContextMenuEntry[]}
     */
    _getCardContextOptions() {
      if (!this.isEditable) return [];
      return [
        {
          name: "AVENTURIA_HELPERS.HeroTray.DiscardCard",
          icon: "<i class=\"fa-solid fa-fw fa-trash-can\"></i>",
          callback: async (li) => {
            const card = this.document.cards.get(li.dataset.cardId);
            const stacks = resolveSiblingStacks(this.document);
            if (!stacks?.discard) return;
            await discardEnduranceCard(card, stacks.discard);
          },
        },
      ];
    }

    /**
     * Re-docks above the tray and wires the hover-preview listeners onto every
     * card row, same as the other two docked card sheets.
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
      this.#initialDockFrame = requestAnimationFrame(() => {
        this.#initialDockFrame = null;
        if (this.rendered) this.updateDockPosition();
      });
      this._createContextMenu(this._getCardContextOptions, "[data-application-part=cardList] .cards .card", {
        hookName: "getEnduranceCardContextOptions",
        parentClassHooks: false,
        fixed: true,
      });
    }

    /** @inheritdoc */
    async _onClose(options) {
      if (this.#initialDockFrame !== null) cancelAnimationFrame(this.#initialDockFrame);
      this.#initialDockFrame = null;
      hideCardPreview();
      return super._onClose(options);
    }
  };
}

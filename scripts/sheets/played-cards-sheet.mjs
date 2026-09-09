/**
 * Own sheet for the hero's "ausgespielte Karten" - the non-Ausdauer cards
 * currently sitting in the Im-Spiel-Stapel (`playPile`), i.e. cards played
 * from the Hand that aren't just spent Ausdauer. Lets the player clean up
 * their own play area: discard a resolved card, take it back onto their hand,
 * or shuffle it back into the deck - all three live in a right-click context
 * menu on the card (Nutzerwunsch 2026-08-24: none of the three is common
 * enough on its own to keep permanently visible next to the card art, unlike
 * the "Karte erschöpfen" toggle below, which stays a normal button since it's
 * the action actually used during play) - same mechanism CCM's own
 * `DockedHandSheet` already uses for flip/next-face/previous-face -
 * `this._createContextMenu()`, a core `ApplicationV2` method, so no CCM
 * internals needed. project/PROJECT.md 2.2 - built on the same docking mixin as the Hand sheet
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

import { resolveSiblingStacks } from "../cards/stacks.mjs";
import {
  discardPlayedCard,
  returnPlayedCardToHand,
  returnPlayedCardToDeck,
  isCardExhausted,
  toggleCardExhausted,
} from "../cards/played-cards.mjs";
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
     * Bottom-aligns with the tray itself (Nutzerwunsch 2026-08-24) rather than
     * using a fixed 28px gap below the Hand sheet - in practice the tray is
     * often *shorter* than Hand + this sheet stacked with that fixed gap
     * (Live-Test-Fund 2026-08-24: an initial version floored `top` at
     * `handRect.bottom + 28`, which - since that's exactly the larger of the
     * two values whenever the tray is the shorter one - always won out over
     * the tray-aligned value via `Math.max()`, silently making this whole
     * adjustment a no-op for that, apparently common, case). 190 is
     * `DockableSheetMixin`'s own fixed default height
     * (`dockable-sheet-mixin.mjs`) - safe to hardcode here since a resized (no
     * longer "docked") sheet never reaches this computation at all
     * (`updateDockPosition()` bails out before calling this callback in that
     * case). The floor is now just `handRect.bottom` (no extra gap) - enough
     * to rule out an actual overlap with the Hand sheet, without also
     * blocking the now-common case of a shorter-than-both-stacked tray from
     * pulling this sheet up closer to the Hand sheet than the old fixed gap.
     */
    (trayRect) => {
      const handEl = document.querySelector(".hand-sheet");
      if (handEl?.getClientRects().length) {
        const handRect = handEl.getBoundingClientRect();
        return { left: handRect.left, top: Math.max(handRect.bottom, trayRect.bottom - 190) };
      }
      return { left: trayRect.right + 16, top: trayRect.top };
    },
    "playedCardsSheetPosition",
  ) {
    /**
     * One deferred first-render docking pass. Foundry applies its initial
     * ApplicationV2 position late in the render cycle; without this pass it
     * can overwrite `_onRender()`'s already correct position and leave this
     * sheet directly on top of the Hand sheet until the user resets it.
     * @type {number|null}
     */
    #initialDockFrame = null;

    /** @inheritdoc */
    static DEFAULT_OPTIONS = {
      classes: ["aventuria-helpers", "played-cards-sheet"],
      actions: {
        // `this` (not the outer `AventuriaHelpersPlayedCardsSheet` binding) -
        // see the identical comment in hand-sheet.mjs for why.
        toggleExhaust: this.#onToggleExhaust,
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
      context.cards = this.document.cards
        .filter((card) => !card.getFlag(MODULE_ID, "usedAsEndurance"))
        .map((card) => ({ card, exhausted: isCardExhausted(card) }));
      context.empty = !context.cards.length;
      return context;
    }

    /**
     * Toggles whether a played card is exhausted (canvas rotation, see
     * `toggleCardExhausted()` in `cards/played-cards.mjs`) - the sheet's own
     * permanent button, unlike discard/return-to-hand/return-to-deck below,
     * which all moved into the right-click context menu (Nutzerwunsch
     * 2026-08-24, project/TODO.md).
     * @this AventuriaHelpersPlayedCardsSheet
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
     * Right-click context menu entries for a played card - "Ablegen", "Zurück
     * auf die Hand nehmen" and "Zurück ins Deck mischen", none common enough
     * during play to keep as permanent buttons next to "Karte erschöpfen"
     * (Nutzerwunsch 2026-08-24, project/TODO.md - "Zurück ins Deck mischen"
     * was already here since 2026-08-19, the other two moved in alongside
     * it). Same `_createContextMenu()`/`ContextMenuEntry` mechanism CCM's own
     * `DockedHandSheet._getCardContextOptions()` uses for flip/next-face/
     * previous-face (`ccm.mjs`) - a core `ApplicationV2` method, not
     * something specific to that class, so usable here without depending on
     * any CCM internals.
     * @returns {import("@client/applications/ux/context-menu.mjs").ContextMenuEntry[]}
     */
    _getCardContextOptions() {
      if (!this.isEditable) return [];
      return [
        {
          name: "AVENTURIA_HELPERS.HeroTray.ReturnToHand",
          icon: "<i class=\"fa-solid fa-fw fa-hand\"></i>",
          callback: async (li) => {
            const card = this.document.cards.get(li.dataset.cardId);
            const stacks = resolveSiblingStacks(this.document);
            if (!stacks?.hand) return;
            await returnPlayedCardToHand(card, stacks.hand);
          },
        },
        {
          name: "AVENTURIA_HELPERS.HeroTray.DiscardCard",
          icon: "<i class=\"fa-solid fa-fw fa-trash-can\"></i>",
          callback: async (li) => {
            const card = this.document.cards.get(li.dataset.cardId);
            const stacks = resolveSiblingStacks(this.document);
            if (!stacks?.discard) return;
            await discardPlayedCard(card, stacks.discard);
          },
        },
        {
          name: "AVENTURIA_HELPERS.HeroTray.ReturnToDeck",
          icon: "<i class=\"fa-solid fa-fw fa-shuffle\"></i>",
          callback: async (li) => {
            const card = this.document.cards.get(li.dataset.cardId);
            const stacks = resolveSiblingStacks(this.document);
            if (!stacks?.deck) return;
            await returnPlayedCardToDeck(card, stacks.deck);
          },
        },
      ];
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
      // Run once after Foundry has committed the window's own initial
      // position and after the Hand sheet has a stable bounding rectangle.
      // updateDockPosition() still respects `docked` if the window was moved
      // manually in the meantime.
      this.#initialDockFrame = requestAnimationFrame(() => {
        this.#initialDockFrame = null;
        if (this.rendered) this.updateDockPosition();
      });
      this._createContextMenu(this._getCardContextOptions, "[data-application-part=cardList] .cards .card", {
        hookName: "getPlayedCardContextOptions",
        parentClassHooks: false,
        fixed: true,
      });
    }

    /** @inheritdoc */
    async _onClose(options) {
      document.removeEventListener("ahb:dockable-repositioned", this.#onDockEvent);
      if (this.#initialDockFrame !== null) cancelAnimationFrame(this.#initialDockFrame);
      this.#initialDockFrame = null;
      hideCardPreview();
      return super._onClose(options);
    }
  };
}

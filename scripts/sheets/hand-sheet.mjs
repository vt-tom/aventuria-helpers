/**
 * Own visual skin for the Hand sheet, built by subclassing Complete Card
 * Management's `DockedHandSheet` instead of writing one from scratch: reusing it
 * keeps its drag-drop and right-click context menu (flip/next/previous face)
 * working exactly as before - only the template and CSS are ours.
 *
 * Unlike CCM's own version, this one is a normal, freely movable window rather
 * than fixed above the hotbar (`window.positioned: true` below overrides
 * DockedHandSheet's `positioned: false` - see the CSS comment on `.hand-sheet`
 * for why the inherited `.docked` positioning CSS also needs neutralizing, not
 * just the JS option). Dragging works via Foundry's normal built-in
 * header-drag (any non-`.header-control` click inside `.window-header`) - the
 * `.hand-sheet-grip` icon added in `_onFirstRender()` below is purely a visual
 * "grab here" affordance at the header's left edge, not a separate mechanism.
 *
 * Like `AventuriaHelpersCombat` in documents/combat.mjs, this class body can only
 * be built once `globalThis.ccm` exists, which happens inside Complete Card
 * Management's own `init` hook - so it's built lazily in `registerHandSheet()`,
 * called from this module's `init` hook after that dependency has already run
 * (guaranteed by `relationships.requires` in module.json).
 *
 * Also adds a second play action, "Als Ausdauer spielen" - `DEFAULT_OPTIONS.actions`
 * merges (rather than replaces) across the inherited class chain, so this sits
 * alongside `DockedHandSheet`'s own inherited `playCard` action untouched.
 */

import { resolveHandStacks } from "../cards/stacks.mjs";
import { playCardAsEndurance } from "../cards/endurance.mjs";

/** The lazily-built class; null until `registerHandSheet()` runs. */
export let AventuriaHelpersHandSheet = null;

/**
 * Single shared floating preview element (lazily created, reused across every
 * card hover and every Hand-sheet instance) - a large copy of the hovered
 * card's image, positioned beside the Hand sheet window rather than scaled up
 * in place, since scaling in place got clipped by the window's own bounds.
 */
let previewEl = null;

/** @returns {HTMLElement} */
function getPreviewEl() {
  if (!previewEl) {
    previewEl = document.createElement("div");
    previewEl.className = "aventuria-helpers hand-card-preview";
    previewEl.innerHTML = "<img alt=\"\">";
    document.body.append(previewEl);
  }
  return previewEl;
}

/**
 * Shows the floating preview for a hovered card, positioned just outside the
 * Hand sheet's own right edge (or its left edge, if there isn't enough room
 * on the right - e.g. narrow viewport or an open sidebar), vertically centred
 * on the hovered card. Computed from actual bounding boxes rather than
 * hardcoded offsets so it keeps working regardless of CCM's own responsive
 * `.docked` width/position math.
 * @param {HTMLElement} cardEl     The hovered `.card` list item.
 * @param {HTMLElement} sheetEl    The Hand sheet's root element.
 */
function showCardPreview(cardEl, sheetEl) {
  // Scoped to .card-art specifically (not just "the first img") - the card
  // also has an endurance-icon action button, and a stray second <img> there
  // previously got picked up instead of the actual card art.
  const img = cardEl.querySelector("img.card-art");
  if (!img?.src) return;

  const el = getPreviewEl();
  el.querySelector("img").src = img.src;
  el.classList.add("visible");

  const sheetRect = sheetEl.getBoundingClientRect();
  const cardRect = cardEl.getBoundingClientRect();
  const previewWidth = el.offsetWidth || 320;
  const gap = 20;

  let left = sheetRect.right + gap;
  if (left + previewWidth > window.innerWidth) {
    left = sheetRect.left - previewWidth - gap;
  }
  el.style.left = `${Math.max(8, left)}px`;
  el.style.top = `${cardRect.top + cardRect.height / 2}px`;
}

/** Hides the floating preview, if currently shown. */
function hideCardPreview() {
  previewEl?.classList.remove("visible");
}

export function registerHandSheet() {
  AventuriaHelpersHandSheet = class extends ccm.apps.CardsSheets.DockedHandSheet {
    /** @inheritdoc */
    static DEFAULT_OPTIONS = {
      classes: ["aventuria-helpers", "hand-sheet"],
      window: { positioned: true },
      actions: {
        // `this` (not the outer `AventuriaHelpersHandSheet` binding) - this is
        // an anonymous class expression, so its own name isn't available
        // inside its body yet at this point (the outer assignment only
        // happens once the whole expression finishes evaluating); `this` in a
        // static field initializer is bound to the class itself regardless.
        playAsEndurance: this.#onPlayAsEndurance,
      },
    };

    /**
     * Plays a card as Ausdauer instead of opening the normal "play to which
     * stack" dialog - see `cards/endurance.mjs` for what that actually means
     * (face-down placement on the hero's own scene region, tagged so the
     * Heldenablage can tell it apart from a normally played card sharing the
     * same Im-Spiel-Stapel).
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
     * Adds the drag-handle grip icon to the header (once - the frame/header
     * isn't part of PARTS, so it only exists after the first render, unlike
     * the card list).
     * @inheritdoc
     */
    async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);
      const header = this.element.querySelector(".window-header");
      if (header && !header.querySelector(".hand-sheet-grip")) {
        const grip = document.createElement("i");
        grip.className = "hand-sheet-grip fa-solid fa-grip-lines-vertical";
        grip.dataset.tooltip = game.i18n.localize("AVENTURIA_HELPERS.HeroTray.DragHandle");
        header.prepend(grip);
      }
    }

    /**
     * Wires the hover-preview listeners onto every card row. Runs after every
     * render (not just the first), since the card list part is fully
     * re-rendered whenever the hand's contents change.
     * @inheritdoc
     */
    async _onRender(context, options) {
      await super._onRender(context, options);
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

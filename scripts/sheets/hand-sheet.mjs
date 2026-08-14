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

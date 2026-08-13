import { AventuriaHelpersHandSheet } from "../sheets/hand-sheet.mjs";
import { resolveHandStacks } from "../cards/stacks.mjs";
import { getEnduranceStatus, exhaustEndurance, readyEndurance } from "../cards/endurance.mjs";
import { openWelcomeScreen } from "../macros/open-welcome-screen.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const MODULE_ID = "aventuria-helpers";
const CCM_ID = "complete-card-management";
const ICONS = "modules/aventuria/assets/icons/";

/** The single running instance, created once in `registerHeroTray()`. */
let tray = null;

/**
 * The currently open Hand sheet, if any - reused instead of stacking a new
 * window per click, since the sheet's header (and with it the close button) is
 * hidden for a more minimal, docked look (see `.hand-sheet .window-header` in
 * the CSS).
 */
let handSheet = null;

/**
 * Permanent HUD element showing the current user's own Aventuria hero (portrait,
 * Deck/Ablage/Hand) so they don't have to dig through the Cards sidebar or the
 * canvas placeables for their own cards. Lives in the same UI slot as the native
 * Foundry player list (`#ui-left-column-1`) and is toggled against it, never shown
 * at the same time - see `registerHeroTray()`.
 */
export class AventuriaHelpersHeroTray extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "aventuria-helpers-hero-tray",
    classes: ["aventuria-helpers", "hero-tray"],
    window: { frame: false, positioned: false },
    actions: {
      pickHero: AventuriaHelpersHeroTray.#onPickHero,
      openSheet: AventuriaHelpersHeroTray.#onOpenSheet,
      drawCard: AventuriaHelpersHeroTray.#onDrawCard,
      shuffleDeck: AventuriaHelpersHeroTray.#onShuffleDeck,
      previewCards: AventuriaHelpersHeroTray.#onPreviewCards,
      viewDeck: AventuriaHelpersHeroTray.#onViewDeck,
      viewDiscard: AventuriaHelpersHeroTray.#onViewDiscard,
      viewHand: AventuriaHelpersHeroTray.#onViewHand,
      toggleTray: AventuriaHelpersHeroTray.#onToggleTray,
      openConfig: AventuriaHelpersHeroTray.#onOpenConfig,
      openHelp: AventuriaHelpersHeroTray.#onOpenHelp,
      exhaustEndurance: AventuriaHelpersHeroTray.#onExhaustEndurance,
      readyEndurance: AventuriaHelpersHeroTray.#onReadyEndurance,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    tray: {
      template: "modules/aventuria-helpers/templates/hero-tray.hbs",
    },
  };

  /* -------------------------------------------------- */

  /**
   * No `<template id="aventuria-helpers-hero-tray">` placeholder exists in Foundry's
   * own `game.hbs` (core file, not ours to edit), so the default `_insertElement()`
   * would just append us to `document.body`. Overriding it - an extension point
   * explicitly documented for subclasses - places the tray in the same flex column
   * as the native player list (`#ui-left-column-1`) instead.
   * @inheritdoc
   */
  async _insertElement(element) {
    const column = document.getElementById("ui-left-column-1");
    if (column) column.append(element);
    else document.body.append(element);
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const stacks = resolveStacks();

    if (!stacks) {
      context.empty = true;
      return context;
    }

    context.empty = false;
    context.actor = stacks.actor;
    context.playerName = game.user.name;
    context.deck = stacks.deck && { count: stacks.deck.availableCards.length };
    context.discard = stacks.discard && { count: stacks.discard.cards.size };
    context.hand = { count: stacks.hand.cards.size };
    context.endurance = stacks.playPile ? getEnduranceStatus(stacks.playPile) : null;
    context.icons = {
      deck: ICONS + "draw-pile.webp",
      discard: ICONS + "discard-pile.webp",
      endurance: ICONS + "endurance.webp",
    };
    return context;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                    */
  /* -------------------------------------------------- */

  /**
   * Runs aventuria's own "Bereite Spieler vor" macro (dialog: choose a level-1 hero
   * + player number). Reuses it wholesale instead of building a separate hero-list
   * dialog - it already does the compendium import, Folder/Cards creation and the
   * `game.user.character`/`playerHand` flag wiring the tray then reads back out.
   * @this AventuriaHelpersHeroTray
   */
  static async #onPickHero() {
    await game.modules.get("aventuria").api.preparePlayer();
    await this.render();
  }

  /**
   * Opens the hero's own actor sheet (whichever sheet class the user has
   * configured for it - not hardcoded to this module's own Hero-Sheet, same as
   * clicking a portrait anywhere else in Foundry).
   * @this AventuriaHelpersHeroTray
   */
  static async #onOpenSheet() {
    game.user.character?.sheet.render(true);
  }

  /**
   * Draws one card from the Deck into the Hand (core `Cards#draw`).
   * @this AventuriaHelpersHeroTray
   */
  static async #onDrawCard() {
    const stacks = resolveStacks();
    if (!stacks?.deck) return;
    await stacks.hand.draw(stacks.deck, 1);
  }

  /**
   * Shuffles the Deck.
   * @this AventuriaHelpersHeroTray
   */
  static async #onShuffleDeck() {
    const stacks = resolveStacks();
    if (!stacks?.deck) return;
    await stacks.deck.shuffle();
  }

  /**
   * Exhausts (rotates 90°) one ready Ausdauer card - see `cards/endurance.mjs`.
   * No confirmation/selection dialog: which specific card is arbitrary, only
   * the ready/spent count shown here matters.
   * @this AventuriaHelpersHeroTray
   */
  static async #onExhaustEndurance() {
    const stacks = resolveStacks();
    if (stacks?.playPile) await exhaustEndurance(stacks.playPile);
  }

  /**
   * Makes one spent Ausdauer card ready again (rotates it back to 0°).
   * @this AventuriaHelpersHeroTray
   */
  static async #onReadyEndurance() {
    const stacks = resolveStacks();
    if (stacks?.playPile) await readyEndurance(stacks.playPile);
  }

  /**
   * "Kartenvorschau": look at the top X cards of the Deck without drawing them,
   * via Complete Card Management's own scry feature - no custom peek UI needed.
   * @this AventuriaHelpersHeroTray
   */
  static async #onPreviewCards() {
    const stacks = resolveStacks();
    if (!stacks?.deck?.availableCards.length) return;
    const amount = await promptCardAmount(stacks.deck.availableCards.length);
    if (!amount) return;
    await ccm.api.scry(stacks.deck, { amount });
  }

  /**
   * Opens the full Complete Card Management deck sheet.
   * @this AventuriaHelpersHeroTray
   */
  static async #onViewDeck() {
    const stacks = resolveStacks();
    if (stacks?.deck) new ccm.apps.CardsSheets.DeckSheet(stacks.deck).render({ force: true });
  }

  /**
   * Opens the full Complete Card Management pile sheet for the discard pile.
   * @this AventuriaHelpersHeroTray
   */
  static async #onViewDiscard() {
    const stacks = resolveStacks();
    if (stacks?.discard) new ccm.apps.CardsSheets.PileSheet(stacks.discard).render({ force: true });
  }

  /**
   * Opens the Hand in the module's own reskinned docked-hand sheet (explicitly
   * instantiated, not `hand.sheet`, since CCM registers its Cards sheets without
   * `makeDefault`). Reuses an already-open instance instead of stacking a new
   * window each click - see `handSheet` above.
   * @this AventuriaHelpersHeroTray
   */
  static async #onViewHand() {
    const stacks = resolveStacks();
    if (!stacks?.hand) return;
    if (handSheet?.rendered && handSheet.document === stacks.hand) {
      handSheet.bringToFront();
      return;
    }
    handSheet = new AventuriaHelpersHandSheet(stacks.hand);
    await handSheet.render({ force: true });
  }

  /**
   * Swaps the tray and the native player list in their shared UI slot.
   * @this AventuriaHelpersHeroTray
   */
  static async #onToggleTray() {
    await toggleTray();
  }

  /**
   * Opens Foundry's native User configuration for the current user - already
   * has everything needed here without building anything from scratch: the
   * core "Character" field (`game.user.character`) plus Complete Card
   * Management's own injected "Player Hand" field
   * (`flags.complete-card-management.playerHand`, added via its
   * `renderUserConfig` hook, `ccm.mjs:4521-4565`). The tray already refreshes
   * on `updateUser` (see `registerHeroTray()`), so saving this dialog updates
   * the tray automatically.
   * @this AventuriaHelpersHeroTray
   */
  static async #onOpenConfig() {
    game.user.sheet.render(true);
  }

  /**
   * Opens the Aventuria Helpers Guide (welcome screen), same entry point as the
   * "Aventuria-Guide öffnen" macro.
   * @this AventuriaHelpersHeroTray
   */
  static async #onOpenHelp() {
    openWelcomeScreen();
  }
}

/* -------------------------------------------------- */

/**
 * Prompts for how many top cards of the deck to preview, styled like the module's
 * other small dialogs (reuses `.probe-dialog`'s CSS wholesale - it's a generic
 * themed-dialog shell, not specific to Proben).
 * @param {number} max
 * @returns {Promise<number|null>}
 */
async function promptCardAmount(max) {
  const result = await foundry.applications.api.Dialog.input({
    window: {
      title: game.i18n.localize("AVENTURIA_HELPERS.HeroTray.PreviewTitle"),
      icon: "fa-solid fa-eye",
    },
    classes: ["aventuria-helpers", "probe-dialog"],
    content: `
      <div class="probe-dialog-body">
        <div class="form-group">
          <label for="tray-preview-amount">${game.i18n.localize("AVENTURIA_HELPERS.HeroTray.PreviewAmount")}</label>
          <input type="number" id="tray-preview-amount" name="amount" value="${Math.min(3, max)}" min="1" max="${max}" step="1" autofocus>
        </div>
      </div>
    `,
    ok: {
      label: game.i18n.localize("AVENTURIA_HELPERS.HeroTray.Preview"),
      icon: "fa-solid fa-eye",
    },
  });
  if (!result) return null;
  return Math.max(1, Math.min(max, Number(result.amount) || 1));
}

/**
 * Resolves the current user's hero and the four Cards stacks `preparePlayer()`
 * creates for them, without duplicating any of that macro's own bookkeeping:
 * only the Hand is tracked via a user flag, so Deck/Ablage/Im-Spiel-Stapel are
 * found as its siblings in the same Folder. Module-level (not a class method) so
 * the auto-refresh hooks below can use it too, to only react to changes on the
 * current user's own stacks.
 * @returns {{actor: Actor, hand: Cards, deck: Cards|null, discard: Cards|null}|null}
 */
function resolveStacks() {
  const actor = game.user.character;
  const handId = game.user.getFlag(CCM_ID, "playerHand");
  const hand = handId ? game.cards.get(handId) : null;
  if (!actor || !hand) return null;

  const stacks = resolveHandStacks(hand);
  return stacks && { actor, ...stacks };
}

/**
 * Flips which of the tray / native player list is visible in their shared slot
 * (both stay mounted, see the CSS) and remembers the choice per user.
 */
async function toggleTray() {
  const show = !document.body.classList.contains("ahb-tray-active");
  document.body.classList.toggle("ahb-tray-active", show);
  await game.user.setFlag(MODULE_ID, "showHeroTray", show);
}

/**
 * Injects a toggle "bubble" floating just outside the native player list
 * (`Hooks.on("renderPlayers")` fires after every one of its renders, so this runs
 * again whenever that app's own root-part render wipes out the previous button).
 * Appended into `#players-active` specifically - see the CSS comment on
 * `#players-active`/`.ahb-tray-toggle` in aventuria-helpers.css for why that
 * element (not `#players` itself) is the correct positioning anchor. Uses
 * aventuria's own hero-token artwork rather than a Font Awesome glyph, both
 * because it reads more clearly as "your hero" and because Foundry only bundles
 * a subset of Font Awesome - an unverified icon class (e.g. the earlier
 * `fa-id-badge`) can silently render as a missing-glyph box.
 * @param {HTMLElement} element
 */
function injectToggleButton(element) {
  if (element.querySelector(".ahb-tray-toggle")) return;
  const anchor = element.querySelector("#players-active") ?? element;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ahb-tray-toggle";
  button.dataset.tooltip = game.i18n.localize("AVENTURIA_HELPERS.HeroTray.ShowTray");
  button.innerHTML = `<img src="${ICONS}starting-hero-token-alt.webp" alt="">`;
  button.addEventListener("click", () => toggleTray());
  anchor.append(button);
}

/**
 * Renders the tray, wires it into the same UI slot as the native player list, and
 * registers the toggle + auto-refresh hooks. Called once from the module's `init`
 * hook; the tray itself renders on `ready` (needs `game.user`/`game.cards` etc.
 * available, unlike the sheet/combat registrations that only configure classes).
 */
export function registerHeroTray() {
  // Debounced so a single user action that touches many Card documents at once
  // (e.g. shuffling updates the sort of every card in the deck, each firing its
  // own "updateCard" hook) collapses into one re-render instead of a flurry.
  const refresh = foundry.utils.debounce(() => tray?.render(), 100);

  Hooks.once("ready", async () => {
    tray = new AventuriaHelpersHeroTray();
    await tray.render({ force: true });
    document.body.classList.toggle("ahb-tray-active", !!game.user.getFlag(MODULE_ID, "showHeroTray"));
  });

  Hooks.on("renderPlayers", (app, element) => injectToggleButton(element));

  Hooks.on("updateUser", (user, changes) => {
    if (user.id !== game.user.id) return;
    if ("character" in changes || foundry.utils.hasProperty(changes, `flags.${CCM_ID}.playerHand`)) {
      refresh();
    }
  });

  // Renaming/deleting a whole stack (rare, e.g. GM cleanup) fires on the Cards
  // stack itself; drawing/shuffling/discarding individual cards only touches the
  // embedded Card documents within it (Cards#draw()/#shuffle() call
  // create/update/deleteEmbeddedDocuments("Card", ...), never Cards#update()) -
  // both kinds of change need their own hook, filtered to the current user's own
  // stacks so other players' card actions don't cause needless re-renders here.
  const ownFolder = () => resolveStacks()?.hand.folder;
  for (const hook of ["createCards", "updateCards", "deleteCards"]) {
    Hooks.on(hook, (doc) => {
      if (doc.folder && doc.folder === ownFolder()) refresh();
    });
  }
  for (const hook of ["createCard", "updateCard", "deleteCard"]) {
    Hooks.on(hook, (card) => {
      if (card.parent?.folder && card.parent.folder === ownFolder()) refresh();
    });
  }
}

import {
  getActiveAdventure,
  startAdventure,
  goToPage,
  endAdventure,
  getAdventureLockHolder,
  acquireAdventureLock,
  releaseAdventureLock,
} from "../cards/adventure-state.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

/** `"de"` -> `"deutsch"`/`"Abenteuer "`, `"en"` -> `"english"`/`"Adventure "` (everything else falls back to English). */
const LANG = {
  de: { pack: "aventuria.journal-deutsch", prefix: "Abenteuer " },
  en: { pack: "aventuria.journal-english", prefix: "Adventure " },
};

/**
 * Guided reader for Aventuria's 10 standard adventures (`project/PROJECT.md` 5.2, "Teil a": picking,
 * reading/navigating, and resuming an adventure - AP-Vergabe deliberately out of scope until
 * 1.5 (Abenteuerpunkte-Tracking) exists). One adventure active at a time, world-wide (see
 * `cards/adventure-state.mjs`), guarded by a manual one-person lock so two people can't
 * advance the same adventure out from under each other.
 */
export class AventuriaHelpersAdventureTool extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "aventuria-helpers-adventure-tool",
    // "aventuria-wrapper"/"journal-sheet" aren't styling hooks of ours - they're exactly the
    // two classes aventuria's own bundled CSS (`dist/style.css`) scopes every one of its rich
    // journal styles under (`.aventuria-wrapper.journal-sheet .window-content ...` - icons,
    // <aside> boxes, fortune-table, content-links, etc.). "journal-sheet" itself comes from
    // Foundry core's own `JournalEntryPageSheet.DEFAULT_OPTIONS.classes` (confirmed in the
    // local v14 source), which aventuria's own sheet subclass inherits and adds
    // "aventuria-wrapper" alongside; adding both here - without extending that sheet class at
    // all - gets the exact same rendering for free instead of re-styling asides/tables/icons
    // from scratch (this module's usual wholesale-reuse rule, see `CLAUDE.md`).
    classes: ["aventuria-helpers", "adventure-tool", "aventuria-wrapper", "journal-sheet"],
    window: {
      title: "AVENTURIA_HELPERS.AdventureTool.Title",
      icon: "fa-solid fa-book-open",
      resizable: true,
    },
    position: { width: 640, height: "auto" },
    actions: {
      close: AventuriaHelpersAdventureTool.#onClose,
      startAdventure: AventuriaHelpersAdventureTool.#onStartAdventure,
      release: AventuriaHelpersAdventureTool.#onRelease,
      endAdventure: AventuriaHelpersAdventureTool.#onEndAdventure,
      goToPage: AventuriaHelpersAdventureTool.#onGoToPage,
      togglePanel: AventuriaHelpersAdventureTool.#onTogglePanel,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    content: {
      template: "modules/aventuria-helpers/templates/adventure-tool.hbs",
    },
  };

  /** The language-appropriate adventure compendium, resolved lazily by `#loadAdventures()`. */
  #pack = null;

  /** Cached `{id, uuid, name, number}` list from `#pack`, fetched once per instance. */
  #adventures = null;

  /** Hook ids (`updateSetting`/`createSetting`) for the live-refresh listener, so `_onClose()` can remove them again. */
  #settingsHooks = [];

  /**
   * Which of the three info panels ("prep"/"history"/"nav") is currently expanded, or `null`
   * if none is - instance-local UI state, not persisted (analogous to
   * `AventuriaHelpersCardHeroSheet#_cardLocked`), since it has no meaning outside the current
   * window. Replaced the three always-stacked `<details>` boxes (Live-Test-Fund 2026-08-21,
   * "nehmen zu viel Platz ein" - see `TODO.md`) with a compact icon row that expands at most
   * one panel at a time instead - Nutzerentscheidung nach Klickdummy-Vergleich
   * (`project/design-unification/`), "Variante A".
   * @type {"prep"|"history"|"nav"|null}
   */
  #activePanel = null;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const holder = getAdventureLockHolder();
    if (holder && holder.id !== game.user.id) {
      context.locked = true;
      context.lockedBy = holder.name;
      return context;
    }
    context.locked = false;

    const active = getActiveAdventure();
    if (!active) {
      context.picker = true;
      context.adventures = await this.#loadAdventures();
      this.#activePanel = null; // stale once back at the picker, see field doc
      return context;
    }

    const entry = await fromUuid(active.entryUuid);
    if (!entry) {
      // The world's language (or the compendium itself) changed out from under a
      // still-active adventure - nothing sane to show, offer only "choose another".
      context.picker = true;
      context.adventures = await this.#loadAdventures();
      context.brokenAdventure = true;
      this.#activePanel = null;
      return context;
    }

    const pages = [...entry.pages].sort((a, b) => a.sort - b.sort);
    const firstPage = pages[0];
    const currentPage = entry.pages.get(active.pageId) ?? firstPage;
    const isFirstPage = currentPage.id === firstPage.id;

    const { prepHtml } = AventuriaHelpersAdventureTool.#extractFirstAside(firstPage.text.content);
    const { restHtml: pageHtml } = isFirstPage
      ? AventuriaHelpersAdventureTool.#extractFirstAside(currentPage.text.content)
      : { restHtml: currentPage.text.content };

    context.reading = true;
    context.entryName = entry.name;
    context.entryUuid = entry.uuid;
    context.pageName = currentPage.name;
    context.panels = {
      prep: this.#activePanel === "prep",
      history: this.#activePanel === "history",
      nav: this.#activePanel === "nav",
    };
    context.prepHtml = prepHtml
      ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(prepHtml, { relativeTo: entry })
      : null;
    context.pageHtml = await foundry.applications.ux.TextEditor.implementation.enrichHTML(pageHtml, { relativeTo: entry });
    context.history = active.visited.map((pageId) => ({
      id: pageId,
      name: entry.pages.get(pageId)?.name ?? pageId,
      active: pageId === currentPage.id,
    }));
    // Fallback for a page whose text has no @UUID link onward (or to "Beenden") at all -
    // Live-Test-Fund 2026-08-21: without this, a reader hitting such a page had no way
    // forward except closing the tool and hoping the History list (visited pages only)
    // happened to cover it. Kept as its own collapsible, deliberately separate from
    // "Verlauf" above rather than folded into it (Nutzerwunsch) - this lists *every* page
    // of the adventure, visited or not, since the whole point is escaping a dead end.
    context.allPages = pages.map((page) => ({
      id: page.id,
      name: page.name,
      active: page.id === currentPage.id,
    }));
    return context;
  }

  /**
   * Fetches and caches the language-appropriate adventure list, once per instance - the 10
   * "Abenteuer N - ..."/"Adventure N - ..." entries (filtered by name prefix, since the
   * German/English compendiums don't share matching folder IDs - see `project/PROJECT.md` 5.2),
   * sorted by their adventure number.
   * @returns {Promise<{id: string, uuid: string, name: string, number: number}[]>}
   */
  async #loadAdventures() {
    if (this.#adventures) return this.#adventures;
    const lang = LANG[game.i18n.lang] ?? LANG.en;
    this.#pack = game.packs.get(lang.pack);
    if (!this.#pack) {
      this.#adventures = [];
      return this.#adventures;
    }
    const index = await this.#pack.getIndex();
    this.#adventures = index
      .filter((e) => e.name.startsWith(lang.prefix))
      .map((e) => ({
        id: e._id,
        uuid: e.uuid,
        name: e.name,
        number: Number.parseInt(e.name.slice(lang.prefix.length), 10) || 0,
      }))
      .sort((a, b) => a.number - b.number);
    return this.#adventures;
  }

  /**
   * Splits off the first `<aside>` element of a JournalEntryPage's raw HTML - the
   * "Vorbereitung"/setup-instructions box, reliably the first `<aside>` on an adventure's
   * first page regardless of its CSS class (confirmed against all 10 adventures, see
   * `project/PROJECT.md` 5.2 for the research).
   * @param {string} html
   * @returns {{prepHtml: string|null, restHtml: string}}
   */
  static #extractFirstAside(html) {
    const container = document.createElement("div");
    container.innerHTML = html;
    const aside = container.querySelector("aside");
    if (!aside) return { prepHtml: null, restHtml: html };
    aside.remove();
    return { prepHtml: aside.outerHTML, restHtml: container.innerHTML };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    // Live-Test-Fund 2026-08-21 (reproducible "locked" window that opens top-left and can't
    // be closed): `render()`/`close()` both funnel through the same one-slot semaphore
    // (`ApplicationV2#render`/`#close`, local v14 core source). This method already runs
    // *inside* the still-in-progress outer `render()` call that holds that slot - a former
    // version called `await this.render()` right here when the lock couldn't be acquired,
    // which queued a second render behind the very slot this call is blocking on: a
    // deadlock. Nothing further ever completed for that instance, including the position
    // update `#render()` performs right after this hook (hence "opens top-left", the CSS
    // width/height/centering from `setPosition()` was never applied) and `close()` itself
    // (queued behind the same jammed slot, hence "can't be closed"). `_prepareContext()`
    // already re-evaluates the lock fresh on every render, so the current pass already shows
    // the correct locked view without needing a synchronous re-render here at all - only the
    // live-refresh hooks below are actually needed, registered unconditionally (locked-out
    // viewers now also get live updates once the lock frees up, which they didn't before).
    await acquireAdventureLock();
    // Live-refresh for every connected client (e.g. the GM advances a page, a second window
    // showing the tool should follow along; the lock also needs to show up/disappear live).
    // Both "update" and "create" are needed - a Setting document is only actually created in
    // the world DB on its *first* ever `game.settings.set()` call (before that, `.get()` just
    // returns the client-side `default: {}}` without a backing document), so a fresh world's
    // very first lock/adventure change fires `createSetting`, not `updateSetting`.
    const onSettingChange = (setting) => {
      if (setting.key === "aventuria-helpers.activeAdventure" || setting.key === "aventuria-helpers.adventureToolLock") {
        this.render();
      }
    };
    this.#settingsHooks = [Hooks.on("updateSetting", onSettingChange), Hooks.on("createSetting", onSettingChange)];
  }

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    // Intercepts @UUID-link clicks that point at another page of the *same* open
    // JournalEntry, navigating within the tool instead of opening a second window - added on
    // an ancestor covering both the prep box and the main page content, so it fires (and can
    // stopPropagation()) before Foundry's own global `document.body` content-link handler
    // (`TextEditor.activateListeners()`, registered once by core) gets a chance to open a
    // separate sheet. Links to anything else (Cards, a different JournalEntry, the shared
    // rulebook, ...) are left alone and bubble up to that default handler normally.
    const content = this.element.querySelector(".adventure-tool-reading");
    content?.addEventListener("click", async (event) => {
      const link = event.target.closest("a.content-link[data-link]");
      if (!link || link.dataset.type !== "JournalEntryPage") return;
      const page = await fromUuid(link.dataset.uuid);
      if (!page || page.parent?.uuid !== context.entryUuid) return;
      event.preventDefault();
      event.stopPropagation();
      await goToPage(page.id);
      await this.render();
    });
  }

  /** @inheritdoc */
  async _onClose(options) {
    const [updateId, createId] = this.#settingsHooks;
    if (updateId !== undefined) Hooks.off("updateSetting", updateId);
    if (createId !== undefined) Hooks.off("createSetting", createId);
    await releaseAdventureLock();
    return super._onClose(options);
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                    */
  /* -------------------------------------------------- */

  static #onClose() {
    this.close();
  }

  /**
   * Starts the chosen adventure at its first page and switches straight into the reading
   * view - no separate confirmation, picking an adventure is itself the confirmation (there's
   * nothing destructive here, unlike replacing an already-assigned hero).
   * @this AventuriaHelpersAdventureTool
   */
  static async #onStartAdventure(event, target) {
    const uuid = target.dataset.uuid;
    const entry = await fromUuid(uuid);
    if (!entry) return;
    const firstPage = [...entry.pages].sort((a, b) => a.sort - b.sort)[0];
    if (!firstPage) return;
    await startAdventure(uuid, firstPage.id);
    await this.render();
  }

  /**
   * Releases the lock and closes the tool - someone else can then open it. Kept as an
   * explicit action distinct from just closing the window, so a GM who only wants to hand
   * off control (without necessarily meaning "I'm done for the session") has a clearly
   * labeled button for it, even though the effect is currently identical to closing.
   * @this AventuriaHelpersAdventureTool
   */
  static async #onRelease() {
    await this.close();
  }

  /**
   * Ends the active adventure (back to the picker) after confirmation - does *not* run board
   * cleanup itself, that's the standalone "Board aufräumen" action on the welcome screen
   * (Nutzerentscheidung 2026-08-17: ending/marking an adventure finished and physically
   * resetting the table are different concerns, and cleanup is just as useful without ever
   * having used this tool - not nested inside it, see `project/PROJECT.md` 5.2/E).
   * @this AventuriaHelpersAdventureTool
   */
  static async #onEndAdventure() {
    const proceed = await foundry.applications.api.Dialog.confirm({
      window: { title: game.i18n.localize("AVENTURIA_HELPERS.AdventureTool.EndConfirmTitle") },
      content: `<p>${game.i18n.localize("AVENTURIA_HELPERS.AdventureTool.EndConfirmBody")}</p>`,
    });
    if (!proceed) return;
    await endAdventure();
    await this.render();
  }

  /**
   * Jumps to a page from the visited-history/all-pages list - closes whichever panel triggered
   * the jump afterwards, same as a dropdown closing after picking an option (the panel's own
   * list would otherwise keep covering the freshly changed page underneath it).
   * @this AventuriaHelpersAdventureTool
   */
  static async #onGoToPage(event, target) {
    await goToPage(target.dataset.pageId);
    this.#activePanel = null;
    await this.render();
  }

  /**
   * Expands/collapses one of the three info panels (Vorbereitung/Verlauf/Seiten-Navigation) -
   * at most one open at a time, clicking an already-open panel's icon closes it again.
   * @this AventuriaHelpersAdventureTool
   */
  static async #onTogglePanel(event, target) {
    const panel = target.dataset.panel;
    this.#activePanel = this.#activePanel === panel ? null : panel;
    await this.render();
  }
}

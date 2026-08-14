import { placeBoardStacks } from "../cards/place-board-stacks.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const MODULE_ID = "aventuria-helpers";

/**
 * Client setting used to reopen the "Erste Schritte" guide on the getting-started step
 * it was on before the "Spielerverwaltung öffnen" button navigated away to Foundry's
 * separate `/players` page - that page isn't part of the SPA, so leaving it reloads the
 * whole client from scratch and would otherwise silently lose the open guide window
 * (Nutzerfeedback 2026-08-14). `-1` means "nothing to reopen".
 */
const REOPEN_STEP_SETTING = "reopenGettingStartedStep";

/**
 * Registers `REOPEN_STEP_SETTING` and the `ready` hook that consumes it. Called once
 * from the module's `init` hook, same pattern as `registerHeroTray()` - the setting
 * itself can be registered at `init`, but reopening the app needs `game.i18n`/rendering
 * to be ready.
 */
export function registerWelcomeScreenReopen() {
  game.settings.register(MODULE_ID, REOPEN_STEP_SETTING, {
    scope: "client",
    config: false,
    type: Number,
    default: -1,
  });

  Hooks.once("ready", async () => {
    const stepIndex = game.settings.get(MODULE_ID, REOPEN_STEP_SETTING);
    if (stepIndex < 0) return;
    await game.settings.set(MODULE_ID, REOPEN_STEP_SETTING, -1);
    const app = new AventuriaHelpersWelcomeScreen();
    app.section = "gettingStarted";
    app.stepIndex = stepIndex;
    await app.render({ force: true });
  });
}

/**
 * Growing guided-onboarding tool for Aventuria: a standalone window that steps users
 * through it section by section, opened manually (no auto-popup, no per-user "seen"
 * tracking). Currently covers the welcome screen and a first "Erste Schritte" section;
 * more sections are expected to hang off this same window as the guide grows.
 */
export class AventuriaHelpersWelcomeScreen extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * The "Erste Schritte" checklist, one entry per page. `action` names a registered
   * action to offer as a button on that page; `note` marks the steps that are still
   * manual today and shows the "planned automation" hint instead of a button.
   */
  static STEPS = [
    { key: "Users", action: "openPlayerManagement" },
    { key: "Language", action: "openSettings" },
    { key: "Scene", action: "importScene" },
    { key: "Macros", action: "importMacros" },
    { key: "PrepareBoard", action: "runPrepareBoard" },
    { key: "PlaceStacks", action: "placeStacks" },
  ];

  /**
   * Maps the game's active language to the matching JournalEntry name in the `guide`
   * compendium (see `scripts/build/build-guide-pack.mjs`, which bakes these exact names
   * in from `manual-de.md`/`manual-en.md`). Only "de" and "en" exist as module languages
   * (see `module.json`), so anything else falls back to the English guide.
   */
  static GUIDE_JOURNAL_NAMES = {
    de: "Aventuria Helpers Guide (deutsch)",
    en: "Aventuria Helpers Guide (englisch)",
  };

  /** Currently shown section; persists across re-renders. */
  section = "welcome";

  /** Currently shown page within the "gettingStarted" section; persists across re-renders. */
  stepIndex = 0;

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "aventuria-helpers-welcome",
    classes: ["aventuria-helpers", "welcome-screen"],
    window: {
      title: "AVENTURIA_HELPERS.Welcome.Title",
      icon: "fa-solid fa-hand-sparkles",
      resizable: true,
    },
    position: { width: 480, height: "auto" },
    actions: {
      close: AventuriaHelpersWelcomeScreen.#onClose,
      showSection: AventuriaHelpersWelcomeScreen.#onShowSection,
      prevStep: AventuriaHelpersWelcomeScreen.#onPrevStep,
      nextStep: AventuriaHelpersWelcomeScreen.#onNextStep,
      goToStep: AventuriaHelpersWelcomeScreen.#onGoToStep,
      openGuide: AventuriaHelpersWelcomeScreen.#onOpenGuide,
      openPlayerManagement: AventuriaHelpersWelcomeScreen.#onOpenPlayerManagement,
      openSettings: AventuriaHelpersWelcomeScreen.#onOpenSettings,
      importScene: AventuriaHelpersWelcomeScreen.#onImportScene,
      importMacros: AventuriaHelpersWelcomeScreen.#onImportMacros,
      runPrepareBoard: AventuriaHelpersWelcomeScreen.#onRunPrepareBoard,
      placeStacks: AventuriaHelpersWelcomeScreen.#onPlaceStacks,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    content: {
      template: "modules/aventuria-helpers/templates/welcome-screen.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.sections = {
      welcome: { active: this.section === "welcome" },
      gettingStarted: { active: this.section === "gettingStarted" },
    };
    if (this.section === "gettingStarted") {
      context.step = this.#prepareStep();
    }
    return context;
  }

  /**
   * Builds the view model for the currently shown "gettingStarted" page - one step
   * per page (see `STEPS`) instead of one long scrolling list, since the previous
   * all-steps-at-once layout made the window too tall on smaller screens.
   */
  #prepareStep() {
    const steps = AventuriaHelpersWelcomeScreen.STEPS;
    const index = Math.clamp(this.stepIndex, 0, steps.length - 1);
    const step = steps[index];
    const prefix = `AVENTURIA_HELPERS.GettingStarted.Steps.${step.key}`;
    return {
      number: index + 1,
      titleKey: `${prefix}.Title`,
      bodyKey: `${prefix}.Body`,
      action: step.action ?? null,
      actionKey: step.action ? `${prefix}.Action` : null,
      note: step.note ?? false,
      isLast: index === steps.length - 1,
      dots: steps.map((s, i) => ({ index: i, number: i + 1, active: i === index })),
    };
  }

  /* -------------------------------------------------- */

  static #onClose() {
    this.close();
  }

  /**
   * Switches sections. `position.height` stays "auto" in DEFAULT_OPTIONS, so re-rendering
   * naturally resizes the window to fit whichever section is now shown. Entering
   * "gettingStarted" always starts back at the first page, so the "Erste Schritte"
   * button on the welcome page has predictable behavior regardless of where the
   * checklist was left last time.
   */
  static async #onShowSection(event, target) {
    this.section = target.dataset.section;
    if (this.section === "gettingStarted") this.stepIndex = 0;
    await this.render();
  }

  /** One page back, or - from the first page - out to the welcome section. */
  static async #onPrevStep() {
    if (this.stepIndex > 0) {
      this.stepIndex -= 1;
    } else {
      this.section = "welcome";
    }
    await this.render();
  }

  /** One page forward, or - from the last page - closes the guide. */
  static async #onNextStep() {
    const isLast = this.stepIndex >= AventuriaHelpersWelcomeScreen.STEPS.length - 1;
    if (isLast) {
      this.close();
      return;
    }
    this.stepIndex += 1;
    await this.render();
  }

  /** Jumps directly to a page via the page-selector dots. */
  static async #onGoToStep(event, target) {
    this.stepIndex = Number(target.dataset.step);
    await this.render();
  }

  /** Opens the language-appropriate journal from the `guide` compendium (see `GUIDE_JOURNAL_NAMES`). */
  static async #onOpenGuide() {
    const pack = game.packs.get("aventuria-helpers.guide");
    if (!pack) {
      ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Welcome.GuideMissing"));
      return;
    }
    const name = AventuriaHelpersWelcomeScreen.GUIDE_JOURNAL_NAMES[game.i18n.lang]
      ?? AventuriaHelpersWelcomeScreen.GUIDE_JOURNAL_NAMES.en;
    const index = await pack.getIndex();
    const entry = index.find((e) => e.name === name);
    if (!entry) {
      ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Welcome.GuideMissing"));
      return;
    }
    const journal = await pack.getDocument(entry._id);
    journal.sheet.render(true);
  }

  /**
   * User/player management lives on Foundry's separate "/players" page, not in an
   * in-world app (see `MainMenu.ITEMS.players` in Foundry core) - opened in a new tab
   * so the running game session isn't navigated away from where the browser honors
   * `_blank`. Some setups (e.g. the Electron desktop app) navigate the single window
   * instead, which reloads the whole client - `REOPEN_STEP_SETTING` records the current
   * step first so `registerWelcomeScreenReopen()`'s `ready` hook can reopen the guide
   * right back where it was after that reload (Nutzerfeedback 2026-08-14).
   */
  static async #onOpenPlayerManagement() {
    await game.settings.set(MODULE_ID, REOPEN_STEP_SETTING, this.stepIndex);
    window.open(foundry.utils.getRoute("players"), "_blank");
  }

  static #onOpenSettings() {
    game.settings.sheet.render({ force: true });
  }

  /**
   * Imports the Aventuria Spielbrett/Gameboard scene matching the world's active
   * language directly into the world, instead of opening the scene compendium for a
   * manual drag-and-drop (Nutzerwunsch 2026-08-14). Resolved via the
   * `flags.aventuria.gameBoard` scene flag rather than by name - "Prepare Board" itself
   * keys off the same flag (see `place-board-stacks.mjs`), and the flag is stable across
   * languages while the display name isn't. Activates the imported scene right away,
   * since "Spielbrett vorbereiten"/"Decks und Stapel platzieren" both need it to be the
   * currently viewed scene.
   */
  static async #onImportScene() {
    const lang = game.i18n.lang === "de" ? "de" : "en";

    const existing = game.scenes.find((s) => s.getFlag("aventuria", "gameBoard") === lang);
    if (existing) {
      await existing.activate();
      ui.notifications.info(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.Scene.AlreadyImported"));
      return;
    }

    const pack = game.packs.get("aventuria.scenes");
    if (!pack) {
      ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.MissingPack"));
      return;
    }
    const documents = await pack.getDocuments();
    const source = documents.find((s) => s.getFlag("aventuria", "gameBoard") === lang);
    if (!source) {
      ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.Scene.NotFound"));
      return;
    }

    const [scene] = await Scene.createDocuments([game.scenes.fromCompendium(source)]);
    await scene.activate();
    ui.notifications.info(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.Scene.Imported"));
  }

  /** Name of the world Macro folder that imported Aventuria macros are sorted into. */
  static MACRO_FOLDER_NAME = "Aventuria Macros";

  /**
   * Imports every macro from the Aventuria macro compendium straight into the world's
   * macro directory, instead of just opening the compendium for a manual drag-and-drop
   * (Nutzerwunsch 2026-08-14). Dedupes by name so re-running this step after macros were
   * already imported doesn't create duplicates - `CompendiumCollection#importAll` was
   * ruled out for this because it has no dedup of its own (fresh random IDs every call).
   * Sorts the imported macros into a dedicated `MACRO_FOLDER_NAME` folder (reused if it
   * already exists, same get-or-create pattern aventuria's own `preparePlayer()` uses
   * for its per-hero Cards folder).
   */
  static async #onImportMacros() {
    const pack = game.packs.get("aventuria.macros");
    if (!pack) {
      ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.MissingPack"));
      return;
    }
    const documents = await pack.getDocuments();
    const existingNames = new Set(game.macros.map((m) => m.name));
    const toCreate = documents
      .filter((doc) => !existingNames.has(doc.name))
      .map((doc) => game.macros.fromCompendium(doc));
    if (!toCreate.length) {
      ui.notifications.info(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.Macros.AlreadyImported"));
      return;
    }
    const folderName = AventuriaHelpersWelcomeScreen.MACRO_FOLDER_NAME;
    const folder = game.folders.find((f) => f.type === "Macro" && f.name === folderName)
      ?? await Folder.create({ name: folderName, type: "Macro" });
    for (const data of toCreate) data.folder = folder.id;
    await Macro.createDocuments(toCreate);
    ui.notifications.info(
      game.i18n.format("AVENTURIA_HELPERS.GettingStarted.Steps.Macros.Imported", { count: toCreate.length }),
    );
  }

  /**
   * Runs aventuria's own "Prepare Board" macro directly via its exposed module API,
   * instead of pointing the GM at the macro directory to run it themselves (Nutzerwunsch
   * 2026-08-14) - same wholesale-reuse approach `#onPickHero()`
   * (`scripts/apps/hero-tray.mjs`) already uses for "Bereite Spieler vor". Confirmed via
   * the compendium macro's own source (`packs/macros` in the `aventuria` module) that
   * "Prepare Board" itself is just a thin wrapper calling this same API function, so this
   * is equivalent to executing the macro, not a reimplementation of it. `prepareBoard()`
   * already reports success/failure (e.g. missing `gameBoard` scene flag) via its own
   * `ui.notifications` calls, so no separate confirmation is needed here.
   */
  static async #onRunPrepareBoard() {
    const api = game.modules.get("aventuria")?.api;
    if (!api?.prepareBoard) {
      ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.PrepareBoard.MissingApi"));
      return;
    }
    await api.prepareBoard();
  }

  static async #onPlaceStacks() {
    await placeBoardStacks();
  }
}

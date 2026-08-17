import { placeBoardStacks } from "../cards/place-board-stacks.mjs";
import { placeHeroStacks } from "../cards/place-hero-stacks.mjs";
import { AventuriaHelpersAssignHeroDialog } from "./assign-hero.mjs";
import { openChangelogJournal } from "./changelog.mjs";
import {
  prepareQuickstartHeroes,
  prepareQuickstartAdventure,
  prepareQuickstartHenchmen,
  openQuickstartJournal,
} from "../cards/prepare-quickstart.mjs";
import { importBoardTokens } from "../actors/import-board-tokens.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const MODULE_ID = "aventuria-helpers";

/** `"pickHero"` -> `"PickHero"`, matching this module's i18n key casing. */
function pascalCase(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

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
   * The step-by-step sections hanging off this window, keyed by `section` value.
   * Each `steps` entry is one page; `action` names a registered action to offer as
   * a button on that page, `note` marks steps that are still manual today and
   * shows the "planned automation" hint instead of a button. i18n strings for a
   * section are read from `AVENTURIA_HELPERS.<PascalCase section key>.*` (see
   * `#prepareStep()`), so a new section only needs an entry here plus matching
   * language keys - no template changes.
   */
  static SECTIONS = {
    gettingStarted: {
      steps: [
        { key: "Users", action: "openPlayerManagement" },
        { key: "Language", action: "openSettings" },
        { key: "Scene", action: "importScene" },
        { key: "Macros", action: "importMacros" },
        { key: "PrepareBoard", action: "runPrepareBoard" },
        { key: "PlaceStacks", action: "placeStacks" },
        { key: "ImportTokens", action: "importTokens" },
      ],
    },
    pickHero: {
      steps: [
        { key: "AssignHero", action: "chooseHeroSlot" },
        { key: "PlaceStacks", action: "placeHeroStacks" },
      ],
    },
    quickstart: {
      steps: [
        { key: "PrepareHeroes", action: "prepareQuickstartHeroes" },
        { key: "PrepareAdventure", action: "prepareQuickstartAdventure" },
        { key: "PrepareHenchmen", action: "prepareQuickstartHenchmen" },
        { key: "OpenJournal", action: "openQuickstartJournal" },
      ],
    },
  };

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

  /** Currently shown page within the active step-based section; persists across re-renders. */
  stepIndex = 0;

  /**
   * `{user, slot}` chosen in the "Helden auswählen" section's first page - reused by
   * its later steps so they don't have to ask again (Nutzerfeedback 2026-08-14: having
   * to pick the player/slot twice felt clunky). Reset only by picking again; simply
   * stays stale if the guide is closed and reopened, same as `stepIndex` resetting to 0.
   */
  heroAssignment = null;

  /**
   * Guards the "Helden auswählen" action handlers below against a second click
   * re-running while the first is still mid-flight (Nutzerfeedback 2026-08-14: ended
   * up with everything placed twice on the scene). Unlike e.g. `#onImportScene()`/
   * `#onImportMacros()`, which dedupe by checking for an already-existing scene/macro
   * before creating one, `preparePlayer()` has no such check at all (a second call
   * imports a whole second Actor+Cards set), and `placeActorToken()`'s own
   * already-exists check is racy under a fast double-click (both calls can see "no
   * token yet" before the first `create()` resolves). Simplest fix for all of that at
   * once: only let one of these handlers run at a time.
   */
  #heroStepBusy = false;

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "aventuria-helpers-welcome",
    classes: ["aventuria-helpers", "welcome-screen"],
    window: {
      title: "AVENTURIA_HELPERS.Welcome.Title",
      icon: "fa-solid fa-hand-sparkles",
      resizable: true,
    },
    position: { width: 560, height: "auto" },
    actions: {
      close: AventuriaHelpersWelcomeScreen.#onClose,
      showSection: AventuriaHelpersWelcomeScreen.#onShowSection,
      prevStep: AventuriaHelpersWelcomeScreen.#onPrevStep,
      nextStep: AventuriaHelpersWelcomeScreen.#onNextStep,
      goToStep: AventuriaHelpersWelcomeScreen.#onGoToStep,
      openGuide: AventuriaHelpersWelcomeScreen.#onOpenGuide,
      openChangelog: AventuriaHelpersWelcomeScreen.#onOpenChangelog,
      openPlayerManagement: AventuriaHelpersWelcomeScreen.#onOpenPlayerManagement,
      openSettings: AventuriaHelpersWelcomeScreen.#onOpenSettings,
      importScene: AventuriaHelpersWelcomeScreen.#onImportScene,
      importMacros: AventuriaHelpersWelcomeScreen.#onImportMacros,
      importTokens: AventuriaHelpersWelcomeScreen.#onImportTokens,
      runPrepareBoard: AventuriaHelpersWelcomeScreen.#onRunPrepareBoard,
      placeStacks: AventuriaHelpersWelcomeScreen.#onPlaceStacks,
      chooseHeroSlot: AventuriaHelpersWelcomeScreen.#onChooseHeroSlot,
      placeHeroStacks: AventuriaHelpersWelcomeScreen.#onPlaceHeroStacks,
      prepareQuickstartHeroes: AventuriaHelpersWelcomeScreen.#onPrepareQuickstartHeroes,
      prepareQuickstartAdventure: AventuriaHelpersWelcomeScreen.#onPrepareQuickstartAdventure,
      prepareQuickstartHenchmen: AventuriaHelpersWelcomeScreen.#onPrepareQuickstartHenchmen,
      openQuickstartJournal: AventuriaHelpersWelcomeScreen.#onOpenQuickstartJournal,
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
    context.sections = Object.fromEntries(
      Object.keys(AventuriaHelpersWelcomeScreen.SECTIONS).map((key) => [key, { active: this.section === key }]),
    );
    context.sections.welcome = { active: this.section === "welcome" };
    if (this.section !== "welcome") {
      context.headingKey = `AVENTURIA_HELPERS.${pascalCase(this.section)}.Heading`;
      context.step = this.#prepareStep();
    }
    return context;
  }

  /**
   * Builds the view model for the currently shown page of the active section - one
   * step per page (see `SECTIONS`) instead of one long scrolling list, since the
   * previous all-steps-at-once layout made the window too tall on smaller screens.
   */
  #prepareStep() {
    const steps = AventuriaHelpersWelcomeScreen.SECTIONS[this.section].steps;
    const index = Math.clamp(this.stepIndex, 0, steps.length - 1);
    const step = steps[index];
    const prefix = `AVENTURIA_HELPERS.${pascalCase(this.section)}.Steps.${step.key}`;
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
   * naturally resizes the window to fit whichever section is now shown. Entering any
   * step-based section always starts back at the first page, so its button on the
   * welcome page has predictable behavior regardless of where it was left last time.
   */
  static async #onShowSection(event, target) {
    this.section = target.dataset.section;
    if (this.section !== "welcome") this.stepIndex = 0;
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
    await this.#advance();
  }

  /**
   * Advances to the next page of the active section, or - from the last page -
   * returns to the welcome section instead of closing the whole window (Nutzerwunsch
   * 2026-08-17: the last page's button used to close the guide entirely; it now reads
   * "Beenden"/"Finish" - see `Welcome.Done` - and lands back on the welcome page so a
   * finished section flows straight into picking the next one). Shared by the
   * explicit "Weiter" button above and, since Nutzerfeedback 2026-08-14 ("Weiter" vs.
   * a step's own action button was easy to mix up), by the "Helden auswählen" steps'
   * own action handlers below, which call this themselves right after their action
   * succeeds instead of requiring a separate "Weiter" click.
   */
  async #advance() {
    const steps = AventuriaHelpersWelcomeScreen.SECTIONS[this.section].steps;
    if (this.stepIndex >= steps.length - 1) {
      this.section = "welcome";
      this.stepIndex = 0;
      await this.render();
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

  /** Opens the changelog journal on its overview page (see `openChangelogJournal()`). */
  static async #onOpenChangelog() {
    await openChangelogJournal();
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

  /** Imports the board-game's own token actors (life point/Fertigkeit/etc. markers) - see `importBoardTokens()`. */
  static async #onImportTokens() {
    await importBoardTokens();
  }

  /**
   * Step 1 of "Helden auswählen": opens `AventuriaHelpersAssignHeroDialog`, which
   * handles everything - picking the target Foundry player, the board slot, and the
   * hero itself, warning about conflicts, and (on confirm) actually creating and
   * assigning the hero via `prepareAndAssignHero()` (`cards/prepare-hero.mjs`).
   * Stores the result on `this.heroAssignment` for step 2 to reuse, then
   * auto-advances, since a successful pick here always means "on to the next step".
   *
   * Nutzerfeedback 2026-08-14: this step used to only pick player+slot here and then
   * hand off to aventuria's own separate "Bereite Spieler vor" dialog for the hero
   * itself - a second manual "Spielernummer" entry, a window-overlap bug between the
   * two dialogs, and no way to warn about conflicts beforehand. Folding hero creation
   * into this same dialog (see `prepare-hero.mjs`'s file header for why that's a
   * deliberate, isolated exception to this module's usual wholesale-reuse rule)
   * removes all of that at once.
   */
  static async #onChooseHeroSlot() {
    if (this.#heroStepBusy) return;
    if (!game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.PickHero.Steps.AssignHero.GmOnly"));
      return;
    }

    this.#heroStepBusy = true;
    try {
      const assignment = await AventuriaHelpersAssignHeroDialog.request();
      if (!assignment) return;

      this.heroAssignment = assignment;
      await this.#advance();
    } finally {
      this.#heroStepBusy = false;
    }
  }

  /**
   * Step 2: places the step-1 player's Deck/Ablage/Hand/Token at the step-1 slot's
   * board position (and shuffles the deck) via `placeHeroStacks()`
   * (`cards/place-hero-stacks.mjs`) - no dialog of its own anymore, reuses
   * `this.heroAssignment` instead of asking a second time. `placeHeroStacks()` does
   * its own GM/CCM/scene guarding and reports failures itself; only advances to
   * "done" on an actual success (its own return value).
   */
  static async #onPlaceHeroStacks() {
    if (this.#heroStepBusy) return;
    if (!this.heroAssignment) {
      ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.PickHero.Steps.PlaceStacks.NoAssignment"));
      return;
    }

    this.#heroStepBusy = true;
    try {
      const { user, slot } = this.heroAssignment;
      const success = await placeHeroStacks(user, slot);
      if (success) await this.#advance();
    } finally {
      this.#heroStepBusy = false;
    }
  }

  /** Step 1 of "Schnellstarter vorbereiten" - see `prepareQuickstartHeroes()`. */
  static async #onPrepareQuickstartHeroes() {
    const success = await prepareQuickstartHeroes();
    if (success) await this.#advance();
  }

  /** Step 2 of "Schnellstarter vorbereiten" - see `prepareQuickstartAdventure()`. */
  static async #onPrepareQuickstartAdventure() {
    const success = await prepareQuickstartAdventure();
    if (success) await this.#advance();
  }

  /** Step 3 of "Schnellstarter vorbereiten" - see `prepareQuickstartHenchmen()`. */
  static async #onPrepareQuickstartHenchmen() {
    const success = await prepareQuickstartHenchmen();
    if (success) await this.#advance();
  }

  /** Step 4 of "Schnellstarter vorbereiten" - see `openQuickstartJournal()`. */
  static async #onOpenQuickstartJournal() {
    const success = await openQuickstartJournal();
    if (success) await this.#advance();
  }
}

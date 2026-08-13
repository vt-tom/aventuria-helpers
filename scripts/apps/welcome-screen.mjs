const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

/**
 * Growing guided-onboarding tool for Aventuria: a standalone window that steps users
 * through it section by section, opened manually (no auto-popup, no per-user "seen"
 * tracking). Currently covers the welcome screen and a first "Erste Schritte" section;
 * more sections are expected to hang off this same window as the guide grows.
 */
export class AventuriaHelpersWelcomeScreen extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * The "Erste Schritte" checklist, one entry per page. `action` names a registered
   * action to offer as a button on that page; `note` marks the three steps that are
   * still manual today and shows the "planned automation" hint instead of a button.
   */
  static STEPS = [
    { key: "Users", action: "openPlayerManagement" },
    { key: "Language", action: "openSettings" },
    { key: "Scene", action: "openScenesCompendium" },
    { key: "Macros", action: "openMacrosCompendium" },
    { key: "PrepareBoard", action: "openMacroDirectory" },
    { key: "PlaceStacks", note: true },
    { key: "LockStacks", note: true },
    { key: "ShuffleFate", note: true },
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
      openScenesCompendium: AventuriaHelpersWelcomeScreen.#onOpenScenesCompendium,
      openMacrosCompendium: AventuriaHelpersWelcomeScreen.#onOpenMacrosCompendium,
      openMacroDirectory: AventuriaHelpersWelcomeScreen.#onOpenMacroDirectory,
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
   * in-world app (see `MainMenu.ITEMS.players` in Foundry core) - opened in a new
   * tab so the running game session isn't navigated away from.
   */
  static #onOpenPlayerManagement() {
    window.open(foundry.utils.getRoute("players"), "_blank");
  }

  static #onOpenSettings() {
    game.settings.sheet.render({ force: true });
  }

  static #onOpenScenesCompendium() {
    AventuriaHelpersWelcomeScreen.#openPack("aventuria.scenes");
  }

  static #onOpenMacrosCompendium() {
    AventuriaHelpersWelcomeScreen.#openPack("aventuria.macros");
  }

  static #openPack(packId) {
    const pack = game.packs.get(packId);
    if (!pack) {
      ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.MissingPack"));
      return;
    }
    pack.render(true);
  }

  /** Points the GM at the macro directory, where imported compendium macros can be run. */
  static #onOpenMacroDirectory() {
    ui.sidebar.expand();
    ui.sidebar.changeTab("macros", "primary");
  }
}

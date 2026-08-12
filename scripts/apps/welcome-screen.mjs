const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

/**
 * Growing guided-onboarding tool for Aventuria: a standalone window that steps users
 * through it section by section, opened manually (no auto-popup, no per-user "seen"
 * tracking). Currently covers the welcome screen and a first "Erste Schritte" section;
 * more sections are expected to hang off this same window as the guide grows.
 */
export class AventuriaHelpersWelcomeScreen extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Currently shown section; persists across re-renders. */
  section = "welcome";

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "aventuria-helpers-welcome",
    classes: ["aventuria-helpers", "welcome-screen"],
    window: {
      title: "AVENTURIA_HELPERS.Welcome.Title",
      icon: "fa-solid fa-hand-sparkles",
    },
    position: { width: 480, height: "auto" },
    actions: {
      close: AventuriaHelpersWelcomeScreen.#onClose,
      showSection: AventuriaHelpersWelcomeScreen.#onShowSection,
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
    return context;
  }

  /* -------------------------------------------------- */

  static #onClose() {
    this.close();
  }

  /**
   * Switches sections. `position.height` stays "auto" in DEFAULT_OPTIONS, so re-rendering
   * naturally resizes the window to fit whichever section is now shown.
   */
  static async #onShowSection(event, target) {
    this.section = target.dataset.section;
    await this.render();
  }
}

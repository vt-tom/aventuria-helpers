const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

/**
 * First step of a planned guided-onboarding tool for Aventuria: a standalone welcome
 * screen, opened manually (no auto-popup, no per-user "seen" tracking). Later steps of
 * the guide are expected to hang off this same window as it grows.
 */
export class AventuriaHelpersWelcomeScreen extends HandlebarsApplicationMixin(ApplicationV2) {
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
    },
  };

  /** @inheritdoc */
  static PARTS = {
    content: {
      template: "modules/aventuria-helpers/templates/welcome-screen.hbs",
    },
  };

  /* -------------------------------------------------- */

  static #onClose() {
    this.close();
  }
}

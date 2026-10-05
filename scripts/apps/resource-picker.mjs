import { resolveSharedDeck, drawSharedCard } from "../cards/shared-draw.mjs";
import { showCardPreview, hideCardPreview } from "../sheets/card-hover-preview.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
let picker = null;

export class ResourcePicker extends HandlebarsApplicationMixin(ApplicationV2) {
  #busy = false;
  #hooks = [];
  static DEFAULT_OPTIONS = {
    id: "aventuria-resource-picker",
    classes: ["aventuria-helpers", "resource-picker"],
    position: { width: 620, height: 580 },
    window: { resizable: true, icon: "fa-solid fa-coins" },
    actions: { selectResource: ResourcePicker.#select },
  };
  static PARTS = { content: { template: "modules/aventuria-helpers/templates/resource-picker.hbs" } };
  get title() { return game.i18n.localize("AVENTURIA_HELPERS.SharedDraw.SelectResource"); }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cards = [...(resolveSharedDeck("resource")?.availableCards ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang, { sensitivity: "base", numeric: true }) || a.id.localeCompare(b.id))
      .map(card => ({ id: card.id, name: card.name, img: card.faces?.[0]?.img ?? card.img }));
    context.busy = this.#busy;
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const element of this.element.querySelectorAll(".resource-choice")) {
      element.addEventListener("mouseenter", () => showCardPreview(element, this.element));
      element.addEventListener("mouseleave", hideCardPreview);
    }
    if (!this.#hooks.length) {
      for (const hook of ["createCard", "updateCard", "deleteCard"]) {
        this.#hooks.push([hook, Hooks.on(hook, card => {
          if (card.parent?.id === resolveSharedDeck("resource")?.id && !this.#busy) {
            hideCardPreview();
            void this.render();
          }
        })]);
      }
    }
  }

  static async #select(event, target) {
    if (this.#busy) return;
    this.#busy = true;
    hideCardPreview();
    this.element.querySelectorAll(".resource-choice").forEach(button => { button.disabled = true; });
    try {
      if (await drawSharedCard("resource", target.dataset.cardId)) await this.close();
    } finally {
      this.#busy = false;
      if (this.rendered) await this.render();
    }
  }

  async _onClose(options) {
    hideCardPreview();
    for (const [hook, id] of this.#hooks) Hooks.off(hook, id);
    this.#hooks = [];
    return super._onClose(options);
  }
}

export function openResourcePicker() {
  picker ??= new ResourcePicker();
  return picker.render({ force: true });
}

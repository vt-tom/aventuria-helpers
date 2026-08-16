import { resolvePlayerSlotOccupant, resolvePlayerSlot } from "../cards/player-slots.mjs";
import { resolveHeroOccupant, prepareAndAssignHero } from "../cards/prepare-hero.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const BOARD_IMAGE = "modules/aventuria-helpers/assets/screenshots/aventuria-gameboard-players.webp";

/**
 * Hotspot rectangles over `BOARD_IMAGE`, as percentages of the image's own
 * rendered width/height (not pixels), so they scale with the window size.
 * Eyeballed from the image's own "Spieler N" label layout (left column 1/2/3
 * top-to-bottom, right column 4/5/6 top-to-bottom). Re-measured 2026-08-14 from a
 * live screenshot after the first pass sat too low (bled down into the next row) -
 * still an eyeball estimate, not pixel-exact, further nudges possible.
 */
const SLOTS = [
  { number: 1, left: 10, top: 13, width: 23, height: 25 },
  { number: 2, left: 10, top: 38, width: 23, height: 25 },
  { number: 3, left: 10, top: 63, width: 23, height: 25 },
  { number: 4, left: 67, top: 13, width: 23, height: 25 },
  { number: 5, left: 67, top: 38, width: 23, height: 25 },
  { number: 6, left: 67, top: 63, width: 23, height: 25 },
];

/**
 * Maps a hero's `system.profession` free-text value to its portrait icon in the
 * aventuria module - covers both German and English profession strings, since
 * `#loadHeroes()` reads whichever language compendium is active. Aventuria's own
 * hero data genders each profession per hero (e.g. "Zwergenschmied" vs.
 * "Zwergenschmiedin"), so both forms are listed - confirmed 2026-08-16 by dumping
 * `system.profession` for all 12 level-1 heroes directly from the German
 * compendium (see `CHANGELOG.md`), rather than guessed, after the first pass
 * (guessed from a user-provided table with only one form per profession) missed
 * several of them and had one outright typo ("Perrainegeweihter" vs. the game's
 * own inconsistent "Perrainegeweihter"/"Perainegeweihte" spelling - kept as-is,
 * not "corrected", since matching the real data is what matters here). English
 * forms are unverified guesses (English doesn't grammatically gender nouns the
 * way German does, so one form likely covers both, but not confirmed against the
 * English compendium). See `CLAUDE.md`'s "Bekannte Datenstruktur" for the full
 * filename/DE/EN reference table - covers the professions of the level-1 heroes
 * currently in the compendium, not necessarily every profession in the game.
 */
const PROFESSION_ICON_DIR = "modules/aventuria/assets/icons/";
const PROFESSION_ICONS = {
  "Zwergenschmied": "dwarf-blacksmith.webp",
  "Zwergenschmiedin": "dwarf-blacksmith.webp",
  "Dwarf Blacksmith": "dwarf-blacksmith.webp",
  "Elfischer Kundschafter": "elf-scout.webp",
  "Elfische Kundschafterin": "elf-scout.webp",
  "Elf Scout": "elf-scout.webp",
  "Halbelfischer Streuner": "half-elf-rogue.webp",
  "Halbelfische Streunerin": "half-elf-rogue.webp",
  "Half Elf Rogue": "half-elf-rogue.webp",
  "Perrainegeweihter": "peraine.webp",
  "Perainegeweihte": "peraine.webp",
  "Blessed One of Peraine": "peraine.webp",
  "Thorwalscher Krieger": "thorwalian.webp",
  "Thorwalsche Kriegerin": "thorwalian.webp",
  "Thorwalian Warrior": "thorwalian.webp",
  "Tulamidischer Magier": "tulamydian-mage.webp",
  "Tulamidische Magierin": "tulamydian-mage.webp",
  "Tulamydian Mage": "tulamydian-mage.webp",
};

/**
 * One-screen "who gets the next hero" picker for the "Helden auswählen" guide's
 * first step: Foundry player, board player slot (visual), and the hero itself, all
 * together - and, on confirm, performs the actual hero creation/assignment itself
 * via `prepareAndAssignHero()` (`cards/prepare-hero.mjs`) instead of handing off to
 * a second, separate dialog.
 *
 * Board slots belonging to a *different* player than the one currently selected are
 * blocked outright (Nutzerentscheidung 2026-08-16: replacing a hero should only ever
 * be possible at its own player's own slot, not at one belonging to someone else -
 * silently overwriting a slot's board wiring out from under an unrelated player was
 * confusing and needed a manual-cleanup warning; not letting it happen at all is
 * simpler than warning about it). Picking a player who already has a slot
 * auto-selects it. The hero itself can still collide with a different player's
 * existing hero (warned about + confirmed) since that's not tied to a board
 * position at all.
 */
export class AventuriaHelpersAssignHeroDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Currently highlighted player slot (1-6), or `null` if none picked yet. */
  selectedSlot = null;

  /** Currently chosen target user's id, or `null` if none picked yet. */
  selectedUserId = null;

  /** Currently chosen hero's document id (within `heroPack`), or `null` if none picked yet. */
  selectedHeroId = null;

  /** The language-appropriate hero compendium, resolved lazily by `#loadHeroes()`. */
  heroPack = null;

  /** Cached `{id, uuid, name}` list from `heroPack`, fetched once per dialog instance. */
  heroOptions = null;

  /** Guards `#onConfirm()` against a second click re-running while the first is still mid-flight. */
  #busy = false;

  /** Resolver for the promise `request()` hands out; settled exactly once via `#finish()`. */
  #resolve = null;
  #finished = false;

  /**
   * Opens the picker and resolves once the GM either confirms a full pick or closes
   * the window - same promise-wrapped-dialog pattern as Foundry's own `Dialog.input()`.
   * @returns {Promise<{user: User, slot: number}|null>}
   */
  static request() {
    return new Promise((resolve) => {
      const app = new AventuriaHelpersAssignHeroDialog();
      app.#resolve = resolve;
      app.render({ force: true });
    });
  }

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "aventuria-helpers-assign-hero",
    classes: ["aventuria-helpers", "assign-hero"],
    window: {
      title: "AVENTURIA_HELPERS.PickHero.AssignDialog.Title",
      icon: "fa-solid fa-user",
    },
    position: { width: 640, height: "auto" },
    actions: {
      close: AventuriaHelpersAssignHeroDialog.#onClose,
      selectSlot: AventuriaHelpersAssignHeroDialog.#onSelectSlot,
      selectHero: AventuriaHelpersAssignHeroDialog.#onSelectHero,
      viewImage: AventuriaHelpersAssignHeroDialog.#onViewImage,
      confirm: AventuriaHelpersAssignHeroDialog.#onConfirm,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    content: {
      template: "modules/aventuria-helpers/templates/assign-hero.hbs",
      // Preserves .hero-list's scroll position across re-renders (native
      // HandlebarsApplicationMixin feature, confirmed in the local v14 source at
      // client/applications/api/handlebars-application.mjs) - without it, picking a
      // hero further down the list scrolled back to the top on every click, since
      // #onSelectHero() re-renders to show the new selection (Nutzerfeedback 2026-08-16).
      scrollable: [".hero-list"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.image = BOARD_IMAGE;
    context.slots = SLOTS.map((slot) => {
      const occupant = resolvePlayerSlotOccupant(slot.number);
      return {
        ...slot,
        selected: this.selectedSlot === slot.number,
        occupant: occupant?.name ?? null,
        blocked: !!occupant && occupant.id !== this.selectedUserId,
      };
    });

    context.users = game.users.map((u) => ({
      id: u.id,
      name: u.name,
      selected: u.id === this.selectedUserId,
    }));
    const selectedUser = this.selectedUserId ? game.users.get(this.selectedUserId) : null;
    context.selectedUserName = selectedUser?.name ?? null;
    context.selectedUserHero = selectedUser?.character?.name ?? null;

    await this.#loadHeroes();
    context.heroes = this.heroOptions.map((h) => ({
      ...h,
      selected: h.id === this.selectedHeroId,
      occupant: resolveHeroOccupant(h.uuid)?.name ?? null,
    }));
    context.selectedHeroOccupant = context.heroes.find((h) => h.selected)?.occupant ?? null;

    context.canContinue = !!(this.selectedSlot && this.selectedUserId && this.selectedHeroId);
    return context;
  }

  /** Fetches and caches the language-appropriate level-1 hero list, once per instance. */
  async #loadHeroes() {
    if (this.heroOptions) return;
    const lang = game.i18n.lang === "de" ? "deutsch" : "english";
    this.heroPack = game.packs.get(`aventuria.heroes-${lang}`);
    if (!this.heroPack) {
      this.heroOptions = [];
      return;
    }
    const docs = await this.heroPack.getDocuments();
    this.heroOptions = docs
      .filter((d) => d.system.level === 1)
      .map((d) => ({
        id: d.id,
        uuid: d.uuid,
        name: d.name,
        profession: d.system.profession,
        icon: PROFESSION_ICONS[d.system.profession]
          ? PROFESSION_ICON_DIR + PROFESSION_ICONS[d.system.profession]
          : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector('select[name="userId"]')?.addEventListener("change", (event) => {
      this.selectedUserId = event.target.value || null;

      // Auto-select the newly chosen player's own slot, if they have one
      // (Nutzerentscheidung 2026-08-16). Otherwise, if a slot was already picked and
      // it turns out to belong to someone else (picked before this player, or left
      // over from a previous player), clear it - it's blocked for this player now.
      const ownSlot = this.selectedUserId ? resolvePlayerSlot(this.selectedUserId) : null;
      if (ownSlot) {
        this.selectedSlot = ownSlot;
      } else if (this.selectedSlot) {
        const occupant = resolvePlayerSlotOccupant(this.selectedSlot);
        if (occupant && occupant.id !== this.selectedUserId) this.selectedSlot = null;
      }

      this.render();
    });

    // `.hero-option` rows are `<div role="button">`, not `<button>` - deliberately, to
    // sidestep a Foundry-core CSS rule that was forcing `<button>` elements to a fixed
    // native height regardless of their (two-line) content, no matter what this
    // module's own CSS specified (Nutzerfeedback 2026-08-16, confirmed via
    // `getComputedStyle()` that the height came from elsewhere, not from a stale
    // stylesheet). Divs don't get native keyboard activation, so wire Enter/Space here
    // and let it dispatch a real `click` - reuses the existing `data-action="selectHero"`
    // delegation instead of duplicating `#onSelectHero()`'s logic.
    this.element.querySelector(".hero-list")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (!event.target.matches(".hero-option")) return;
      event.preventDefault();
      event.target.click();
    });
  }

  /**
   * Settles the request promise exactly once - a confirmed pick resolves with
   * a result first and then closes the window, which would otherwise resolve
   * `null` a second time via `close()` below.
   */
  #finish(result) {
    if (this.#finished) return;
    this.#finished = true;
    this.#resolve?.(result);
  }

  /** @inheritdoc */
  async close(options) {
    this.#finish(null);
    return super.close(options);
  }

  /* -------------------------------------------------- */

  static #onClose() {
    this.close();
  }

  /**
   * Highlights the clicked slot. Blocked slots (belonging to a different player)
   * are `disabled` in the template, so a real click never reaches here for them -
   * this check is just defense in depth.
   */
  static async #onSelectSlot(event, target) {
    if (target.disabled) return;
    this.selectedSlot = Number(target.dataset.slot);
    await this.render();
  }

  /**
   * Highlights the clicked hero. A row-list of buttons instead of a `<select>` -
   * native `<option>` elements can't show an image, and Nutzerwunsch 2026-08-16 was
   * specifically to show the profession icon per hero in this list.
   */
  static async #onSelectHero(event, target) {
    this.selectedHeroId = target.dataset.heroId;
    await this.render();
  }

  /** Large view of the board image - same `ImagePopout` pattern as `hero-sheet.mjs#viewImage()`. */
  static async #onViewImage(event, target) {
    new foundry.applications.apps.ImagePopout({
      src: target.dataset.src,
      window: { title: game.i18n.localize("AVENTURIA_HELPERS.PickHero.AssignDialog.Title") },
    }).render({ force: true });
  }

  /**
   * Confirms the pick: warns about either of the two remaining possible conflicts
   * (hero already someone else's, player already has a hero of their own) in one
   * consolidated confirmation, then actually creates and assigns the hero via
   * `prepareAndAssignHero()`. The third conflict (slot already someone else's) can't
   * happen anymore - such slots are blocked from being selected at all.
   */
  static async #onConfirm() {
    if (this.#busy) return;
    if (!this.selectedSlot || !this.selectedUserId || !this.selectedHeroId) return;

    const targetUser = game.users.get(this.selectedUserId);
    const hero = this.heroOptions.find((h) => h.id === this.selectedHeroId);
    const heroOccupant = resolveHeroOccupant(hero.uuid);

    const warnings = [];
    if (heroOccupant && heroOccupant.id !== targetUser.id) {
      warnings.push(
        game.i18n.format("AVENTURIA_HELPERS.PickHero.AssignDialog.HeroOccupiedConfirmBody", { player: heroOccupant.name }),
      );
    }
    if (targetUser.character) {
      warnings.push(
        game.i18n.format("AVENTURIA_HELPERS.PickHero.AssignDialog.PlayerHasHeroConfirmBody", {
          hero: targetUser.character.name,
        }),
      );
    }

    if (warnings.length) {
      const proceed = await foundry.applications.api.Dialog.confirm({
        window: { title: "AVENTURIA_HELPERS.PickHero.AssignDialog.ConfirmTitle" },
        content: `<ul>${warnings.map((w) => `<li>${w}</li>`).join("")}</ul>`,
      });
      if (!proceed) return;
    }

    const scene = canvas.scene;
    if (!scene || !scene.getFlag("aventuria", "gameBoard")) {
      ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.PickHero.AssignDialog.WrongScene"));
      return;
    }

    this.#busy = true;
    try {
      await prepareAndAssignHero({
        heroPack: this.heroPack,
        heroId: this.selectedHeroId,
        targetUser,
        playerSlot: this.selectedSlot,
        scene,
      });
    } catch (err) {
      console.error("aventuria-helpers | prepareAndAssignHero failed", err);
      ui.notifications.error(game.i18n.localize("AVENTURIA_HELPERS.PickHero.AssignDialog.PrepareFailed"));
      return;
    } finally {
      this.#busy = false;
    }

    this.#finish({ user: targetUser, slot: this.selectedSlot });
    await this.close();
  }
}

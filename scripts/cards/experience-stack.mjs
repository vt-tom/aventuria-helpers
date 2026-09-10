import { resolveStacksForActor } from "./stacks.mjs";
import { resolveWorldLanguage } from "../world-language.mjs";

const MODULE_ID = "aventuria-helpers";
const HERO_TYPE = "aventuria.hero";
const MIGRATED_SETTING = "migratedExperienceStacks";

/**
 * Maps a hero's `system.profession` (any of the gendered German forms or the single English
 * form, same variants as `PROFESSION_ICONS` in `assign-hero.mjs`) to the language-appropriate
 * Erfahrungsschatz Cards document name in `cards-deutsch`/`cards-english` - verified 2026-08-26
 * by unpacking both compendiums (`fvtt package unpack`) and listing every `type:"deck"` document,
 * not guessed. The English document name is `"(Proficiency)"`, not `"(Proficiency Stash)"`
 * despite the latter being the term the rules text itself uses.
 */
const PROFESSION_TO_EXPERIENCE_DECK = {
  "Zwergenschmied": { de: "Zwergenschmied (Erfahrungsschatz)", en: "Dwarf Blacksmith (Proficiency)" },
  "Zwergenschmiedin": { de: "Zwergenschmied (Erfahrungsschatz)", en: "Dwarf Blacksmith (Proficiency)" },
  "Dwarf Blacksmith": { de: "Zwergenschmied (Erfahrungsschatz)", en: "Dwarf Blacksmith (Proficiency)" },
  "Elfischer Kundschafter": { de: "Elfischer Kundschafter (Erfahrungsschatz)", en: "Elf Scout (Proficiency)" },
  "Elfische Kundschafterin": { de: "Elfischer Kundschafter (Erfahrungsschatz)", en: "Elf Scout (Proficiency)" },
  "Elf Scout": { de: "Elfischer Kundschafter (Erfahrungsschatz)", en: "Elf Scout (Proficiency)" },
  "Halbelfischer Streuner": { de: "Halbelfischer Streuner (Erfahrungsschatz)", en: "Half Elf Rogue (Proficiency)" },
  "Halbelfische Streunerin": { de: "Halbelfischer Streuner (Erfahrungsschatz)", en: "Half Elf Rogue (Proficiency)" },
  "Half Elf Rogue": { de: "Halbelfischer Streuner (Erfahrungsschatz)", en: "Half Elf Rogue (Proficiency)" },
  "Perrainegeweihter": { de: "Perrainegeweihter (Erfahrungsschatz)", en: "Blessed One of Peraine (Proficiency)" },
  "Perainegeweihte": { de: "Perrainegeweihter (Erfahrungsschatz)", en: "Blessed One of Peraine (Proficiency)" },
  "Blessed One of Peraine": { de: "Perrainegeweihter (Erfahrungsschatz)", en: "Blessed One of Peraine (Proficiency)" },
  "Thorwalscher Krieger": { de: "Thorwalscher Krieger (Erfahrungsschatz)", en: "Thorwalian Warrior (Proficiency)" },
  "Thorwalsche Kriegerin": { de: "Thorwalscher Krieger (Erfahrungsschatz)", en: "Thorwalian Warrior (Proficiency)" },
  "Thorwalian Warrior": { de: "Thorwalscher Krieger (Erfahrungsschatz)", en: "Thorwalian Warrior (Proficiency)" },
  "Tulamidischer Magier": { de: "Tulamidischer Magier (Erfahrungsschatz)", en: "Tulamydian Mage (Proficiency)" },
  "Tulamidische Magierin": { de: "Tulamidischer Magier (Erfahrungsschatz)", en: "Tulamydian Mage (Proficiency)" },
  "Tulamydian Mage": { de: "Tulamidischer Magier (Erfahrungsschatz)", en: "Tulamydian Mage (Proficiency)" },
};

/**
 * Imports (or, if one already exists in the given Folder, re-finds) the hero's Erfahrungsschatz
 * Cards document - the level-2/3 card pool a main-deck card can be upgraded against
 * (`cards/upgrade-card.mjs`). Idempotent and safe to call standalone, not just from
 * `prepare-hero.mjs`'s `prepareAndAssignHero()`: heroes assigned before this feature existed have
 * no Erfahrungsschatz yet, and `AventuriaHelpersCardUpgradeDialog` calls this on demand to
 * backfill it instead of requiring a separate migration/backfill script.
 *
 * Deliberately its own file rather than living in `prepare-hero.mjs` alongside the rest of the
 * hero-assignment logic: `prepare-hero.mjs` imports `sheets/card-hero-sheet.mjs` (for
 * `HERO_SHEET_ID`), which itself extends `sheets/hero-sheet.mjs` - `card-upgrade-dialog.mjs`
 * calling directly into `prepare-hero.mjs` would close that into a circular import
 * (`hero-sheet.mjs` -> `card-upgrade-dialog.mjs` -> `prepare-hero.mjs` -> `card-hero-sheet.mjs`
 * -> `hero-sheet.mjs`), which surfaced as `ReferenceError: Cannot access
 * 'AventuriaHelpersHeroSheet' before initialization` at Foundry startup (found live 2026-08-26).
 * This module has no dependency on either sheet class, so keeping it separate breaks the cycle.
 * @param {Actor} actor
 * @param {Folder} folder - the hero's shared Cards folder (same one Deck/Hand/Discard/PlayPile live in).
 * @returns {Promise<Cards|null>} `null` if the profession isn't recognized or the matching
 *   compendium document can't be found (should not happen for the 12 quickstart heroes).
 */
export async function ensureExperienceStack(actor, folder) {
  const existing = game.cards.find(
    (c) => c.folder === folder && c.type === "deck" && c.getFlag(MODULE_ID, "stackType") === "experience",
  );
  if (existing) return existing;

  // Bugfix 2026-09-10: must match the hero's own deck language (resolveWorldLanguage()), not
  // whoever's client happens to call this - an Erfahrungsschatz in the wrong language silently
  // breaks "Aktionskarten verbessern" for this hero, since getCardLevelChanges() (upgrade-card.mjs)
  // matches purely by exact card name.
  const lang = resolveWorldLanguage();
  const deckName = PROFESSION_TO_EXPERIENCE_DECK[actor.system.profession]?.[lang];
  if (!deckName) {
    console.warn(`aventuria-helpers | No Erfahrungsschatz mapping for profession "${actor.system.profession}"`);
    return null;
  }

  const pack = game.packs.get(`aventuria.cards-${lang === "de" ? "deutsch" : "english"}`);
  const source = pack ? (await pack.getDocuments()).find((d) => d.name === deckName) : null;
  if (!source) {
    console.warn(`aventuria-helpers | Erfahrungsschatz deck "${deckName}" not found in ${pack?.metadata?.id ?? "(missing pack)"}`);
    return null;
  }

  return Cards.create({
    ...game.cards.fromCompendium(source),
    img: "modules/aventuria/assets/player-draw-back.webp",
    folder: folder.id,
    name: game.i18n.format("AVENTURIA_HELPERS.CardUpgrade.ExperienceStackName", { name: actor.name }),
    [`flags.${MODULE_ID}.stackType`]: "experience",
  });
}

/**
 * Backfills `ensureExperienceStack()` for every already-assigned hero in the world - added
 * 2026-08-26 after a live test found that a hero assigned before this feature existed had no
 * Erfahrungsschatz and the "Aktionskarten verbessern" dialog just showed the on-demand
 * "Erfahrungsschatz anlegen" button. That per-hero button still works standalone, but a GM
 * shouldn't have to open every player's Kartenbogen once to click it - this walks all
 * `aventuria.hero` actors instead. Skips heroes that already have one (idempotent, safe to call
 * repeatedly) and heroes with no resolvable Deck/Folder yet (never assigned/prepared).
 * @returns {Promise<number>} how many heroes got a newly-created Erfahrungsschatz.
 */
export async function migrateExperienceStacks() {
  let migrated = 0;
  for (const actor of game.actors.filter((a) => a.type === HERO_TYPE)) {
    const stacks = resolveStacksForActor(actor);
    if (!stacks?.deck?.folder || stacks.experience) continue;
    if (await ensureExperienceStack(actor, stacks.deck.folder)) migrated++;
  }
  return migrated;
}

/**
 * Registers the world-scoped "already migrated" flag and runs `migrateExperienceStacks()` once
 * per world on `ready`. Gated on `game.users.activeGM` rather than a plain `game.user.isGM`
 * check - per CLAUDE.md, every player at this table has the Gamemaster role for other reasons
 * (complete-card-management/aventuria need it), so a plain `isGM` check would run this
 * concurrently on every connected client and risk two clients both seeing "no Erfahrungsschatz
 * yet" and racing to create one each. `activeGM` deterministically designates a single one of
 * the currently-active GM-role users, so only that client ever runs it.
 */
export function registerExperienceStackMigration() {
  game.settings.register(MODULE_ID, MIGRATED_SETTING, {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  Hooks.once("ready", async () => {
    if (game.user !== game.users.activeGM) return;
    if (game.settings.get(MODULE_ID, MIGRATED_SETTING)) return;

    const migrated = await migrateExperienceStacks();
    await game.settings.set(MODULE_ID, MIGRATED_SETTING, true);
    if (migrated > 0) {
      ui.notifications.info(game.i18n.format("AVENTURIA_HELPERS.CardUpgrade.MigrationDone", { count: migrated }));
    }
  });
}

const MODULE_ID = "aventuria-helpers";

/** Client setting: last module version this client has already seen the changelog for. */
const LAST_SEEN_SETTING = "lastSeenChangelogVersion";

/**
 * Maps the game's active language to the matching JournalEntry name in the `changelog`
 * compendium (see `build-changelog-pack.mjs`, which bakes these exact names in from
 * `CHANGES.md`/`CHANGES-en.md`) - same pattern as `GUIDE_JOURNAL_NAMES` in
 * `welcome-screen.mjs`. Only "de" and "en" exist as module languages, so anything else
 * falls back to the English changelog.
 */
const CHANGELOG_JOURNAL_NAMES = {
  de: "Aventuria Helpers - Changelog (deutsch)",
  en: "Aventuria Helpers - Changelog (englisch)",
};

/**
 * Opens the language-appropriate `changelog` compendium JournalEntry (see
 * `build-changelog-pack.mjs`, one page per version, page name === version string e.g.
 * `"0.1.4"`). If `pageVersion` names an existing page, the sheet jumps straight to it
 * (`JournalEntrySheet`'s documented `pageId` render option); otherwise it opens on its
 * default (first/overview) page.
 */
export async function openChangelogJournal(pageVersion = null) {
  const pack = game.packs.get(`${MODULE_ID}.changelog`);
  if (!pack) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Welcome.ChangelogMissing"));
    return;
  }
  const name = CHANGELOG_JOURNAL_NAMES[game.i18n.lang] ?? CHANGELOG_JOURNAL_NAMES.en;
  const index = await pack.getIndex();
  const entry = index.find((e) => e.name === name);
  if (!entry) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Welcome.ChangelogMissing"));
    return;
  }
  const journal = await pack.getDocument(entry._id);
  const page = pageVersion ? journal.pages.find((p) => p.name === pageVersion) : null;
  await journal.sheet.render(true, page ? { pageId: page.id } : {});
}

/**
 * Registers `LAST_SEEN_SETTING` and the `ready` hook that auto-opens the changelog once per
 * client after an update - Nutzerwunsch: neue Version soll beim ersten Laden danach auffallen,
 * statt nur passiv im Willkommensbildschirm erreichbar zu sein (siehe `#onOpenChangelog()` in
 * `welcome-screen.mjs` für den manuellen Weg). Called once from the module's `init` hook, same
 * pattern as `registerWelcomeScreenReopen()`.
 *
 * A never-before-seen client (fresh install, empty setting) just silently records the current
 * version instead of popping up - there is no "what's new since last time" for a first-time
 * install, the whole changelog would just be noise.
 */
export function registerChangelogAutoOpen() {
  game.settings.register(MODULE_ID, LAST_SEEN_SETTING, {
    scope: "client",
    config: false,
    type: String,
    default: "",
  });

  Hooks.once("ready", async () => {
    const currentVersion = game.modules.get(MODULE_ID).version;
    const lastSeen = game.settings.get(MODULE_ID, LAST_SEEN_SETTING);
    if (lastSeen !== currentVersion) {
      if (lastSeen) await openChangelogJournal(currentVersion);
      await game.settings.set(MODULE_ID, LAST_SEEN_SETTING, currentVersion);
    }
  });
}

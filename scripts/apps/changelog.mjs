const MODULE_ID = "aventuria-helpers";

/** Client setting: last module version this client has already seen the changelog for. */
const LAST_SEEN_SETTING = "lastSeenChangelogVersion";

/**
 * Opens the `changelog` compendium's single JournalEntry (see `build-changelog-pack.mjs`,
 * one page per version, page name === version string e.g. `"0.1.4"`). If `pageVersion` names
 * an existing page, the sheet jumps straight to it (`JournalEntrySheet`'s documented `pageId`
 * render option); otherwise it opens on its default (first/overview) page.
 */
export async function openChangelogJournal(pageVersion = null) {
  const pack = game.packs.get(`${MODULE_ID}.changelog`);
  if (!pack) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Welcome.ChangelogMissing"));
    return;
  }
  const [journal] = await pack.getDocuments();
  if (!journal) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Welcome.ChangelogMissing"));
    return;
  }
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

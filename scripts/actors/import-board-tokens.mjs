const TOKEN_FOLDER_NAME = "Aventuria Tokens";

/**
 * Imports Aventuria's own board-game token actors (life point/Fertigkeit/Fate Point/etc.
 * counters - the physical game's marker tokens, not NPCs) from the language-appropriate
 * "Aventuria Heroes"/"Aventuria Helden" Actor compendium's "Tokens"/"Token" folder into a
 * dedicated world Actor folder, same dedupe-by-name-then-bulk-import shape as
 * `#onImportMacros()` (`welcome-screen.mjs`). Placing them on the Gameboard scene itself is a
 * separate follow-up (`TOKEN_PLACEMENTS`, still needs live-captured coordinates, same as
 * `HERO_PLACEMENTS` in `place-hero-stacks.mjs`) - this only gets them into the world so they
 * exist to place.
 * @returns {Promise<boolean>}
 */
export async function importBoardTokens() {
  const lang = game.i18n.lang === "de" ? "de" : "en";
  const packId = lang === "de" ? "aventuria.heroes-deutsch" : "aventuria.heroes-english";
  const pack = game.packs.get(packId);
  if (!pack) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.MissingPack"));
    return false;
  }

  const folders = await pack.folders;
  const tokenFolder = folders.find((f) => /^tokens?$/i.test(f.name));
  if (!tokenFolder) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.ImportTokens.NotFound"));
    return false;
  }

  const documents = await pack.getDocuments({ folder: tokenFolder.id });
  const existingNames = new Set(game.actors.map((a) => a.name));
  const toCreate = documents
    .filter((doc) => !existingNames.has(doc.name))
    .map((doc) => game.actors.fromCompendium(doc));

  if (!toCreate.length) {
    ui.notifications.info(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.ImportTokens.AlreadyImported"));
    return true;
  }

  const folder = game.folders.find((f) => f.type === "Actor" && f.name === TOKEN_FOLDER_NAME)
    ?? await Folder.create({ name: TOKEN_FOLDER_NAME, type: "Actor" });
  for (const data of toCreate) data.folder = folder.id;
  await Actor.createDocuments(toCreate);

  ui.notifications.info(
    game.i18n.format("AVENTURIA_HELPERS.GettingStarted.Steps.ImportTokens.Imported", { count: toCreate.length }),
  );
  return true;
}

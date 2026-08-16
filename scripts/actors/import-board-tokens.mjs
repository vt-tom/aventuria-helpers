import { placeActorToken } from "../cards/place-hero-stacks.mjs";

const TOKEN_FOLDER_NAME = "Aventuria Tokens";

/**
 * Live-captured Gameboard positions for 12 of the 13 token actors (Stand 2026-08-16, same
 * capture method as `HERO_PLACEMENTS`: user placed each token by hand, then read the
 * positions back via console). Matched by name in *either* language, since the world's
 * imported actors carry whichever language `importBoardTokens()` used at import time, and
 * the two Actor compendiums (`aventuria.heroes-deutsch`/`-english`) don't share matching
 * folder-index order (verified live - `Threat Point`/`Gefahrenpunktmarke` and
 * `Adventure Token (5)`/`Abenteuermarke (5)` sit at different positions in each pack's
 * "Tokens" folder), so pairing has to go by translated meaning, not by list position.
 *
 * Deliberately excludes "Starting Hero Token"/"Startspielermarke" - Nutzerentscheidung
 * 2026-08-16, that one isn't placed automatically (handed out/moved manually during play
 * instead of sitting at a fixed spot).
 */
const TOKEN_PLACEMENTS = [
  { de: "Fertigkeitsmarke", en: "Ability Token", x: 4690, y: 4180, rotation: 278.53076560994816 },
  { de: "Minus-Marke", en: "Minus Token", x: 4678, y: 4670, rotation: 72.37198063218037 },
  { de: "Verderbensmarke", en: "Doom Counter", x: 4804, y: 4774, rotation: 7.5946433685914485 },
  { de: "Gefahrenpunktmarke", en: "Threat Point", x: 4788, y: 4298, rotation: 0 },
  { de: "Lebenspunktemarke (5)", en: "Life Point (5)", x: 4662, y: 5118, rotation: 16.032339353935967 },
  { de: "Netzmarke", en: "Net Token", x: 4670, y: 4429, rotation: 0 },
  { de: "Plus-Marke", en: "Plus Token", x: 4776, y: 4533, rotation: 0 },
  { de: "Schicksalspunkt", en: "Fate Point", x: 6692, y: 4351, rotation: 0 },
  { de: "Abenteuermarke (5)", en: "Adventure Token (5)", x: 4799, y: 4048, rotation: 0 },
  { de: "Lebenspunktemarke", en: "Life Point", x: 4804, y: 4995, rotation: 347.347443499442 },
  { de: "Abenteuermarke", en: "Adventure Token", x: 4746, y: 3906, rotation: 0 },
  { de: "Zeitmarke", en: "Time Counter", x: 5387, y: 4351, rotation: 0 },
];

/**
 * Imports Aventuria's own board-game token actors (life point/Fertigkeit/Fate Point/etc.
 * counters - the physical game's marker tokens, not NPCs) from the language-appropriate
 * "Aventuria Heroes"/"Aventuria Helden" Actor compendium's "Tokens"/"Token" folder into a
 * dedicated world Actor folder, same dedupe-by-name-then-bulk-import shape as
 * `#onImportMacros()` (`welcome-screen.mjs`).
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

  const folder = game.folders.find((f) => f.type === "Actor" && f.name === TOKEN_FOLDER_NAME)
    ?? await Folder.create({ name: TOKEN_FOLDER_NAME, type: "Actor" });

  if (toCreate.length) {
    for (const data of toCreate) data.folder = folder.id;
    await Actor.createDocuments(toCreate);
    ui.notifications.info(
      game.i18n.format("AVENTURIA_HELPERS.GettingStarted.Steps.ImportTokens.Imported", { count: toCreate.length }),
    );
  } else {
    ui.notifications.info(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.ImportTokens.AlreadyImported"));
  }

  await placeBoardTokens(folder);
  return true;
}

/**
 * Places the 12 `TOKEN_PLACEMENTS` markers on the currently viewed Gameboard scene, matching
 * each spot to its already-imported world Actor by name (in either language). Same
 * create-or-move idempotency as `placeActorToken()` itself, so re-running "Marken
 * importieren" doesn't pile up duplicate tokens. Silently does nothing (beyond a warning) if
 * the wrong scene is active - matches `placeBoardStacks()`/`placeHeroStacks()`'s guard
 * pattern, since this only makes sense on the Aventuria Gameboard.
 * @param {Folder} folder - The world Actor folder `importBoardTokens()` imports into.
 * @returns {Promise<void>}
 */
async function placeBoardTokens(folder) {
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.ImportTokens.GmOnly"));
    return;
  }
  const scene = canvas.scene;
  if (!scene) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.ImportTokens.NoScene"));
    return;
  }
  if (!scene.getFlag("aventuria", "gameBoard")) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.GettingStarted.Steps.ImportTokens.WrongScene"));
    return;
  }

  let placed = 0;
  for (const spot of TOKEN_PLACEMENTS) {
    const actor = game.actors.find((a) => a.folder?.id === folder.id && (a.name === spot.de || a.name === spot.en));
    if (!actor) continue;
    await placeActorToken(actor, scene, spot);
    placed++;
  }
  if (placed) {
    ui.notifications.info(
      game.i18n.format("AVENTURIA_HELPERS.GettingStarted.Steps.ImportTokens.Placed", {
        count: placed,
        total: TOKEN_PLACEMENTS.length,
      }),
    );
  }
}

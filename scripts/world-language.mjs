const AVENTURIA_ID = "aventuria";

/**
 * Resolves which of Aventuria's two content languages ("de"/"en") this *world* is actually
 * being played in - not the client language of whoever happens to be clicking a given button
 * right now. `flags.aventuria.gameBoard` on the imported Spielbrett/Gameboard scene (baked into
 * that scene by Aventuria's own compendium data, not written by this module) carries exactly
 * that value once "Spielbrett importieren" has run - the single earliest step of "Erste
 * Schritte", so in practice it exists for the entire rest of a world's life.
 *
 * Added 2026-09-10 (Nutzerfrage: "Ist es ein Problem wenn die Sprache der Spielenden gemischt
 * ist?"): several world-mutating functions used to derive their compendium language fresh from
 * `game.i18n.lang` every time they ran - fine for read-only per-viewer display (a journal opened
 * for whoever clicked, an adventure list navigated by whoever's reading), but wrong for anything
 * that creates *shared* content, since it silently language-locks that content to whichever
 * client happened to execute the step, independent of the actual playing language everyone else
 * already established. Concretely found broken this way: a hero's own deck (`assign-hero.mjs`,
 * picked at "Held zuweisen" time), the board's marker token actors (`import-board-tokens.mjs`),
 * a hero's Erfahrungsschatz (`experience-stack.mjs` - a language mismatch here silently breaks
 * "Aktionskarten verbessern" for that one hero, since its exact-name matching then never finds a
 * pairing), and the Schnellstarter's shared adventure/henchmen decks (`prepare-quickstart.mjs`).
 * All of those now resolve their language through this helper instead of `game.i18n.lang`
 * directly. Left alone on purpose: anything that only decides which language *to read something
 * in* for the current viewer and writes nothing shared (the Guide/Changelog journal picked for
 * whoever opened it, the Abenteuer-Tool's own adventure list) - matching the viewer's own client
 * language there is the correct, desired behavior, not the bug this fixes.
 *
 * Falls back to `game.i18n.lang` when no Gameboard scene exists yet - the only realistic case is
 * "Spielbrett importieren" itself, which *establishes* the world language for everything after it
 * and therefore has no prior scene to read it back from.
 * @returns {"de"|"en"}
 */
export function resolveWorldLanguage() {
  const scene = game.scenes.find((s) => ["de", "en"].includes(s.getFlag(AVENTURIA_ID, "gameBoard")));
  if (scene) return scene.getFlag(AVENTURIA_ID, "gameBoard");
  return game.i18n.lang === "de" ? "de" : "en";
}

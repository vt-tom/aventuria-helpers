import { resolveStacks } from "./stacks.mjs";
import { playCardAsEndurance } from "./endurance.mjs";

const MODULE_ID = "aventuria-helpers";
const CCM_MODULE_ID = "complete-card-management";

/**
 * Starting `system.serialNumber` of each Schnellstarter hero's deck - hand cards are the
 * first 5 (`start`..`start+4`), Ausdauer cards the next 4 (`start+5`..`start+8`), the rest
 * stays in the deck to draw during play. Two names per role (gendered hero variants, same
 * as `PROFESSION_ICONS` in `assign-hero.mjs`) share the same start, matched against the
 * Actor's first name since Aventuria hero names are "Firstname Lastname". Confirmed live
 * against an already-assigned "Karmal Eternius" (Stand 2026-08-16): their deck has exactly
 * 30 cards, sequentially numbered 61-90 - `61` matches this table exactly.
 */
const QUICKSTART_HERO_START = {
  Yoleyana: 1,
  Jandriel: 1,
  Miraculo: 31,
  Tsaiana: 31,
  Selestia: 61,
  Karmal: 61,
  Lavalox: 91,
  Iridya: 91,
  Brutack: 121,
  Peraike: 121,
  Kjaska: 151,
  Fortran: 151,
};

/** `system.serialNumber` range of the henchmen prepared in the background for the adventure. */
const HENCHMAN_RANGE = [736, 742];

/** Flag on the world Cards deck `prepareHenchmenDeck()` creates, so re-running doesn't duplicate it. */
const HENCHMEN_DECK_FLAG = "quickstartHenchmen";

/**
 * Master card compendium Aventuria's own (dialog-driven) `createHenchmanDeck()` macro draws
 * from - UUIDs read directly out of its decompiled source (`aventuria/dist/index.js`), not
 * guessed.
 */
const MASTER_CARDS_UUID = {
  de: "Compendium.aventuria.cards-deutsch.Cards.o3kno8d23bmIEXzP",
  en: "Compendium.aventuria.cards-english.Cards.o3kno8d23bmIEXzP",
};

/** Same henchman-deck cover art `createHenchmanDeck()` itself uses. */
const HENCHMEN_DECK_IMG = "modules/aventuria/assets/cards-en/henchmen/Aventuria-ChampionofMischief-HenchmanCards-B-71.webp";

/**
 * Live-captured Gameboard position for the Schergen/henchmen deck (Stand 2026-08-16, same
 * capture method as `HERO_PLACEMENTS`/`TOKEN_PLACEMENTS`: user placed the deck by hand, then
 * read the position back via console). The adventure/event deck itself deliberately isn't
 * placed as a whole deck (Nutzerentscheidung 2026-08-16) - only individual cards drawn from
 * it are (see `ADVENTURE_CARD_PLACEMENTS`, still pending).
 */
const HENCHMAN_DECK_POSITION = { x: 5430.799999999999, y: 4552.6, rotation: 0 };

/** Flag on the world Cards deck `prepareAdventureDeck()` creates, so re-running doesn't duplicate it. */
const ADVENTURE_DECK_FLAG = "quickstartAdventureDeck";

/** Aventuria's own pre-built Schnellstarter adventure/event card deck, per language - given directly by the user (Stand 2026-08-16), not researched. */
const ADVENTURE_DECK_UUID = {
  de: "Compendium.aventuria.cards-deutsch.Cards.OBPF1FtAy8XL2W8G",
  en: "Compendium.aventuria.cards-english.Cards.OBPF1FtAy8XL2W8G",
};

/** "Das Abenteuer"/"The Adventure" page in Aventuria's own Schnellstarter journal, per language. */
const ADVENTURE_JOURNAL = {
  de: { uuid: "Compendium.aventuria.journal-deutsch.JournalEntry.dep4000schnellst", pageId: "00dasabenteuer00" },
  en: { uuid: "Compendium.aventuria.journal-english.JournalEntry.aventrul04quicks", pageId: "04theadventur000" },
};

/** Resolves a hero Actor's name to its Schnellstarter deck-range start, or `null` if it's not one of the six. */
function resolveQuickstartStart(heroName) {
  const entry = Object.entries(QUICKSTART_HERO_START).find(([firstName]) => heroName.startsWith(firstName));
  return entry ? entry[1] : null;
}

/**
 * Draws the hero's first 5 cards (`start`..`start+4`) from their already-prepared deck into
 * their hand, then plays the next 4 (`start+5`..`start+8`) out as Ausdauer via the existing
 * `playCardAsEndurance()` (reused as-is, same canvas-region mechanism a manually-played
 * Ausdauer card goes through - see `cards/endurance.mjs`).
 *
 * Idempotent: only considers cards still `!card.drawn` in the deck, so re-running this (e.g.
 * a second click because the first one's result wasn't obviously visible yet) just skips
 * whatever's already been drawn/played instead of trying to draw it again - `Cards#pass()`
 * throws ("You may not pass Card ... which has already been drawn") for an already-drawn
 * card, and since that throw previously happened inside the un-guarded `prepareQuickstart()`
 * loop, it silently aborted the rest of the loop, leaving every hero after the one that threw
 * untouched (Nutzerfeedback 2026-08-16, reproduced via the exact `UTSCards.pass` stack trace).
 *
 * Logs a console warning per hero if fewer Ausdauer cards were placed than expected
 * (`playCardAsEndurance()` itself already shows a `ui.notifications.warn()` for the concrete
 * reason - no scene, or no play-region wired for that hero's Im-Spiel-Stapel - but a warning
 * fired mid-loop for one of six heroes is easy to miss in the notification tray, so this adds
 * a per-hero summary that stays in the console).
 * @param {User} user
 * @param {number} start
 * @returns {Promise<boolean>} Whether the hero had a prepared deck to draw from.
 */
async function prepareHeroCards(user, start) {
  const stacks = resolveStacks(user);
  if (!stacks?.deck) return false;

  const inRange = (card, from, to) => card.system.serialNumber >= from && card.system.serialNumber <= to;
  const handCards = stacks.deck.cards.filter((c) => !c.drawn && inRange(c, start, start + 4));
  const enduranceCards = stacks.deck.cards.filter((c) => !c.drawn && inRange(c, start + 5, start + 8));

  if (handCards.length) {
    await stacks.deck.pass(stacks.hand, handCards.map((c) => c.id), { action: "draw" });
  }
  let enduranceOk = 0;
  for (const card of enduranceCards) {
    if (await playCardAsEndurance(stacks.playPile, card)) enduranceOk++;
  }
  if (enduranceOk < enduranceCards.length) {
    console.warn(
      `${MODULE_ID} | prepareQuickstart: ${user.character.name} (${user.name}) - only ${enduranceOk}/${enduranceCards.length} Ausdauer cards placed.`,
    );
  }
  return true;
}

/**
 * Headless equivalent of Aventuria's own `createHenchmanDeck()` macro, filtered to
 * `HENCHMAN_RANGE` instead of asking via its interactive Name/Keywords/Min/Max dialog -
 * Nutzerentscheidung 2026-08-16, same "don't call a dialog-only API wholesale from an
 * automated one-click step" precedent as `prepare-hero.mjs` already set for `preparePlayer()`
 * (see `CLAUDE.md`'s Grundregel). No-op if a quickstart henchmen deck already exists in the
 * world (idempotent re-runs, same convention as `#onImportMacros()`).
 * @returns {Promise<Cards|null>}
 */
async function prepareHenchmenDeck() {
  if (game.cards.find((c) => c.getFlag(MODULE_ID, HENCHMEN_DECK_FLAG))) return null;

  const lang = game.i18n.lang === "de" ? "de" : "en";
  const master = await fromUuid(MASTER_CARDS_UUID[lang]);
  const [min, max] = HENCHMAN_RANGE;
  const cards = master.cards
    .filter((c) => c.system.serialNumber >= min && c.system.serialNumber <= max)
    .map((c) => game.cards.fromCompendium(c));

  return Cards.create({
    name: game.i18n.localize("AVENTURIA_HELPERS.Quickstart.Steps.Prepare.HenchmenDeckName"),
    img: HENCHMEN_DECK_IMG,
    type: "deck",
    cards,
    "flags.core.sheetClass": "complete-card-management.DeckSheet",
    [`flags.${MODULE_ID}.${HENCHMEN_DECK_FLAG}`]: true,
  });
}

/**
 * Locks the Schergen/henchmen deck onto the currently viewed Gameboard scene at
 * `HENCHMAN_DECK_POSITION` - same `complete-card-management` scene-flag + `cardCollection`
 * mechanism `placeBoardStacks()`/`placeHeroStacks()` use for their own decks/piles. Silently
 * does nothing (no warning) if the wrong scene is active, since this is a best-effort part of
 * `prepareQuickstart()` rather than its own guide step. Idempotent - re-setting the same
 * position is harmless.
 * @param {Cards} deck
 * @returns {Promise<void>}
 */
async function placeHenchmenDeck(deck) {
  const scene = canvas.scene;
  if (!scene || !scene.getFlag("aventuria", "gameBoard")) return;

  const cardCollection = new Set(scene.getFlag(CCM_MODULE_ID, "cardCollection") ?? []);
  cardCollection.add(deck.uuid);
  await scene.setFlag(CCM_MODULE_ID, "cardCollection", Array.from(cardCollection));

  await deck.setFlag(CCM_MODULE_ID, scene.id, {
    x: HENCHMAN_DECK_POSITION.x,
    y: HENCHMAN_DECK_POSITION.y,
    rotation: HENCHMAN_DECK_POSITION.rotation,
    sort: deck.sort,
    locked: true,
  });
}

/**
 * Wholesale-copies Aventuria's own pre-built Schnellstarter adventure/event card deck
 * (`ADVENTURE_DECK_UUID`) into the world - no filtering needed, unlike the henchmen deck,
 * since this compendium Cards document already *is* exactly the Schnellstarter's card set.
 * Reuses the source deck's own name/image via `game.cards.fromCompendium()` instead of
 * hardcoding either, same pattern `prepare-hero.mjs` uses for a hero's own deck. No-op if a
 * quickstart adventure deck already exists in the world (idempotent re-runs).
 * @returns {Promise<Cards|null>}
 */
async function prepareAdventureDeck() {
  if (game.cards.find((c) => c.getFlag(MODULE_ID, ADVENTURE_DECK_FLAG))) return null;

  const lang = game.i18n.lang === "de" ? "de" : "en";
  const source = await fromUuid(ADVENTURE_DECK_UUID[lang]);
  if (!source) return null;

  return Cards.create({
    ...game.cards.fromCompendium(source),
    [`flags.${MODULE_ID}.${ADVENTURE_DECK_FLAG}`]: true,
  });
}

/** Opens the language-appropriate Schnellstarter journal directly on its "Das Abenteuer" page. */
async function openAdventureJournal() {
  const { uuid, pageId } = ADVENTURE_JOURNAL[game.i18n.lang === "de" ? "de" : "en"];
  const journal = await fromUuid(uuid);
  if (!journal) return;
  await journal.sheet.render(true, { pageId });
}

/**
 * Prepares the Schnellstarter ("quick start") adventure in one click, once every
 * participating player already has a hero assigned and placed on the board (Guide sections
 * "Erste Schritte"/"Helden auswählen"): draws each of the six Schnellstarter heroes' starting
 * hand and Ausdauer cards, creates and places the henchmen deck (Nr. 736-742) on the
 * Gameboard, creates the adventure/event card deck (kept off the board, Nutzerentscheidung
 * 2026-08-16 - only specific cards drawn from it end up on the scene, still pending), and
 * opens the adventure's journal entry. GM-only, same as every other world-mutating guide
 * step.
 * @returns {Promise<boolean>}
 */
export async function prepareQuickstart() {
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Quickstart.Steps.Prepare.GmOnly"));
    return false;
  }

  const users = game.users.filter((u) => u.character);
  let prepared = 0;
  for (const user of users) {
    const start = resolveQuickstartStart(user.character.name);
    if (start == null) continue;
    // One hero's failure must not stop the rest of the table from being prepared - an
    // uncaught error here previously aborted the whole loop (Nutzerfeedback 2026-08-16).
    try {
      if (await prepareHeroCards(user, start)) prepared++;
    } catch (error) {
      console.error(`${MODULE_ID} | prepareQuickstart: failed for ${user.character.name} (${user.name}).`, error);
    }
  }

  if (!prepared) {
    ui.notifications.warn(game.i18n.localize("AVENTURIA_HELPERS.Quickstart.Steps.Prepare.NoHeroes"));
    return false;
  }

  await prepareHenchmenDeck();
  const henchmenDeck = game.cards.find((c) => c.getFlag(MODULE_ID, HENCHMEN_DECK_FLAG));
  if (henchmenDeck) await placeHenchmenDeck(henchmenDeck);

  await prepareAdventureDeck();
  await openAdventureJournal();

  ui.notifications.info(
    game.i18n.format("AVENTURIA_HELPERS.Quickstart.Steps.Prepare.Done", { count: prepared }),
  );
  return true;
}

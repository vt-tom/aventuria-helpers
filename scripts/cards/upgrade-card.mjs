import { resolveStacksForActor } from "./stacks.mjs";

const MODULE_ID = "aventuria-helpers";

/**
 * Abenteuerpunkte-Kosten je Aktionskarten-Steigerung (Regeltext: "1 Abenteuerpunkt" pro Karte,
 * unabhängig von Stufe 1→2 oder 2→3) - Herunterstufen erstattet denselben Betrag
 * (Nutzerentscheidung 2026-08-26: reines Rückgängigmachen, kein Netto-Verlust).
 */
export const CARD_UPGRADE_AP_COST = 1;

/**
 * Builds every currently possible card-level change for a hero: for each Action card in the
 * Deck, an "up" entry if a same-named card one level higher exists in the Erfahrungsschatz, and
 * a "down" entry if a same-named card one level lower exists there (a Stufe-2-Karte can offer
 * both at once). Matching is by exact card name only, deliberately - the official compendium has
 * several typo'd/mistranslated card names in some heroes' Erfahrungsschatz decks (verified
 * 2026-08-26 by cross-checking every hero's Deck against its Erfahrungsschatz name-by-name, not
 * guessed) that would otherwise need silently "corrected" matching; leaving those pairs simply
 * unmatched (no upgrade offered) is the safe default, consistent with how `data/level-values.mjs`
 * already handles similar upstream data gaps.
 * @param {Actor} actor
 * @returns {{
 *   available: boolean,
 *   missingExperience: boolean,
 *   changes: Array<{deckCardId: string, experienceCardId: string, name: string, deckImg: string,
 *     experienceImg: string, fromLevel: number, toLevel: number, direction: "up"|"down", apDelta: number}>,
 * }}
 */
export function getCardLevelChanges(actor) {
  const stacks = resolveStacksForActor(actor);
  if (!stacks?.deck) return { available: false, missingExperience: false, changes: [] };
  if (!stacks.experience) return { available: false, missingExperience: true, changes: [] };

  const experienceByName = new Map();
  for (const card of stacks.experience.cards) {
    if (card.type !== "aventuria.action") continue;
    if (!experienceByName.has(card.name)) experienceByName.set(card.name, new Map());
    experienceByName.get(card.name).set(card.system.level, card);
  }

  const changes = [];
  for (const deckCard of stacks.deck.cards) {
    if (deckCard.type !== "aventuria.action") continue;
    const levels = experienceByName.get(deckCard.name);
    if (!levels) continue;
    const level = deckCard.system.level;

    const upCard = level < 3 ? levels.get(level + 1) : null;
    if (upCard) {
      changes.push({
        deckCardId: deckCard.id,
        experienceCardId: upCard.id,
        name: deckCard.name,
        deckImg: deckCard.img,
        experienceImg: upCard.img,
        fromLevel: level,
        toLevel: level + 1,
        direction: "up",
        apDelta: -CARD_UPGRADE_AP_COST,
      });
    }

    const downCard = level > 1 ? levels.get(level - 1) : null;
    if (downCard) {
      changes.push({
        deckCardId: deckCard.id,
        experienceCardId: downCard.id,
        name: deckCard.name,
        deckImg: deckCard.img,
        experienceImg: downCard.img,
        fromLevel: level,
        toLevel: level - 1,
        direction: "down",
        apDelta: CARD_UPGRADE_AP_COST,
      });
    }
  }

  return { available: true, missingExperience: false, changes };
}

/**
 * Applies a batch of card-level changes in one go (Nutzerentscheidung 2026-08-26:
 * Mehrfachauswahl mit Sammel-Bestätigung statt einer Aktion pro Karte) - re-derives the current
 * candidates first and only acts on selections that still match a real one (second line of
 * defense, same reasoning as `applyLevelUp()`'s re-check), then swaps every selected card pair
 * between Deck and Erfahrungsschatz via `Cards#pass()`, and finally writes the net AP delta plus
 * one `apLog` entry per card in a single `actor.update()`.
 *
 * The swap itself is done with explicit `deleteEmbeddedDocuments`/`createEmbeddedDocuments` rather
 * than `Cards#pass()` (Bugfix 2026-09-03): Deck and Erfahrungsschatz are *both* `type:"deck"`
 * Cards documents, and `pass()` between two decks only ever *copies* the card into the destination
 * (with `keepId: true`) and never removes it from the source - so the old two-`pass()` swap both
 * silently duplicated cards in the Deck and, on any later swap of the same pair (e.g. a refund),
 * threw "The _id [...] already exists within the parent collection" when `createEmbeddedDocuments`'
 * `keepId` hit the copy the first upgrade had left behind. Recreating with fresh ids sidesteps
 * both problems and round-trips cleanly across repeated up/down.
 * @param {Actor} actor
 * @param {Array<{deckCardId: string, direction: "up"|"down"}>} selections
 * @returns {Promise<void>}
 */
export async function applyCardLevelChanges(actor, selections) {
  const stacks = resolveStacksForActor(actor);
  if (!stacks?.deck || !stacks?.experience) {
    throw new Error(`aventuria-helpers | Cannot apply card level changes for ${actor.name}: missing deck/experience stack`);
  }

  const { changes } = getCardLevelChanges(actor);
  const matched = selections
    .map((selection) => changes.find((c) => c.deckCardId === selection.deckCardId && c.direction === selection.direction))
    .filter(Boolean);
  if (!matched.length) return;

  const netDelta = matched.reduce((sum, c) => sum + c.apDelta, 0);
  const currentAp = Number(actor.getFlag(MODULE_ID, "adventurePoints")) || 0;
  if (currentAp + netDelta < 0) {
    throw new Error(`aventuria-helpers | Not enough adventure points to apply the selected card changes for ${actor.name}`);
  }

  for (const change of matched) {
    // Same swap regardless of direction - "up" and "down" only differ in which card was already
    // sitting in the Deck vs. the Erfahrungsschatz, not in the mechanic itself: drop the current
    // card from each stack and recreate the other stack's card there with a fresh id.
    const expCard = stacks.experience.cards.get(change.experienceCardId);
    const deckCard = stacks.deck.cards.get(change.deckCardId);
    if (!expCard || !deckCard) continue;

    const intoDeck = foundry.utils.mergeObject(
      expCard.toObject(),
      { origin: stacks.deck.id, drawn: false },
      { inplace: false },
    );
    const intoExperience = foundry.utils.mergeObject(
      deckCard.toObject(),
      { origin: stacks.experience.id, drawn: false },
      { inplace: false },
    );
    delete intoDeck._id;
    delete intoExperience._id;

    await stacks.deck.deleteEmbeddedDocuments("Card", [deckCard.id]);
    await stacks.experience.deleteEmbeddedDocuments("Card", [expCard.id]);
    await stacks.deck.createEmbeddedDocuments("Card", [intoDeck]);
    await stacks.experience.createEmbeddedDocuments("Card", [intoExperience]);
  }

  const apLog = actor.getFlag(MODULE_ID, "apLog") ?? [];
  const newLogEntries = matched.map((c) => ({
    date: new Date().toISOString(),
    amount: c.apDelta,
    type: "card",
    note:
      c.direction === "up"
        ? `Aktionskarte "${c.name}" Stufe ${c.fromLevel} → ${c.toLevel}`
        : `Aktionskarte "${c.name}" Stufe ${c.fromLevel} → ${c.toLevel} (zurückgestuft)`,
  }));

  await actor.update({
    [`flags.${MODULE_ID}.adventurePoints`]: currentAp + netDelta,
    [`flags.${MODULE_ID}.apLog`]: [...apLog, ...newLogEntries],
  });
}

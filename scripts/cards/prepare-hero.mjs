import { resolveStacks } from "./stacks.mjs";
import { AventuriaHelpersHeroSheet } from "../sheets/hero-sheet.mjs";
import { wirePlayRegion } from "./player-slots.mjs";

const MODULE_ID = "aventuria-helpers";
const AVENTURIA_ID = "aventuria";
const CCM_ID = "complete-card-management";

/**
 * Sheet identifier `Actors.registerSheet()` derives for `AventuriaHelpersHeroSheet`
 * (`scope.ClassName`, confirmed against the actual registration logic in the local
 * v14 source, `client/applications/apps/document-sheet-config.mjs`'s
 * `DocumentSheetConfig.registerSheet()`: `const id = \`${scope}.${sheetClass.name}\`;`).
 * Built from the class itself rather than hardcoded, so a future rename can't
 * silently desync it.
 */
const HERO_SHEET_ID = `${MODULE_ID}.${AventuriaHelpersHeroSheet.name}`;

/**
 * Deliberate, isolated exception to this module's usual "never rebuild aventuria's
 * own logic, always call it wholesale" rule (see `CLAUDE.md`'s Grundregel) -
 * Nutzerentscheidung 2026-08-14: calling aventuria's own "Bereite Spieler vor"
 * dialog (`preparePlayer()` in `aventuria/dist/index.js:849-932`) as a *second*,
 * unrelated dialog right after our own player+slot picker produced a genuinely bad
 * experience (a second manual "Spielernummer" entry, a window-overlap bug, no way
 * to warn about conflicts beforehand) that wasn't fixable by tweaking the seam
 * between the two dialogs - only by not having a seam at all. This file reimplements
 * exactly what that function does, faithfully mirrored from its decompiled source
 * (see `CHANGELOG.md` for the exact reference), so `assign-hero.mjs` can do
 * everything - player, board slot, hero, validation - on one screen.
 */

/**
 * Resolves which user (if any) already has the given compendium hero as their
 * character - `fromCompendium()`/`importFromCompendium()` always stamps
 * `_stats.compendiumSource` with the origin UUID regardless of `keepId`, the same
 * mechanism `place-hero-stacks.mjs`'s `PLACEMENTS` matching already relies on.
 * @param {string} heroUuid
 * @returns {User|null}
 */
export function resolveHeroOccupant(heroUuid) {
  return game.users.find((u) => u.character?._stats?.compendiumSource === heroUuid) ?? null;
}

/**
 * Deletes a user's currently-assigned hero Actor, its four Cards stacks, their
 * shared Folder, and any Token representing that Actor on any scene, if any - used
 * right before assigning them a new hero (Nutzerwunsch: overwriting a player's hero
 * actively cleans up the old one instead of leaving it orphaned in the world, token
 * included so there's nothing left over on the board to manually remove).
 * @param {User} user
 * @returns {Promise<void>}
 */
async function deleteExistingHero(user) {
  const stacks = resolveStacks(user);
  if (!stacks) return;

  for (const scene of game.scenes) {
    const tokens = scene.tokens.filter((t) => t.actorId === stacks.actor.id);
    if (tokens.length) await scene.deleteEmbeddedDocuments("Token", tokens.map((t) => t.id));
  }

  const cardIds = [stacks.deck, stacks.discard, stacks.playPile, stacks.hand]
    .filter(Boolean)
    .map((c) => c.id);
  if (cardIds.length) await Cards.deleteDocuments(cardIds);

  const folder = stacks.hand.folder;
  if (folder) await folder.delete();

  await stacks.actor.delete();
}

/**
 * Faithful reimplementation of aventuria's `preparePlayer()` (see file header),
 * parameterized so the hero, target player and board slot are already decided
 * (`assign-hero.mjs`'s own dialog collects and validates all three) instead of
 * being asked for via a second dialog. If `targetUser` already has a hero, it -
 * Actor, all four Cards stacks, and their Folder - is deleted first.
 * @param {object} options
 * @param {CompendiumCollection} options.heroPack
 * @param {string} options.heroId
 * @param {User} options.targetUser
 * @param {number} options.playerSlot
 * @param {Scene} options.scene
 * @returns {Promise<{actor: Actor, deck: Cards, hand: Cards, discard: Cards, playPile: Cards}>}
 */
export async function prepareAndAssignHero({ heroPack, heroId, targetUser, playerSlot, scene }) {
  await deleteExistingHero(targetUser);

  const actor = await game.actors.importFromCompendium(heroPack, heroId);
  // Nutzerwunsch 2026-08-16: heroes prepared through this tool should open with this
  // module's own Hero-Sheet, not the generic UTS sheet - `Actors.registerSheet()`
  // for it (aventuria-helpers.mjs) deliberately keeps `makeDefault: false` (doesn't
  // change the world-wide default for every hero), so set it per-actor instead, same
  // as `flags.core.sheetClass` aventuria's own `preparePlayer()` already sets on its
  // Cards documents for their CCM sheets.
  await actor.setFlag("core", "sheetClass", HERO_SHEET_ID);
  const deckSource = await fromUuid(actor.getFlag(AVENTURIA_ID, "deck"));
  const folder = await Folder.create({ name: actor.name, type: "Cards" });

  const [deck, hand, discard, playPile] = await Cards.createDocuments([
    {
      ...game.cards.fromCompendium(deckSource),
      img: "modules/aventuria/assets/player-draw-back.webp",
      folder: folder.id,
      name: game.i18n.format("AVENTURIA.Macros.PreparePlayer.Deck", { name: actor.name }),
    },
    {
      name: game.i18n.format("AVENTURIA.Macros.PreparePlayer.Hand", { name: actor.name }),
      img: "modules/aventuria/assets/Back-INTERNATIONAL.webp",
      type: "hand",
      folder: folder.id,
      "flags.core.sheetClass": "complete-card-management.HandSheet",
    },
    {
      name: game.i18n.format("AVENTURIA.Macros.PreparePlayer.DiscardPile", { name: actor.name }),
      img: "modules/aventuria/assets/player-discard-back.webp",
      type: "pile",
      folder: folder.id,
      flags: { "core.sheetClass": "complete-card-management.PileSheet" },
    },
    {
      name: game.i18n.format("AVENTURIA.Macros.PreparePlayer.PlayPile", { name: actor.name }),
      img: "modules/aventuria/assets/Back-INTERNATIONAL.webp",
      type: "pile",
      folder: folder.id,
      flags: {
        "core.sheetClass": "complete-card-management.PileSheet",
        [`${AVENTURIA_ID}.pileType`]: "play",
      },
    },
  ]);

  await targetUser.update({ character: actor.id, [`flags.${CCM_ID}.playerHand`]: hand.id });

  await wirePlayRegion(scene, playerSlot, playPile);

  return { actor, deck, hand, discard, playPile };
}

import { LEVEL_VALUES } from "../data/level-values.mjs";

const MODULE_ID = "aventuria-helpers";

/** Abenteuerpunkte-Kosten je Steigerung, unabhaengig davon welche Karte gesteigert wird. */
export const LEVEL_UP_AP_COST = 3;

/** Hoechste erreichbare Stufe je Track, passend zu den drei `level`-Choices I/II/III im aventuria-Schema. */
export const MAX_CARD_LEVEL = 3;

/** Niedrigste Stufe je Track - ein frisch zugewiesener Held startet hier. */
export const MIN_CARD_LEVEL = 1;

const SKILL_KEYS = ["body", "craft", "knowledge", "perception", "persuade", "stealth", "survival", "willpower"];
const HERO_STAT_KEYS = ["close", "ranged", "magic", "dodge"];
const EQUIP_FIELDS = ["basicEquipment", "secondEquipment"];

/**
 * Resolves the `LEVEL_VALUES` entry for an actor by matching its name's leading first name -
 * same convention `QUICKSTART_HERO_START` in `prepare-quickstart.mjs` uses. `null` if this hero
 * isn't one of the 12 quickstart heroes the data table covers.
 * @param {Actor} actor
 * @returns {string|null}
 */
export function getHeroFirstName(actor) {
  return Object.keys(LEVEL_VALUES).find((firstName) => actor.name.startsWith(firstName)) ?? null;
}

/**
 * Current level (1-3) of one of the two independent tracks. Module flag, defaults to 1 when
 * unset (a freshly assigned hero starts at Stufe I on both the Heldenkarte and Talentkarte).
 * @param {Actor} actor
 * @param {"hero"|"skill"} track
 * @returns {number}
 */
export function getCardLevel(actor, track) {
  const flag = actor.getFlag(MODULE_ID, track === "hero" ? "heroCardLevel" : "skillCardLevel");
  return Number(flag) || 1;
}

/**
 * Current Abenteuerpunkte-Kontostand. Module flag, defaults to 0.
 * @param {Actor} actor
 * @returns {number}
 */
export function getAdventurePoints(actor) {
  return Number(actor.getFlag(MODULE_ID, "adventurePoints")) || 0;
}

/**
 * Builds the "Feld: alt -> neu" preview for steigern one track by one level, without writing
 * anything - used by both the hero sheet (to decide whether/how to show the "Steigern" button)
 * and the level-up dialog (to render the confirmation list).
 * @param {Actor} actor
 * @param {"hero"|"skill"} track
 * @returns {{
 *   known: boolean,
 *   fromLevel: number,
 *   toLevel: number|null,
 *   atMax: boolean,
 *   dataMissing: boolean,
 *   changes: Array<{field: string, label: string, from: *, to: *}>,
 * }}
 */
export function getLevelUpPreview(actor, track) {
  const fromLevel = getCardLevel(actor, track);
  const firstName = getHeroFirstName(actor);
  const known = !!firstName;
  const atMax = fromLevel >= MAX_CARD_LEVEL;

  if (!known || atMax) {
    return { known, fromLevel, toLevel: atMax ? null : fromLevel + 1, atMax, dataMissing: false, changes: [] };
  }

  const toLevel = fromLevel + 1;
  const diff = LEVEL_VALUES[firstName]?.[track]?.[toLevel];
  if (diff === undefined || diff === null) {
    return { known, fromLevel, toLevel, atMax: false, dataMissing: true, changes: [] };
  }

  const system = actor.system;
  const changes = [];
  for (const [field, value] of Object.entries(diff)) {
    if (track === "skill") {
      changes.push({
        field: `skills.${field}`,
        label: `AVENTURIA.Models.Hero.FIELDS.skills.${field}.label`,
        from: system.skills[field],
        to: value,
      });
    } else if (field === "basicEquipment" || field === "secondEquipment") {
      for (const [subField, subValue] of Object.entries(value)) {
        changes.push({
          field: `${field}.${subField}`,
          label: `AVENTURIA.Models.Hero.FIELDS.${field}.${subField}.label`,
          from: system[field]?.[subField] ?? "",
          to: subValue,
        });
      }
    } else if (field === "specialAbility") {
      changes.push({
        field: "specialAbility",
        label: "AVENTURIA.Models.Hero.FIELDS.specialAbility.label",
        from: system.specialAbility.name,
        to: value.name,
        description: value.description,
      });
    } else {
      changes.push({
        field,
        label: `AVENTURIA.Models.Hero.FIELDS.${field}.label`,
        from: system[field],
        to: value,
      });
    }
  }

  return { known, fromLevel, toLevel, atMax: false, dataMissing: false, changes };
}

/**
 * The `system.`-relative leaf paths a single level diff touches - the exact set `applyLevelUp()`
 * writes and `applyLevelDown()` restores. Mirrors `applyLevelUp()`'s write loop.
 * @param {"hero"|"skill"} track
 * @param {object} diff  One `LEVEL_VALUES[firstName][track][level]` entry.
 * @returns {string[]}
 */
function diffLeafPaths(track, diff) {
  const paths = [];
  if (track === "skill") {
    for (const key of SKILL_KEYS) if (key in diff) paths.push(`skills.${key}`);
    return paths;
  }
  for (const key of HERO_STAT_KEYS) if (key in diff) paths.push(key);
  for (const eqField of EQUIP_FIELDS) {
    if (diff[eqField]) for (const subField of Object.keys(diff[eqField])) paths.push(`${eqField}.${subField}`);
  }
  if (diff.specialAbility) paths.push("specialAbility.name", "specialAbility.description");
  return paths;
}

/** Reads the `levelUpHistory` undo entry stored for one track at a given level, or `null`. */
function getLevelUpHistoryEntry(actor, track, level) {
  const history = actor.getFlag(MODULE_ID, "levelUpHistory") ?? {};
  return history?.[track]?.[`l${level}`] ?? null;
}

/**
 * Applies one level-up step: writes the diffed `system.*` fields, bumps the track's level flag,
 * deducts the AP cost, appends an `apLog` entry, and records an undo snapshot of the pre-change
 * field values under `flags.aventuria-helpers.levelUpHistory.<track>.l<toLevel>` so the step can
 * later be reversed by `applyLevelDown()` (the sparse `LEVEL_VALUES` diffs only hold the *new*
 * values, not the previous ones - and Stufe-I base values aren't stored anywhere, so a snapshot
 * taken here is the only reliable way to undo). Callers (the level-up dialog) are expected to
 * have already checked `getLevelUpPreview()`/`getAdventurePoints()` themselves - the checks here
 * are a second line of defense, not the primary UI gate.
 * @param {Actor} actor
 * @param {"hero"|"skill"} track
 * @returns {Promise<void>}
 */
export async function applyLevelUp(actor, track) {
  const preview = getLevelUpPreview(actor, track);
  if (!preview.known || preview.atMax || preview.dataMissing) {
    throw new Error(`aventuria-helpers | Cannot level up ${actor.name}'s ${track} track: ${JSON.stringify(preview)}`);
  }
  const ap = getAdventurePoints(actor);
  if (ap < LEVEL_UP_AP_COST) {
    throw new Error(`aventuria-helpers | Not enough adventure points to level up ${actor.name}'s ${track} track`);
  }

  const firstName = getHeroFirstName(actor);
  const diff = LEVEL_VALUES[firstName][track][preview.toLevel];

  // Stored as an array of {path, value} pairs, not a {path: value} map: a map key like
  // "basicEquipment.damage" would be dot-expanded into nested objects when it round-trips through
  // `actor.update()`/flag storage, breaking the readback. Array entries have no dotted keys.
  const snapshot = diffLeafPaths(track, diff).map((path) => ({
    path,
    value: foundry.utils.getProperty(actor.system, path),
  }));

  const updateData = {
    [`flags.${MODULE_ID}.${track === "hero" ? "heroCardLevel" : "skillCardLevel"}`]: preview.toLevel,
    [`flags.${MODULE_ID}.adventurePoints`]: ap - LEVEL_UP_AP_COST,
    [`flags.${MODULE_ID}.apLog`]: [
      ...(actor.getFlag(MODULE_ID, "apLog") ?? []),
      {
        date: new Date().toISOString(),
        amount: -LEVEL_UP_AP_COST,
        type: "card",
        note: `${track === "hero" ? "Heldenkarte" : "Talentkarte"} Stufe ${preview.fromLevel} → ${preview.toLevel}`,
      },
    ],
    [`flags.${MODULE_ID}.levelUpHistory.${track}.l${preview.toLevel}`]: {
      snapshot,
      apCost: LEVEL_UP_AP_COST,
      fromLevel: preview.fromLevel,
      toLevel: preview.toLevel,
    },
  };

  if (track === "skill") {
    for (const key of SKILL_KEYS) {
      if (key in diff) updateData[`system.skills.${key}`] = diff[key];
    }
  } else {
    for (const key of ["close", "ranged", "magic", "dodge"]) {
      if (key in diff) updateData[`system.${key}`] = diff[key];
    }
    for (const eqField of ["basicEquipment", "secondEquipment"]) {
      if (diff[eqField]) {
        for (const [subField, subValue] of Object.entries(diff[eqField])) {
          updateData[`system.${eqField}.${subField}`] = subValue;
        }
      }
    }
    if (diff.specialAbility) {
      updateData["system.specialAbility.name"] = diff.specialAbility.name;
      updateData["system.specialAbility.description"] = diff.specialAbility.description;
    }
  }

  await actor.update(updateData);
}

/**
 * Builds the "Feld: aktuell -> zurueck zu" preview for undoing one level-up step on a track,
 * without writing anything - used by the hero sheet (to decide whether to show the "Zurückstufen"
 * button) and the level-up dialog (to render the confirmation list). Only possible when an undo
 * snapshot from `applyLevelUp()` exists for the track's current level: a hero leveled up before
 * this feature existed (or one already at Stufe I) has no snapshot and can't be reversed here.
 * @param {Actor} actor
 * @param {"hero"|"skill"} track
 * @returns {{
 *   atMin: boolean,
 *   hasSnapshot: boolean,
 *   fromLevel: number,
 *   toLevel: number|null,
 *   refund: number,
 *   changes: Array<{field: string, label: string, from: *, to: *, description?: string}>,
 * }}
 */
export function getLevelDownPreview(actor, track) {
  const fromLevel = getCardLevel(actor, track);
  const atMin = fromLevel <= MIN_CARD_LEVEL;
  const entry = atMin ? null : getLevelUpHistoryEntry(actor, track, fromLevel);
  const snap = Array.isArray(entry?.snapshot) ? entry.snapshot : null;
  const hasSnapshot = !!snap?.length;

  if (atMin || !hasSnapshot) {
    return { atMin, hasSnapshot, fromLevel, toLevel: atMin ? null : fromLevel - 1, refund: 0, changes: [] };
  }

  const changes = [];
  for (const { path, value: oldValue } of snap) {
    if (path === "specialAbility.description") continue; // folded into the specialAbility.name row
    if (path === "specialAbility.name") {
      changes.push({
        field: "specialAbility",
        label: "AVENTURIA.Models.Hero.FIELDS.specialAbility.label",
        from: actor.system.specialAbility?.name ?? "",
        to: oldValue,
        description: snap.find((e) => e.path === "specialAbility.description")?.value,
      });
      continue;
    }
    changes.push({
      field: path,
      label: `AVENTURIA.Models.Hero.FIELDS.${path}.label`,
      from: foundry.utils.getProperty(actor.system, path),
      to: oldValue,
    });
  }

  return {
    atMin: false,
    hasSnapshot: true,
    fromLevel,
    toLevel: fromLevel - 1,
    refund: entry.apCost ?? LEVEL_UP_AP_COST,
    changes,
  };
}

/**
 * Reverses one level-up step: restores the `system.*` fields from the undo snapshot, drops the
 * track's level flag by one, refunds the AP that step cost, appends an `apLog` entry, and clears
 * the now-consumed snapshot (a later re-level writes a fresh one). A manual stat edit made after
 * the level-up is overwritten by the restore - the dialog's "aktuell → zurück zu" table shows
 * exactly which fields change, so this is visible before confirming. Second-line checks only;
 * the dialog gates on `getLevelDownPreview()` first.
 * @param {Actor} actor
 * @param {"hero"|"skill"} track
 * @returns {Promise<void>}
 */
export async function applyLevelDown(actor, track) {
  const fromLevel = getCardLevel(actor, track);
  if (fromLevel <= MIN_CARD_LEVEL) {
    throw new Error(`aventuria-helpers | ${actor.name}'s ${track} track is already at the minimum level`);
  }
  const entry = getLevelUpHistoryEntry(actor, track, fromLevel);
  if (!Array.isArray(entry?.snapshot) || !entry.snapshot.length) {
    throw new Error(
      `aventuria-helpers | No level-up snapshot stored for ${actor.name}'s ${track} track at level ${fromLevel} - cannot undo`,
    );
  }

  const toLevel = fromLevel - 1;
  const refund = entry.apCost ?? LEVEL_UP_AP_COST;
  const levelFlag = track === "hero" ? "heroCardLevel" : "skillCardLevel";

  const updateData = {
    [`flags.${MODULE_ID}.${levelFlag}`]: toLevel,
    [`flags.${MODULE_ID}.adventurePoints`]: getAdventurePoints(actor) + refund,
    [`flags.${MODULE_ID}.apLog`]: [
      ...(actor.getFlag(MODULE_ID, "apLog") ?? []),
      {
        date: new Date().toISOString(),
        amount: refund,
        type: "card",
        note: `${track === "hero" ? "Heldenkarte" : "Talentkarte"} Stufe ${fromLevel} → ${toLevel} (zurückgestuft)`,
      },
    ],
  };

  for (const { path, value: oldValue } of entry.snapshot) {
    if (oldValue === undefined) continue;
    updateData[`system.${path}`] = oldValue;
  }

  await actor.update(updateData);
  // Separate call rather than a `-=`/ForcedDeletion key folded into `updateData` above: a stale
  // `l<fromLevel>` entry left behind if this second write failed would be harmless anyway (only
  // ever read again while the track sits at `fromLevel`, and `applyLevelUp()` overwrites it on a
  // re-level), so atomicity isn't needed - and `unsetFlag()` is the unambiguous v14 API.
  await actor.unsetFlag(MODULE_ID, `levelUpHistory.${track}.l${fromLevel}`);
}

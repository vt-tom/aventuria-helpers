import { LEVEL_VALUES } from "../data/level-values.mjs";

const MODULE_ID = "aventuria-helpers";

/** Abenteuerpunkte-Kosten je Steigerung, unabhaengig davon welche Karte gesteigert wird. */
export const LEVEL_UP_AP_COST = 3;

/** Hoechste erreichbare Stufe je Track, passend zu den drei `level`-Choices I/II/III im aventuria-Schema. */
export const MAX_CARD_LEVEL = 3;

const SKILL_KEYS = ["body", "craft", "knowledge", "perception", "persuade", "stealth", "survival", "willpower"];

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
 * Applies one level-up step: writes the diffed `system.*` fields, bumps the track's level flag,
 * deducts the AP cost, and appends an `apLog` entry. Callers (the level-up dialog) are expected
 * to have already checked `getLevelUpPreview()`/`getAdventurePoints()` themselves - the checks
 * here are a second line of defense, not the primary UI gate.
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

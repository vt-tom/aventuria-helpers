const ICONS = "modules/aventuria/assets/icons/";
const CARD_TEMPLATE = "modules/aventuria-helpers/templates/chat/probe-card.hbs";

/** Icon file + short label key per attribute, for the Probe dialog and chat card. */
const ATTRIBUTES = {
  close: { icon: "close-combat.webp", label: "AVENTURIA_HELPERS.Attributes.Close" },
  ranged: { icon: "ranged-combat.webp", label: "AVENTURIA_HELPERS.Attributes.Ranged" },
  magic: { icon: "magic.webp", label: "AVENTURIA_HELPERS.Attributes.Magic" },
  dodge: { icon: "dodge.webp", label: "AVENTURIA_HELPERS.Attributes.Dodge" },
};

/** Aventuria has no per-skill artwork, so every skill Probe reuses the talent-card icon. */
const SKILL_ICON = "talent.webp";

/**
 * Prompts for a situational modifier. Positive values are subtracted from the roll
 * (easier), negative values are added (harder) - explained in the dialog itself.
 * @param {string} title    Dialog window title.
 * @param {string} label    Name of the thing being tested, shown in the target line.
 * @param {string} icon     Icon path shown next to the label.
 * @param {number} target   The value the roll will be tested against.
 * @param {string} [extra]  Optional extra HTML shown between the target line and the
 *                          modifier field (e.g. a damage-formula preview).
 * @returns {Promise<number|null>} The chosen modifier, or null if cancelled.
 */
async function promptModifier(title, label, icon, target, extra = "") {
  const result = await foundry.applications.api.Dialog.input({
    window: { title, icon: "fa-solid fa-dice-d20" },
    classes: ["aventuria-helpers", "probe-dialog"],
    content: `
      <div class="probe-dialog-body">
        <p class="probe-target">
          <img src="${icon}" alt="">
          <strong>${label}</strong>
          <span>${game.i18n.localize("AVENTURIA_HELPERS.Probe.Target")} ${target}</span>
        </p>
        ${extra}
        <div class="form-group">
          <label for="probe-modifier">${game.i18n.localize("AVENTURIA_HELPERS.Probe.Modifier")}</label>
          <input type="number" id="probe-modifier" name="modifier" value="0" step="1" autofocus>
        </div>
        <p class="probe-hint">${game.i18n.localize("AVENTURIA_HELPERS.Probe.Hint")}</p>
      </div>
    `,
    ok: {
      label: game.i18n.localize("AVENTURIA_HELPERS.Probe.Roll"),
      icon: "fa-solid fa-dice-d20",
    },
  });
  if (!result) return null;
  return Number(result.modifier) || 0;
}

/**
 * Rolls 1d20 against a target, roll-under (total = d20 - modifier <= target). A natural 1
 * is always a critical success and a natural 20 is always a critical failure, regardless
 * of the modifier - both override what the modified total alone would say.
 * @param {number} modifier
 * @param {number} target
 * @returns {Promise<{roll: Roll, dieResult: number, total: number, success: boolean, tier: "criticalSuccess"|"success"|"failure"|"criticalFailure"}>}
 */
async function rollD20(modifier, target) {
  const roll = new Roll("1d20");
  await roll.evaluate();
  const dieResult = roll.total;
  const total = dieResult - modifier;
  let tier;
  if (dieResult === 1) tier = "criticalSuccess";
  else if (dieResult === 20) tier = "criticalFailure";
  else tier = total <= target ? "success" : "failure";
  const success = tier === "criticalSuccess" || tier === "success";
  return { roll, dieResult, total, success, tier };
}

/**
 * Localization key suffix per outcome tier. Both Talent- and Angriffsproben use the same
 * "Erfolg"/"Misserfolg" wording for the non-critical tiers - Nutzerentscheidung 2026-08-21
 * (third pass, same day: an earlier version used "Bestanden"/"Nicht bestanden" for
 * Angriffsproben specifically, since replaced). Angriffsproben (equipment/attribute
 * attacks) only ever show two outcomes, collapsing both critical tiers into Success/Failure -
 * see probe-roll.mjs Bugs entry in TODO.md. Talent-Proben show all four tiers, with their
 * own critical wording ("Kritischer Erfolg"/"Kritischer Misserfolg").
 */
const TIER_KEYS = {
  criticalSuccess: "CriticalSuccess",
  success: "Success",
  failure: "Failure",
  criticalFailure: "CriticalFailure",
};

function outcomeLabel(tier, { showCritical }) {
  if (!showCritical) tier = tier === "criticalSuccess" ? "success" : tier === "criticalFailure" ? "failure" : tier;
  return game.i18n.localize(`AVENTURIA_HELPERS.Probe.${TIER_KEYS[tier]}`);
}

/**
 * Normalizes German dice notation ("1W6") to Foundry's ("1d6") and validates the
 * result, so a hand-typed damage field can be rolled directly.
 * @param {string} damage
 * @returns {string|null}
 */
function normalizeDamageFormula(damage) {
  if (!damage?.trim()) return null;
  const formula = damage.trim().replace(/(\d)\s*[wW]\s*(\d)/g, "$1d$2");
  return Roll.validate(formula) ? formula : null;
}

/**
 * Prompts for a modifier, rolls 1d20 against it, and posts a chat card with the
 * result and whether the Probe was passed.
 * @param {Actor} actor
 * @param {string} label
 * @param {string} icon
 * @param {number} target
 * @param {boolean} showCritical  Talent-Proben show all four outcome tiers (kritischer
 *   Erfolg/Erfolg/Misserfolg/kritischer Misserfolg); Angriffsproben (attribute chips) only
 *   ever show Erfolg/Misserfolg, per Nutzerentscheidung 2026-08-21 (TODO.md Bugs entry).
 */
async function rollProbe(actor, label, icon, target, showCritical) {
  if (target == null) return;

  const modifier = await promptModifier(
    game.i18n.format("AVENTURIA_HELPERS.Probe.Title", { attribute: label }),
    label,
    icon,
    target,
  );
  if (modifier === null) return;

  const { roll, dieResult, total, success, tier } = await rollD20(modifier, target);

  const content = await renderTemplate(CARD_TEMPLATE, {
    label,
    icon,
    target,
    dieResult,
    hasModifier: modifier !== 0,
    operator: modifier >= 0 ? "−" : "+",
    modifierAbs: Math.abs(modifier),
    total,
    success,
    outcomeLabel: outcomeLabel(tier, { showCritical }),
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    content,
  });
}

/**
 * Rolls a Probe for one of the four attribute chips (Nahkampf/Fernkampf/Magie/Ausweichen).
 * Counts as an Angriffsprobe (only Erfolg/Misserfolg shown, no separate kritisch-Text).
 * @param {Actor} actor
 * @param {"close"|"ranged"|"magic"|"dodge"} key
 */
export async function rollAttribute(actor, key) {
  const def = ATTRIBUTES[key];
  if (!def) return;
  await rollProbe(actor, game.i18n.localize(def.label), ICONS + def.icon, actor.system[key], false);
}

/**
 * Rolls a Probe for one of the eight Talente. Shows all four outcome tiers.
 * @param {Actor} actor
 * @param {"body"|"craft"|"knowledge"|"perception"|"persuade"|"stealth"|"survival"|"willpower"} key
 */
export async function rollSkill(actor, key) {
  if (!(key in actor.system.skills)) return;
  // DataModel field labels are already localized in place via LOCALIZATION_PREFIXES,
  // same as how aventuria's own rollTest() uses them.
  const label = actor.system.schema.getField(["skills", key]).label;
  await rollProbe(actor, label, ICONS + SKILL_ICON, actor.system.skills[key], true);
}

/**
 * Rolls a piece of equipment: the attack Probe for its attackType, plus its damage
 * formula, in one dialog - then automatically marks the equipment "erschöpft". Per
 * Aventuria's rules, using either weapon exhausts the whole hero card (a hero with two
 * weapons may only use one per turn), so both `exhaust` fields are marked, not just the
 * one that was used - see `AventuriaHelpersHeroSheet#toggleExhaust`.
 * @param {Actor} actor
 * @param {"basicEquipment"|"secondEquipment"} key
 */
export async function rollEquipment(actor, key) {
  const equipment = actor.system[key];
  const attrDef = equipment && ATTRIBUTES[equipment.attackType];
  if (!attrDef) return;

  const target = actor.system[equipment.attackType];
  if (target == null) return;

  const attrLabel = game.i18n.localize(attrDef.label);
  const icon = ICONS + attrDef.icon;
  const name = equipment.name || attrLabel;
  const damageFormula = normalizeDamageFormula(equipment.damage);
  const damagePreview = damageFormula
    ? `<p class="probe-damage-preview">${game.i18n.localize("AVENTURIA.Models.Hero.FIELDS.basicEquipment.damage.label")}: <strong>${equipment.damage}</strong></p>`
    : "";

  const modifier = await promptModifier(
    game.i18n.format("AVENTURIA_HELPERS.Probe.EquipmentTitle", { name }),
    attrLabel,
    icon,
    target,
    damagePreview,
  );
  if (modifier === null) return;

  const { roll, dieResult, total, success, tier } = await rollD20(modifier, target);

  let damageRoll = null;
  if (damageFormula) {
    damageRoll = new Roll(damageFormula);
    await damageRoll.evaluate();
  }

  const content = await renderTemplate(CARD_TEMPLATE, {
    label: name,
    icon,
    target,
    dieResult,
    hasModifier: modifier !== 0,
    operator: modifier >= 0 ? "−" : "+",
    modifierAbs: Math.abs(modifier),
    total,
    success,
    outcomeLabel: outcomeLabel(tier, { showCritical: false }),
    damage: damageRoll ? { formula: equipment.damage, total: damageRoll.total } : null,
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: damageRoll ? [roll, damageRoll] : [roll],
    sound: CONFIG.sounds.dice,
    content,
  });

  await actor.update({
    "system.basicEquipment.exhaust": true,
    "system.secondEquipment.exhaust": true,
  });
}

const ICONS = "modules/aventuria/assets/icons/";

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
 * Prompts for a situational modifier, rolls 1d20 against it, and posts a chat card
 * with the result and whether the Probe was passed (roll-under: total <= target).
 * Positive modifiers are subtracted from the roll (easier), negative modifiers are
 * added (harder).
 * @param {Actor} actor
 * @param {string} label     Localized name of the thing being tested.
 * @param {string} icon      Icon path shown in the dialog and chat card.
 * @param {number} target    The value the roll is tested against.
 */
async function rollProbe(actor, label, icon, target) {
  if (target == null) return;

  const result = await foundry.applications.api.Dialog.input({
    window: {
      title: game.i18n.format("AVENTURIA_HELPERS.Probe.Title", { attribute: label }),
      icon: "fa-solid fa-dice-d20",
    },
    classes: ["aventuria-helpers", "probe-dialog"],
    content: `
      <div class="probe-dialog-body">
        <p class="probe-target">
          <img src="${icon}" alt="">
          <strong>${label}</strong>
          <span>${game.i18n.localize("AVENTURIA_HELPERS.Probe.Target")} ${target}</span>
        </p>
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
  if (!result) return;

  const modifier = Number(result.modifier) || 0;

  const roll = new Roll("1d20");
  await roll.evaluate();

  const dieResult = roll.total;
  const total = dieResult - modifier;
  const success = total <= target;

  const content = await renderTemplate("modules/aventuria-helpers/templates/chat/probe-card.hbs", {
    label,
    icon,
    target,
    dieResult,
    hasModifier: modifier !== 0,
    operator: modifier >= 0 ? "−" : "+",
    modifierAbs: Math.abs(modifier),
    total,
    success,
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
 * @param {Actor} actor
 * @param {"close"|"ranged"|"magic"|"dodge"} key
 */
export async function rollAttribute(actor, key) {
  const def = ATTRIBUTES[key];
  if (!def) return;
  await rollProbe(actor, game.i18n.localize(def.label), ICONS + def.icon, actor.system[key]);
}

/**
 * Rolls a Probe for one of the eight Talente.
 * @param {Actor} actor
 * @param {"body"|"craft"|"knowledge"|"perception"|"persuade"|"stealth"|"survival"|"willpower"} key
 */
export async function rollSkill(actor, key) {
  if (!(key in actor.system.skills)) return;
  // DataModel field labels are already localized in place via LOCALIZATION_PREFIXES,
  // same as how aventuria's own rollTest() uses them.
  const label = actor.system.schema.getField(["skills", key]).label;
  await rollProbe(actor, label, ICONS + SKILL_ICON, actor.system.skills[key]);
}

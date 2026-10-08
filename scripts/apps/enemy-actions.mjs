const ENEMY_TYPES = new Set(["aventuria.henchman", "aventuria.leader", "aventuria.wildcard", "aventuria.demon"]);
const PREFIX = "AVENTURIA_HELPERS.EnemyActions.";
export async function rollEnemyDie(card, sides, { count = 1, modifier = 0 } = {}) {
  if (card?.documentName !== "Card" || !ENEMY_TYPES.has(card.type) || !card.isOwner || ![6, 20].includes(sides)) return;
  if (sides === 6 && (!Number.isSafeInteger(count) || count < 1 || count > 100 || !Number.isSafeInteger(modifier))) {
    throw new Error(game.i18n.localize(PREFIX + "InvalidDice"));
  }
  const formula = sides === 20 ? "1d20" : `${count}d6${modifier > 0 ? "+" : ""}${modifier === 0 ? "" : modifier}`;
  const label = game.i18n.localize(PREFIX + (sides === 20 ? "RollD20" : "RollD6"));
  const escape = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const roll = new Roll(formula);
  await roll.evaluate();
  await roll.toMessage({ flavor: `${escape(card.name)} · ${escape(label)}`, whisper: [], blind: false }, { rollMode: "publicroll" });
}

/** Extend CCM's existing card image preview without replacing its open action. */
export function registerEnemyActions() {
  Hooks.on("renderImagePopout", async (app, element) => {
    if (!app.options.uuid) return;
    const card = await foundry.utils.fromUuid(app.options.uuid);
    if (card?.documentName !== "Card" || !ENEMY_TYPES.has(card.type) || !card.isOwner) return;
    const root = app.element ?? element;
    const figure = root?.querySelector("figure");
    if (!figure || root.querySelector(".aventuria-enemy-actions")) return;
    const bar = document.createElement("div");
    bar.className = "aventuria-enemy-actions";
    let countInput, modifierInput;
    for (const sides of [20, 6]) {
      const group = document.createElement("div");
      group.className = "aventuria-enemy-dice-group";
      if (sides === 6) {
        for (const [key, initial, minimum, maximum] of [["DiceCount", 1, 1, 100], ["Modifier", 0, null, null]]) {
          const field = document.createElement("label");
          const text = document.createElement("span");
          text.textContent = game.i18n.localize(PREFIX + key);
          const input = document.createElement("input");
          input.type = "number";
          input.step = "1";
          input.value = String(initial);
          if (minimum != null) input.min = String(minimum);
          if (maximum != null) input.max = String(maximum);
          input.setAttribute("aria-label", text.textContent);
          field.append(text, input);
          group.append(field);
          if (key === "DiceCount") countInput = input;
          else modifierInput = input;
        }
      }
      const button = document.createElement("button");
      button.type = "button";
      const label = game.i18n.localize(PREFIX + (sides === 20 ? "RollD20" : "RollD6"));
      button.title = label;
      button.setAttribute("aria-label", label);
      const icon = document.createElement("i");
      icon.className = `fa-solid ${sides === 20 ? "fa-dice-d20" : "fa-dice-d6"}`;
      icon.setAttribute("aria-hidden", "true");
      const caption = document.createElement("span");
      caption.textContent = label;
      button.append(icon, caption);
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const options = sides === 6 ? {
            count: countInput.value.trim() === "" ? NaN : Number(countInput.value),
            modifier: modifierInput.value.trim() === "" ? NaN : Number(modifierInput.value),
          } : {};
          await rollEnemyDie(card, sides, options);
        }
        catch (error) { console.error("aventuria-helpers | Enemy roll failed", error); ui.notifications.error(error.message); }
        finally { button.disabled = false; }
      });
      group.append(button);
      bar.append(group);
    }
    root.classList.add("aventuria-enemy-preview");
    figure.append(bar);
  });
}

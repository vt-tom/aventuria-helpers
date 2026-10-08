import { rollAttribute, rollSkill, rollEquipment } from "../probe-roll.mjs";
import { closeHeroSwitcher } from "./hero-switcher.mjs";
import { heroPortrait } from "../actors/hero-portrait.mjs";

const localize = key => game.i18n.localize(`AVENTURIA_HELPERS.HeroTray.${key}`);
const ICONS = "modules/aventuria/assets/icons/";
let overlay;

export function closeTrayMenu() {
  overlay?.remove();
  overlay = null;
  document.removeEventListener("keydown", onKey, true);
}
function onKey(event) {
  if (event.key === "Escape") { event.preventDefault(); closeTrayMenu(); }
}

/** One entry per assigned hero, regardless of shared assignments. */
export function onlineHeroes(users) {
  return [...new Map(Array.from(users)
    .filter(user => user.active && user.character?.type === "aventuria.hero")
    .map(user => [user.character.id, user.character])).values()];
}

function openMenu(title, entries, anchor, back) {
  closeTrayMenu();
  closeHeroSwitcher();
  overlay = document.createElement("div");
  overlay.className = "ahb-hero-switcher aventuria-helpers ahb-tray-menu";
  overlay.addEventListener("pointerdown", event => { if (event.target === overlay) closeTrayMenu(); });
  const menu = document.createElement("div");
  menu.className = "ahb-hero-switcher-menu";
  const radius = entries.length > 6 ? 155 : 120;
  const pad = radius + 62;
  menu.style.left = `${Math.max(pad, Math.min(window.innerWidth - pad, anchor.x))}px`;
  menu.style.top = `${Math.max(pad, Math.min(window.innerHeight - pad, anchor.y))}px`;
  const centre = document.createElement("button");
  centre.type = "button";
  centre.className = "ahb-tray-menu-centre";
  centre.textContent = title;
  centre.title = localize(back ? "Back" : "CloseMenu");
  centre.addEventListener("click", () => { closeTrayMenu(); back?.(); });
  menu.append(centre);
  entries.forEach((entry, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ahb-hero-switcher-item";
    button.title = entry.label;
    const angle = (-90 + index * 360 / entries.length) * Math.PI / 180;
    button.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)`;
    const image = document.createElement(entry.abbreviation ? "strong" : entry.icon ? "i" : "img");
    if (entry.abbreviation) {
      image.className = "ahb-tray-talent-initials";
      image.textContent = entry.abbreviation;
    } else if (entry.icon) {
      image.className = `ahb-tray-action-icon fa-solid ${entry.icon}`;
    } else {
      image.src = entry.img;
      image.alt = "";
    }
    const label = document.createElement("span");
    label.textContent = entry.label;
    button.append(image, label);
    button.addEventListener("click", async () => {
      closeTrayMenu();
      try { await entry.run(); }
      catch (error) { console.error("aventuria-helpers | Tray action failed", error); ui.notifications.error(error.message); }
    });
    menu.append(button);
  });
  overlay.append(menu);
  document.body.append(overlay);
  document.addEventListener("keydown", onKey, true);
  centre.focus();
}

async function chooseRandomHero() {
  const heroes = onlineHeroes(game.users);
  if (!heroes.length) return ui.notifications.warn(localize("NoOnlineHero"));
  const actor = heroes[Math.floor(Math.random() * heroes.length)];
  const result = game.i18n.format("AVENTURIA_HELPERS.HeroTray.RandomResult", { name: actor.name });
  const players = Array.from(game.users).filter(user => user.active && user.character?.id === actor.id);
  const content = await renderTemplate("modules/aventuria-helpers/templates/chat/random-hero.hbs", {
    title: result, name: actor.name, player: players.map(user => user.name).join(", "), portrait: heroPortrait(actor),
  });
  await ChatMessage.create({ content, whisper: [], blind: false });
}

export function openTrayProbes(actor, anchor) {
  if (!actor.isOwner) return;
  const back = () => openTrayProbes(actor, anchor);
  const run = callback => () => actor.isOwner && callback();
  const combat = [
    ["close", "Close", "close-combat.webp"], ["ranged", "Ranged", "ranged-combat.webp"],
    ["magic", "Magic", "magic.webp"], ["dodge", "Dodge", "dodge.webp"],
  ].map(([key, label, icon]) => ({
    label: `${game.i18n.localize(`AVENTURIA_HELPERS.Attributes.${label}`)} · ${actor.system[key] ?? 0}`,
    img: ICONS + icon, run: run(() => rollAttribute(actor, key)),
  }));
  const skillNames = ["body", "craft", "knowledge", "perception", "persuade", "stealth", "survival", "willpower"]
    .filter(key => key in (actor.system.skills ?? {}))
    .map(key => ({ label: game.i18n.localize(`AVENTURIA.Models.Hero.FIELDS.skills.${key}.label`), key }))
    .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
  const skills = skillNames.map(({ label, key }) => {
    const name = label.toLocaleUpperCase(game.i18n.lang);
    let length = Math.min(2, name.length);
    while (length < name.length && skillNames.some(other => other.key !== key
      && other.label.toLocaleUpperCase(game.i18n.lang).startsWith(name.slice(0, length)))) length++;
    return { label: `${label} · ${actor.system.skills[key]}`, abbreviation: name.slice(0, length),
      run: run(() => rollSkill(actor, key)) };
  });
  const equipment = ["basicEquipment", "secondEquipment"]
    .filter(key => actor.system[key]?.name)
    .map(key => ({ label: actor.system[key].name, img: ICONS + "close-combat.webp", run: run(() => rollEquipment(actor, key)) }));
  const groups = [
    { key: "CombatProbes", img: "close-combat.webp", entries: combat },
    { key: "TalentProbes", img: "talent.webp", entries: skills },
    { key: "EquipmentProbes", img: "damage-point.webp", entries: equipment },
  ].filter(group => group.entries.length);
  const entries = groups.map(group => ({
    label: localize(group.key), img: ICONS + group.img,
    run: () => openMenu(localize(group.key), group.entries, anchor, back),
  }));
  entries.push({ label: localize("RandomHero"), icon: "fa-dice", run: chooseRandomHero });
  openMenu(localize("Probes"), entries, anchor);
}

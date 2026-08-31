/**
 * Radial hero picker for the Heldenablage (feature 2.5, project/TODO.md).
 *
 * Lets one person run several heroes' Heldenablagen from a single Foundry
 * client - the use case is solo play, where switching hero previously meant
 * logging in as a different user in a second browser. Opened from the tray
 * bar's switch button and from a right-click on the tray portrait; picking a
 * medallion points the tray (and only the tray + the windows it opens) at
 * that hero via `AventuriaHelpersHeroTray#setActiveHero()`. The viewer's own
 * `user.character` assignment is never touched, and the choice is deliberately
 * not persisted (Nutzerentscheidung 2026-08-31) - every reload starts back on
 * the own hero.
 *
 * Plain DOM, no ApplicationV2: it's a transient throw-away overlay, same
 * approach as `sheets/card-hover-preview.mjs`.
 */

import { resolveStacks } from "../cards/stacks.mjs";

/** The single open overlay, if any. */
let overlay = null;

/** Closes the radial menu and detaches its global listeners. */
export function closeHeroSwitcher() {
  overlay?.remove();
  overlay = null;
  document.removeEventListener("keydown", onKey, true);
}

function onKey(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeHeroSwitcher();
  }
}

/**
 * @param {{img: string, label: string, sub: string, active?: boolean, disabled?: boolean}} opts
 * @returns {HTMLButtonElement}
 */
function buildMedallion({ img, label, sub, active, disabled }) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "ahb-hero-switcher-item";
  if (active) el.classList.add("is-active");
  if (disabled) el.disabled = true;
  el.dataset.tooltip = sub ? `${label} · ${sub}` : label;
  const span = document.createElement("span");
  span.textContent = label;
  const image = document.createElement("img");
  image.src = img;
  image.alt = "";
  el.append(image, span);
  return el;
}

/**
 * Opens the radial menu centred on `anchor` (viewport coordinates). Targets
 * are every `game.users` entry that currently resolves a full set of hero
 * stacks (i.e. has an assigned + prepared hero). The centre medallion always
 * switches back to the viewer's own hero.
 * @param {import("./hero-tray.mjs").AventuriaHelpersHeroTray} tray
 * @param {{x: number, y: number}} anchor
 */
export function openHeroSwitcher(tray, anchor) {
  closeHeroSwitcher();

  const ownId = game.user.id;
  const targets = game.users
    .map((user) => ({ user, stacks: resolveStacks(user) }))
    .filter((entry) => !!entry.stacks)
    .map((entry) => ({ user: entry.user, actor: entry.stacks.actor }));

  overlay = document.createElement("div");
  // `aventuria-helpers` so the shared `--copper-*` tokens (defined on that
  // class, not `:root`) resolve - the overlay lives on `document.body`,
  // outside any module window.
  overlay.className = "ahb-hero-switcher aventuria-helpers";
  overlay.addEventListener("pointerdown", (event) => {
    if (event.target === overlay) closeHeroSwitcher();
  });

  const menu = document.createElement("div");
  menu.className = "ahb-hero-switcher-menu";

  const others = targets.filter((entry) => entry.user.id !== ownId);
  // No ring when there's only the own hero to show - just the centre medallion.
  const radius = others.length ? 118 : 0;
  const pad = radius + 56;
  const cx = Math.max(pad, Math.min(window.innerWidth - pad, anchor.x));
  const cy = Math.max(pad, Math.min(window.innerHeight - pad, anchor.y));
  menu.style.left = `${cx}px`;
  menu.style.top = `${cy}px`;

  const own = targets.find((entry) => entry.user.id === ownId);
  const centre = buildMedallion({
    img: own?.actor.img ?? "icons/svg/mystery-man.svg",
    label: own
      ? game.i18n.localize("AVENTURIA_HELPERS.HeroTray.BackToOwn")
      : game.i18n.localize("AVENTURIA_HELPERS.HeroTray.NoOwnHero"),
    sub: own ? own.user.name : "",
    active: !tray.viewingForeignHero,
    disabled: !own && !tray.viewingForeignHero,
  });
  centre.classList.add("is-centre");
  centre.addEventListener("click", () => {
    tray.setActiveHero(null);
    closeHeroSwitcher();
  });
  menu.append(centre);

  others.forEach((entry, index) => {
    const angle = ((-90 + (360 / others.length) * index) * Math.PI) / 180;
    const el = buildMedallion({
      img: entry.actor.img,
      label: entry.actor.name,
      sub: entry.user.name,
      active: tray.activeUserId === entry.user.id,
    });
    el.style.transform =
      `translate(-50%, -50%) translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)`;
    el.addEventListener("click", () => {
      tray.setActiveHero(entry.user.id);
      closeHeroSwitcher();
    });
    menu.append(el);
  });

  overlay.append(menu);
  document.body.append(overlay);
  document.addEventListener("keydown", onKey, true);
}

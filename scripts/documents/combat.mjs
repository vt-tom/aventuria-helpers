import { resetCardRotations } from "../macros/reset-card-rotations.mjs";
import { readyAllHeroes } from "../actors/hero-exhaust.mjs";

const MODULE_ID = "aventuria-helpers";
const CCM_MODULE_ID = "complete-card-management";
const ENEMY_PHASE_FLAG = "enemyPhase";
const ROUND_END_FLAG = "roundEnd";

/** Combatants that are fixed phase markers, not part of the party's rotating turn order. */
function isPhaseMarker(combatant) {
  return !!(combatant.getFlag(MODULE_ID, ENEMY_PHASE_FLAG) || combatant.getFlag(MODULE_ID, ROUND_END_FLAG));
}

/**
 * Replaces the active Combat document class with one that implements Aventuria's fixed
 * initiative rotation instead of Foundry's default "sort by rolled initiative" behavior:
 * the party's turn order is never rolled, only set once (however the GM ordered/numbered
 * the combatants when starting the encounter), and then shifts by exactly one seat every
 * round - round 1's first combatant becomes the last for round 2, and so on.
 *
 * Must run inside an "init" hook that fires after the system's own "init" hook has already
 * assigned its Combat document class (module load order guarantees this), since the class
 * needs to extend whatever CONFIG.Combat.documentClass already is at that point.
 */
export function registerCombat() {
  const BaseCombat = CONFIG.Combat.documentClass;

  class AventuriaHelpersCombat extends BaseCombat {
    /**
     * Combatants flagged as the fixed "enemy phase" marker (see `registerEnemyPhaseCombatant()`)
     * are deliberately left out of the captured rotation, so they never take part in it.
     * @inheritdoc
     */
    async startCombat() {
      const rotationOrder = this.turns
        .filter(c => !isPhaseMarker(c))
        .map(c => c.id);
      await this.setFlag(MODULE_ID, "rotationOrder", rotationOrder);
      return super.startCombat();
    }

    /**
     * Sorts by seat position within the fixed rotation instead of by raw initiative value.
     * The rotation offset advances by one for every round, cycling back to the start.
     * Combatants outside the captured rotation (e.g. added after the encounter began, or the
     * fixed "enemy phase" marker which is deliberately excluded from it) fall back to the
     * default initiative-based sort and are placed after all rotating ones.
     *
     * Declared as a bound instance field, not a prototype method: `setupTurns()` calls this
     * via `this.combatants.contents.sort(this._sortCombatants)`, an unbound reference, so a
     * regular method here would see `this === undefined` and crash on `this.getFlag(...)`.
     * @inheritdoc
     */
    _sortCombatants = (a, b) => {
      const baseOrder = this.getFlag(MODULE_ID, "rotationOrder");
      if (!baseOrder?.length) return super._sortCombatants(a, b);

      const seats = baseOrder.length;
      const offset = (Math.max(this.round, 1) - 1) % seats;
      const seatOf = combatant => {
        const position = baseOrder.indexOf(combatant.id);
        return position === -1 ? Infinity : (position - offset + seats) % seats;
      };

      const seatA = seatOf(a);
      const seatB = seatOf(b);
      return seatA !== seatB ? seatA - seatB : super._sortCombatants(a, b);
    };

    /**
     * After a round ends, offers to reset every card on the current scene back to its upright
     * rotation via this module's own card-rotation macro (Complete Card Management), and
     * (project/TODO.md Features, 2026-08-24) ready every hero's exhausted equipment at the same
     * time - same underlying rule for both: whatever was used last round becomes available
     * again at the start of the next one. Shares one confirmation instead of asking twice per
     * round. The hero-readying half doesn't need Complete Card Management (it's a plain Actor
     * update), so it still runs even without that dependency active, unlike the card-rotation
     * reset.
     * @inheritdoc
     */
    async nextRound() {
      const result = await super.nextRound();
      if (game.user.isGM) {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          window: { title: "AVENTURIA_HELPERS.Combat.RoundEndResetConfirmTitle" },
          content: `<p>${game.i18n.localize("AVENTURIA_HELPERS.Combat.RoundEndResetConfirmBody")}</p>`,
        });
        if (confirmed) {
          if (game.modules.get(CCM_MODULE_ID)?.active) await resetCardRotations();
          await readyAllHeroes();
        }
      }
      return result;
    }

    /**
     * Aventuria never rolls initiative - so instead of leaving new combatants without a
     * value (which forces the GM to roll for each one just to get a sane sort order), every
     * combatant is auto-numbered 1..X by the order they were added, counting down so the
     * first-added combatant gets the highest number and therefore sorts first under
     * Foundry's default descending initiative sort. This only matters pre-combat: once
     * `startCombat()` captures the round-1 order, raw initiative is ignored by `_sortCombatants`.
     * The fixed phase markers ("Gegneraktionen"/"Rundenende") are excluded - they keep the
     * fixed `initiative` value they were created with, which already sorts them after every
     * numbered (1..X) combatant.
     * @inheritdoc
     */
    _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
      super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
      if (collection !== "combatants" || !game.user.isActiveGM) return;

      const rotating = this.combatants.contents.filter(c => !isPhaseMarker(c));
      const updates = rotating
        .map((c, i) => ({ _id: c.id, initiative: rotating.length - i }))
        .filter((update, i) => rotating[i].initiative !== update.initiative);
      if (updates.length) this.updateEmbeddedDocuments("Combatant", updates);
    }

    /**
     * Bugfix 2026-09-10 (Nutzerfeedback): must re-sort `this.turns` into the new round's
     * rotated order *before* calling into the base class, not after. Round changes don't
     * trigger a re-sort of `turns` in core Foundry, since the default sort only depends on
     * `initiative`, which doesn't change between rounds - ours does. But core's own
     * `_onUpdate()` (`client/documents/combat.mjs`) already reads `this.turns` in that same
     * call, via `_getCurrentState()` and `_updateTurnMarkers()`, to work out who the new
     * "current" combatant is and move the canvas token turn marker onto them. Calling our
     * `setupTurns()` only afterwards (the previous order here) left both of those reading the
     * *previous* round's seating for one round-change cycle: the marker landed on whoever sat
     * first under the old rotation instead of the new one - invisible whenever that seat's
     * occupant lacks a token (or isn't part of the rotation at all, e.g. a phase marker), and
     * only catching up once a manual turn-to-turn step forced a fresh, by-then-correctly-sorted
     * read. @inheritdoc
     */
    _onUpdate(changed, options, userId) {
      if ("round" in changed) this.setupTurns();
      super._onUpdate(changed, options, userId);
      if ("round" in changed && this.isView) ui.combat.render();
    }
  }

  CONFIG.Combat.documentClass = AventuriaHelpersCombat;
}

/**
 * Adds a "Gegneraktionen hinzufügen" entry to the Combat Tracker's encounter context menu
 * (the same right-click menu UTS's own "Add Player" entry lives in), creating a fixed,
 * token-less Combatant that represents the GM's enemy-action phase. It's given `initiative: 0`
 * and a marker flag so `AventuriaHelpersCombat` (see `registerCombat()`) always keeps it last
 * in the turn order and never includes it in the party's rotation.
 *
 * Uses the "getCombatContextOptions" hook Foundry's CombatTracker already dispatches around
 * its encounter context menu, rather than subclassing the tracker itself.
 */
export function registerEnemyPhaseCombatant() {
  Hooks.on("getCombatContextOptions", (app, options) => {
    options.push({
      name: "AVENTURIA_HELPERS.Combat.AddEnemyPhase",
      icon: '<i class="fa-solid fa-dragon"></i>',
      condition: () => game.user.isGM && !!app.viewed,
      callback: () => app.viewed.createEmbeddedDocuments("Combatant", [{
        name: game.i18n.localize("AVENTURIA_HELPERS.Combat.EnemyPhaseName"),
        img: "modules/aventuria/assets/icons/action-opponent.webp",
        initiative: 0,
        flags: { [MODULE_ID]: { [ENEMY_PHASE_FLAG]: true } },
      }]),
    });
  });
}

/**
 * Adds a "Rundenende hinzufügen" entry to the same encounter context menu as
 * `registerEnemyPhaseCombatant()`, creating a second fixed, token-less Combatant that
 * represents end-of-round effects (e.g. duration-based conditions expiring). Given
 * `initiative: -1` - one below the "Gegneraktionen" marker's `0` - so it always sorts last,
 * after both the party's rotation and the enemy-action phase.
 */
export function registerRoundEndCombatant() {
  Hooks.on("getCombatContextOptions", (app, options) => {
    options.push({
      name: "AVENTURIA_HELPERS.Combat.AddRoundEnd",
      icon: '<i class="fa-solid fa-flag-checkered"></i>',
      condition: () => game.user.isGM && !!app.viewed,
      callback: () => app.viewed.createEmbeddedDocuments("Combatant", [{
        name: game.i18n.localize("AVENTURIA_HELPERS.Combat.RoundEndName"),
        img: "modules/aventuria/assets/icons/timer.webp",
        initiative: -1,
        flags: { [MODULE_ID]: { [ROUND_END_FLAG]: true } },
      }]),
    });
  });
}

/**
 * Hides the per-combatant initiative badge (`.token-initiative`, `templates/sidebar/tabs/combat/
 * tracker.hbs`) for every combatant that's part of the party's fixed seat rotation, once the
 * encounter has actually started. Nutzerfrage 2026-09-10 (CLAUDE.md "Combat Tracker"): the number
 * shown there is nothing but the 1..X seat-assignment auto-numbering from when combatants were
 * added (`_onCreateDescendantDocuments` above) - correct and useful *before* `startCombat()`
 * (it's the actual sort key the GM can still see/adjust to reorder seats), but frozen and
 * meaningless afterwards, since `_sortCombatants` then sorts by captured seat position instead
 * and never touches the raw value again - reads as a bug ("warum ändert sich die Zahl nicht,
 * obwohl sich die Reihenfolge dreht?") rather than the harmless leftover it actually is. Left
 * showing for the fixed phase markers ("Gegneraktionen"/"Rundenende") - their `0`/`-1` initiative
 * is a real, unchanging value, not a rotation artifact.
 */
export function registerHideRotationInitiative() {
  Hooks.on("renderCombatTracker", (app, html) => {
    const combat = app.viewed;
    if (!combat?.started) return;
    for (const combatant of combat.combatants) {
      if (isPhaseMarker(combatant)) continue;
      html.querySelector(`.combatant[data-combatant-id="${combatant.id}"] .token-initiative`)?.remove();
    }
  });
}

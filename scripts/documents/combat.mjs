import { resetCardRotations } from "../macros/reset-card-rotations.mjs";

const MODULE_ID = "aventuria-helpers";
const CCM_MODULE_ID = "complete-card-management";
const ENEMY_PHASE_FLAG = "enemyPhase";

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
        .filter(c => !c.getFlag(MODULE_ID, ENEMY_PHASE_FLAG))
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
     * After a round ends, offers to reset every card on the current scene back to its
     * upright rotation via this module's own card-rotation macro (Complete Card Management).
     * @inheritdoc
     */
    async nextRound() {
      const result = await super.nextRound();
      if (game.user.isGM && game.modules.get(CCM_MODULE_ID)?.active) {
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          window: { title: "AVENTURIA_HELPERS.Macros.ResetCardRotations.ConfirmTitle" },
          content: `<p>${game.i18n.localize("AVENTURIA_HELPERS.Macros.ResetCardRotations.ConfirmBody")}</p>`,
        });
        if (confirmed) await resetCardRotations();
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
     * The "enemy phase" marker is excluded - it keeps the fixed `initiative: 0` it was created
     * with, which already sorts it after every numbered (1..X) combatant.
     * @inheritdoc
     */
    _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
      super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
      if (collection !== "combatants" || !game.user.isActiveGM) return;

      const rotating = this.combatants.contents.filter(c => !c.getFlag(MODULE_ID, ENEMY_PHASE_FLAG));
      const updates = rotating
        .map((c, i) => ({ _id: c.id, initiative: rotating.length - i }))
        .filter((update, i) => rotating[i].initiative !== update.initiative);
      if (updates.length) this.updateEmbeddedDocuments("Combatant", updates);
    }

    /** @inheritdoc */
    _onUpdate(changed, options, userId) {
      super._onUpdate(changed, options, userId);

      // Round changes don't trigger a re-sort of `turns` in core Foundry, since the default
      // sort only depends on `initiative`, which doesn't change between rounds. Ours does.
      if ("round" in changed) {
        this.setupTurns();
        if (this.isView) ui.combat.render();
      }
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

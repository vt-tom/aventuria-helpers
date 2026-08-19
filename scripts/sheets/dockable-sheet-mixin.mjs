/**
 * Adds "dock to the Heldenablage tray, but stay optionally drag/drop-able
 * with a reset" behavior to an ApplicationV2 subclass - shared by
 * `AventuriaHelpersHandSheet` and `AventuriaHelpersPlayedCardsSheet`, each
 * docked at a different offset from the tray (see the `getOffset` param).
 * Originally built once for the Hand sheet only, extracted here once the
 * Played-Cards sheet needed the exact same logic (PROJECT.md 2.2).
 *
 * See CHANGELOG.md 0.1.5 ("Hand-Sheet: Andocken bleibt optional statt
 * zwingend") for the full reasoning behind the `docked`/`#repositioning`/
 * `_onPosition()` design - short version: `window.positioned: true` keeps
 * Foundry's native header-drag working; `_onPosition()` is core's own
 * post-`setPosition()` hook (`application.mjs`), used here to tell a real
 * user drag apart from this mixin's own repositioning call, since both
 * funnel through the same `setPosition()` method.
 * @param {typeof foundry.applications.api.ApplicationV2} Base
 * @param {(trayRect: DOMRect) => {left: number, top: number}} getOffset
 *   Computes the target `left`/`top` from the tray's live bounding rect.
 */
export function DockableSheetMixin(Base, getOffset) {
  return class extends Base {
    /** @inheritdoc */
    static DEFAULT_OPTIONS = {
      window: {
        positioned: true,
        // Shows a corner drag handle - Nutzerwunsch 2026-08-19: fixed default
        // size (below), but still enlargeable by hand. `_refit()` (core's
        // auto-fit-to-content pass, only relevant for `"auto"` width/height)
        // no-ops entirely once `resizable` is true ("resizable applications
        // manage their own dimensions") - moot here since neither dimension
        // is `"auto"` below (see the `position` comment for why height isn't
        // either, despite that being the more natural fit for this content).
        resizable: true,
        // Shows up in the header's "..." controls menu - `window.controls`
        // arrays concatenate across the DEFAULT_OPTIONS inheritance chain
        // (confirmed in application.mjs's `#mergeApplicationOptions()`), so
        // this coexists with whatever controls the concrete subclass or its
        // own CCM base class add.
        controls: [{
          icon: "fa-solid fa-fw fa-rotate-left",
          label: "AVENTURIA_HELPERS.HeroTray.ResetDock",
          action: "resetDock",
        }],
      },
      // Fixed 600×190px default (Nutzerwunsch 2026-08-19) - a CSS
      // `min-width`/`min-height` on the concrete subclass's own root class
      // stops the resize handle from dragging it any smaller, while
      // `resizable` above lets it go bigger. Both sheets share an identical
      // single-row layout (header + one row of cards + a button row), so a
      // fixed height fits both equally well - deliberately NOT `"auto"`
      // (which this used at first): with a resizable window, Foundry's own
      // shrink-to-fit height measurement (`_updatePosition()`,
      // application.mjs) turned out to noticeably over-measure in practice
      // (visible as a chunk of empty space below the button row, especially
      // on the Played-Cards sheet - Nutzerfeedback 2026-08-19), for reasons
      // not fully pinned down; a fixed height sidesteps that fragile
      // remeasurement entirely instead of chasing the exact cause.
      position: { width: 600, height: 190 },
      actions: {
        resetDock: this.#onResetDock,
      },
    };

    /**
     * Whether this instance should auto-follow the tray's position (see
     * `updateDockPosition()`) - flipped to `false` by `_onPosition()` the
     * moment the user drags the window away, and back to `true` by
     * "Position zurücksetzen" (`#onResetDock()`).
     */
    docked = true;

    /**
     * Guards `_onPosition()` so `updateDockPosition()`'s own `setPosition()`
     * call isn't mistaken for a user-initiated drag.
     */
    #repositioning = false;

    /**
     * Re-docks relative to `#aventuria-helpers-hero-tray`'s live
     * `getBoundingClientRect()` - safe to call as often as needed (on every
     * render, on window resize, when the tray toggles back into view) since
     * the tray's own rect never depends on this sheet's size or position.
     * No-ops if `docked` is false (user has manually moved it), or if the
     * tray isn't in the DOM or is currently hidden (`display: none` while
     * the native player list is shown instead) - `getClientRects().length`
     * is the visibility check, since `getBoundingClientRect()` would just
     * return a zero-size rect at (0, 0) then, not a useful position.
     */
    updateDockPosition() {
      if (!this.docked) return;
      const tray = document.getElementById("aventuria-helpers-hero-tray");
      if (!tray || !this.element || !tray.getClientRects().length) return;

      const { left, top } = getOffset(tray.getBoundingClientRect());
      this.#repositioning = true;
      this.setPosition({ left, top });
      this.#repositioning = false;
      // Lets a dependent sheet (e.g. Played-Cards-Sheet docking below the
      // Hand sheet's own live position, played-cards-sheet.mjs) re-run its
      // own updateDockPosition() right away instead of only on its own next
      // render - otherwise resetting *this* sheet alone (e.g. via "Position
      // zurücksetzen") left a dependent sheet still docked to this sheet's
      // stale pre-reset position until something happened to re-render it.
      // Document-level, not a direct object reference, to keep this generic
      // and match the existing DOM-lookup-based decoupling (getOffset above
      // already finds its anchor/dependency via document.getElementById/
      // querySelector rather than an imported instance).
      document.dispatchEvent(new CustomEvent("ahb:dockable-repositioned", { detail: { sheet: this } }));
    }

    /**
     * Detects a user-driven reposition (header drag, or the corner resize
     * handle - both funnel through `setPosition()` in core) to stop
     * auto-docking until explicitly reset. Ignores calls made from within
     * `updateDockPosition()` itself, flagged via `#repositioning`. A resize
     * un-docks the sheet too, same as a drag; it stays exactly where/how big
     * it was left until "Position zurücksetzen" (which only restores
     * `left`/`top`, not the size the user dragged it to).
     * @inheritdoc
     */
    _onPosition(position) {
      super._onPosition(position);
      if (!this.#repositioning) this.docked = false;
    }

    /**
     * "Position zurücksetzen" header-controls entry: re-enables auto-docking
     * and immediately snaps back to the Heldenablage.
     * @this InstanceType<ReturnType<typeof DockableSheetMixin>>
     */
    static async #onResetDock() {
      this.docked = true;
      this.updateDockPosition();
    }

    /**
     * Skips core's default close animation (Nutzerfeedback 2026-08-19: the
     * "X" button felt sluggish - cards vanish instantly when core adds the
     * `.minimizing` class to the window, since `.window-content { display:
     * none }` in that state, but the outer frame then keeps visibly
     * shrinking for another ~250ms, `max-height 0.25s ease-out`, before
     * `#close()` actually tears it down - `application.mjs`). That
     * mismatch (content gone, frame lingering) is standard core behavior for
     * every Foundry window, not something introduced by this mixin - a
     * source-level check ruled out the two most likely module-side causes:
     * `min-width`/`min-height` on `.hand-sheet`/`.played-cards-sheet` don't
     * fight the shrink, core's own `.application.minimizing/.minimized {
     * min-width: unset; min-height: unset; }` already wins on specificity
     * ((0,2,0) vs. our (0,1,0)) regardless of load order. Passing
     * `animate: false` here sidesteps the whole animation outright instead
     * of chasing why it reads as sluggish specifically here - `...options`
     * after the default still lets an explicit caller override it.
     * @inheritdoc
     */
    async close(options = {}) {
      return super.close({ animate: false, ...options });
    }
  };
}

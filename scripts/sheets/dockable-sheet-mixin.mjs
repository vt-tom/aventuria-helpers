const MODULE_ID = "aventuria-helpers";

/**
 * Adds "dock to the Heldenablage tray, but stay optionally drag/drop-able
 * with a reset" behavior to an ApplicationV2 subclass - shared by
 * `AventuriaHelpersHandSheet` and `AventuriaHelpersPlayedCardsSheet`, each
 * docked at a different offset from the tray (see the `getOffset` param).
 * Originally built once for the Hand sheet only, extracted here once the
 * Played-Cards sheet needed the exact same logic (project/PROJECT.md 2.2).
 *
 * See project/CHANGELOG.md 0.1.5 ("Hand-Sheet: Andocken bleibt optional statt
 * zwingend") for the full reasoning behind the `docked`/`#repositioning`/
 * `_onPosition()` design - short version: `window.positioned: true` keeps
 * Foundry's native header-drag working; `_onPosition()` is core's own
 * post-`setPosition()` hook (`application.mjs`), used here to tell a real
 * user drag apart from this mixin's own repositioning call, since both
 * funnel through the same `setPosition()` method.
 * @param {typeof foundry.applications.api.ApplicationV2} Base
 * @param {(trayRect: DOMRect) => {left: number, top: number}} getOffset
 *   Computes the target `left`/`top` from the tray's live bounding rect.
 * @param {string} settingKey
 *   Client-setting key (registered in `aventuria-helpers.mjs`) a manually-moved position is
 *   persisted under, so it survives fully closing and reopening the sheet - both view-toggle
 *   buttons in `hero-tray.mjs` throw the old instance away on close (`rendered` becomes
 *   `false`) and construct a fresh one on the next click, which previously reset `docked` back
 *   to its `true` default every time, silently undoing a manual drag the moment the window was
 *   closed (TODO.md Bugs, 2026-08-24: "Position wird nicht gemerkt, öffnet wieder an der
 *   Ursprungsposition"). Required, not optional - both current subclasses always pass one.
 */
export function DockableSheetMixin(Base, getOffset, settingKey) {
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
     * moment the user drags/resizes the window away, and back to `true` by
     * "Position zurücksetzen" (`#onResetDock()`).
     */
    docked = true;

    /**
     * Guards `_onPosition()` so `updateDockPosition()`'s own `setPosition()`
     * call isn't mistaken for a user-initiated drag.
     */
    #repositioning = false;

    /**
     * The `{left, top, width, height}` `updateDockPosition()` last applied - `_onPosition()`
     * below compares against this (not just `#repositioning`) to tell an actual user
     * drag/resize apart from Foundry core's own render() pipeline, which unconditionally
     * re-applies `options.position` once more right after this sheet's *first* render
     * ("Update application position" in application.mjs) - outside `updateDockPosition()`'s
     * own call, so `#repositioning` alone can't guard it. Since that reapplied object is the
     * very same one `updateDockPosition()` just wrote left/top into, it carries identical
     * values - `#repositioning` being `false` at that point used to make `_onPosition()`
     * flip `docked` to `false` right after the very first render regardless, silently
     * breaking every *later* auto-redock (Live-Test-Fund 2026-08-24: the Ausgespielte-
     * Karten-Sheet, opened before the Hand sheet, never noticed the Hand sheet opening
     * afterwards and stayed at its Hand-less fallback spot, exactly on top of it).
     * @type {{left: number, top: number, width: number|string, height: number|string}|null}
     */
    #lastDockedPosition = null;

    /**
     * Restores a manually-moved position saved under `settingKey` (see the mixin's own doc
     * comment) before `_onRender()`'s `updateDockPosition()` gets a chance to auto-dock this
     * fresh instance - runs before `_onRender()` in Foundry's own render lifecycle
     * (`application.mjs`: `_onFirstRender` is awaited, then `_onRender`), so setting `docked`
     * to `false` here reliably gates the following auto-dock.
     * @inheritdoc
     */
    async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);
      const saved = game.settings.get(MODULE_ID, settingKey);
      if (saved?.left != null) {
        this.docked = false;
        this.setPosition(saved);
      }
    }

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
      const applied = this.setPosition({ left, top });
      this.#repositioning = false;
      this.#lastDockedPosition = {
        left: applied.left, top: applied.top, width: applied.width, height: applied.height,
      };
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
     * `updateDockPosition()` itself, flagged via `#repositioning` - but that
     * flag alone isn't enough (see `#lastDockedPosition`'s doc comment):
     * Foundry core also re-applies the exact same position object once more,
     * unprompted, right after this sheet's first render, outside
     * `updateDockPosition()`'s own call. Only treat this as a real user move
     * if it actually changed something `updateDockPosition()` didn't just
     * set itself. A resize still un-docks the sheet, same as a drag; it
     * stays exactly where/how big it was left until "Position zurücksetzen"
     * (which only restores `left`/`top`, not the size the user dragged it to).
     * @inheritdoc
     */
    _onPosition(position) {
      super._onPosition(position);
      if (this.#repositioning) return;
      const last = this.#lastDockedPosition;
      if (
        last
        && position.left === last.left && position.top === last.top
        && position.width === last.width && position.height === last.height
      ) {
        return;
      }
      this.docked = false;
      // Persisted so the manual position survives fully closing and reopening the sheet, not
      // just later renders of this same instance - see the mixin's own doc comment.
      game.settings.set(MODULE_ID, settingKey, {
        left: position.left, top: position.top, width: position.width, height: position.height,
      });
    }

    /**
     * "Position zurücksetzen" header-controls entry: re-enables auto-docking, snaps back to
     * the Heldenablage, and clears the persisted manual position (see `_onFirstRender()`) so a
     * later fresh instance starts docked again too, instead of reapplying the just-abandoned spot.
     * @this InstanceType<ReturnType<typeof DockableSheetMixin>>
     */
    static async #onResetDock() {
      this.docked = true;
      await game.settings.set(MODULE_ID, settingKey, {});
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

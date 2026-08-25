/**
 * Shared floating card-hover preview for the docked card sheets (Hand-Sheet,
 * Played-Cards-Sheet) - a large copy of the hovered card's image, positioned
 * beside the sheet window rather than scaled up in place (scaling in place
 * got clipped by the window's own bounds). One preview element is created
 * lazily and reused across every card hover and every sheet instance,
 * regardless of which sheet triggered it.
 *
 * Extracted from hand-sheet.mjs when Played-Cards-Sheet needed the exact
 * same behavior (project/PROJECT.md 2.2 follow-up, Nutzerwunsch 2026-08-19) - same
 * "genuine, immediate duplication" reasoning as `DockableSheetMixin`.
 *
 * Always lives in *this script's own* `document` (the main Foundry window) - this module never
 * re-runs inside a popup opened via Foundry's "Detach Window" (only stylesheets get cloned
 * there, see `DetachedWindowManager#applyHarness()`; a sheet's already-rendered DOM is just
 * moved into it via `adoptNode()`), so the bare `document`/`window` globals below always
 * correctly refer to the main window regardless of which window a hovered `.card` currently
 * lives in. An earlier attempt (2026-08-24) created the preview in the hovered card's own
 * `ownerDocument` instead, reasoning it needed to appear *in* the detached popup - reverted the
 * same day (TODO.md Bugs, Nutzer-Feedback nach Test): Foundry sizes a detached popup to exactly
 * fit the sheet it hosts (`#detach()`, `application.mjs`: "Set the detached window size to the
 * fully rendered size of the app"), leaving no spare viewport room for a floating overlay next
 * to it - the relative left/right-of-sheet positioning math below is meaningless there anyway,
 * `getBoundingClientRect()` on a popup-hosted element is relative to that popup's own viewport,
 * not this one. `showCardPreview()` now detects that case and centers the preview on the main
 * window's game surface instead (Nutzervorschlag).
 */

let previewEl = null;

/** @returns {HTMLElement} */
function getPreviewEl() {
  if (!previewEl) {
    previewEl = document.createElement("div");
    previewEl.className = "aventuria-helpers hand-card-preview";
    previewEl.innerHTML = "<img alt=\"\">";
    document.body.append(previewEl);
  }
  return previewEl;
}

/**
 * Shows the floating preview for a hovered card, positioned just outside the
 * sheet's own right edge (or its left edge, if there isn't enough room on the
 * right - e.g. narrow viewport or an open sidebar), vertically centred on the
 * hovered card. Computed from actual bounding boxes rather than hardcoded
 * offsets so it keeps working regardless of the sheet's own responsive
 * width/position math.
 * @param {HTMLElement} cardEl     The hovered `.card` list item.
 * @param {HTMLElement} sheetEl    The sheet's root element.
 */
export function showCardPreview(cardEl, sheetEl) {
  // Scoped to .card-art specifically (not just "the first img") - some card
  // rows also have action buttons with their own icons/images.
  const img = cardEl.querySelector("img.card-art");
  if (!img?.src) return;

  const el = getPreviewEl();
  el.querySelector("img").src = img.src;
  el.classList.add("visible");

  // The hovered card lives in a detached popup, not this (main) window - see this module's own
  // doc comment for why relative positioning against it doesn't make sense here. Center on the
  // game surface instead; `.centered`'s own CSS handles both axes. Clears any inline left/top
  // left over from a previous, non-centered hover - inline styles would otherwise outrank the
  // CSS class's own 50%/50% values.
  if (cardEl.ownerDocument !== document) {
    el.style.left = "";
    el.style.top = "";
    el.classList.add("centered");
    return;
  }
  el.classList.remove("centered");

  const sheetRect = sheetEl.getBoundingClientRect();
  const cardRect = cardEl.getBoundingClientRect();
  const previewWidth = el.offsetWidth || 320;
  // The preview is vertically centred on its `top` via CSS's `translateY(-50%)`
  // - a fallback matters here (not just for width above) because a sheet
  // docked low on screen (e.g. Played-Cards-Sheet, stacked below the Hand
  // sheet) can hover its very first card before any preview image has ever
  // loaded, when `offsetHeight` is still 0.
  const previewHeight = el.offsetHeight || 420;
  const margin = 8;
  const gap = 20;

  let left = sheetRect.right + gap;
  if (left + previewWidth > window.innerWidth) {
    left = sheetRect.left - previewWidth - gap;
  }
  el.style.left = `${Math.max(margin, left)}px`;

  // Clamp the centre point so the (vertically-centred) preview never runs off
  // the top or bottom of the screen - a low card row would otherwise centre
  // the preview partway off the bottom edge.
  const center = cardRect.top + cardRect.height / 2;
  const minCenter = margin + previewHeight / 2;
  const maxCenter = window.innerHeight - margin - previewHeight / 2;
  el.style.top = `${Math.min(Math.max(center, minCenter), maxCenter)}px`;
}

/** Hides the floating preview, if currently shown. */
export function hideCardPreview() {
  previewEl?.classList.remove("visible", "centered");
}

/**
 * Shared floating card-hover preview for the docked card sheets (Hand-Sheet,
 * Played-Cards-Sheet) - a large copy of the hovered card's image, positioned
 * beside the sheet window rather than scaled up in place (scaling in place
 * got clipped by the window's own bounds). One preview element is created
 * lazily and reused across every card hover and every sheet instance,
 * regardless of which sheet triggered it.
 *
 * Extracted from hand-sheet.mjs when Played-Cards-Sheet needed the exact
 * same behavior (PROJECT.md 2.2 follow-up, Nutzerwunsch 2026-08-19) - same
 * "genuine, immediate duplication" reasoning as `DockableSheetMixin`.
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
  previewEl?.classList.remove("visible");
}

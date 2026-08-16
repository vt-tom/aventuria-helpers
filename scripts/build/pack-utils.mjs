import { randomBytes } from "node:crypto";

/**
 * Shared helpers for the `packs/_source/*`-generating build scripts (`build-guide-pack.mjs`,
 * `build-changelog-pack.mjs`) - both bake Markdown into JournalEntry/JournalEntryPage source
 * JSON the same way, just from a different source file and with a different page-per-entry
 * shape.
 */

// Mirrors Foundry core's `SHOWDOWN_OPTIONS` (see `common/constants.mjs`) so the HTML we
// pre-bake here matches byte-for-byte what Foundry's own Markdown journal page editor would
// produce from the same source - same reason the `showdown` devDependency is pinned to the
// exact version Foundry itself bundles.
export const SHOWDOWN_OPTIONS = {
  disableForced4SpacesIndentedSublists: true,
  noHeaderId: true,
  parseImgDimensions: true,
  strikethrough: true,
  tables: true,
  tablesHeaderId: true,
};

/** 16-char alphanumeric ID in the same shape as `foundry.utils.randomID()`. */
export function randomId(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i++) id += chars[bytes[i] % chars.length];
  return id;
}

/** Turns a document name into the same `Name_With_Underscores_id.json` filenames `fvtt unpack` produces. */
export function sourceFilename(name, id) {
  return `${name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}_${id}.json`;
}

/** `_stats` block shared by every top-level/embedded document in a hand-built pack source file. */
export function buildStats() {
  return {
    compendiumSource: null,
    coreVersion: "14.364",
    createdTime: Date.now(),
    duplicateSource: null,
    exportSource: null,
    lastModifiedBy: null,
    modifiedTime: null,
    systemId: "universal-tabletop-system",
    systemVersion: "1.2.1",
  };
}

/**
 * Splits a Markdown document into one chunk per page: the lead-in before the first `##`
 * heading becomes an overview page (named after the `#` title), and every `##` heading after
 * that becomes its own page (named after the heading text, heading line stripped from the
 * body since the page's own title takes over that role). `###` sub-headings stay put as
 * regular content within their page.
 */
export function splitIntoPages(markdown) {
  const h1 = markdown.match(/^#\s+(.+)$/m);
  const overviewName = h1 ? h1[1].trim() : "Overview";
  const rest = h1 ? markdown.slice(h1.index + h1[0].length) : markdown;

  const chapterHeadings = [...rest.matchAll(/^##\s+(.+)$/gm)];
  const pages = [{ name: overviewName, markdown: rest.slice(0, chapterHeadings[0]?.index ?? rest.length).trim() }];

  for (let i = 0; i < chapterHeadings.length; i++) {
    const start = chapterHeadings[i].index + chapterHeadings[i][0].length;
    const end = chapterHeadings[i + 1]?.index ?? rest.length;
    pages.push({ name: chapterHeadings[i][1].trim(), markdown: rest.slice(start, end).trim() });
  }
  return pages;
}

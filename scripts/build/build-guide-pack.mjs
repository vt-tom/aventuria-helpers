import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import showdown from "showdown";

/**
 * Builds `packs/_source/guide/*.json` (one JournalEntry per language) from
 * `manual-de.md`/`manual-en.md` at the module root - the compendium counterpart to
 * `npm run pack:macros`, just for a JournalEntry pack instead of a Macro pack. Run via
 * `npm run build:guide`, then `npm run pack:guide` to turn the source into the actual
 * LevelDB pack (or `npm run guide` for both in one go).
 *
 * The manuals stay the source of truth: this script re-derives the JournalEntryPage
 * content from them every time rather than hand-editing the compendium, so the two
 * never drift apart silently.
 */

const MODULE_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../..");
const SOURCE_DIR = path.join(MODULE_ROOT, "packs/_source/guide");
const MODULE_ID = "aventuria-helpers";

// Mirrors Foundry core's `SHOWDOWN_OPTIONS` (see `common/constants.mjs`) so the HTML we
// pre-bake here matches byte-for-byte what Foundry's own Markdown journal page editor
// would produce from the same source - same reason the `showdown` devDependency is
// pinned to the exact version Foundry itself bundles.
const SHOWDOWN_OPTIONS = {
  disableForced4SpacesIndentedSublists: true,
  noHeaderId: true,
  parseImgDimensions: true,
  strikethrough: true,
  tables: true,
  tablesHeaderId: true,
};

const MANUALS = [
  { lang: "de", file: "manual-de.md", entryName: "Aventuria Helpers Guide (deutsch)", pageName: "Aventuria Helpers Guide" },
  { lang: "en", file: "manual-en.md", entryName: "Aventuria Helpers Guide (englisch)", pageName: "Aventuria Helpers Guide" },
];

/** 16-char alphanumeric ID in the same shape as `foundry.utils.randomID()`. */
function randomId(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i++) id += chars[bytes[i] % chars.length];
  return id;
}

/** Turns a document name into the same `Name_With_Underscores_id.json` filenames `fvtt unpack` produces. */
function sourceFilename(name, id) {
  return `${name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}_${id}.json`;
}

function buildEntry({ file, entryName, pageName }) {
  const markdown = readFileSync(path.join(MODULE_ROOT, file), "utf8");
  const converter = new showdown.Converter(SHOWDOWN_OPTIONS);
  const html = converter
    .makeHtml(markdown)
    // Screenshot links in the manuals are repo-relative (so GitHub renders them too);
    // Foundry needs them as module-absolute paths to resolve at runtime.
    .replaceAll('src="assets/screenshots/', `src="modules/${MODULE_ID}/assets/screenshots/`);

  const now = Date.now();
  const stats = {
    compendiumSource: null,
    coreVersion: "14.364",
    createdTime: now,
    duplicateSource: null,
    exportSource: null,
    lastModifiedBy: null,
    modifiedTime: null,
    systemId: "universal-tabletop-system",
    systemVersion: "1.2.1",
  };

  const pageId = randomId();
  const entryId = randomId();

  const page = {
    _id: pageId,
    name: pageName,
    type: "text",
    system: {},
    title: { show: false, level: 1 },
    image: {},
    text: { content: html, markdown, format: 2 },
    video: { controls: true, volume: 0.5 },
    src: null,
    category: null,
    sort: 0,
    ownership: { default: -1 },
    flags: {},
    _stats: stats,
    // LevelDB packs store each embedded document under its own compound key
    // (`!<parentCollection>.<embeddedCollection>!<parentId>.<embeddedId>`) rather than
    // inlining it - the `fvtt package pack` compiler reads this off every document in the
    // hierarchy, top-level or embedded, and strips it back out before storing the value.
    _key: `!journal.pages!${entryId}.${pageId}`,
  };

  return {
    _id: entryId,
    name: entryName,
    pages: [page],
    folder: null,
    categories: [],
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: stats,
    _key: `!journal!${entryId}`,
  };
}

mkdirSync(SOURCE_DIR, { recursive: true });
for (const stale of readdirSync(SOURCE_DIR)) unlinkSync(path.join(SOURCE_DIR, stale));

for (const manual of MANUALS) {
  const entry = buildEntry(manual);
  const filePath = path.join(SOURCE_DIR, sourceFilename(entry.name, entry._id));
  writeFileSync(filePath, `${JSON.stringify(entry, null, 2)}\n`);
  console.log(`Wrote ${path.relative(MODULE_ROOT, filePath)}`);
}

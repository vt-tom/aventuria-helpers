import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import showdown from "showdown";
import { SHOWDOWN_OPTIONS, randomId, sourceFilename, buildStats, splitIntoPages } from "./pack-utils.mjs";

/**
 * Builds `packs/_source/changelog/*.json` (a single JournalEntry, one page per version) from
 * `CHANGES.md` at the module root - same build shape as `build-guide-pack.mjs`, reused because
 * `CHANGES.md` is already structured the same way (`#` intro, one `##` heading per version).
 * Run via `npm run build:changelog`, then `npm run pack:changelog` (or `npm run changelog` for
 * both). German only, same as `CHANGES.md` itself - no `en` counterpart exists yet.
 *
 * `CHANGES.md` stays the source of truth: this script re-derives the JournalEntryPages from it
 * every time rather than hand-editing the compendium, so the two never drift apart silently.
 */

const MODULE_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../..");
const SOURCE_DIR = path.join(MODULE_ROOT, "packs/_source/changelog");
const ENTRY_NAME = "Aventuria Helfer – Änderungen";

function buildEntry() {
  const source = readFileSync(path.join(MODULE_ROOT, "CHANGES.md"), "utf8");
  const converter = new showdown.Converter(SHOWDOWN_OPTIONS);
  const toHtml = (md) => converter.makeHtml(md);

  const stats = buildStats();
  const entryId = randomId();
  const pages = splitIntoPages(source).map(({ name, markdown }, index) => {
    const pageId = randomId();
    return {
      _id: pageId,
      name,
      type: "text",
      system: {},
      title: { show: true, level: 1 },
      image: {},
      text: { content: toHtml(markdown), markdown, format: 2 },
      video: { controls: true, volume: 0.5 },
      src: null,
      category: null,
      sort: index * 100000,
      ownership: { default: -1 },
      flags: {},
      _stats: stats,
      _key: `!journal.pages!${entryId}.${pageId}`,
    };
  });

  return {
    _id: entryId,
    name: ENTRY_NAME,
    pages,
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

const entry = buildEntry();
const filePath = path.join(SOURCE_DIR, sourceFilename(entry.name, entry._id));
writeFileSync(filePath, `${JSON.stringify(entry, null, 2)}\n`);
console.log(`Wrote ${path.relative(MODULE_ROOT, filePath)}`);

import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";

/**
 * Pre-release gate: `packs/_source/**` (tracked in git) is the source of truth for the
 * compiled `packs/<name>` LevelDB directories (gitignored - see CLAUDE.md's "Release-Ablauf");
 * `npm run packs` rebuilds them from source right before a release zip is built. This script
 * catches the failure mode that setup enables: editing a macro or journal page live in Foundry
 * changes the compiled pack on disk but not `packs/_source/**`, and without a sync check that
 * edit would ship correctly today but then silently vanish on the *next* release once the
 * compiled pack is rebuilt from the now-stale source. Run via `npm run check:packs` before
 * tagging a release; on drift it reports which pack/document and which `unpack:<name>` script
 * to run to resolve it.
 */

const MODULE_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../..");
const MODULE_ID = "aventuria-helpers";

const PACKS = [
  { name: "macros", compendiumType: "Macro" },
  { name: "guide", compendiumType: "JournalEntry" },
  { name: "changelog", compendiumType: "JournalEntry" },
];

function readDocsById(dir) {
  const docs = new Map();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const doc = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    docs.set(doc._id, { file, doc });
  }
  return docs;
}

let ok = true;
const staging = mkdtempSync(path.join(tmpdir(), "aventuria-helpers-pack-check-"));

try {
  for (const { name, compendiumType } of PACKS) {
    const outDir = path.join(staging, name);
    // All arguments below are fixed constants (never user input), so the shell-escaping
    // risk `shell: true` normally carries does not apply here.
    const result = spawnSync(
      "npx",
      [
        "fvtt", "package", "unpack", name,
        "--type", "Module",
        "--id", MODULE_ID,
        "--compendiumType", compendiumType,
        "--out", outDir,
      ],
      { cwd: MODULE_ROOT, encoding: "utf8", shell: true },
    );
    if (result.error || result.status !== 0) {
      console.error(`[${name}] could not unpack the compiled pack for comparison:\n${result.error || result.stderr || result.stdout}`);
      ok = false;
      continue;
    }

    const sourceDir = path.join(MODULE_ROOT, "packs/_source", name);
    const compiled = readDocsById(outDir);
    const source = readDocsById(sourceDir);

    for (const id of new Set([...compiled.keys(), ...source.keys()])) {
      const inCompiled = compiled.get(id);
      const inSource = source.get(id);
      if (!inSource) {
        console.error(`[${name}] "${inCompiled.file}" (id ${id}) exists in the compiled pack but not in packs/_source/${name} - run "npm run unpack:${name}".`);
        ok = false;
      } else if (!inCompiled) {
        console.error(`[${name}] "${inSource.file}" (id ${id}) exists in packs/_source/${name} but not in the compiled pack - stale source, run "npm run pack:${name}" or remove it.`);
        ok = false;
      } else if (!isDeepStrictEqual(inCompiled.doc, inSource.doc)) {
        console.error(`[${name}] "${id}" differs between the compiled pack and packs/_source/${name}/${inSource.file} - run "npm run unpack:${name}" to sync.`);
        ok = false;
      }
    }
  }
} finally {
  rmSync(staging, { recursive: true, force: true });
}

if (!ok) {
  console.error("\npacks/_source is out of sync with the compiled packs - a release built from source would not match what's currently loaded in Foundry.");
  process.exit(1);
}

console.log(`packs/_source matches the compiled packs for: ${PACKS.map((p) => p.name).join(", ")}`);

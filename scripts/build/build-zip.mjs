/**
 * Builds a distributable zip of the module: `aventuria-helpers/<module files>`
 * - the module folder itself is the zip's single top-level entry (not its
 * contents loose at the archive root), the layout Foundry expects when a
 * user drops the zip into their `Data/modules/` folder.
 *
 * Excludes exactly what `.gitignore` excludes (local-only dev docs,
 * `node_modules`, LevelDB `LOCK` files) plus `.git` itself, which isn't part
 * of `.gitignore` (git doesn't need to ignore itself) but obviously isn't
 * part of the module either. Not a general `.gitignore` parser - just the
 * handful of concrete entries that file currently has; if `.gitignore` grows
 * new patterns, mirror them in `shouldExclude()` below.
 *
 * Works off the current working-tree state, not the last git commit -
 * deliberately, since e.g. the packs' LevelDB log/manifest files rotate
 * file names on every write and are almost always ahead of the last commit,
 * but still need to ship.
 *
 * No versioning yet (matches the current `TODO.md`/`PROJECT.md` stance) -
 * re-run via `npm run zip` any time a fresh snapshot is needed, e.g. for
 * manual distribution before a GitHub release pipeline exists.
 */

import { cpSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const MODULE_ID = "aventuria-helpers";
const ROOT = resolve(import.meta.dirname, "..", "..");
const OUT_ZIP = resolve(ROOT, "..", `${MODULE_ID}.zip`);

const EXCLUDE_DIRS = new Set([".git", "node_modules"]);
const EXCLUDE_ROOT_FILES = new Set(["CLAUDE.md", "CHANGELOG.md", "PROJECT.md", "TODO.md"]);

/** @param {string} src Absolute path of the file/dir currently being copied. */
function shouldExclude(src) {
  const rel = relative(ROOT, src);
  if (rel === "") return false;
  const parts = rel.split(sep);
  const name = parts[parts.length - 1];
  if (parts.length === 1 && (EXCLUDE_DIRS.has(name) || EXCLUDE_ROOT_FILES.has(name))) return true;
  if (name === "LOCK" && parts.includes("packs")) return true;
  return false;
}

/** Wraps a path for safe use inside a single-quoted PowerShell string. */
function psQuote(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

const staging = mkdtempSync(join(tmpdir(), "aventuria-helpers-zip-"));
const stagedModule = join(staging, MODULE_ID);

try {
  cpSync(ROOT, stagedModule, {
    recursive: true,
    filter: (src) => !shouldExclude(src),
  });

  const command = `Compress-Archive -Path ${psQuote(stagedModule)} -DestinationPath ${psQuote(OUT_ZIP)} -Force`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Compress-Archive failed (exit code ${result.status})`);
  }

  const { size } = statSync(OUT_ZIP);
  console.log(`Built ${basename(OUT_ZIP)} (${(size / 1024 / 1024).toFixed(2)} MB) -> ${OUT_ZIP}`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}

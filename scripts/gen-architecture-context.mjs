// Generates src/lib/architecture-context.ts from ARCHITECTURE.md so the idea
// scope-estimator and build-prompt generator can hand Claude the repo's real,
// current architecture instead of a hand-written summary that drifts.
//
// Runs automatically at the start of `npm run build` (see package.json), so the
// bundled context is regenerated on every deploy. JSON.stringify handles all
// escaping (backticks, ${}, newlines) safely.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = join(root, "ARCHITECTURE.md");
const outPath = join(root, "src", "lib", "architecture-context.ts");

let md = "";
try {
  md = readFileSync(srcPath, "utf8");
} catch {
  console.warn("gen-architecture-context: ARCHITECTURE.md not found; writing empty context.");
}

const banner =
  "// AUTO-GENERATED from ARCHITECTURE.md by scripts/gen-architecture-context.mjs.\n" +
  "// Do not edit by hand — it is regenerated on every build.\n";
const body = `${banner}export const ARCHITECTURE_MD = ${JSON.stringify(md)};\n`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, body);
console.log(`gen-architecture-context: wrote ${outPath} (${md.length} chars)`);

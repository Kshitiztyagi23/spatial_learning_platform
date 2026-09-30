import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateColourRules, validatePuzzle } from "../src/core/puzzle";
import type { Puzzle } from "../src/core/types";

const puzzlesDir = join(import.meta.dirname, "..", "src", "data", "puzzles");
const files = readdirSync(puzzlesDir).filter((f) => f.endsWith(".json")).sort();

let failed = false;

for (const file of files) {
  const puzzle: Puzzle = JSON.parse(readFileSync(join(puzzlesDir, file), "utf-8"));
  try {
    validatePuzzle(puzzle);
    validateColourRules(puzzle);
    console.log(`ok    ${file}`);
  } catch (err) {
    failed = true;
    console.error(`FAIL  ${file}`);
    console.error(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (files.length === 0) {
  console.error("No puzzle files found.");
  failed = true;
}

process.exit(failed ? 1 : 0);

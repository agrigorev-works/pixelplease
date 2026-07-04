import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = await readFile(path.join(rootDir, "src", "main.ts"), "utf8");
const llmsPath = path.join(rootDir, "public", "llms.txt");
const llmsFullPath = path.join(rootDir, "public", "llms-full.txt");

const familyNames = [
  ...new Set(Array.from(mainSource.matchAll(/\bfamily: "([^"]+)"/g), ([, family]) => family)),
].filter((family) => !family.includes("$")).sort((a, b) => a.localeCompare(b));

if (familyNames.length < 10) {
  throw new Error(`Expected bundled Google Font families in src/main.ts; found ${familyNames.length}.`);
}

const llms = await readFile(llmsPath, "utf8");
const llmsFull = await readFile(llmsFullPath, "utf8");

for (const family of familyNames) {
  if (!llmsFull.includes(family)) {
    throw new Error(`llms-full.txt is missing bundled font family: ${family}`);
  }
}

if (!llms.includes("[Full LLM context](https://pixelplease.tools/llms-full.txt)")) {
  throw new Error("llms.txt must link to llms-full.txt.");
}

console.log(`LLM files OK: ${familyNames.length} bundled font families listed.`);

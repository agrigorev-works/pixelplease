import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imagePath = path.join(rootDir, "public", "og-image.png");
const expectedWidth = 1200;
const expectedHeight = 630;

const bytes = await readFile(imagePath);
const pngSignature = "89504e470d0a1a0a";

if (bytes.subarray(0, 8).toString("hex") !== pngSignature) {
  throw new Error(`${imagePath} must be a PNG file.`);
}

const width = bytes.readUInt32BE(16);
const height = bytes.readUInt32BE(20);

if (width !== expectedWidth || height !== expectedHeight) {
  throw new Error(
    `${imagePath} must be ${expectedWidth}x${expectedHeight}; received ${width}x${height}.`,
  );
}

console.log(`OG image OK: ${width}x${height}`);

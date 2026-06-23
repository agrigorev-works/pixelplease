import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imagePaths = [
  path.join(rootDir, "public", "og-image.png"),
  path.join(rootDir, "public", "og-image-20260623.png"),
];
const expectedWidth = 1200;
const expectedHeight = 630;

const pngSignature = "89504e470d0a1a0a";

for (const imagePath of imagePaths) {
  const bytes = await readFile(imagePath);

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

  console.log(`OG image OK: ${path.relative(rootDir, imagePath)} ${width}x${height}`);
}

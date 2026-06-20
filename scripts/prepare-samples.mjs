import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const samplesDir = path.resolve("samples");
const latoPath = path.join(samplesDir, "Lato-Regular.ttf");
const latoUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Regular.ttf";

await mkdir(samplesDir, { recursive: true });

if (await exists(latoPath)) {
  console.log(`Sample already exists: ${latoPath}`);
  process.exit(0);
}

console.log(`Downloading Lato sample from ${latoUrl}`);
const response = await fetch(latoUrl);

if (!response.ok) {
  throw new Error(`Failed to download sample font: ${response.status} ${response.statusText}`);
}

const buffer = Buffer.from(await response.arrayBuffer());
await writeFile(latoPath, buffer);
console.log(`Saved ${latoPath} (${buffer.length} bytes)`);

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const samplesDir = path.resolve("samples");
const latoPath = path.join(samplesDir, "Lato-Regular.ttf");
const bundledLatoPath = path.resolve("public/fonts/google/lato/Lato-Regular.ttf");

await mkdir(samplesDir, { recursive: true });

if (await exists(latoPath)) {
  console.log(`Sample already exists: ${latoPath}`);
  process.exit(0);
}

await copyFile(bundledLatoPath, latoPath);
const { size } = await stat(latoPath);
console.log(`Copied ${latoPath} from bundled demo font (${size} bytes)`);

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

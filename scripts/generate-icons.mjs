import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";
import sharp from "sharp";
import iconGen from "icon-gen";

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const currentFile = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(currentFile), "..");
  const svgPath = path.join(projectRoot, "src/assets/icons/merlet-icon.svg");
  const outputDir = path.join(projectRoot, "resources/icons");
  await ensureDir(outputDir);

  const basePngPath = path.join(outputDir, "merlet-1024.png");
  const pngPath = path.join(outputDir, "merlet.png");

  const svgContent = await fs.readFile(svgPath);

  await sharp(svgContent)
    .resize(1024, 1024, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(basePngPath);

  await sharp(svgContent)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(pngPath);

  await iconGen(basePngPath, outputDir, {
    report: true,
    icns: {
      name: "merlet",
    },
    ico: {
      name: "merlet",
    },
  });

  console.log("Generated Electron icon assets in", outputDir);
}

main().catch((error) => {
  console.error("Failed to generate icons", error);
  process.exitCode = 1;
});

/**
 * Generates PWA icons and iOS splash screens from public/icons/icon-source.svg
 * Run: npm run generate-pwa-assets
 */
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "icons");
const splashDir = path.join(root, "public", "splash");
const source = path.join(outDir, "icon-source.svg");

const ICON_SIZES = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

/** Portrait splash screens for common iPhone models */
const SPLASH_SCREENS = [
  { name: "apple-splash-1170-2532.png", width: 1170, height: 2532 },
  { name: "apple-splash-1284-2778.png", width: 1284, height: 2778 },
  { name: "apple-splash-1290-2796.png", width: 1290, height: 2796 },
];

const BG = "#0f172a";

async function createSplash(width, height, iconBuffer) {
  const iconSize = Math.round(Math.min(width, height) * 0.28);
  const icon = await sharp(iconBuffer).resize(iconSize, iconSize).png().toBuffer();
  const left = Math.round((width - iconSize) / 2);
  const top = Math.round((height - iconSize) / 2);

  return sharp({
    create: { width, height, channels: 4, background: BG },
  })
    .composite([{ input: icon, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(splashDir, { recursive: true });
  const svg = await readFile(source);

  for (const size of ICON_SIZES) {
    const name =
      size === 180
        ? "apple-touch-icon.png"
        : size === 32
          ? "favicon-32.png"
          : size === 16
            ? "favicon-16.png"
            : `icon-${size}.png`;

    await sharp(svg).resize(size, size).png().toFile(path.join(outDir, name));
    console.log(`wrote icons/${name}`);
  }

  await sharp(svg).resize(32, 32).png().toFile(path.join(root, "public", "favicon.ico"));
  console.log("wrote favicon.ico");

  const icon512 = await sharp(svg).resize(512, 512).png().toBuffer();
  for (const { name, width, height } of SPLASH_SCREENS) {
    const splash = await createSplash(width, height, icon512);
    await sharp(splash).toFile(path.join(splashDir, name));
    console.log(`wrote splash/${name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

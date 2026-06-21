import maplibregl from "maplibre-gl";
import {
  CATEGORY_MARKER_COLORS,
  CATEGORY_MARKER_EMOJI,
  getMarkerIconId,
  MARKER_CATEGORY_SLUGS,
} from "@/lib/map/category-markers";

const PIN_W = 56;
const PIN_H = 64;

function drawMarkerCanvas(
  emoji: string,
  bgColor: string,
  visited: boolean
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = PIN_W;
  canvas.height = PIN_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, PIN_W, PIN_H);

  // Drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;

  // Pin body — circle
  ctx.beginPath();
  ctx.arc(28, 26, 22, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.restore();

  // White ring
  ctx.beginPath();
  ctx.arc(28, 26, 22, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner highlight
  ctx.beginPath();
  ctx.arc(28, 26, 18, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Emoji
  ctx.font = "22px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 28, 27);

  // Pin point
  ctx.beginPath();
  ctx.moveTo(28, 46);
  ctx.lineTo(20, 58);
  ctx.lineTo(36, 58);
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (visited) {
    ctx.beginPath();
    ctx.arc(44, 10, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#14b8a6";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("✓", 44, 11);
  }

  return canvas;
}

/** Register colorful pin sprites for every category × visit state */
export function registerMapMarkerImages(map: maplibregl.Map): void {
  for (const slug of MARKER_CATEGORY_SLUGS) {
    for (const visited of [false, true] as const) {
      const id = getMarkerIconId(slug, visited ? "visited" : "saved");
      if (map.hasImage(id)) continue;

      const canvas = drawMarkerCanvas(
        CATEGORY_MARKER_EMOJI[slug],
        CATEGORY_MARKER_COLORS[slug],
        visited
      );
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      const { data, width, height } = ctx.getImageData(0, 0, PIN_W, PIN_H);
      map.addImage(id, { width, height, data }, { pixelRatio: 2 });
    }
  }
}

export { PIN_W, PIN_H };

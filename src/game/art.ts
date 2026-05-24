import type * as Phaser from "phaser";

export const CHARACTER_TEXTURE_KEYS = {
  player: "caretaker-player",
  guide: "guide-mira",
  rival: "rival-cal-venn",
} as const;

type DrawTexture = (context: CanvasRenderingContext2D) => void;

export function ensurePolishTextures(scene: Phaser.Scene) {
  createTexture(scene, CHARACTER_TEXTURE_KEYS.player, 16, 18, drawCaretaker);
  createTexture(scene, CHARACTER_TEXTURE_KEYS.guide, 16, 18, drawGuide);
  createTexture(scene, CHARACTER_TEXTURE_KEYS.rival, 16, 18, drawRival);
  createTexture(scene, "mote-glowbud", 18, 18, drawGlowbud);
  createTexture(scene, "mote-reedling", 18, 18, drawReedling);
  createTexture(scene, "mote-stonelet", 18, 18, drawStonelet);
  createTexture(scene, "mote-driftcap", 18, 18, drawDriftcap);
}

function createTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: DrawTexture,
) {
  if (scene.textures.exists(key)) {
    return;
  }

  const texture = scene.textures.createCanvas(key, width, height);

  if (!texture) {
    return;
  }

  texture.context.imageSmoothingEnabled = false;
  draw(texture.context);
  texture.refresh();
}

function drawCaretaker(context: CanvasRenderingContext2D) {
  context.fillStyle = "#3d2f12";
  context.fillRect(5, 2, 6, 3);
  context.fillStyle = "#f3c383";
  context.fillRect(5, 5, 6, 5);
  context.fillStyle = "#f4d35e";
  context.fillRect(4, 10, 8, 6);
  context.fillStyle = "#fff7ad";
  context.fillRect(6, 11, 4, 2);
  context.fillStyle = "#2f6b56";
  context.fillRect(4, 16, 3, 2);
  context.fillRect(9, 16, 3, 2);
  context.fillStyle = "#101820";
  context.fillRect(6, 7, 1, 1);
  context.fillRect(9, 7, 1, 1);
}

function drawGuide(context: CanvasRenderingContext2D) {
  context.fillStyle = "#123047";
  context.fillRect(5, 2, 6, 3);
  context.fillStyle = "#d8b48a";
  context.fillRect(5, 5, 6, 5);
  context.fillStyle = "#7dd3fc";
  context.fillRect(4, 10, 8, 7);
  context.fillStyle = "#f8fafc";
  context.fillRect(5, 11, 6, 2);
  context.fillStyle = "#101820";
  context.fillRect(6, 7, 1, 1);
  context.fillRect(9, 7, 1, 1);
}

function drawRival(context: CanvasRenderingContext2D) {
  context.fillStyle = "#0f172a";
  context.fillRect(4, 2, 8, 4);
  context.fillStyle = "#f3c383";
  context.fillRect(5, 5, 6, 5);
  context.fillStyle = "#dce7ff";
  context.fillRect(3, 10, 10, 7);
  context.fillStyle = "#7dd3fc";
  context.fillRect(5, 11, 6, 2);
  context.fillStyle = "#2563eb";
  context.fillRect(4, 16, 3, 2);
  context.fillRect(9, 16, 3, 2);
  context.fillStyle = "#101820";
  context.fillRect(6, 7, 1, 1);
  context.fillRect(9, 7, 1, 1);
}

function drawGlowbud(context: CanvasRenderingContext2D) {
  context.fillStyle = "#4a154b";
  context.fillRect(6, 6, 6, 7);
  context.fillStyle = "#e879f9";
  context.fillRect(5, 5, 8, 7);
  context.fillStyle = "#fdf4ff";
  context.fillRect(7, 6, 4, 3);
  context.fillStyle = "#fde68a";
  context.fillRect(8, 1, 2, 5);
  context.fillStyle = "#67e8f9";
  context.fillRect(5, 13, 3, 2);
  context.fillRect(10, 13, 3, 2);
  context.fillStyle = "#101820";
  context.fillRect(7, 8, 1, 1);
  context.fillRect(10, 8, 1, 1);
}

function drawReedling(context: CanvasRenderingContext2D) {
  context.fillStyle = "#14532d";
  context.fillRect(7, 3, 4, 11);
  context.fillStyle = "#a7f3d0";
  context.fillRect(6, 4, 6, 9);
  context.fillStyle = "#34d399";
  context.fillRect(4, 2, 5, 3);
  context.fillRect(10, 1, 4, 4);
  context.fillStyle = "#f8fafc";
  context.fillRect(8, 6, 1, 1);
  context.fillRect(10, 6, 1, 1);
  context.fillStyle = "#14532d";
  context.fillRect(5, 13, 3, 2);
  context.fillRect(10, 13, 3, 2);
}

function drawStonelet(context: CanvasRenderingContext2D) {
  context.fillStyle = "#334155";
  context.fillRect(4, 6, 10, 7);
  context.fillStyle = "#94a3b8";
  context.fillRect(5, 4, 8, 9);
  context.fillStyle = "#cbd5e1";
  context.fillRect(7, 5, 3, 2);
  context.fillStyle = "#0f172a";
  context.fillRect(7, 8, 1, 1);
  context.fillRect(10, 8, 1, 1);
  context.fillStyle = "#64748b";
  context.fillRect(5, 13, 3, 2);
  context.fillRect(10, 13, 3, 2);
}

function drawDriftcap(context: CanvasRenderingContext2D) {
  context.fillStyle = "#7c2d12";
  context.fillRect(4, 4, 10, 5);
  context.fillStyle = "#fb7185";
  context.fillRect(5, 3, 8, 5);
  context.fillStyle = "#fef3c7";
  context.fillRect(7, 8, 4, 6);
  context.fillStyle = "#fff7ed";
  context.fillRect(6, 4, 2, 1);
  context.fillRect(10, 5, 2, 1);
  context.fillStyle = "#101820";
  context.fillRect(7, 10, 1, 1);
  context.fillRect(10, 10, 1, 1);
  context.fillStyle = "#92400e";
  context.fillRect(6, 14, 6, 1);
}

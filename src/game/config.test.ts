import { expect, test } from "bun:test";
import { createGameConfig, GAME_VIEWPORT } from "./config";

test("creates a pixel-art Phaser config for the supplied parent", () => {
  const config = createGameConfig({
    parent: "game-root",
    renderType: 1,
    scaleMode: 2,
    autoCenter: 3,
    scene: [],
  });

  expect(config.parent).toBe("game-root");
  expect(config.width).toBe(GAME_VIEWPORT.width);
  expect(config.height).toBe(GAME_VIEWPORT.height);
  expect(config.pixelArt).toBe(true);
  expect(config.roundPixels).toBe(true);
  expect(config.antialias).toBe(false);
  expect(config.scale).toEqual({
    mode: 2,
    autoCenter: 3,
  });
});

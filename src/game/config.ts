import type * as Phaser from "phaser";

export const GAME_VIEWPORT = {
  width: 320,
  height: 180,
} as const;

type CreateGameConfigInput = {
  parent: HTMLElement | string;
  renderType: number;
  scaleMode: Phaser.Scale.ScaleModeType;
  autoCenter: Phaser.Scale.CenterType;
  scene: Phaser.Types.Scenes.SceneType | Phaser.Types.Scenes.SceneType[];
};

export function createGameConfig({
  parent,
  renderType,
  scaleMode,
  autoCenter,
  scene,
}: CreateGameConfigInput): Phaser.Types.Core.GameConfig {
  return {
    type: renderType,
    parent,
    width: GAME_VIEWPORT.width,
    height: GAME_VIEWPORT.height,
    backgroundColor: "#101820",
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    banner: false,
    audio: {
      noAudio: true,
    },
    scale: {
      mode: scaleMode,
      autoCenter,
    },
    scene,
  };
}

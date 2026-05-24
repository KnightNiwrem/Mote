import * as Phaser from "phaser";

const FADE_DURATION_MS = 180;

export function fadeInScene(scene: Phaser.Scene) {
  scene.cameras.main.fadeIn(FADE_DURATION_MS, 16, 24, 32);
}

export function fadeToScene(
  scene: Phaser.Scene,
  sceneKey: string,
  data?: object,
) {
  scene.cameras.main.fadeOut(FADE_DURATION_MS, 16, 24, 32);
  scene.cameras.main.once(
    Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
    () => {
      scene.scene.start(sceneKey, data);
    },
  );
}

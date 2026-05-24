import * as Phaser from "phaser";
import { dispatchGameRuntimeEvent } from "@/game/input";
import { fadeInScene, fadeToScene } from "@/game/scenes/transitions";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    this.cameras.main.setBackgroundColor("#101820");
    dispatchGameRuntimeEvent({ type: "busy", canPause: false });
    fadeInScene(this);
    this.time.delayedCall(120, () => {
      fadeToScene(this, "World");
    });
  }
}

import * as Phaser from "phaser";

const tileSize = 16;

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    this.cameras.main.setBackgroundColor("#101820");

    const graphics = this.add.graphics();
    graphics.fillStyle(0x162d24, 1);
    graphics.fillRect(0, 0, 320, 180);

    graphics.fillStyle(0x1f513f, 1);
    for (let y = 0; y < 180; y += tileSize) {
      for (let x = 0; x < 320; x += tileSize) {
        if ((x / tileSize + y / tileSize) % 2 === 0) {
          graphics.fillRect(x, y, tileSize, tileSize);
        }
      }
    }

    graphics.lineStyle(1, 0x2f6b56, 0.6);
    for (let x = 0; x <= 320; x += tileSize) {
      graphics.lineBetween(x, 0, x, 180);
    }
    for (let y = 0; y <= 180; y += tileSize) {
      graphics.lineBetween(0, y, 320, y);
    }

    this.add.rectangle(160, 96, 18, 18, 0xf4d35e).setStrokeStyle(2, 0x3d2f12);
    this.add.rectangle(160, 78, 12, 10, 0x7dd3fc).setStrokeStyle(1, 0x123047);
    this.add.rectangle(160, 122, 80, 8, 0x8f5f38);

    this.add.text(12, 10, "Mote Garden", {
      color: "#f8fafc",
      fontFamily: "monospace",
      fontSize: "10px",
    });

    this.add.text(12, 24, "Phase 0", {
      color: "#badbcc",
      fontFamily: "monospace",
      fontSize: "8px",
    });
  }
}

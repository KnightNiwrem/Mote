import * as Phaser from "phaser";
import { useEffect, useRef } from "react";
import { createGameConfig } from "./config";
import { BattleScene } from "./scenes/BattleScene";
import { BootScene } from "./scenes/BootScene";
import { WorldScene } from "./scenes/WorldScene";

export function GameHost() {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!parentRef.current) return;

    const game = new Phaser.Game(
      createGameConfig({
        parent: parentRef.current,
        renderType: Phaser.AUTO,
        scaleMode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        scene: [BootScene, WorldScene, BattleScene],
      }),
    );

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={parentRef}
      role="application"
      aria-label="Mote game canvas"
      className="h-full w-full overflow-hidden bg-[#101820] [&>canvas]:block [&>canvas]:[image-rendering:pixelated]"
    />
  );
}

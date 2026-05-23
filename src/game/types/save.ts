import type { GridPosition, WorldMapId } from "@/game/data/maps";

export type CircleSlot =
  | { state: "empty" }
  | {
      state: "occupied";
      bodyId: string;
      mindId: string;
      level: number;
      experience: number;
      bond: number;
      currentHp: number;
    };

export type OccupiedCircleSlot = Extract<CircleSlot, { state: "occupied" }>;

export type QuestFlagValue = boolean | number | string;

export type SaveGame = {
  version: number;
  player: {
    name: string;
    currentMapId: WorldMapId;
    position: GridPosition;
  };
  circle: CircleSlot[];
  inventory: Record<string, number>;
  questFlags: Record<string, QuestFlagValue>;
  acquiredBodies: string[];
  acquiredMinds: string[];
};

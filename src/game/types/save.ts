import type { GridPosition, WorldMapId } from "@/game/data/maps";
import type { QuestState } from "@/game/data/quests";

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

export type CompanionSaveState = {
  bond: number;
  energy: number;
  fullness: number;
  joy: number;
  focus: number;
  lastAction: "rest" | "feed" | "play" | "train" | null;
};

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
  quests: QuestState;
  companion: CompanionSaveState;
  acquiredBodies: string[];
  acquiredMinds: string[];
};

export type SaveSlotId = "slot-1" | "slot-2" | "slot-3";

export type SaveSlotMetadata = {
  playerName: string;
  mapId: WorldMapId;
  mapName: string;
  chapterLabel: string;
  updatedAt: string;
  acquiredBodyCount: number;
  trialMarks: string[];
};

export type SaveSlotRecord = {
  version: number;
  slotId: SaveSlotId;
  metadata: SaveSlotMetadata;
  save: SaveGame;
};

export type SaveSlotState =
  | {
      status: "empty";
      slotId: SaveSlotId;
    }
  | {
      status: "valid";
      slotId: SaveSlotId;
      record: SaveSlotRecord;
    }
  | {
      status: "corrupt";
      slotId: SaveSlotId;
    };

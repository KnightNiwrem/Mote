import type { DialogueId } from "@/game/data/dialogue";
import type { EncounterTableId } from "@/game/data/encounters";
import type { TrialId } from "@/game/data/trials";

export const TILE_SIZE = 16;

export const TILE_IDS = {
  grass: 0,
  path: 1,
  hedge: 2,
  water: 3,
  flowers: 4,
} as const;

export type TileId = (typeof TILE_IDS)[keyof typeof TILE_IDS];
export type Direction = "up" | "down" | "left" | "right";
export type GridPosition = {
  x: number;
  y: number;
};

export type WorldMapId = "garden" | "motehaven-path" | "optima-trial-arena";

export type WorldNpc = {
  id: string;
  name: string;
  kind?: "npc" | "companion" | "wild-mote" | "trial-rival";
  position: GridPosition;
  dialogue: string[];
  dialogueId?: DialogueId;
  battleBodyId?: string;
  trialId?: TrialId;
};

export type MapTransition = {
  id: string;
  position: GridPosition;
  toMapId: WorldMapId;
  toPosition: GridPosition;
};

export type EncounterZone = {
  id: string;
  origin: GridPosition;
  width: number;
  height: number;
  tableId: EncounterTableId;
  stepChance: number;
};

export type WorldMap = {
  id: WorldMapId;
  name: string;
  width: number;
  height: number;
  start: GridPosition;
  tiles: TileId[][];
  blockedTiles: readonly TileId[];
  npcs: readonly WorldNpc[];
  transitions: readonly MapTransition[];
  encounterZones: readonly EncounterZone[];
};

const tileByMark: Record<string, TileId> = {
  ".": TILE_IDS.grass,
  "=": TILE_IDS.path,
  "#": TILE_IDS.hedge,
  "~": TILE_IDS.water,
  "*": TILE_IDS.flowers,
};

function rowsToTiles(rows: readonly string[]): TileId[][] {
  return rows.map((row) =>
    Array.from(row, (mark) => tileByMark[mark] ?? TILE_IDS.grass),
  );
}

const gardenRows = [
  "########################",
  "#..........##..........#",
  "#..****....##....****..#",
  "#..*..*..........*..*..#",
  "#..****..........****..#",
  "#......................#",
  "#.......####...........#",
  "#.......#..#...........#",
  "#.......#..#..........=#",
  "#.......####...........#",
  "#......................#",
  "#..~~~~...........~~~~.#",
  "#..~~~~...........~~~~.#",
  "#......................#",
  "#....=====.............#",
  "########################",
] as const;

const motehavenPathRows = [
  "########################",
  "#~~~~~~..........~~~~~~#",
  "#~~~~~~..........~~~~~~#",
  "#......................#",
  "#..######..............#",
  "#......................#",
  "#..........####........#",
  "#..........#..#........#",
  "#=.........#..#....====#",
  "#..........####........#",
  "#......................#",
  "#..............######..#",
  "#......................#",
  "#~~~~~~..........~~~~~~#",
  "#~~~~~~..........~~~~~~#",
  "########################",
] as const;

const optimaTrialArenaRows = [
  "########################",
  "#..........##..........#",
  "#..****....##....****..#",
  "#......................#",
  "#....================..#",
  "#....=..............=..#",
  "#....=..............=..#",
  "#....=..............=..#",
  "#=...=..............=..#",
  "#....=..............=..#",
  "#....=..............=..#",
  "#....================..#",
  "#......................#",
  "#..****..........****..#",
  "#......................#",
  "########################",
] as const;

export const WORLD_MAPS: Record<WorldMapId, WorldMap> = {
  garden: {
    id: "garden",
    name: "Mote Garden",
    width: 24,
    height: 16,
    start: { x: 6, y: 13 },
    tiles: rowsToTiles(gardenRows),
    blockedTiles: [TILE_IDS.hedge, TILE_IDS.water, TILE_IDS.flowers],
    npcs: [
      {
        id: "first-companion",
        name: "Luma",
        kind: "companion",
        position: { x: 6, y: 14 },
        dialogue: [],
        dialogueId: "luma-garden",
      },
      {
        id: "tessera-guide",
        name: "Guide Mira",
        position: { x: 14, y: 7 },
        dialogueId: "guide-mira",
        dialogue: [
          "Motehaven starts with small steps. Watch the hedges, then try the east gate.",
        ],
      },
    ],
    transitions: [
      {
        id: "garden-east-gate",
        position: { x: 22, y: 8 },
        toMapId: "motehaven-path",
        toPosition: { x: 2, y: 8 },
      },
    ],
    encounterZones: [],
  },
  "motehaven-path": {
    id: "motehaven-path",
    name: "Motehaven Route 1",
    width: 24,
    height: 16,
    start: { x: 1, y: 8 },
    tiles: rowsToTiles(motehavenPathRows),
    blockedTiles: [TILE_IDS.hedge, TILE_IDS.water, TILE_IDS.flowers],
    npcs: [
      {
        id: "route-reedling",
        name: "Wild Reedling",
        kind: "wild-mote",
        position: { x: 5, y: 8 },
        dialogue: ["The Reedling stamps once, ready to spar."],
        battleBodyId: "reedling",
      },
    ],
    transitions: [
      {
        id: "path-west-gate",
        position: { x: 1, y: 8 },
        toMapId: "garden",
        toPosition: { x: 21, y: 8 },
      },
      {
        id: "path-east-trial-gate",
        position: { x: 22, y: 8 },
        toMapId: "optima-trial-arena",
        toPosition: { x: 2, y: 8 },
      },
    ],
    encounterZones: [
      {
        id: "path-west-meadow",
        origin: { x: 2, y: 3 },
        width: 8,
        height: 3,
        tableId: "motehaven-route-1",
        stepChance: 0.16,
      },
      {
        id: "path-east-meadow",
        origin: { x: 13, y: 10 },
        width: 8,
        height: 3,
        tableId: "motehaven-route-1",
        stepChance: 0.16,
      },
    ],
  },
  "optima-trial-arena": {
    id: "optima-trial-arena",
    name: "Optima Trial Arena",
    width: 24,
    height: 16,
    start: { x: 2, y: 8 },
    tiles: rowsToTiles(optimaTrialArenaRows),
    blockedTiles: [TILE_IDS.hedge, TILE_IDS.water, TILE_IDS.flowers],
    npcs: [
      {
        id: "optima-rival-cal",
        name: "Cal Venn",
        kind: "trial-rival",
        position: { x: 11, y: 7 },
        dialogue: [],
        dialogueId: "cal-venn",
        trialId: "first-trial",
      },
    ],
    transitions: [
      {
        id: "trial-west-gate",
        position: { x: 1, y: 8 },
        toMapId: "motehaven-path",
        toPosition: { x: 21, y: 8 },
      },
    ],
    encounterZones: [],
  },
};

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

export type WorldMapId = "garden" | "motehaven-path";

export type WorldNpc = {
  id: string;
  name: string;
  kind?: "npc" | "companion" | "wild-mote";
  position: GridPosition;
  dialogue: string[];
  battleBodyId?: string;
};

export type MapTransition = {
  id: string;
  position: GridPosition;
  toMapId: WorldMapId;
  toPosition: GridPosition;
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
      },
      {
        id: "tessera-guide",
        name: "Guide Mira",
        position: { x: 14, y: 7 },
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
    ],
  },
};

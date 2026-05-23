import type {
  Direction,
  GridPosition,
  MapTransition,
  WorldMap,
  WorldNpc,
} from "@/game/data/maps";

export function positionsMatch(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

export function getNextTile(
  position: GridPosition,
  direction: Direction,
): GridPosition {
  switch (direction) {
    case "up":
      return { x: position.x, y: position.y - 1 };
    case "down":
      return { x: position.x, y: position.y + 1 };
    case "left":
      return { x: position.x - 1, y: position.y };
    case "right":
      return { x: position.x + 1, y: position.y };
  }
}

export function isBlockedTile(map: WorldMap, position: GridPosition): boolean {
  const tile = map.tiles[position.y]?.[position.x];

  return tile === undefined || map.blockedTiles.includes(tile);
}

export function findNpcAt(
  map: WorldMap,
  position: GridPosition,
): WorldNpc | undefined {
  return map.npcs.find((npc) => positionsMatch(npc.position, position));
}

export function canMoveTo(map: WorldMap, position: GridPosition): boolean {
  return !isBlockedTile(map, position) && !findNpcAt(map, position);
}

export function findNpcFacing(
  map: WorldMap,
  position: GridPosition,
  direction: Direction,
): WorldNpc | undefined {
  return findNpcAt(map, getNextTile(position, direction));
}

export function findTransitionAt(
  map: WorldMap,
  position: GridPosition,
): MapTransition | undefined {
  return map.transitions.find((transition) =>
    positionsMatch(transition.position, position),
  );
}

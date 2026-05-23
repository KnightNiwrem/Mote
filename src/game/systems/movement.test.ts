import { expect, test } from "bun:test";
import { WORLD_MAPS } from "@/game/data/maps";
import {
  canMoveTo,
  findNpcFacing,
  findTransitionAt,
  getNextTile,
  isBlockedTile,
} from "./movement";

test("placeholder world maps are rectangular", () => {
  for (const map of Object.values(WORLD_MAPS)) {
    expect(map.tiles).toHaveLength(map.height);
    expect(map.tiles.every((row) => row.length === map.width)).toBe(true);
  }
});

test("grid movement resolves one tile in the requested direction", () => {
  expect(getNextTile({ x: 3, y: 4 }, "up")).toEqual({ x: 3, y: 3 });
  expect(getNextTile({ x: 3, y: 4 }, "down")).toEqual({ x: 3, y: 5 });
  expect(getNextTile({ x: 3, y: 4 }, "left")).toEqual({ x: 2, y: 4 });
  expect(getNextTile({ x: 3, y: 4 }, "right")).toEqual({ x: 4, y: 4 });
});

test("blocked tiles, bounds, and NPCs stop movement", () => {
  const garden = WORLD_MAPS.garden;

  expect(isBlockedTile(garden, { x: 0, y: 0 })).toBe(true);
  expect(isBlockedTile(garden, { x: -1, y: 0 })).toBe(true);
  expect(canMoveTo(garden, garden.start)).toBe(true);
  expect(canMoveTo(garden, { x: 14, y: 7 })).toBe(false);
});

test("interaction finds the NPC on the faced tile", () => {
  const garden = WORLD_MAPS.garden;

  expect(findNpcFacing(garden, garden.start, "down")?.id).toBe(
    "first-companion",
  );
  expect(findNpcFacing(garden, { x: 14, y: 8 }, "up")?.id).toBe(
    "tessera-guide",
  );
  expect(findNpcFacing(garden, { x: 14, y: 8 }, "down")).toBeUndefined();
});

test("map transitions are found at trigger tiles", () => {
  const garden = WORLD_MAPS.garden;
  const path = WORLD_MAPS["motehaven-path"];

  expect(findTransitionAt(garden, { x: 22, y: 8 })?.toMapId).toBe(
    "motehaven-path",
  );
  expect(findTransitionAt(path, { x: 1, y: 8 })?.toMapId).toBe("garden");
});

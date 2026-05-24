import { expect, test } from "bun:test";
import { ENCOUNTER_TABLES } from "@/game/data/encounters";
import { WORLD_MAPS } from "@/game/data/maps";
import {
  canUnlockWildBody,
  chooseWeightedEncounter,
  findEncounterZoneAt,
  rollWildEncounter,
} from "./encounters";

test("encounter zones are found by tile position", () => {
  const path = WORLD_MAPS["motehaven-path"];

  expect(findEncounterZoneAt(path, { x: 2, y: 3 })?.id).toBe(
    "path-west-meadow",
  );
  expect(findEncounterZoneAt(path, { x: 21, y: 13 })).toBeUndefined();
  expect(
    findEncounterZoneAt(WORLD_MAPS.garden, { x: 6, y: 13 }),
  ).toBeUndefined();
});

test("weighted encounters select entries by cumulative weight", () => {
  const table = ENCOUNTER_TABLES["motehaven-route-1"];

  expect(chooseWeightedEncounter(table, () => 0).bodyId).toBe("reedling");
  expect(chooseWeightedEncounter(table, () => 0.56).bodyId).toBe("stonelet");
  expect(chooseWeightedEncounter(table, () => 0.9).bodyId).toBe("driftcap");
});

test("wild encounter rolls use zone chance before weighted body choice", () => {
  const path = WORLD_MAPS["motehaven-path"];

  expect(rollWildEncounter(path, { x: 3, y: 4 }, () => 0.99)).toBeNull();
  expect(
    rollWildEncounter(path, { x: 3, y: 4 }, createRandomSource([0, 0.9])),
  ).toEqual({
    zoneId: "path-west-meadow",
    tableId: "motehaven-route-1",
    bodyId: "driftcap",
  });
});

test("wild body rewards are limited to unlockable encounter entries", () => {
  expect(canUnlockWildBody("reedling")).toBe(true);
  expect(canUnlockWildBody("stonelet")).toBe(true);
  expect(canUnlockWildBody("driftcap")).toBe(true);
  expect(canUnlockWildBody("glowbud")).toBe(false);
});

function createRandomSource(values: readonly number[]) {
  let index = 0;

  return () => values[index++] ?? 0;
}

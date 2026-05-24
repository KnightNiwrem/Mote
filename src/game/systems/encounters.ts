import {
  ENCOUNTER_TABLES,
  type WeightedEncounter,
} from "@/game/data/encounters";
import type { EncounterZone, GridPosition, WorldMap } from "@/game/data/maps";

export type WildEncounterRoll = {
  zoneId: string;
  tableId: EncounterZone["tableId"];
  bodyId: string;
};

export type RandomSource = () => number;

export function findEncounterZoneAt(
  map: WorldMap,
  position: GridPosition,
): EncounterZone | undefined {
  return map.encounterZones.find(
    (zone) =>
      position.x >= zone.origin.x &&
      position.x < zone.origin.x + zone.width &&
      position.y >= zone.origin.y &&
      position.y < zone.origin.y + zone.height,
  );
}

export function rollWildEncounter(
  map: WorldMap,
  position: GridPosition,
  random: RandomSource = Math.random,
): WildEncounterRoll | null {
  const zone = findEncounterZoneAt(map, position);

  if (!zone || random() >= zone.stepChance) {
    return null;
  }

  return {
    zoneId: zone.id,
    tableId: zone.tableId,
    bodyId: chooseWeightedEncounter(ENCOUNTER_TABLES[zone.tableId], random)
      .bodyId,
  };
}

export function chooseWeightedEncounter(
  encounters: readonly WeightedEncounter[],
  random: RandomSource = Math.random,
): WeightedEncounter {
  const totalWeight = encounters.reduce(
    (total, encounter) => total + encounter.weight,
    0,
  );
  const target = random() * totalWeight;
  let cumulativeWeight = 0;

  for (const encounter of encounters) {
    cumulativeWeight += encounter.weight;

    if (target < cumulativeWeight) {
      return encounter;
    }
  }

  const fallbackEncounter = encounters.at(-1);
  if (!fallbackEncounter) {
    throw new Error("Encounter table must include at least one entry");
  }

  return fallbackEncounter;
}

export function canUnlockWildBody(bodyId: string): boolean {
  return Object.values(ENCOUNTER_TABLES).some((encounters) =>
    encounters.some(
      (encounter) => encounter.bodyId === bodyId && encounter.unlockBodyOnWin,
    ),
  );
}

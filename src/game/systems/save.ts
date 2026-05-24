import { MOTE_BODIES, STARTER_BODY, STARTER_BODY_ID } from "@/game/data/bodies";
import {
  type GridPosition,
  WORLD_MAPS,
  type WorldMapId,
} from "@/game/data/maps";
import { MOTE_MINDS, STARTER_MIND_ID } from "@/game/data/minds";
import {
  INITIAL_ACQUIRED_MIND_IDS,
  normalizeAcquiredMindIds,
} from "@/game/systems/mindBody";
import {
  createCircleSlot,
  createEmptyCircle,
  MAX_CIRCLE_SLOTS,
  setCircleSlot,
} from "@/game/systems/moteCircle";
import type { CircleSlot, QuestFlagValue, SaveGame } from "@/game/types/save";

export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_STORAGE_KEY = "mote:save";

export type SaveStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type SaveMigration = (
  save: Record<string, unknown>,
) => Record<string, unknown>;

const SAVE_MIGRATIONS: Partial<Record<number, SaveMigration>> = {
  0: (save) => ({
    version: SAVE_SCHEMA_VERSION,
    player: save.player ?? {
      name: "Caretaker",
      currentMapId: "garden",
      position: WORLD_MAPS.garden.start,
    },
    circle: Array.isArray(save.circle) ? save.circle : createInitialCircle(),
    inventory: isRecord(save.inventory) ? save.inventory : {},
    questFlags: isRecord(save.questFlags) ? save.questFlags : {},
    acquiredBodies: Array.isArray(save.acquiredBodies)
      ? save.acquiredBodies
      : [STARTER_BODY_ID],
    acquiredMinds: Array.isArray(save.acquiredMinds)
      ? normalizeAcquiredMindIds(save.acquiredMinds.filter(isString))
      : [...INITIAL_ACQUIRED_MIND_IDS],
  }),
};

export function createInitialSaveGame(): SaveGame {
  return {
    version: SAVE_SCHEMA_VERSION,
    player: {
      name: "Caretaker",
      currentMapId: "garden",
      position: WORLD_MAPS.garden.start,
    },
    circle: createInitialCircle(),
    inventory: {},
    questFlags: {},
    acquiredBodies: [STARTER_BODY_ID],
    acquiredMinds: [...INITIAL_ACQUIRED_MIND_IDS],
  };
}

export function createInitialCircle(): CircleSlot[] {
  return setCircleSlot(
    createEmptyCircle(),
    0,
    createCircleSlot({
      bodyId: STARTER_BODY_ID,
      mindId: STARTER_MIND_ID,
      bond: 2,
      currentHp: STARTER_BODY.baseStats.hp,
    }),
  );
}

export function serializeSaveGame(save: SaveGame): string {
  const validSave = validateSaveGame(save);

  if (!validSave) {
    throw new Error("Cannot serialize invalid save data");
  }

  return JSON.stringify(validSave);
}

export function parseSaveGame(serialized: string): SaveGame | null {
  try {
    return validateSaveGame(JSON.parse(serialized));
  } catch {
    return null;
  }
}

export function loadOrCreateSaveGame(
  storage: SaveStorage | null = getBrowserStorage(),
): SaveGame {
  return loadSaveGame(storage) ?? createInitialSaveGame();
}

export function loadSaveGame(
  storage: SaveStorage | null = getBrowserStorage(),
): SaveGame | null {
  if (!storage) {
    return null;
  }

  try {
    const serialized = storage.getItem(SAVE_STORAGE_KEY);
    return serialized ? parseSaveGame(serialized) : null;
  } catch {
    return null;
  }
}

export function saveGame(
  save: SaveGame,
  storage: SaveStorage | null = getBrowserStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(SAVE_STORAGE_KEY, serializeSaveGame(save));
    return true;
  } catch {
    return false;
  }
}

export function clearSaveGame(
  storage: SaveStorage | null = getBrowserStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(SAVE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function validateSaveGame(value: unknown): SaveGame | null {
  const migrated = migrateSaveData(value);

  if (!isRecord(migrated) || migrated.version !== SAVE_SCHEMA_VERSION) {
    return null;
  }

  const player = validatePlayer(migrated.player);
  const circle = validateCircle(migrated.circle);
  const inventory = validateInventory(migrated.inventory);
  const questFlags = validateQuestFlags(migrated.questFlags);
  const acquiredBodies = validateKnownIdList(
    migrated.acquiredBodies,
    MOTE_BODIES,
  );
  const acquiredMinds = validateKnownIdList(migrated.acquiredMinds, MOTE_MINDS);

  if (
    !player ||
    !circle ||
    !inventory ||
    !questFlags ||
    !acquiredBodies ||
    !acquiredMinds
  ) {
    return null;
  }

  return {
    version: SAVE_SCHEMA_VERSION,
    player,
    circle,
    inventory,
    questFlags,
    acquiredBodies,
    acquiredMinds: normalizeAcquiredMindIds(acquiredMinds),
  };
}

export function migrateSaveData(value: unknown): unknown {
  if (!isRecord(value)) {
    return null;
  }

  let current = value;
  let version = getSaveVersion(current);

  while (version < SAVE_SCHEMA_VERSION) {
    const migrate = SAVE_MIGRATIONS[version];

    if (!migrate) {
      return null;
    }

    current = migrate(current);
    version = getSaveVersion(current);
  }

  return current;
}

function getBrowserStorage(): SaveStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function getSaveVersion(save: Record<string, unknown>): number {
  return Number.isInteger(save.version) ? Number(save.version) : 0;
}

function validatePlayer(value: unknown): SaveGame["player"] | null {
  if (!isRecord(value) || typeof value.name !== "string") {
    return null;
  }

  if (
    typeof value.currentMapId !== "string" ||
    !isWorldMapId(value.currentMapId)
  ) {
    return null;
  }

  const position = validateGridPosition(value.position, value.currentMapId);

  if (!position) {
    return null;
  }

  return {
    name: value.name,
    currentMapId: value.currentMapId,
    position,
  };
}

function validateCircle(value: unknown): CircleSlot[] | null {
  if (!Array.isArray(value) || value.length > MAX_CIRCLE_SLOTS) {
    return null;
  }

  const circle: CircleSlot[] = [];

  for (const slot of value) {
    const validSlot = validateCircleSlot(slot);

    if (!validSlot) {
      return null;
    }

    circle.push(validSlot);
  }

  return circle;
}

function validateCircleSlot(value: unknown): CircleSlot | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.state === "empty") {
    return { state: "empty" };
  }

  if (
    value.state !== "occupied" ||
    typeof value.bodyId !== "string" ||
    typeof value.mindId !== "string" ||
    !Object.hasOwn(MOTE_BODIES, value.bodyId) ||
    !Object.hasOwn(MOTE_MINDS, value.mindId) ||
    !isPositiveInteger(value.level) ||
    !isNonNegativeInteger(value.experience) ||
    !isIntegerInRange(value.bond, 0, 10) ||
    !isNonNegativeInteger(value.currentHp)
  ) {
    return null;
  }

  return {
    state: "occupied",
    bodyId: value.bodyId,
    mindId: value.mindId,
    level: value.level,
    experience: value.experience,
    bond: value.bond,
    currentHp: value.currentHp,
  };
}

function validateInventory(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) {
    return null;
  }

  const inventory: Record<string, number> = {};

  for (const [key, count] of Object.entries(value)) {
    if (!isNonNegativeInteger(count)) {
      return null;
    }

    inventory[key] = count;
  }

  return inventory;
}

function validateQuestFlags(
  value: unknown,
): Record<string, QuestFlagValue> | null {
  if (!isRecord(value)) {
    return null;
  }

  const questFlags: Record<string, QuestFlagValue> = {};

  for (const [key, flag] of Object.entries(value)) {
    if (
      typeof flag !== "boolean" &&
      typeof flag !== "string" &&
      (typeof flag !== "number" || !Number.isFinite(flag))
    ) {
      return null;
    }

    questFlags[key] = flag;
  }

  return questFlags;
}

function validateKnownIdList(
  value: unknown,
  knownRecords: Record<string, unknown>,
): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const ids: string[] = [];

  for (const id of value) {
    if (typeof id !== "string" || !Object.hasOwn(knownRecords, id)) {
      return null;
    }

    ids.push(id);
  }

  return ids;
}

function isWorldMapId(value: string): value is WorldMapId {
  return Object.hasOwn(WORLD_MAPS, value);
}

function validateGridPosition(
  value: unknown,
  mapId: WorldMapId,
): GridPosition | null {
  if (
    !isRecord(value) ||
    !isNonNegativeInteger(value.x) ||
    !isNonNegativeInteger(value.y)
  ) {
    return null;
  }

  const map = WORLD_MAPS[mapId];
  if (value.x >= map.width || value.y >= map.height) {
    return null;
  }

  return {
    x: value.x,
    y: value.y,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

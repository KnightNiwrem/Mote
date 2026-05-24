import { MOTE_BODIES, STARTER_BODY, STARTER_BODY_ID } from "@/game/data/bodies";
import {
  type GridPosition,
  WORLD_MAPS,
  type WorldMapId,
} from "@/game/data/maps";
import { MOTE_MINDS, STARTER_MIND_ID } from "@/game/data/minds";
import { QUEST_DEFINITIONS, type RewardDefinition } from "@/game/data/quests";
import { TRIALS } from "@/game/data/trials";
import { INITIAL_INVENTORY } from "@/game/systems/inventory";
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
import {
  applyRewardToSave,
  createInitialQuestState,
  getCurrentObjective,
  isQuestCompleted,
  migrateQuestStateFromLegacy,
  validateQuestState,
} from "@/game/systems/quests";
import type {
  CircleSlot,
  QuestFlagValue,
  SaveGame,
  SaveSlotId,
  SaveSlotMetadata,
  SaveSlotRecord,
  SaveSlotState,
} from "@/game/types/save";

export const SAVE_SCHEMA_VERSION = 2;
export const SAVE_STORAGE_KEY = "mote:save";
export const SAVE_SLOT_SCHEMA_VERSION = 1;
export const SAVE_SLOT_STORAGE_KEY_PREFIX = "mote:save-slot:";
export const ACTIVE_SAVE_SLOT_STORAGE_KEY = "mote:active-save-slot";
export const SAVE_SLOT_IDS = ["slot-1", "slot-2", "slot-3"] as const;

export type SaveStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type SaveMigration = (
  save: Record<string, unknown>,
) => Record<string, unknown>;

const SAVE_MIGRATIONS: Partial<Record<number, SaveMigration>> = {
  0: (save) => ({
    version: 1,
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
  1: (save) => ({
    ...save,
    version: SAVE_SCHEMA_VERSION,
    quests: isRecord(save.quests)
      ? save.quests
      : migrateQuestStateFromLegacy({
          questFlags: isRecord(save.questFlags)
            ? (validateQuestFlags(save.questFlags) ?? {})
            : {},
          acquiredBodies: Array.isArray(save.acquiredBodies)
            ? save.acquiredBodies.filter(isString)
            : undefined,
          inventory: isRecord(save.inventory)
            ? (validateInventory(save.inventory) ?? undefined)
            : undefined,
        }),
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
    inventory: { ...INITIAL_INVENTORY },
    questFlags: {},
    quests: createInitialQuestState(),
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
    migrateLegacyAutosave(storage);

    const activeSlotId = getActiveSaveSlotId(storage);
    const activeSlot = activeSlotId
      ? readSaveSlot(activeSlotId, storage)
      : null;

    if (activeSlot?.status === "valid") {
      return activeSlot.record.save;
    }

    const fallbackSlot = getLatestValidSaveSlot(listSaveSlots(storage));

    if (!fallbackSlot) {
      return null;
    }

    setActiveSaveSlotId(fallbackSlot.slotId, storage);
    return fallbackSlot.record.save;
  } catch {
    return null;
  }
}

export function saveGame(
  save: SaveGame,
  storage: SaveStorage | null = getBrowserStorage(),
  slotId: SaveSlotId | null = null,
): boolean {
  if (!storage) {
    return false;
  }

  try {
    return Boolean(
      writeSaveSlot(
        slotId ?? getActiveSaveSlotId(storage) ?? SAVE_SLOT_IDS[0],
        save,
        storage,
      ),
    );
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
    const activeSlotId = getActiveSaveSlotId(storage);

    if (activeSlotId) {
      storage.removeItem(getSaveSlotStorageKey(activeSlotId));
    }

    storage.removeItem(SAVE_STORAGE_KEY);
    storage.removeItem(ACTIVE_SAVE_SLOT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getSaveSlotStorageKey(slotId: SaveSlotId): string {
  return `${SAVE_SLOT_STORAGE_KEY_PREFIX}${slotId}`;
}

export function listSaveSlots(
  storage: SaveStorage | null = getBrowserStorage(),
): SaveSlotState[] {
  if (!storage) {
    return SAVE_SLOT_IDS.map((slotId) => ({ status: "empty", slotId }));
  }

  migrateLegacyAutosave(storage);
  return SAVE_SLOT_IDS.map((slotId) => readSaveSlot(slotId, storage));
}

export function readSaveSlot(
  slotId: SaveSlotId,
  storage: SaveStorage | null = getBrowserStorage(),
): SaveSlotState {
  if (!storage) {
    return { status: "empty", slotId };
  }

  try {
    const serialized = storage.getItem(getSaveSlotStorageKey(slotId));

    if (!serialized) {
      return { status: "empty", slotId };
    }

    const record = parseSaveSlotRecord(serialized, slotId);
    return record
      ? { status: "valid", slotId, record }
      : { status: "corrupt", slotId };
  } catch {
    return { status: "corrupt", slotId };
  }
}

export function writeSaveSlot(
  slotId: SaveSlotId,
  save: SaveGame,
  storage: SaveStorage | null = getBrowserStorage(),
  updatedAt = new Date().toISOString(),
): SaveSlotRecord | null {
  if (!storage) {
    return null;
  }

  const validSave = validateSaveGame(save);

  if (!validSave) {
    return null;
  }

  const record: SaveSlotRecord = {
    version: SAVE_SLOT_SCHEMA_VERSION,
    slotId,
    metadata: createSaveSlotMetadata(validSave, updatedAt),
    save: validSave,
  };

  try {
    storage.setItem(getSaveSlotStorageKey(slotId), JSON.stringify(record));
    storage.setItem(SAVE_STORAGE_KEY, serializeSaveGame(validSave));
    setActiveSaveSlotId(slotId, storage);
    return record;
  } catch {
    return null;
  }
}

export function deleteSaveSlot(
  slotId: SaveSlotId,
  storage: SaveStorage | null = getBrowserStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(getSaveSlotStorageKey(slotId));

    if (getActiveSaveSlotId(storage) === slotId) {
      storage.removeItem(ACTIVE_SAVE_SLOT_STORAGE_KEY);
    }

    return true;
  } catch {
    return false;
  }
}

export function getActiveSaveSlotId(
  storage: SaveStorage | null = getBrowserStorage(),
): SaveSlotId | null {
  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(ACTIVE_SAVE_SLOT_STORAGE_KEY);
    return value && isSaveSlotId(value) ? value : null;
  } catch {
    return null;
  }
}

export function setActiveSaveSlotId(
  slotId: SaveSlotId,
  storage: SaveStorage | null = getBrowserStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(ACTIVE_SAVE_SLOT_STORAGE_KEY, slotId);
    return true;
  } catch {
    return false;
  }
}

export function createSaveSlotMetadata(
  save: SaveGame,
  updatedAt = new Date().toISOString(),
): SaveSlotMetadata {
  const map = WORLD_MAPS[save.player.currentMapId];

  return {
    playerName: save.player.name,
    mapId: save.player.currentMapId,
    mapName: map.name,
    chapterLabel: getChapterLabel(save),
    updatedAt,
    acquiredBodyCount: save.acquiredBodies.length,
    trialMarks: getTrialMarks(save),
  };
}

export function migrateLegacyAutosave(
  storage: SaveStorage | null = getBrowserStorage(),
): SaveSlotRecord | null {
  if (!storage) {
    return null;
  }

  const hasValidSlot = SAVE_SLOT_IDS.some(
    (slotId) => readSaveSlot(slotId, storage).status === "valid",
  );

  if (hasValidSlot) {
    return null;
  }

  try {
    const serialized = storage.getItem(SAVE_STORAGE_KEY);
    const oldSave = serialized ? parseSaveGame(serialized) : null;

    if (!oldSave) {
      return null;
    }

    return writeSaveSlot(SAVE_SLOT_IDS[0], oldSave, storage);
  } catch {
    return null;
  }
}

export function validateSaveGame(value: unknown): SaveGame | null {
  const shouldRepairLegacyRewards =
    isRecord(value) && getSaveVersion(value) < SAVE_SCHEMA_VERSION;
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
  const quests = validateQuestState(migrated.quests, {
    questFlags: questFlags ?? undefined,
    acquiredBodies: acquiredBodies ?? undefined,
    inventory: inventory ?? undefined,
  });

  if (
    !player ||
    !circle ||
    !inventory ||
    !questFlags ||
    !quests ||
    !acquiredBodies ||
    !acquiredMinds
  ) {
    return null;
  }

  const save: SaveGame = {
    version: SAVE_SCHEMA_VERSION,
    player,
    circle,
    inventory,
    questFlags,
    quests,
    acquiredBodies,
    acquiredMinds: normalizeAcquiredMindIds(acquiredMinds),
  };

  return shouldRepairLegacyRewards ? repairClaimedQuestRewards(save) : save;
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

function parseSaveSlotRecord(
  serialized: string,
  expectedSlotId: SaveSlotId,
): SaveSlotRecord | null {
  try {
    return validateSaveSlotRecord(JSON.parse(serialized), expectedSlotId);
  } catch {
    return null;
  }
}

function validateSaveSlotRecord(
  value: unknown,
  expectedSlotId: SaveSlotId,
): SaveSlotRecord | null {
  if (
    !isRecord(value) ||
    value.version !== SAVE_SLOT_SCHEMA_VERSION ||
    typeof value.slotId !== "string" ||
    value.slotId !== expectedSlotId ||
    !isSaveSlotId(value.slotId)
  ) {
    return null;
  }

  const save = validateSaveGame(value.save);
  const metadata = validateSaveSlotMetadata(value.metadata, save);

  if (!save || !metadata) {
    return null;
  }

  return {
    version: SAVE_SLOT_SCHEMA_VERSION,
    slotId: value.slotId,
    metadata: createSaveSlotMetadata(save, metadata.updatedAt),
    save,
  };
}

function repairClaimedQuestRewards(save: SaveGame): SaveGame {
  let nextSave = save;

  for (const definition of Object.values(QUEST_DEFINITIONS)) {
    const progress = nextSave.quests[definition.id];

    if (!progress?.rewardsClaimed) {
      continue;
    }

    for (const reward of definition.rewards) {
      nextSave = applyMissingRewardToSave(nextSave, reward);
    }
  }

  return nextSave;
}

function applyMissingRewardToSave(
  save: SaveGame,
  reward: RewardDefinition,
): SaveGame {
  if (reward.type === "item") {
    const expectedCount = reward.count ?? 1;
    const currentCount = save.inventory[reward.itemId] ?? 0;

    if (currentCount >= expectedCount) {
      return save;
    }

    return applyRewardToSave(save, {
      ...reward,
      count: expectedCount - currentCount,
    });
  }

  if (reward.type === "flag") {
    return save.questFlags[reward.flag] === reward.value
      ? save
      : applyRewardToSave(save, reward);
  }

  if (reward.type === "experience") {
    const slotIndex = reward.slotIndex ?? 0;
    const slot = save.circle[slotIndex];

    if (slot?.state !== "occupied" || slot.experience >= reward.amount) {
      return save;
    }

    return applyRewardToSave(save, {
      ...reward,
      amount: reward.amount - slot.experience,
    });
  }

  return applyRewardToSave(save, reward);
}

function validateSaveSlotMetadata(
  value: unknown,
  save: SaveGame | null,
): SaveSlotMetadata | null {
  if (
    !save ||
    !isRecord(value) ||
    typeof value.playerName !== "string" ||
    typeof value.mapId !== "string" ||
    !isWorldMapId(value.mapId) ||
    typeof value.mapName !== "string" ||
    typeof value.chapterLabel !== "string" ||
    typeof value.updatedAt !== "string" ||
    !isNonNegativeInteger(value.acquiredBodyCount) ||
    !Array.isArray(value.trialMarks) ||
    !value.trialMarks.every(isString)
  ) {
    return null;
  }

  return {
    playerName: value.playerName,
    mapId: value.mapId,
    mapName: value.mapName,
    chapterLabel: value.chapterLabel,
    updatedAt: value.updatedAt,
    acquiredBodyCount: value.acquiredBodyCount,
    trialMarks: value.trialMarks,
  };
}

function getLatestValidSaveSlot(
  slots: readonly SaveSlotState[],
): Extract<SaveSlotState, { status: "valid" }> | null {
  const validSlots = slots.filter((slot) => slot.status === "valid");

  if (validSlots.length === 0) {
    return null;
  }

  return validSlots.reduce((latest, slot) =>
    Date.parse(slot.record.metadata.updatedAt) >
    Date.parse(latest.record.metadata.updatedAt)
      ? slot
      : latest,
  );
}

function getChapterLabel(save: SaveGame): string {
  const firstTrial = TRIALS["first-trial"];

  if (
    save.questFlags[firstTrial.completionFlag] === true ||
    isQuestCompleted(save.quests, "trial:precision-mark")
  ) {
    return "Chapter 1 - Precision Mark";
  }

  if (save.player.currentMapId === "optima-trial-arena") {
    return "Chapter 1 - Optima Trial";
  }

  if (save.player.currentMapId === "motehaven-path") {
    return "Chapter 1 - Route 1";
  }

  return getCurrentObjective(save);
}

function getTrialMarks(save: SaveGame): string[] {
  return Object.values(TRIALS).flatMap((trial) =>
    (save.inventory[trial.rewardInventoryKey] ?? 0) > 0 ||
    save.questFlags[trial.completionFlag] === true
      ? [trial.rewardLabel]
      : [],
  );
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

function isSaveSlotId(value: string): value is SaveSlotId {
  return SAVE_SLOT_IDS.some((slotId) => slotId === value);
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

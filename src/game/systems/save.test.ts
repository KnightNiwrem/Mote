import { expect, test } from "bun:test";
import { MAIN_QUEST_ID, TRIAL_QUEST_ID } from "@/game/data/quests";
import { applyInventoryItem } from "@/game/systems/inventory";
import { MAX_CIRCLE_SLOTS } from "@/game/systems/moteCircle";
import {
  ACTIVE_SAVE_SLOT_STORAGE_KEY,
  createInitialSaveGame,
  createSaveSlotMetadata,
  deleteSaveSlot,
  getActiveSaveSlotId,
  getSaveSlotStorageKey,
  listSaveSlots,
  loadOrCreateSaveGame,
  migrateLegacyAutosave,
  parseSaveGame,
  readSaveSlot,
  SAVE_SLOT_IDS,
  SAVE_STORAGE_KEY,
  saveGame,
  serializeSaveGame,
  setActiveSaveSlotId,
  validateSaveGame,
  writeSaveSlot,
} from "./save";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

test("save serialization preserves player progress fields", () => {
  const save = createInitialSaveGame();
  const parsed = parseSaveGame(serializeSaveGame(save));

  expect(parsed?.player.currentMapId).toBe("garden");
  expect(parsed?.player.position).toEqual({ x: 6, y: 13 });
  expect(parsed?.circle).toHaveLength(MAX_CIRCLE_SLOTS);
  expect(parsed?.circle[0]).toEqual({
    state: "occupied",
    bodyId: "glowbud",
    mindId: "luma-companion",
    level: 1,
    experience: 0,
    bond: 2,
    currentHp: 24,
  });
  expect(parsed?.acquiredBodies).toEqual(["glowbud"]);
  expect(parsed?.acquiredMinds).toEqual([
    "base-mind",
    "luma-companion",
    "optima-focus",
    "northstar-base",
  ]);
  expect(parsed?.inventory).toEqual({
    "focus-bell": 1,
    "key:garden-pass": 1,
    "patch-pulse": 2,
  });
  expect(parsed?.questFlags).toEqual({});
  expect(parsed?.quests[MAIN_QUEST_ID]?.state).toBe("active");
  expect(parsed?.quests[MAIN_QUEST_ID]?.trackedObjectiveId).toBe(
    "care-for-luma",
  );
  expect(parsed?.quests[TRIAL_QUEST_ID]?.state).toBe("inactive");
});

test("invalid save data is rejected safely", () => {
  const save = createInitialSaveGame();

  expect(parseSaveGame("{")).toBeNull();
  expect(
    validateSaveGame({
      ...save,
      player: { ...save.player, currentMapId: "void" },
    }),
  ).toBeNull();
  expect(
    validateSaveGame({
      ...save,
      circle: [...save.circle, { state: "empty" }],
    }),
  ).toBeNull();
});

test("save storage round trips valid saves", () => {
  const storage = new MemoryStorage();
  const save = {
    ...createInitialSaveGame(),
    player: {
      name: "Caretaker",
      currentMapId: "motehaven-path" as const,
      position: { x: 2, y: 8 },
    },
    inventory: {
      berry: 3,
    },
    questFlags: {
      metGuide: true,
    },
  };

  expect(saveGame(save, storage)).toBe(true);
  expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(serializeSaveGame(save));
  expect(storage.getItem(getSaveSlotStorageKey("slot-1"))).not.toBeNull();
  expect(getActiveSaveSlotId(storage)).toBe("slot-1");
  expect(loadOrCreateSaveGame(storage)).toEqual(save);
});

test("save slots create, read, update, and delete saves", () => {
  const storage = new MemoryStorage();
  const save = createInitialSaveGame();
  const updatedSave = {
    ...save,
    player: {
      ...save.player,
      currentMapId: "motehaven-path" as const,
      position: { x: 2, y: 8 },
    },
  };

  expect(listSaveSlots(storage)).toEqual(
    SAVE_SLOT_IDS.map((slotId) => ({ status: "empty", slotId })),
  );

  const record = writeSaveSlot(
    "slot-2",
    save,
    storage,
    "2026-05-24T00:00:00.000Z",
  );

  expect(record?.slotId).toBe("slot-2");
  if (!record) {
    throw new Error("Expected slot write to return a record");
  }

  expect(readSaveSlot("slot-2", storage)).toEqual({
    status: "valid",
    slotId: "slot-2",
    record,
  });
  expect(getActiveSaveSlotId(storage)).toBe("slot-2");

  const updatedRecord = writeSaveSlot(
    "slot-2",
    updatedSave,
    storage,
    "2026-05-24T00:01:00.000Z",
  );

  expect(updatedRecord?.metadata.mapId).toBe("motehaven-path");
  if (!updatedRecord) {
    throw new Error("Expected slot update to return a record");
  }

  expect(readSaveSlot("slot-2", storage)).toEqual({
    status: "valid",
    slotId: "slot-2",
    record: updatedRecord,
  });

  expect(deleteSaveSlot("slot-2", storage)).toBe(true);
  expect(readSaveSlot("slot-2", storage)).toEqual({
    status: "empty",
    slotId: "slot-2",
  });
  expect(storage.getItem(ACTIVE_SAVE_SLOT_STORAGE_KEY)).toBeNull();
});

test("save metadata includes player, location, progress, timestamp, bodies, and trial marks", () => {
  const save = {
    ...createInitialSaveGame(),
    player: {
      name: "Rin",
      currentMapId: "optima-trial-arena" as const,
      position: { x: 2, y: 8 },
    },
    acquiredBodies: ["glowbud", "reedling"],
    inventory: {
      "trial:first:precision-mark": 1,
    },
    questFlags: {
      "trial.first.completed": true,
    },
  };

  expect(createSaveSlotMetadata(save, "2026-05-24T01:02:03.000Z")).toEqual({
    playerName: "Rin",
    mapId: "optima-trial-arena",
    mapName: "Optima Trial Arena",
    chapterLabel: "Chapter 1 - Precision Mark",
    updatedAt: "2026-05-24T01:02:03.000Z",
    acquiredBodyCount: 2,
    trialMarks: ["Precision Mark"],
  });
});

test("legacy autosave migrates to slot one without dropping progress fields", () => {
  const storage = new MemoryStorage();
  const legacySave = {
    ...createInitialSaveGame(),
    player: {
      name: "Legacy",
      currentMapId: "motehaven-path" as const,
      position: { x: 7, y: 5 },
    },
    circle: createInitialSaveGame().circle.map((slot, index) =>
      index === 0 && slot.state === "occupied"
        ? { ...slot, currentHp: 13, bond: 7 }
        : slot,
    ),
    inventory: {
      "trial:first:precision-mark": 1,
      berry: 2,
    },
    questFlags: {
      "trial.first.completed": true,
      "story.sovereignWeightsHint": "introduced",
    },
    acquiredBodies: ["glowbud", "reedling"],
    acquiredMinds: [
      "base-mind",
      "luma-companion",
      "optima-focus",
      "northstar-base",
    ],
  };

  const { quests: _quests, ...legacySaveWithoutQuests } = legacySave;

  storage.setItem(
    SAVE_STORAGE_KEY,
    JSON.stringify({
      ...legacySaveWithoutQuests,
      version: 1,
    }),
  );

  const migrated = migrateLegacyAutosave(storage);
  const slot = readSaveSlot("slot-1", storage);

  expect(migrated?.slotId).toBe("slot-1");
  expect(slot.status).toBe("valid");

  if (slot.status !== "valid") {
    throw new Error("Expected migrated slot to be valid");
  }

  expect(slot.record.save.player).toEqual(legacySave.player);
  expect(slot.record.save.circle).toEqual(legacySave.circle);
  expect(slot.record.save.inventory).toEqual(legacySave.inventory);
  expect(slot.record.save.questFlags).toEqual(legacySave.questFlags);
  expect(slot.record.save.quests[TRIAL_QUEST_ID]?.state).toBe("completed");
  expect(slot.record.save.quests[MAIN_QUEST_ID]?.state).toBe("completed");
  expect(loadOrCreateSaveGame(storage)).toEqual(slot.record.save);
});

test("version one saves migrate quest progress from flags and persist it", () => {
  const versionOneSave = {
    version: 1,
    player: {
      name: "Legacy",
      currentMapId: "optima-trial-arena",
      position: { x: 2, y: 8 },
    },
    circle: createInitialSaveGame().circle,
    inventory: {
      "trial:first:precision-mark": 1,
    },
    questFlags: {
      "trial.first.completed": true,
      "story.sovereignWeightsHint": "introduced",
    },
    acquiredBodies: ["glowbud", "reedling"],
    acquiredMinds: createInitialSaveGame().acquiredMinds,
  };
  const migrated = validateSaveGame(versionOneSave);

  expect(migrated?.version).toBe(2);
  expect(migrated?.quests[TRIAL_QUEST_ID]?.state).toBe("completed");
  expect(migrated?.quests[MAIN_QUEST_ID]?.state).toBe("completed");

  const parsed = migrated ? parseSaveGame(serializeSaveGame(migrated)) : null;

  expect(parsed?.quests).toEqual(migrated?.quests);
});

test("corrupt save slots are reported without blocking other slots", () => {
  const storage = new MemoryStorage();
  const save = createInitialSaveGame();

  writeSaveSlot("slot-1", save, storage);
  storage.setItem(getSaveSlotStorageKey("slot-2"), "{");

  expect(readSaveSlot("slot-2", storage)).toEqual({
    status: "corrupt",
    slotId: "slot-2",
  });
  expect(listSaveSlots(storage).map((slot) => slot.status)).toEqual([
    "valid",
    "corrupt",
    "empty",
  ]);

  setActiveSaveSlotId("slot-2", storage);
  expect(loadOrCreateSaveGame(storage)).toEqual(save);
});

test("version zero saves migrate through the save hooks", () => {
  const migrated = validateSaveGame({
    version: 0,
    player: {
      name: "Caretaker",
      currentMapId: "garden",
      position: { x: 6, y: 13 },
    },
    circle: createInitialSaveGame().circle,
    inventory: {},
    questFlags: {},
  });

  expect(migrated?.version).toBe(2);
  expect(migrated?.acquiredBodies).toEqual(["glowbud"]);
  expect(migrated?.quests[MAIN_QUEST_ID]?.state).toBe("active");
  expect(migrated?.acquiredMinds).toEqual([
    "base-mind",
    "luma-companion",
    "optima-focus",
    "northstar-base",
  ]);
});

test("inventory and Circle item effects persist through save slots", () => {
  const storage = new MemoryStorage();
  const save = createInitialSaveGame();
  const used = applyInventoryItem(save, "focus-bell", { context: "menu" });

  expect(used.success).toBe(true);
  writeSaveSlot("slot-1", used.save, storage, "2026-05-24T02:00:00.000Z");

  const slot = readSaveSlot("slot-1", storage);
  expect(slot.status).toBe("valid");

  if (slot.status !== "valid") {
    throw new Error("Expected slot to be valid");
  }

  expect(slot.record.save.inventory["focus-bell"]).toBeUndefined();
  expect(
    slot.record.save.circle[0]?.state === "occupied"
      ? slot.record.save.circle[0].bond
      : null,
  ).toBe(3);
});

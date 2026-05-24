import { expect, test } from "bun:test";
import { GUIDE_MIRA_DIALOGUE_ID } from "@/game/data/dialogue";
import { MAIN_QUEST_ID, TRIAL_QUEST_ID } from "@/game/data/quests";
import { FIRST_TRIAL_ID, TRIALS } from "@/game/data/trials";
import { createTrialBattleState } from "@/game/systems/battle";
import { getDialogueStartView } from "@/game/systems/dialogue";
import { applyInventoryItem } from "@/game/systems/inventory";
import {
  getOccupiedCircleSlots,
  MAX_CIRCLE_SLOTS,
} from "@/game/systems/moteCircle";
import { applyTrialBattleResultToSave } from "@/game/systems/trials";
import type { BattleState } from "@/game/types/battle";
import type { OccupiedCircleSlot } from "@/game/types/save";
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
  expect(slot.record.save.inventory).toEqual({
    ...legacySave.inventory,
    "patch-pulse": 1,
  });
  expect(slot.record.save.questFlags).toEqual({
    ...legacySave.questFlags,
    "quest.main.chapterOneComplete": true,
  });
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

test("legacy quest reward claims repair missing durable reward side effects", () => {
  const trial = TRIALS[FIRST_TRIAL_ID];
  const migrated = validateSaveGame({
    version: 1,
    player: {
      name: "Legacy",
      currentMapId: "optima-trial-arena",
      position: { x: 2, y: 8 },
    },
    circle: createInitialSaveGame().circle,
    inventory: {},
    questFlags: {
      [trial.completionFlag]: true,
      [trial.storyHintFlag]: "introduced",
    },
    acquiredBodies: ["glowbud", "reedling"],
    acquiredMinds: createInitialSaveGame().acquiredMinds,
  });

  expect(migrated?.quests[TRIAL_QUEST_ID]?.rewardsClaimed).toBe(true);
  expect(migrated?.quests[MAIN_QUEST_ID]?.rewardsClaimed).toBe(true);
  expect(migrated?.inventory[trial.rewardInventoryKey]).toBe(1);
  expect(migrated?.inventory["patch-pulse"]).toBe(1);
  expect(migrated?.questFlags["quest.main.chapterOneComplete"]).toBe(true);
});

test("legacy quest reward repair does not duplicate already present rewards", () => {
  const trial = TRIALS[FIRST_TRIAL_ID];
  const migrated = validateSaveGame({
    version: 1,
    player: {
      name: "Legacy",
      currentMapId: "optima-trial-arena",
      position: { x: 2, y: 8 },
    },
    circle: createInitialSaveGame().circle,
    inventory: {
      [trial.rewardInventoryKey]: 2,
      "patch-pulse": 4,
    },
    questFlags: {
      [trial.completionFlag]: true,
      [trial.storyHintFlag]: "introduced",
      "quest.main.chapterOneComplete": true,
    },
    acquiredBodies: ["glowbud", "reedling"],
    acquiredMinds: createInitialSaveGame().acquiredMinds,
  });

  expect(migrated?.inventory[trial.rewardInventoryKey]).toBe(2);
  expect(migrated?.inventory["patch-pulse"]).toBe(4);
});

test("validated save slots expose metadata regenerated from migrated save data", () => {
  const storage = new MemoryStorage();
  const updatedAt = "2026-05-24T03:00:00.000Z";
  const { quests: _quests, ...legacySaveWithoutQuests } =
    createInitialSaveGame();
  const migratedSave = validateSaveGame({
    ...legacySaveWithoutQuests,
    version: 1,
    questFlags: {
      "story.luma.met": true,
    },
  });

  if (!migratedSave) {
    throw new Error("Expected migrated save to validate");
  }

  storage.setItem(
    getSaveSlotStorageKey("slot-1"),
    JSON.stringify({
      version: 1,
      slotId: "slot-1",
      metadata: createSaveSlotMetadata(createInitialSaveGame(), updatedAt),
      save: migratedSave,
    }),
  );

  const slot = readSaveSlot("slot-1", storage);

  expect(slot.status).toBe("valid");

  if (slot.status !== "valid") {
    throw new Error("Expected slot to be valid");
  }

  expect(slot.record.metadata.updatedAt).toBe(updatedAt);
  expect(slot.record.metadata.chapterLabel).toBe(
    "Speak with Guide Mira near the east hedge.",
  );
  expect(listSaveSlots(storage)[0]).toEqual(slot);
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
  expect(getActiveSaveSlotId(storage)).toBe("slot-1");

  const updatedSave = {
    ...save,
    player: {
      ...save.player,
      currentMapId: "motehaven-path" as const,
      position: { x: 2, y: 8 },
    },
  };

  expect(saveGame(updatedSave, storage)).toBe(true);
  expect(readSaveSlot("slot-2", storage)).toEqual({
    status: "corrupt",
    slotId: "slot-2",
  });

  const fallbackSlot = readSaveSlot("slot-1", storage);

  expect(fallbackSlot.status).toBe("valid");

  if (fallbackSlot.status !== "valid") {
    throw new Error("Expected fallback slot to stay valid");
  }

  expect(fallbackSlot.record.save.player.currentMapId).toBe("motehaven-path");
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

test("generated trial completion persists and reloads through save slots", () => {
  const storage = new MemoryStorage();
  const trial = TRIALS[FIRST_TRIAL_ID];
  const completedSave = applyTrialBattleResultToSave(
    createInitialSaveGame(),
    winFirstTrial(getStarterSlot()),
    FIRST_TRIAL_ID,
  );

  writeSaveSlot("slot-3", completedSave, storage, "2026-05-24T04:00:00.000Z");

  const reloaded = loadOrCreateSaveGame(storage);
  const slot = readSaveSlot("slot-3", storage);
  const mira = getDialogueStartView(GUIDE_MIRA_DIALOGUE_ID, reloaded);

  expect(reloaded.questFlags[trial.completionFlag]).toBe(true);
  expect(reloaded.questFlags[trial.storyHintFlag]).toBe("introduced");
  expect(reloaded.inventory[trial.rewardInventoryKey]).toBe(1);
  expect(reloaded.quests[TRIAL_QUEST_ID]?.state).toBe("completed");
  expect(reloaded.quests[MAIN_QUEST_ID]?.state).toBe("completed");

  expect(slot.status).toBe("valid");

  if (slot.status !== "valid") {
    throw new Error("Expected trial completion slot to be valid");
  }

  expect(slot.record.metadata.chapterLabel).toBe("Chapter 1 - Precision Mark");
  expect(slot.record.metadata.trialMarks).toEqual(["Precision Mark"]);
  expect(mira.view.type === "line" ? mira.view.text : "").toContain(
    "Sovereign signals",
  );
});

function getStarterSlot(): OccupiedCircleSlot {
  const slot = getOccupiedCircleSlots(createInitialSaveGame().circle)[0];

  if (!slot) {
    throw new Error("Expected starter save to include an occupied Circle slot");
  }

  return slot;
}

function winFirstTrial(playerSlot: OccupiedCircleSlot): BattleState {
  const state = createTrialBattleState({
    playerSlot,
  });

  return {
    ...state,
    player: {
      ...state.player,
      currentHp: 6,
    },
    enemy: {
      ...state.enemy,
      currentHp: 0,
    },
    outcome: "player-win",
  };
}

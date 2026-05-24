import { expect, test } from "bun:test";
import { MAX_CIRCLE_SLOTS } from "@/game/systems/moteCircle";
import {
  createInitialSaveGame,
  loadOrCreateSaveGame,
  parseSaveGame,
  SAVE_STORAGE_KEY,
  saveGame,
  serializeSaveGame,
  validateSaveGame,
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
  expect(parsed?.inventory).toEqual({});
  expect(parsed?.questFlags).toEqual({});
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

  expect(migrated?.version).toBe(1);
  expect(migrated?.acquiredBodies).toEqual(["glowbud"]);
  expect(migrated?.acquiredMinds).toEqual([
    "base-mind",
    "luma-companion",
    "optima-focus",
    "northstar-base",
  ]);
});

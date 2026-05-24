import { expect, test } from "bun:test";
import {
  DEFAULT_GAME_OPTIONS,
  loadGameOptions,
  OPTIONS_STORAGE_KEY,
  parseGameOptions,
  saveGameOptions,
  validateGameOptions,
} from "./options";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test("loads default options when storage is empty or unavailable", () => {
  expect(loadGameOptions(null)).toEqual(DEFAULT_GAME_OPTIONS);
  expect(loadGameOptions(new MemoryStorage())).toEqual(DEFAULT_GAME_OPTIONS);
});

test("persists and reloads valid options", () => {
  const storage = new MemoryStorage();
  const options = {
    soundVolume: 0.35,
    musicVolume: 0.45,
    textSpeed: "fast" as const,
    reducedMotion: true,
    controlDisplay: "always" as const,
  };

  expect(saveGameOptions(options, storage)).toBe(true);
  expect(storage.getItem(OPTIONS_STORAGE_KEY)).toBe(JSON.stringify(options));
  expect(loadGameOptions(storage)).toEqual(options);
});

test("validates options with defaults and clamped volumes", () => {
  expect(
    validateGameOptions({
      soundVolume: 2,
      musicVolume: -1,
      textSpeed: "bad",
      reducedMotion: "no",
      controlDisplay: "bad",
    }),
  ).toEqual({
    soundVolume: 1,
    musicVolume: 0,
    textSpeed: DEFAULT_GAME_OPTIONS.textSpeed,
    reducedMotion: DEFAULT_GAME_OPTIONS.reducedMotion,
    controlDisplay: DEFAULT_GAME_OPTIONS.controlDisplay,
  });

  expect(parseGameOptions("{")).toBeNull();
});

import type {
  ControlDisplay,
  GameOptions,
  TextSpeed,
} from "@/game/types/options";

export const OPTIONS_STORAGE_KEY = "mote:options";

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  soundVolume: 0.8,
  musicVolume: 0.6,
  textSpeed: "normal",
  reducedMotion: false,
  controlDisplay: "auto",
};

export type OptionsStorage = Pick<Storage, "getItem" | "setItem">;

export function loadGameOptions(
  storage: OptionsStorage | null = getBrowserStorage(),
): GameOptions {
  if (!storage) {
    return DEFAULT_GAME_OPTIONS;
  }

  try {
    const serialized = storage.getItem(OPTIONS_STORAGE_KEY);

    if (!serialized) {
      return DEFAULT_GAME_OPTIONS;
    }

    return parseGameOptions(serialized) ?? DEFAULT_GAME_OPTIONS;
  } catch {
    return DEFAULT_GAME_OPTIONS;
  }
}

export function saveGameOptions(
  options: GameOptions,
  storage: OptionsStorage | null = getBrowserStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  const validOptions = validateGameOptions(options);

  if (!validOptions) {
    return false;
  }

  try {
    storage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(validOptions));
    return true;
  } catch {
    return false;
  }
}

export function parseGameOptions(serialized: string): GameOptions | null {
  try {
    return validateGameOptions(JSON.parse(serialized));
  } catch {
    return null;
  }
}

export function validateGameOptions(value: unknown): GameOptions | null {
  if (!isRecord(value)) {
    return null;
  }

  const soundVolume = normalizeVolume(
    value.soundVolume,
    DEFAULT_GAME_OPTIONS.soundVolume,
  );
  const musicVolume = normalizeVolume(
    value.musicVolume,
    DEFAULT_GAME_OPTIONS.musicVolume,
  );
  const textSpeed = normalizeTextSpeed(value.textSpeed);
  const reducedMotion =
    typeof value.reducedMotion === "boolean"
      ? value.reducedMotion
      : DEFAULT_GAME_OPTIONS.reducedMotion;
  const controlDisplay = normalizeControlDisplay(value.controlDisplay);

  return {
    soundVolume,
    musicVolume,
    textSpeed,
    reducedMotion,
    controlDisplay,
  };
}

function normalizeVolume(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function normalizeTextSpeed(value: unknown): TextSpeed {
  return value === "slow" || value === "normal" || value === "fast"
    ? value
    : DEFAULT_GAME_OPTIONS.textSpeed;
}

function normalizeControlDisplay(value: unknown): ControlDisplay {
  return value === "auto" || value === "always" || value === "hidden"
    ? value
    : DEFAULT_GAME_OPTIONS.controlDisplay;
}

function getBrowserStorage(): OptionsStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

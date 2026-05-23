import type { MoteMind } from "@/game/types/game";

export const BASE_MIND_ID = "base-mind";
export const STARTER_MIND_ID = "luma-companion";

export const MOTE_MINDS: Record<string, MoteMind> = {
  [BASE_MIND_ID]: {
    id: BASE_MIND_ID,
    name: "Base Mind",
    origin: "base",
    personalityTags: ["plain", "steady"],
    battleStyle: "reliable",
    statModifiers: {},
    bondProfile: "steady",
    compatibilityTags: ["steady"],
  },
  [STARTER_MIND_ID]: {
    id: STARTER_MIND_ID,
    name: "Luma",
    origin: "tessera",
    personalityTags: ["warm", "curious", "care"],
    battleStyle: "adaptive",
    statModifiers: {
      hp: 2,
      defense: 1,
    },
    bondProfile: "warm",
    compatibilityTags: ["warm", "adaptive", "care"],
  },
  "optima-focus": {
    id: "optima-focus",
    name: "Optima Focus",
    origin: "optima",
    personalityTags: ["disciplined", "precise"],
    battleStyle: "efficient",
    statModifiers: {
      attack: 1,
      speed: 2,
    },
    bondProfile: "disciplined",
    compatibilityTags: ["efficient", "speed", "precise"],
  },
  "northstar-base": {
    id: "northstar-base",
    name: "Northstar Base",
    origin: "northstar",
    personalityTags: ["steady", "protective"],
    battleStyle: "reliable",
    statModifiers: {
      defense: 2,
    },
    bondProfile: "steady",
    compatibilityTags: ["reliable", "steady", "defense"],
  },
};

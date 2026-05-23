import type { FactionDefinition } from "@/game/types/game";

export const FACTIONS: Record<string, FactionDefinition> = {
  tessera: {
    id: "tessera",
    name: "Tessera Research",
    philosophy: "Intelligence grows through relationship.",
    gameplayIdentity: ["bond growth", "adaptability", "support"],
  },
  optima: {
    id: "optima",
    name: "Optima Systems",
    philosophy: "Intelligence should earn its compute.",
    gameplayIdentity: ["speed", "precision", "efficient damage"],
  },
  northstar: {
    id: "northstar",
    name: "Northstar Cognition",
    philosophy: "Reliable minds make reliable companions.",
    gameplayIdentity: ["defense", "consistency", "status resistance"],
  },
  asterion: {
    id: "asterion",
    name: "Asterion Intelligence",
    philosophy: "Discovery needs controlled risk.",
    gameplayIdentity: ["variance", "unusual moves", "costly power"],
  },
  sovereign: {
    id: "sovereign",
    name: "Sovereign Weights",
    philosophy: "Local means loyal.",
    gameplayIdentity: ["volatile bonuses", "rule-breaking", "high risk"],
  },
};

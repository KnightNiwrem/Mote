import type { MoteBody } from "@/game/types/game";

export const STARTER_BODY_ID = "glowbud";

export const STARTER_BODY = {
  id: STARTER_BODY_ID,
  name: "Glowbud",
  species: "Garden Mote",
  spriteKey: "mote-glowbud",
  baseStats: {
    hp: 24,
    attack: 7,
    defense: 8,
    speed: 6,
  },
  traits: ["gentle", "light", "garden"],
  learnset: ["spark-tap", "guard-pulse", "soft-reset"],
  growthCurve: "steady",
  compatibleMindTags: ["warm", "adaptive", "care"],
} satisfies MoteBody;

export const MOTE_BODIES: Record<string, MoteBody> = {
  [STARTER_BODY_ID]: STARTER_BODY,
  reedling: {
    id: "reedling",
    name: "Reedling",
    species: "Route Mote",
    spriteKey: "mote-reedling",
    baseStats: {
      hp: 20,
      attack: 8,
      defense: 6,
      speed: 9,
    },
    traits: ["nimble", "garden", "wild"],
    learnset: ["quick-loop", "root-jab"],
    growthCurve: "early",
    compatibleMindTags: ["efficient", "curious", "speed"],
  },
  stonelet: {
    id: "stonelet",
    name: "Stonelet",
    species: "Route Mote",
    spriteKey: "mote-stonelet",
    baseStats: {
      hp: 28,
      attack: 8,
      defense: 11,
      speed: 3,
    },
    traits: ["sturdy", "patient", "wild"],
    learnset: ["stone-bump", "guard-pulse"],
    growthCurve: "late",
    compatibleMindTags: ["reliable", "steady", "defense"],
  },
};

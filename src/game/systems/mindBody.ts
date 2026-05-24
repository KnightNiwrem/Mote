import { MOTE_BODIES } from "@/game/data/bodies";
import { BASE_MIND_ID, MOTE_MINDS, STARTER_MIND_ID } from "@/game/data/minds";
import type {
  BattleStats,
  MoteBody,
  MoteMind,
  MoveDefinition,
} from "@/game/types/game";
import type { CircleSlot, OccupiedCircleSlot } from "@/game/types/save";

export const INITIAL_ACQUIRED_MIND_IDS = [
  BASE_MIND_ID,
  STARTER_MIND_ID,
  "optima-focus",
  "northstar-base",
] as const;

export type CompatibilityRating = "strained" | "aligned" | "resonant";

export function calculateCompatibilityScore(
  body: MoteBody,
  mind: MoteMind,
): number {
  if (mind.id === BASE_MIND_ID) {
    return 60;
  }

  const mindTags = new Set([
    ...mind.compatibilityTags,
    ...mind.personalityTags,
    mind.battleStyle,
    mind.bondProfile,
  ]);
  const matchingTags = body.compatibleMindTags.filter((tag) =>
    mindTags.has(tag),
  );

  return clamp(50 + matchingTags.length * 15, 35, 100);
}

export function getCompatibilityRating(score: number): CompatibilityRating {
  if (score >= 85) {
    return "resonant";
  }

  if (score >= 65) {
    return "aligned";
  }

  return "strained";
}

export function getCompatibilityLabel(body: MoteBody, mind: MoteMind): string {
  const score = calculateCompatibilityScore(body, mind);
  const rating = getCompatibilityRating(score);

  return `${capitalize(rating)} ${score}`;
}

export function calculateMindBodyStats(
  body: MoteBody,
  mind: MoteMind,
): BattleStats {
  const compatibilityBonus =
    getCompatibilityRating(calculateCompatibilityScore(body, mind)) ===
    "resonant"
      ? 1
      : 0;

  return {
    hp: Math.max(
      1,
      body.baseStats.hp + (mind.statModifiers.hp ?? 0) + compatibilityBonus,
    ),
    attack: Math.max(
      1,
      body.baseStats.attack +
        (mind.statModifiers.attack ?? 0) +
        compatibilityBonus,
    ),
    defense: Math.max(
      1,
      body.baseStats.defense +
        (mind.statModifiers.defense ?? 0) +
        compatibilityBonus,
    ),
    speed: Math.max(
      1,
      body.baseStats.speed +
        (mind.statModifiers.speed ?? 0) +
        compatibilityBonus,
    ),
  };
}

export function getMindMoveModifier(
  mind: MoteMind,
  move: MoveDefinition,
): number {
  if (mind.battleStyle === "efficient" && move.role === "damage") {
    return 1;
  }

  if (mind.battleStyle === "adaptive" && move.role === "recovery") {
    return 1;
  }

  if (mind.battleStyle === "reliable" && move.role === "support") {
    return 1;
  }

  return 0;
}

export function getBondGainModifier(mind: MoteMind): number {
  switch (mind.bondProfile) {
    case "warm":
      return 1;
    case "disciplined":
      return 0;
    case "steady":
      return 0;
    case "curious":
      return 1;
    case "unstable":
      return -1;
  }
}

export function normalizeAcquiredMindIds(mindIds: readonly string[]): string[] {
  const knownMindIds = [...INITIAL_ACQUIRED_MIND_IDS, ...mindIds].filter(
    (mindId) => Object.hasOwn(MOTE_MINDS, mindId),
  );

  return [...new Set(knownMindIds)];
}

export function getAvailableMindIds(mindIds: readonly string[]): string[] {
  return normalizeAcquiredMindIds(mindIds);
}

export function assignMindToCircleSlot(
  slot: OccupiedCircleSlot,
  mindId: string,
): OccupiedCircleSlot {
  const body = MOTE_BODIES[slot.bodyId];
  const mind = MOTE_MINDS[mindId];

  if (!body || !mind) {
    throw new Error("Cannot assign an unknown body or mind");
  }

  const stats = calculateMindBodyStats(body, mind);

  return {
    ...slot,
    mindId,
    currentHp: Math.min(slot.currentHp, stats.hp),
  };
}

export function getCircleSlotCompatibility(slot: CircleSlot): string {
  if (slot.state !== "occupied") {
    return "Empty";
  }

  const body = MOTE_BODIES[slot.bodyId];
  const mind = MOTE_MINDS[slot.mindId];

  if (!body || !mind) {
    return "Unknown";
  }

  return getCompatibilityLabel(body, mind);
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

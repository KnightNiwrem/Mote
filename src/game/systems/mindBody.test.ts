import { expect, test } from "bun:test";
import { MOTE_BODIES } from "@/game/data/bodies";
import { MOTE_MINDS } from "@/game/data/minds";
import { MOTE_MOVES } from "@/game/data/moves";
import {
  assignMindToCircleSlot,
  calculateCompatibilityScore,
  calculateMindBodyStats,
  getAvailableMindIds,
  getBondGainModifier,
  getCompatibilityRating,
  getMindMoveModifier,
} from "./mindBody";

test("compatibility scoring reflects body and mind tag alignment", () => {
  const reedling = MOTE_BODIES.reedling;
  const optima = MOTE_MINDS["optima-focus"];
  const northstar = MOTE_MINDS["northstar-base"];

  if (!reedling || !optima || !northstar) {
    throw new Error("Expected initial body and mind data to exist");
  }

  expect(calculateCompatibilityScore(reedling, optima)).toBe(95);
  expect(
    getCompatibilityRating(calculateCompatibilityScore(reedling, optima)),
  ).toBe("resonant");
  expect(calculateCompatibilityScore(reedling, northstar)).toBe(50);
  expect(
    getCompatibilityRating(calculateCompatibilityScore(reedling, northstar)),
  ).toBe("strained");
});

test("resonant pairings add a small battle stat bonus", () => {
  const stonelet = MOTE_BODIES.stonelet;
  const northstar = MOTE_MINDS["northstar-base"];

  if (!stonelet || !northstar) {
    throw new Error("Expected stonelet and northstar data to exist");
  }

  expect(calculateMindBodyStats(stonelet, northstar)).toEqual({
    hp: 29,
    attack: 9,
    defense: 14,
    speed: 4,
  });
});

test("mind profiles add deterministic move and bond modifiers", () => {
  const optima = MOTE_MINDS["optima-focus"];
  const luma = MOTE_MINDS["luma-companion"];
  const northstar = MOTE_MINDS["northstar-base"];
  const quickLoop = MOTE_MOVES["quick-loop"];
  const softReset = MOTE_MOVES["soft-reset"];
  const guardPulse = MOTE_MOVES["guard-pulse"];

  if (
    !optima ||
    !luma ||
    !northstar ||
    !quickLoop ||
    !softReset ||
    !guardPulse
  ) {
    throw new Error("Expected initial mind and move data to exist");
  }

  expect(getMindMoveModifier(optima, quickLoop)).toBe(1);
  expect(getMindMoveModifier(luma, softReset)).toBe(1);
  expect(getMindMoveModifier(northstar, guardPulse)).toBe(1);
  expect(getBondGainModifier(luma)).toBe(1);
  expect(getBondGainModifier(optima)).toBe(0);
});

test("Circle mind assignment clamps HP and normalizes available minds", () => {
  const slot = assignMindToCircleSlot(
    {
      state: "occupied",
      bodyId: "reedling",
      mindId: "base-mind",
      level: 1,
      experience: 0,
      bond: 0,
      currentHp: 99,
    },
    "optima-focus",
  );

  expect(slot.mindId).toBe("optima-focus");
  expect(slot.currentHp).toBe(21);
  expect(getAvailableMindIds(["base-mind", "missing-mind"])).toEqual([
    "base-mind",
  ]);
});

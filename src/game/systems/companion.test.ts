import { expect, test } from "bun:test";
import {
  applyGardenAction,
  COMPANION_MAX_VALUE,
  createInitialCompanionState,
  getCompanionDialogue,
} from "./companion";

test("Garden actions update the first companion state", () => {
  const initialState = createInitialCompanionState();
  const nextState = applyGardenAction(initialState, "play");

  expect(nextState.bond).toBe(initialState.bond + 2);
  expect(nextState.joy).toBe(initialState.joy + 3);
  expect(nextState.energy).toBe(initialState.energy - 1);
  expect(nextState.lastAction).toBe("play");
});

test("Garden action values are clamped to the companion range", () => {
  const nextState = applyGardenAction(
    {
      bond: COMPANION_MAX_VALUE,
      energy: 1,
      fullness: 0,
      joy: COMPANION_MAX_VALUE,
      focus: COMPANION_MAX_VALUE,
      lastAction: null,
    },
    "train",
  );

  expect(nextState.bond).toBe(COMPANION_MAX_VALUE);
  expect(nextState.energy).toBe(0);
  expect(nextState.fullness).toBe(0);
  expect(nextState.focus).toBe(COMPANION_MAX_VALUE);
});

test("first companion dialogue changes with bond", () => {
  const state = createInitialCompanionState();

  expect(getCompanionDialogue(state)).toContain("learning");
  expect(getCompanionDialogue({ ...state, bond: 5 })).toContain("rhythm");
  expect(getCompanionDialogue({ ...state, bond: 8 })).toContain("like us");
});

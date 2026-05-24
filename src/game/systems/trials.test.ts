import { expect, test } from "bun:test";
import { SOVEREIGN_HINT_DIALOGUE_ID } from "@/game/data/dialogue";
import { FIRST_TRIAL_ID, TRIALS } from "@/game/data/trials";
import { createTrialBattleState } from "@/game/systems/battle";
import { getOccupiedCircleSlots } from "@/game/systems/moteCircle";
import type { BattleState } from "@/game/types/battle";
import type { OccupiedCircleSlot } from "@/game/types/save";
import { createInitialSaveGame } from "./save";
import {
  applyTrialBattleResult,
  applyTrialBattleResultToSave,
  isTrialCompleted,
} from "./trials";

test("trial reward completes progression and introduces Sovereign Weights", () => {
  const save = createInitialSaveGame();
  const wonTrial = winFirstTrial(getStarterSlot());
  const result = applyTrialBattleResult(save, wonTrial, FIRST_TRIAL_ID);
  const nextSave = result.save;
  const trial = TRIALS[FIRST_TRIAL_ID];

  expect(result.completedNow).toBe(true);
  expect(result.commands).toEqual([
    {
      type: "sound",
      soundId: "signal",
    },
    {
      type: "wait",
      ms: 350,
    },
    {
      type: "say",
      dialogueId: SOVEREIGN_HINT_DIALOGUE_ID,
    },
  ]);
  expect(isTrialCompleted(nextSave, FIRST_TRIAL_ID)).toBe(true);
  expect(nextSave.questFlags[trial.storyHintFlag]).toBe("introduced");
  expect(nextSave.questFlags["trial.first.lastOutcome"]).toBe("player-win");
  expect(nextSave.inventory[trial.rewardInventoryKey]).toBe(1);
  expect(nextSave.circle[0]).toEqual({
    state: "occupied",
    bodyId: "glowbud",
    mindId: "luma-companion",
    level: 1,
    experience: 8,
    bond: 2,
    currentHp: 6,
  });
});

test("trial reward is granted only once", () => {
  const trial = TRIALS[FIRST_TRIAL_ID];
  const wonTrial = winFirstTrial(getStarterSlot());
  const completedSave = applyTrialBattleResultToSave(
    createInitialSaveGame(),
    wonTrial,
    FIRST_TRIAL_ID,
  );
  const repeatedSave = applyTrialBattleResultToSave(
    completedSave,
    wonTrial,
    FIRST_TRIAL_ID,
  );
  const repeatedResult = applyTrialBattleResult(
    completedSave,
    wonTrial,
    FIRST_TRIAL_ID,
  );

  expect(repeatedResult.completedNow).toBe(false);
  expect(repeatedResult.commands).toEqual([]);
  expect(repeatedSave.inventory[trial.rewardInventoryKey]).toBe(1);
  expect(repeatedSave.circle[0]).toEqual(completedSave.circle[0]);
});

test("losing a trial records the result without completing it", () => {
  const save = createInitialSaveGame();
  const state = createTrialBattleState({
    playerSlot: getStarterSlot(),
  });
  const lostTrial: BattleState = {
    ...state,
    player: {
      ...state.player,
      currentHp: 0,
    },
    outcome: "enemy-win",
  };
  const nextSave = applyTrialBattleResultToSave(
    save,
    lostTrial,
    FIRST_TRIAL_ID,
  );
  const result = applyTrialBattleResult(save, lostTrial, FIRST_TRIAL_ID);

  expect(result.completedNow).toBe(false);
  expect(result.commands).toEqual([]);
  expect(isTrialCompleted(nextSave, FIRST_TRIAL_ID)).toBe(false);
  expect(nextSave.questFlags["trial.first.lastOutcome"]).toBe("enemy-win");
  expect(nextSave.inventory[TRIALS[FIRST_TRIAL_ID].rewardInventoryKey]).toBe(
    undefined,
  );
  expect(nextSave.circle[0]).toEqual({
    state: "occupied",
    bodyId: "glowbud",
    mindId: "luma-companion",
    level: 1,
    experience: 0,
    bond: 2,
    currentHp: 1,
  });
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

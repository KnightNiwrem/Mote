import { SOVEREIGN_HINT_CUTSCENE_ID } from "@/game/data/cutscenes";
import { MAIN_QUEST_ID, TRIAL_QUEST_ID } from "@/game/data/quests";
import { TRIALS, type TrialId } from "@/game/data/trials";
import { type CutsceneCommand, runCutscene } from "@/game/systems/cutscenes";
import { updateCircleSlot } from "@/game/systems/moteCircle";
import {
  applyQuestActionToSave,
  completeQuestAndClaimRewards,
  isQuestCompleted,
} from "@/game/systems/quests";
import type { BattleState } from "@/game/types/battle";
import type { SaveGame } from "@/game/types/save";

export function isTrialCompleted(save: SaveGame, trialId: TrialId): boolean {
  return (
    save.questFlags[TRIALS[trialId].completionFlag] === true ||
    isQuestCompleted(save.quests, TRIAL_QUEST_ID)
  );
}

export type TrialBattleResultApplication = {
  save: SaveGame;
  commands: CutsceneCommand[];
  completedNow: boolean;
};

export function applyTrialBattleResult(
  save: SaveGame,
  battleState: BattleState,
  trialId: TrialId,
): TrialBattleResultApplication {
  const trial = TRIALS[trialId];
  const wonTrial = battleState.outcome === "player-win";
  const alreadyCompleted = isTrialCompleted(save, trialId);
  const savedHp =
    battleState.outcome === "enemy-win"
      ? 1
      : Math.max(1, battleState.player.currentHp);

  let nextSave: SaveGame = {
    ...save,
    circle: updateCircleSlot(save.circle, 0, (slot) =>
      slot.state === "occupied"
        ? {
            ...slot,
            currentHp: savedHp,
            experience:
              slot.experience +
              (wonTrial && !alreadyCompleted ? trial.experienceReward : 0),
          }
        : slot,
    ),
    questFlags: {
      ...save.questFlags,
      "trial.first.lastOutcome": battleState.outcome,
    },
  };

  if (!wonTrial || alreadyCompleted) {
    return {
      save: nextSave,
      commands: [],
      completedNow: false,
    };
  }

  nextSave = applyQuestActionToSave(nextSave, {
    type: "start",
    questId: TRIAL_QUEST_ID,
  });
  nextSave = applyQuestActionToSave(nextSave, {
    type: "advance",
    trigger: "trial-completed",
    targetId: trialId,
  });
  nextSave = completeQuestAndClaimRewards(nextSave, TRIAL_QUEST_ID);
  const cutsceneResult = runCutscene(nextSave, SOVEREIGN_HINT_CUTSCENE_ID);
  nextSave = cutsceneResult.save;
  nextSave = applyQuestActionToSave(nextSave, {
    type: "advance",
    trigger: "sovereign-hint",
    targetId: "sovereign-weights",
  });

  return {
    save: completeQuestAndClaimRewards(nextSave, MAIN_QUEST_ID),
    commands: cutsceneResult.commands,
    completedNow: true,
  };
}

export function applyTrialBattleResultToSave(
  save: SaveGame,
  battleState: BattleState,
  trialId: TrialId,
): SaveGame {
  return applyTrialBattleResult(save, battleState, trialId).save;
}

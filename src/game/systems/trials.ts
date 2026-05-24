import { TRIALS, type TrialId } from "@/game/data/trials";
import { updateCircleSlot } from "@/game/systems/moteCircle";
import type { BattleState } from "@/game/types/battle";
import type { SaveGame } from "@/game/types/save";

export function isTrialCompleted(save: SaveGame, trialId: TrialId): boolean {
  return save.questFlags[TRIALS[trialId].completionFlag] === true;
}

export function applyTrialBattleResultToSave(
  save: SaveGame,
  battleState: BattleState,
  trialId: TrialId,
): SaveGame {
  const trial = TRIALS[trialId];
  const wonTrial = battleState.outcome === "player-win";
  const alreadyCompleted = isTrialCompleted(save, trialId);
  const savedHp =
    battleState.outcome === "enemy-win"
      ? 1
      : Math.max(1, battleState.player.currentHp);

  return {
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
    inventory:
      wonTrial && !alreadyCompleted
        ? {
            ...save.inventory,
            [trial.rewardInventoryKey]:
              (save.inventory[trial.rewardInventoryKey] ?? 0) + 1,
          }
        : save.inventory,
    questFlags: {
      ...save.questFlags,
      "trial.first.lastOutcome": battleState.outcome,
      ...(wonTrial
        ? {
            [trial.completionFlag]: true,
            [trial.storyHintFlag]: "introduced",
          }
        : {}),
    },
  };
}

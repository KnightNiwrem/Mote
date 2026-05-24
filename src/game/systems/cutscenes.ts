import {
  CUTSCENES,
  type CutsceneDefinition,
  type CutsceneId,
  type CutsceneStep,
} from "@/game/data/cutscenes";
import type { Direction, GridPosition } from "@/game/data/maps";
import type { TrialId } from "@/game/data/trials";
import { applyRewardToSave } from "@/game/systems/quests";
import type { SaveGame } from "@/game/types/save";

export type CutsceneCommand =
  | {
      type: "say";
      dialogueId: string;
    }
  | {
      type: "moveActor";
      actorId: string;
      path: GridPosition[];
    }
  | {
      type: "faceActor";
      actorId: string;
      direction: Direction;
    }
  | {
      type: "wait";
      ms: number;
    }
  | {
      type: "sound";
      soundId: string;
    }
  | {
      type: "battle";
      battleKind: "wild" | "trial";
      enemyBodyId?: string;
      trialId?: TrialId;
    };

export type CutsceneRunResult = {
  save: SaveGame;
  commands: CutsceneCommand[];
  skipped: boolean;
};

export function getCutsceneDefinition(
  cutsceneId: CutsceneId,
): CutsceneDefinition {
  return CUTSCENES[cutsceneId];
}

export function getCutsceneSummary(cutsceneId: CutsceneId): string {
  return getCutsceneDefinition(cutsceneId).summary;
}

export function runCutscene(
  save: SaveGame,
  cutsceneId: CutsceneId,
): CutsceneRunResult {
  const definition = getCutsceneDefinition(cutsceneId);

  if (
    definition.skippableAfterFlag &&
    save.questFlags[definition.skippableAfterFlag] === true
  ) {
    return {
      save,
      commands: [],
      skipped: true,
    };
  }

  return runCutsceneSteps(save, definition.steps);
}

export function runCutsceneSteps(
  save: SaveGame,
  steps: readonly CutsceneStep[],
): CutsceneRunResult {
  let nextSave = save;
  const commands: CutsceneCommand[] = [];

  for (const step of steps) {
    if (step.type === "flag") {
      nextSave = {
        ...nextSave,
        questFlags: {
          ...nextSave.questFlags,
          [step.flag]: step.value,
        },
      };
    } else if (step.type === "reward") {
      nextSave = applyRewardToSave(nextSave, step.reward);
    } else if (step.type === "say") {
      commands.push({
        type: "say",
        dialogueId: step.dialogueId,
      });
    } else if (step.type === "moveActor") {
      commands.push({
        type: "moveActor",
        actorId: step.actorId,
        path: step.path,
      });
    } else if (step.type === "faceActor") {
      commands.push({
        type: "faceActor",
        actorId: step.actorId,
        direction: step.direction,
      });
    } else if (step.type === "wait") {
      commands.push({
        type: "wait",
        ms: step.ms,
      });
    } else if (step.type === "sound") {
      commands.push({
        type: "sound",
        soundId: step.soundId,
      });
    } else {
      commands.push({
        type: "battle",
        battleKind: step.battleKind,
        enemyBodyId: step.enemyBodyId,
        trialId: step.trialId,
      });
    }
  }

  return {
    save: nextSave,
    commands,
    skipped: false,
  };
}

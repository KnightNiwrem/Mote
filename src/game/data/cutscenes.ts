import type { DialogueId } from "@/game/data/dialogue";
import { SOVEREIGN_HINT_DIALOGUE_ID } from "@/game/data/dialogue";
import type { Direction, GridPosition } from "@/game/data/maps";
import type { RewardDefinition } from "@/game/data/quests";
import type { TrialId } from "@/game/data/trials";
import { TRIALS } from "@/game/data/trials";

export const SOVEREIGN_HINT_CUTSCENE_ID = "sovereign-weights-hint";

export type CutsceneId = typeof SOVEREIGN_HINT_CUTSCENE_ID;

export type CutsceneStep =
  | {
      type: "say";
      dialogueId: DialogueId;
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
      type: "flag";
      flag: string;
      value: boolean | number | string;
    }
  | {
      type: "reward";
      reward: RewardDefinition;
    }
  | {
      type: "battle";
      battleKind: "wild" | "trial";
      enemyBodyId?: string;
      trialId?: TrialId;
    };

export type CutsceneDefinition = {
  id: CutsceneId;
  steps: readonly CutsceneStep[];
  skippableAfterFlag?: string;
  summary: string;
};

const firstTrial = TRIALS["first-trial"];

export const CUTSCENES: Record<CutsceneId, CutsceneDefinition> = {
  [SOVEREIGN_HINT_CUTSCENE_ID]: {
    id: SOVEREIGN_HINT_CUTSCENE_ID,
    summary: firstTrial.sovereignHint,
    skippableAfterFlag: "cutscene.sovereign-weights-hint.completed",
    steps: [
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
      {
        type: "flag",
        flag: firstTrial.storyHintFlag,
        value: "introduced",
      },
      {
        type: "reward",
        reward: {
          type: "item",
          itemId: "material:signal-fragment",
        },
      },
      {
        type: "flag",
        flag: "cutscene.sovereign-weights-hint.completed",
        value: true,
      },
    ],
  },
};

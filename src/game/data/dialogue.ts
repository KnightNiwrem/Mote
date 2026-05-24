import type { TrialId } from "@/game/data/trials";
import {
  BODY_RESEARCH_QUEST_ID,
  MAIN_QUEST_ID,
  type QuestId,
  type QuestObjectiveTrigger,
  type QuestProgressStatus,
  TRIAL_QUEST_ID,
} from "./quests";

export const LUMA_DIALOGUE_ID = "luma-garden";
export const GUIDE_MIRA_DIALOGUE_ID = "guide-mira";
export const CAL_VENN_DIALOGUE_ID = "cal-venn";
export const WILD_BODY_DIALOGUE_ID = "wild-body-acquired";
export const SOVEREIGN_HINT_DIALOGUE_ID = "sovereign-weights-hint";

export type DialogueId =
  | typeof LUMA_DIALOGUE_ID
  | typeof GUIDE_MIRA_DIALOGUE_ID
  | typeof CAL_VENN_DIALOGUE_ID
  | typeof WILD_BODY_DIALOGUE_ID
  | typeof SOVEREIGN_HINT_DIALOGUE_ID;

export type DialogueCondition =
  | {
      type: "flag";
      flag: string;
      value?: boolean | number | string;
    }
  | {
      type: "quest-state";
      questId: QuestId;
      state: QuestProgressStatus;
    }
  | {
      type: "objective-complete";
      questId: QuestId;
      objectiveId: string;
    }
  | {
      type: "trial-completed";
      trialId: TrialId;
    }
  | {
      type: "has-acquired-body";
      bodyId?: string;
    };

export type DialogueEffect =
  | {
      type: "setFlag";
      flag: string;
      value: boolean | number | string;
    }
  | {
      type: "startQuest";
      questId: QuestId;
    }
  | {
      type: "advanceQuest";
      trigger: QuestObjectiveTrigger;
      targetId?: string;
      questId?: QuestId;
      objectiveId?: string;
      amount?: number;
    }
  | {
      type: "completeQuest";
      questId: QuestId;
    }
  | {
      type: "claimQuestRewards";
      questId: QuestId;
    }
  | {
      type: "giveItem";
      itemId: string;
      count?: number;
    }
  | {
      type: "healCircle";
      amount: number;
    }
  | {
      type: "openMenu";
      menu: "garden" | "circle" | "inventory" | "quests";
    }
  | {
      type: "startBattle";
      battleKind: "wild" | "trial";
      enemyBodyId?: string;
      trialId?: TrialId;
    }
  | {
      type: "startCutscene";
      cutsceneId: string;
    };

export type DialogueLineVariant = {
  conditions: readonly DialogueCondition[];
  speaker?: string;
  text?: string;
  next?: string;
  effects?: readonly DialogueEffect[];
};

export type DialogueChoice = {
  id: string;
  label: string;
  next?: string;
  conditions?: readonly DialogueCondition[];
  effects?: readonly DialogueEffect[];
};

export type DialogueNode =
  | {
      type: "line";
      speaker: string;
      text: string;
      next?: string;
      effects?: readonly DialogueEffect[];
      variants?: readonly DialogueLineVariant[];
    }
  | {
      type: "choice";
      prompt: string;
      choices: readonly DialogueChoice[];
    }
  | {
      type: "end";
      effects?: readonly DialogueEffect[];
    };

export type DialogueDefinition = {
  id: DialogueId;
  startNodeId: string;
  nodes: Record<string, DialogueNode>;
};

export const DIALOGUES: Record<DialogueId, DialogueDefinition> = {
  [LUMA_DIALOGUE_ID]: {
    id: LUMA_DIALOGUE_ID,
    startNodeId: "start",
    nodes: {
      start: {
        type: "line",
        speaker: "Luma",
        text: "I'm Luma. Care first, then the road will listen.",
        effects: [
          {
            type: "setFlag",
            flag: "story.luma.met",
            value: true,
          },
          {
            type: "openMenu",
            menu: "garden",
          },
        ],
        variants: [
          {
            conditions: [
              {
                type: "flag",
                flag: "trial.first.completed",
                value: true,
              },
            ],
            text: "The Garden is quiet after the mark. That signal felt heavy.",
          },
          {
            conditions: [
              {
                type: "flag",
                flag: "story.luma.met",
                value: true,
              },
            ],
            text: "Ready for another Garden rhythm?",
          },
        ],
      },
    },
  },
  [GUIDE_MIRA_DIALOGUE_ID]: {
    id: GUIDE_MIRA_DIALOGUE_ID,
    startNodeId: "start",
    nodes: {
      start: {
        type: "line",
        speaker: "Guide Mira",
        text: "Motehaven splits bodies from minds. Win a wild body, then decide how it fits your Circle.",
        effects: [
          {
            type: "setFlag",
            flag: "story.mira.met",
            value: true,
          },
          {
            type: "advanceQuest",
            trigger: "dialogue",
            targetId: "guide-mira",
            questId: MAIN_QUEST_ID,
            objectiveId: "meet-guide-mira",
          },
          {
            type: "startQuest",
            questId: TRIAL_QUEST_ID,
          },
          {
            type: "startQuest",
            questId: BODY_RESEARCH_QUEST_ID,
          },
        ],
        variants: [
          {
            conditions: [
              {
                type: "flag",
                flag: "trial.first.completed",
                value: true,
              },
            ],
            text: "You cleared Cal's mark. Sovereign signals rarely arrive alone; keep the fragment close.",
          },
          {
            conditions: [
              {
                type: "flag",
                flag: "story.mira.met",
                value: true,
              },
            ],
            text: "Route 1 is still the best teacher. Bodies show what a mind can actually carry.",
          },
        ],
      },
    },
  },
  [CAL_VENN_DIALOGUE_ID]: {
    id: CAL_VENN_DIALOGUE_ID,
    startNodeId: "start",
    nodes: {
      start: {
        type: "line",
        speaker: "Cal Venn",
        text: "Optima measures care by output. Show me your Circle can turn bond into performance.",
        effects: [
          {
            type: "startQuest",
            questId: TRIAL_QUEST_ID,
          },
          {
            type: "startBattle",
            battleKind: "trial",
            trialId: "first-trial",
          },
        ],
        variants: [
          {
            conditions: [
              {
                type: "trial-completed",
                trialId: "first-trial",
              },
            ],
            text: "Your result stands. Efficiency is not colder than care, only less forgiving.",
            effects: [],
          },
        ],
      },
    },
  },
  [WILD_BODY_DIALOGUE_ID]: {
    id: WILD_BODY_DIALOGUE_ID,
    startNodeId: "start",
    nodes: {
      start: {
        type: "line",
        speaker: "System",
        text: "New body acquired: {bodyName}. Assign it to the Circle or keep it in body inventory.",
        next: "assignment",
      },
      assignment: {
        type: "choice",
        prompt: "Assign this body?",
        choices: [
          {
            id: "assign",
            label: "Assign to Circle",
          },
          {
            id: "keep",
            label: "Keep in inventory",
          },
        ],
      },
    },
  },
  [SOVEREIGN_HINT_DIALOGUE_ID]: {
    id: SOVEREIGN_HINT_DIALOGUE_ID,
    startNodeId: "start",
    nodes: {
      start: {
        type: "line",
        speaker: "Signal",
        text: "A cracked local signal interrupts the arena board: SOVEREIGN WEIGHTS ARE LISTENING.",
      },
    },
  },
};

import { FIRST_TRIAL_ID, TRIALS } from "@/game/data/trials";

export const MAIN_QUEST_ID = "main:motehaven-awakening";
export const TRIAL_QUEST_ID = "trial:precision-mark";
export const BODY_RESEARCH_QUEST_ID = "research:first-body";

export type QuestId =
  | typeof MAIN_QUEST_ID
  | typeof TRIAL_QUEST_ID
  | typeof BODY_RESEARCH_QUEST_ID;

export type QuestCategory =
  | "main"
  | "trial"
  | "companion"
  | "collection"
  | "research"
  | "faction"
  | "errand"
  | "hidden";

export type QuestProgressStatus =
  | "inactive"
  | "available"
  | "active"
  | "readyToTurnIn"
  | "completed"
  | "failed";

export type QuestObjectiveTrigger =
  | "garden-action"
  | "dialogue"
  | "body-acquired"
  | "circle-managed"
  | "trial-completed"
  | "sovereign-hint";

export type QuestCondition =
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
      type: "has-body";
      bodyId?: string;
    }
  | {
      type: "has-item";
      itemId: string;
      count?: number;
    };

export type RewardDefinition =
  | {
      type: "item";
      itemId: string;
      count?: number;
    }
  | {
      type: "flag";
      flag: string;
      value: boolean | number | string;
    }
  | {
      type: "heal-circle";
      amount: number;
    }
  | {
      type: "experience";
      amount: number;
      slotIndex?: number;
    };

export type QuestObjectiveDefinition = {
  id: string;
  label: string;
  trigger: QuestObjectiveTrigger;
  targetId?: string;
  targetCount?: number;
  journalText?: string;
};

export type QuestDefinition = {
  id: QuestId;
  title: string;
  category: QuestCategory;
  objectives: readonly QuestObjectiveDefinition[];
  prerequisites?: readonly QuestCondition[];
  rewards: readonly RewardDefinition[];
  journalText: Record<QuestProgressStatus, string>;
  initialState?: QuestProgressStatus;
};

export type QuestProgress = {
  state: QuestProgressStatus;
  objectiveProgress: Record<string, number>;
  trackedObjectiveId?: string;
  rewardsClaimed?: boolean;
};

export type QuestState = Record<QuestId, QuestProgress>;

const firstTrial = TRIALS[FIRST_TRIAL_ID];

export const QUEST_DEFINITIONS: Record<QuestId, QuestDefinition> = {
  [MAIN_QUEST_ID]: {
    id: MAIN_QUEST_ID,
    title: "Motehaven Awakening",
    category: "main",
    initialState: "active",
    objectives: [
      {
        id: "care-for-luma",
        label: "Care for Luma in the Garden.",
        trigger: "garden-action",
      },
      {
        id: "meet-guide-mira",
        label: "Speak with Guide Mira near the east hedge.",
        trigger: "dialogue",
        targetId: "guide-mira",
      },
      {
        id: "acquire-wild-body",
        label: "Win a Route 1 battle and acquire a wild body.",
        trigger: "body-acquired",
      },
      {
        id: "inspect-circle",
        label: "Inspect your Circle and pairing.",
        trigger: "circle-managed",
      },
      {
        id: "clear-precision-trial",
        label: "Defeat Cal Venn in the Precision Trial.",
        trigger: "trial-completed",
        targetId: FIRST_TRIAL_ID,
      },
      {
        id: "decode-sovereign-signal",
        label: "Record the Sovereign Weights signal.",
        trigger: "sovereign-hint",
        targetId: "sovereign-weights",
      },
    ],
    rewards: [
      {
        type: "flag",
        flag: "quest.main.chapterOneComplete",
        value: true,
      },
    ],
    journalText: {
      inactive: "The Garden is quiet.",
      available: "Luma is waiting in the Garden.",
      active: "Follow Luma's first chapter through Motehaven.",
      readyToTurnIn: "The Sovereign signal is recorded.",
      completed:
        "Chapter 1 is complete. Follow the Sovereign Weights signal next.",
      failed: "The Motehaven route has stalled.",
    },
  },
  [TRIAL_QUEST_ID]: {
    id: TRIAL_QUEST_ID,
    title: firstTrial.name,
    category: "trial",
    initialState: "inactive",
    prerequisites: [
      {
        type: "objective-complete",
        questId: MAIN_QUEST_ID,
        objectiveId: "meet-guide-mira",
      },
    ],
    objectives: [
      {
        id: "clear-first-trial",
        label: "Challenge Cal Venn and win the Precision Trial.",
        trigger: "trial-completed",
        targetId: FIRST_TRIAL_ID,
      },
    ],
    rewards: [
      {
        type: "item",
        itemId: firstTrial.rewardInventoryKey,
      },
      {
        type: "flag",
        flag: firstTrial.completionFlag,
        value: true,
      },
    ],
    journalText: {
      inactive: "Guide Mira has not introduced the Trial path yet.",
      available: "The Optima arena is open for a challenge.",
      active: "Cal Venn is waiting in the Optima arena.",
      readyToTurnIn: "Report the Trial result.",
      completed: "The Precision Mark is yours.",
      failed: "Cal Venn held the line. Prepare and try again.",
    },
  },
  [BODY_RESEARCH_QUEST_ID]: {
    id: BODY_RESEARCH_QUEST_ID,
    title: "First Wild Body",
    category: "research",
    initialState: "active",
    objectives: [
      {
        id: "acquire-route-body",
        label: "Acquire one wild body from Route 1.",
        trigger: "body-acquired",
      },
    ],
    rewards: [
      {
        type: "item",
        itemId: "patch-pulse",
      },
    ],
    journalText: {
      inactive: "No body research is active.",
      available: "Route 1 has wild bodies worth cataloging.",
      active: "Acquire a wild body so Mira can compare body and mind data.",
      readyToTurnIn: "The first wild body is recorded.",
      completed: "Mira's first body sample is complete.",
      failed: "The body sample was lost.",
    },
  },
};

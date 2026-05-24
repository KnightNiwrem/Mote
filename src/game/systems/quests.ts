import { MOTE_BODIES } from "@/game/data/bodies";
import { MOTE_MINDS } from "@/game/data/minds";
import {
  BODY_RESEARCH_QUEST_ID,
  MAIN_QUEST_ID,
  QUEST_DEFINITIONS,
  type QuestCondition,
  type QuestDefinition,
  type QuestId,
  type QuestObjectiveDefinition,
  type QuestObjectiveTrigger,
  type QuestProgress,
  type QuestProgressStatus,
  type QuestState,
  type RewardDefinition,
  TRIAL_QUEST_ID,
} from "@/game/data/quests";
import { TRIALS } from "@/game/data/trials";
import { addInventoryItem } from "@/game/systems/inventory";
import { calculateMindBodyStats } from "@/game/systems/mindBody";
import { updateCircleSlot } from "@/game/systems/moteCircle";
import type { SaveGame } from "@/game/types/save";

export type QuestAction =
  | {
      type: "start";
      questId: QuestId;
    }
  | {
      type: "advance";
      trigger: QuestObjectiveTrigger;
      targetId?: string;
      amount?: number;
      questId?: QuestId;
      objectiveId?: string;
    }
  | {
      type: "complete";
      questId: QuestId;
    }
  | {
      type: "claim-rewards";
      questId: QuestId;
    }
  | {
      type: "fail";
      questId: QuestId;
    };

export type QuestJournalEntry = {
  id: QuestId;
  title: string;
  category: QuestDefinition["category"];
  status: QuestProgressStatus;
  journalText: string;
  currentObjective: string;
  rewardText: string;
};

type QuestMigrationContext = {
  questFlags?: Record<string, boolean | number | string>;
  acquiredBodies?: string[];
  inventory?: Record<string, number>;
};

export function createInitialQuestState(): QuestState {
  return Object.fromEntries(
    Object.values(QUEST_DEFINITIONS).map((definition) => [
      definition.id,
      createQuestProgress(definition, definition.initialState ?? "inactive"),
    ]),
  ) as QuestState;
}

export function questReducer(
  questState: QuestState,
  action: QuestAction,
  context: QuestMigrationContext = {},
): QuestState {
  switch (action.type) {
    case "start":
      return refreshAvailableQuests(
        updateQuest(questState, action.questId, (progress, definition) => {
          if (progress.state !== "inactive" && progress.state !== "available") {
            return progress;
          }

          return withTrackedObjective(definition, {
            ...progress,
            state: "active",
          });
        }),
        context,
      );
    case "advance":
      return refreshAvailableQuests(
        advanceMatchingObjectives(questState, action),
        context,
      );
    case "complete":
      return refreshAvailableQuests(
        updateQuest(questState, action.questId, (progress, definition) =>
          withTrackedObjective(definition, {
            ...progress,
            state: "completed",
            objectiveProgress: completeAllObjectives(definition),
          }),
        ),
        context,
      );
    case "claim-rewards":
      return refreshAvailableQuests(
        updateQuest(questState, action.questId, (progress, definition) => {
          if (
            progress.rewardsClaimed ||
            (progress.state !== "readyToTurnIn" &&
              progress.state !== "completed")
          ) {
            return progress;
          }

          return withTrackedObjective(definition, {
            ...progress,
            state: "completed",
            rewardsClaimed: true,
          });
        }),
        context,
      );
    case "fail":
      return refreshAvailableQuests(
        updateQuest(questState, action.questId, (progress, definition) =>
          withTrackedObjective(definition, {
            ...progress,
            state: "failed",
          }),
        ),
        context,
      );
  }
}

export function applyQuestActionToSave(
  save: SaveGame,
  action: QuestAction,
): SaveGame {
  const before = save.quests;
  const quests = questReducer(
    save.quests,
    action,
    getQuestConditionContext(save),
  );
  let nextSave: SaveGame = {
    ...save,
    quests,
  };

  if (action.type !== "claim-rewards") {
    return nextSave;
  }

  const beforeProgress = before[action.questId];
  const afterProgress = quests[action.questId];

  if (!afterProgress?.rewardsClaimed || beforeProgress?.rewardsClaimed) {
    return nextSave;
  }

  for (const reward of QUEST_DEFINITIONS[action.questId].rewards) {
    nextSave = applyRewardToSave(nextSave, reward);
  }

  return {
    ...nextSave,
    quests: refreshAvailableQuests(
      nextSave.quests,
      getQuestConditionContext(nextSave),
    ),
  };
}

export function completeQuestAndClaimRewards(
  save: SaveGame,
  questId: QuestId,
): SaveGame {
  return applyQuestActionToSave(
    applyQuestActionToSave(save, { type: "complete", questId }),
    { type: "claim-rewards", questId },
  );
}

export function advanceQuestObjective(
  save: SaveGame,
  input: Extract<QuestAction, { type: "advance" }>,
): SaveGame {
  return applyQuestActionToSave(save, input);
}

export function applyRewardToSave(
  save: SaveGame,
  reward: RewardDefinition,
): SaveGame {
  if (reward.type === "item") {
    const result = addInventoryItem(
      save.inventory,
      reward.itemId,
      reward.count,
    );

    return {
      ...save,
      inventory: result.inventory,
    };
  }

  if (reward.type === "flag") {
    return {
      ...save,
      questFlags: {
        ...save.questFlags,
        [reward.flag]: reward.value,
      },
    };
  }

  if (reward.type === "experience") {
    const slotIndex = reward.slotIndex ?? 0;

    return {
      ...save,
      circle: updateCircleSlot(save.circle, slotIndex, (slot) =>
        slot.state === "occupied"
          ? { ...slot, experience: slot.experience + reward.amount }
          : slot,
      ),
    };
  }

  return {
    ...save,
    circle: save.circle.map((slot) => {
      if (slot.state !== "occupied") {
        return slot;
      }

      const body = MOTE_BODIES[slot.bodyId];
      const mind = MOTE_MINDS[slot.mindId];
      const maxHp = body && mind ? calculateMindBodyStats(body, mind).hp : 999;

      return {
        ...slot,
        currentHp: Math.min(maxHp, slot.currentHp + reward.amount),
      };
    }),
  };
}

export function getQuestJournalEntries(save: SaveGame): QuestJournalEntry[] {
  return Object.values(QUEST_DEFINITIONS)
    .map((definition) => {
      const progress =
        save.quests[definition.id] ??
        createQuestProgress(definition, definition.initialState ?? "inactive");
      const objective = getTrackedObjective(definition, progress);

      return {
        id: definition.id,
        title: definition.title,
        category: definition.category,
        status: progress.state,
        journalText: definition.journalText[progress.state],
        currentObjective:
          objective?.journalText ??
          objective?.label ??
          definition.journalText.completed,
        rewardText: formatRewards(definition.rewards),
      };
    })
    .filter((entry) => entry.status !== "inactive");
}

export function getCurrentObjective(save: SaveGame): string {
  const entries = getQuestJournalEntries(save);
  const mainEntry = entries.find(
    (entry) =>
      entry.id === MAIN_QUEST_ID &&
      (entry.status === "active" || entry.status === "readyToTurnIn"),
  );

  if (mainEntry) {
    return mainEntry.currentObjective;
  }

  const activeEntry = entries.find(
    (entry) => entry.status === "active" || entry.status === "readyToTurnIn",
  );

  if (activeEntry) {
    return activeEntry.currentObjective;
  }

  const completedMain = entries.find((entry) => entry.id === MAIN_QUEST_ID);
  return completedMain?.journalText ?? "Review your quest journal.";
}

export function isQuestObjectiveComplete(
  questState: QuestState,
  questId: QuestId,
  objectiveId: string,
): boolean {
  const definition = QUEST_DEFINITIONS[questId];
  const objective = definition.objectives.find(
    (candidate) => candidate.id === objectiveId,
  );
  const progress = questState[questId];

  if (!objective || !progress) {
    return false;
  }

  return (
    getObjectiveProgress(progress, objective) >= getObjectiveTarget(objective)
  );
}

export function isQuestCompleted(
  questState: QuestState,
  questId: QuestId,
): boolean {
  return questState[questId]?.state === "completed";
}

export function areQuestConditionsMet(
  save: SaveGame,
  conditions: readonly QuestCondition[] | undefined,
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) =>
    isQuestConditionMet(save.quests, condition, getQuestConditionContext(save)),
  );
}

export function validateQuestState(
  value: unknown,
  context: QuestMigrationContext = {},
): QuestState | null {
  if (!isRecord(value)) {
    return null;
  }

  const initial = migrateQuestStateFromLegacy(context);
  const entries = Object.entries(QUEST_DEFINITIONS).map(
    ([questId, definition]) => {
      const candidate = value[questId];
      const progress =
        validateQuestProgress(candidate, definition) ??
        initial[questId as QuestId];

      return [questId, progress];
    },
  );

  return refreshAvailableQuests(
    Object.fromEntries(entries) as QuestState,
    context,
  );
}

export function migrateQuestStateFromLegacy(
  context: QuestMigrationContext = {},
): QuestState {
  let state = createInitialQuestState();
  const flags = context.questFlags ?? {};
  const acquiredBodies = context.acquiredBodies ?? [];
  const inventory = context.inventory ?? {};
  const firstTrial = TRIALS["first-trial"];

  if (flags["story.luma.met"] === true) {
    state = questReducer(
      state,
      {
        type: "advance",
        trigger: "garden-action",
        objectiveId: "care-for-luma",
        questId: MAIN_QUEST_ID,
      },
      context,
    );
  }

  if (flags["story.mira.met"] === true) {
    state = questReducer(
      state,
      {
        type: "advance",
        trigger: "dialogue",
        targetId: "guide-mira",
      },
      context,
    );
  }

  if (acquiredBodies.some((bodyId) => bodyId !== "glowbud")) {
    state = questReducer(
      state,
      {
        type: "advance",
        trigger: "body-acquired",
      },
      context,
    );
  }

  if (
    flags[firstTrial.completionFlag] === true ||
    (inventory[firstTrial.rewardInventoryKey] ?? 0) > 0
  ) {
    state = questReducer(
      state,
      {
        type: "start",
        questId: TRIAL_QUEST_ID,
      },
      context,
    );
    state = questReducer(
      state,
      {
        type: "advance",
        trigger: "trial-completed",
        targetId: firstTrial.id,
      },
      context,
    );
    state = questReducer(
      state,
      {
        type: "complete",
        questId: TRIAL_QUEST_ID,
      },
      context,
    );
    state = questReducer(
      state,
      {
        type: "claim-rewards",
        questId: TRIAL_QUEST_ID,
      },
      context,
    );
  }

  if (flags[firstTrial.storyHintFlag] === "introduced") {
    state = questReducer(
      state,
      {
        type: "advance",
        trigger: "sovereign-hint",
        targetId: "sovereign-weights",
      },
      context,
    );
    state = questReducer(
      state,
      {
        type: "complete",
        questId: MAIN_QUEST_ID,
      },
      context,
    );
    state = questReducer(
      state,
      {
        type: "claim-rewards",
        questId: MAIN_QUEST_ID,
      },
      context,
    );
  }

  if (
    isQuestObjectiveComplete(
      state,
      BODY_RESEARCH_QUEST_ID,
      "acquire-route-body",
    )
  ) {
    state = questReducer(
      state,
      {
        type: "complete",
        questId: BODY_RESEARCH_QUEST_ID,
      },
      context,
    );
    state = questReducer(
      state,
      {
        type: "claim-rewards",
        questId: BODY_RESEARCH_QUEST_ID,
      },
      context,
    );
  }

  return refreshAvailableQuests(state, context);
}

function advanceMatchingObjectives(
  questState: QuestState,
  action: Extract<QuestAction, { type: "advance" }>,
): QuestState {
  let nextState = questState;

  for (const definition of Object.values(QUEST_DEFINITIONS)) {
    if (action.questId && action.questId !== definition.id) {
      continue;
    }

    const progress = nextState[definition.id];

    if (!progress || progress.state !== "active") {
      continue;
    }

    const nextProgress = advanceQuestProgress(definition, progress, action);

    if (nextProgress !== progress) {
      nextState = {
        ...nextState,
        [definition.id]: nextProgress,
      };
    }
  }

  return nextState;
}

function advanceQuestProgress(
  definition: QuestDefinition,
  progress: QuestProgress,
  action: Extract<QuestAction, { type: "advance" }>,
): QuestProgress {
  let changed = false;
  const objectiveProgress = { ...progress.objectiveProgress };

  for (const objective of definition.objectives) {
    if (!doesActionMatchObjective(action, objective)) {
      continue;
    }

    const current = objectiveProgress[objective.id] ?? 0;
    const target = getObjectiveTarget(objective);
    const next = Math.min(target, current + (action.amount ?? 1));

    if (next !== current) {
      objectiveProgress[objective.id] = next;
      changed = true;
    }
  }

  if (!changed) {
    return progress;
  }

  const nextProgress: QuestProgress = {
    ...progress,
    objectiveProgress,
  };

  return withTrackedObjective(definition, {
    ...nextProgress,
    state: areAllObjectivesComplete(definition, nextProgress)
      ? "readyToTurnIn"
      : progress.state,
  });
}

function doesActionMatchObjective(
  action: Extract<QuestAction, { type: "advance" }>,
  objective: QuestObjectiveDefinition,
): boolean {
  if (action.objectiveId && action.objectiveId !== objective.id) {
    return false;
  }

  if (action.trigger !== objective.trigger) {
    return false;
  }

  return objective.targetId === undefined
    ? true
    : objective.targetId === action.targetId;
}

function refreshAvailableQuests(
  questState: QuestState,
  context: QuestMigrationContext = {},
): QuestState {
  let nextState = questState;

  for (const definition of Object.values(QUEST_DEFINITIONS)) {
    const progress = nextState[definition.id];

    if (!progress || progress.state !== "inactive") {
      continue;
    }

    if (
      areQuestConditionsMetForState(
        nextState,
        definition.prerequisites,
        context,
      )
    ) {
      nextState = {
        ...nextState,
        [definition.id]: withTrackedObjective(definition, {
          ...progress,
          state: "available",
        }),
      };
    }
  }

  return nextState;
}

function areQuestConditionsMetForState(
  questState: QuestState,
  conditions: readonly QuestCondition[] | undefined,
  context: QuestMigrationContext = {},
): boolean {
  if (!conditions || conditions.length === 0) {
    return false;
  }

  return conditions.every((condition) =>
    isQuestConditionMet(questState, condition, context),
  );
}

function isQuestConditionMet(
  questState: QuestState,
  condition: QuestCondition,
  context: QuestMigrationContext = {},
): boolean {
  if (condition.type === "flag") {
    const value = context.questFlags?.[condition.flag];

    return condition.value === undefined
      ? Boolean(value)
      : value === condition.value;
  }

  if (condition.type === "quest-state") {
    return questState[condition.questId]?.state === condition.state;
  }

  if (condition.type === "objective-complete") {
    return isQuestObjectiveComplete(
      questState,
      condition.questId,
      condition.objectiveId,
    );
  }

  if (condition.type === "has-body") {
    const acquiredBodies = context.acquiredBodies ?? [];

    return condition.bodyId
      ? acquiredBodies.includes(condition.bodyId)
      : acquiredBodies.length > 1;
  }

  return (context.inventory?.[condition.itemId] ?? 0) >= (condition.count ?? 1);
}

function getQuestConditionContext(save: SaveGame): QuestMigrationContext {
  return {
    questFlags: save.questFlags,
    acquiredBodies: save.acquiredBodies,
    inventory: save.inventory,
  };
}

function updateQuest(
  questState: QuestState,
  questId: QuestId,
  update: (
    progress: QuestProgress,
    definition: QuestDefinition,
  ) => QuestProgress,
): QuestState {
  const definition = QUEST_DEFINITIONS[questId];
  const progress = questState[questId] ?? createQuestProgress(definition);

  return {
    ...questState,
    [questId]: update(progress, definition),
  };
}

function createQuestProgress(
  definition: QuestDefinition,
  state: QuestProgressStatus = "inactive",
): QuestProgress {
  return withTrackedObjective(definition, {
    state,
    objectiveProgress: Object.fromEntries(
      definition.objectives.map((objective) => [objective.id, 0]),
    ),
  });
}

function validateQuestProgress(
  value: unknown,
  definition: QuestDefinition,
): QuestProgress | null {
  if (!isRecord(value) || !isQuestProgressStatus(value.state)) {
    return null;
  }

  const rawObjectiveProgress = isRecord(value.objectiveProgress)
    ? value.objectiveProgress
    : {};
  const objectiveProgress = Object.fromEntries(
    definition.objectives.map((objective) => {
      const rawCount = rawObjectiveProgress[objective.id];
      const count = Number.isInteger(rawCount) ? Number(rawCount) : 0;

      return [
        objective.id,
        Math.min(Math.max(0, count), getObjectiveTarget(objective)),
      ];
    }),
  );

  return withTrackedObjective(definition, {
    state: value.state,
    objectiveProgress,
    rewardsClaimed:
      typeof value.rewardsClaimed === "boolean"
        ? value.rewardsClaimed
        : undefined,
  });
}

function withTrackedObjective(
  definition: QuestDefinition,
  progress: QuestProgress,
): QuestProgress {
  const trackedObjective = getTrackedObjective(definition, progress);

  return {
    ...progress,
    trackedObjectiveId: trackedObjective?.id,
  };
}

function getTrackedObjective(
  definition: QuestDefinition,
  progress: QuestProgress,
): QuestObjectiveDefinition | null {
  return (
    definition.objectives.find(
      (objective) =>
        getObjectiveProgress(progress, objective) <
        getObjectiveTarget(objective),
    ) ??
    definition.objectives[definition.objectives.length - 1] ??
    null
  );
}

function areAllObjectivesComplete(
  definition: QuestDefinition,
  progress: QuestProgress,
): boolean {
  return definition.objectives.every(
    (objective) =>
      getObjectiveProgress(progress, objective) >=
      getObjectiveTarget(objective),
  );
}

function completeAllObjectives(
  definition: QuestDefinition,
): Record<string, number> {
  return Object.fromEntries(
    definition.objectives.map((objective) => [
      objective.id,
      getObjectiveTarget(objective),
    ]),
  );
}

function getObjectiveProgress(
  progress: QuestProgress,
  objective: QuestObjectiveDefinition,
): number {
  return progress.objectiveProgress[objective.id] ?? 0;
}

function getObjectiveTarget(objective: QuestObjectiveDefinition): number {
  return objective.targetCount ?? 1;
}

function formatRewards(rewards: readonly RewardDefinition[]): string {
  if (rewards.length === 0) {
    return "No reward";
  }

  return rewards
    .map((reward) => {
      if (reward.type === "item") {
        return `${reward.count ?? 1} ${reward.itemId}`;
      }

      if (reward.type === "experience") {
        return `${reward.amount} XP`;
      }

      if (reward.type === "heal-circle") {
        return `${reward.amount} HP recovery`;
      }

      return reward.flag;
    })
    .join(", ");
}

function isQuestProgressStatus(value: unknown): value is QuestProgressStatus {
  return (
    value === "inactive" ||
    value === "available" ||
    value === "active" ||
    value === "readyToTurnIn" ||
    value === "completed" ||
    value === "failed"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import { expect, test } from "bun:test";
import {
  BODY_RESEARCH_QUEST_ID,
  MAIN_QUEST_ID,
  QUEST_DEFINITIONS,
  type QuestCondition,
  TRIAL_QUEST_ID,
} from "@/game/data/quests";
import { createInitialSaveGame } from "@/game/systems/save";
import {
  advanceQuestObjective,
  applyQuestActionToSave,
  completeQuestAndClaimRewards,
  createInitialQuestState,
  getCurrentObjective,
  getQuestJournalEntries,
  isQuestObjectiveComplete,
  questReducer,
  validateQuestState,
} from "./quests";

test("initial quest state gives the player a visible objective", () => {
  const save = createInitialSaveGame();

  expect(save.quests[MAIN_QUEST_ID]?.state).toBe("active");
  expect(getCurrentObjective(save)).toBe("Care for Luma in the Garden.");
  expect(getQuestJournalEntries(save).map((entry) => entry.id)).toEqual([
    MAIN_QUEST_ID,
    BODY_RESEARCH_QUEST_ID,
  ]);
});

test("quest reducer starts, advances, completes, claims, and fails quests", () => {
  let state = createInitialQuestState();

  state = questReducer(state, {
    type: "advance",
    trigger: "dialogue",
    targetId: "guide-mira",
    questId: MAIN_QUEST_ID,
    objectiveId: "meet-guide-mira",
  });
  expect(state[TRIAL_QUEST_ID]?.state).toBe("available");

  state = questReducer(state, { type: "start", questId: TRIAL_QUEST_ID });
  expect(state[TRIAL_QUEST_ID]?.state).toBe("active");

  state = questReducer(state, {
    type: "advance",
    trigger: "trial-completed",
    targetId: "first-trial",
  });
  expect(state[TRIAL_QUEST_ID]?.state).toBe("readyToTurnIn");

  state = questReducer(state, { type: "complete", questId: TRIAL_QUEST_ID });
  state = questReducer(state, {
    type: "claim-rewards",
    questId: TRIAL_QUEST_ID,
  });
  expect(state[TRIAL_QUEST_ID]?.state).toBe("completed");
  expect(state[TRIAL_QUEST_ID]?.rewardsClaimed).toBe(true);

  state = questReducer(state, {
    type: "fail",
    questId: BODY_RESEARCH_QUEST_ID,
  });
  expect(state[BODY_RESEARCH_QUEST_ID]?.state).toBe("failed");
});

test("objective counters advance only matching triggers and targets", () => {
  let state = questReducer(createInitialQuestState(), {
    type: "advance",
    trigger: "dialogue",
    objectiveId: "meet-guide-mira",
  });
  state = questReducer(state, {
    type: "advance",
    trigger: "trial-completed",
    targetId: "wrong-trial",
  });

  expect(
    isQuestObjectiveComplete(state, MAIN_QUEST_ID, "meet-guide-mira"),
  ).toBe(false);
  expect(
    isQuestObjectiveComplete(state, MAIN_QUEST_ID, "clear-precision-trial"),
  ).toBe(false);

  state = questReducer(state, {
    type: "advance",
    trigger: "body-acquired",
    targetId: "reedling",
    amount: 1,
  });

  expect(
    isQuestObjectiveComplete(state, MAIN_QUEST_ID, "acquire-wild-body"),
  ).toBe(true);
  expect(
    isQuestObjectiveComplete(
      state,
      BODY_RESEARCH_QUEST_ID,
      "acquire-route-body",
    ),
  ).toBe(true);
  expect(
    isQuestObjectiveComplete(state, MAIN_QUEST_ID, "clear-precision-trial"),
  ).toBe(false);
});

test("Phase 11 quest objectives progress through the full chapter sequence", () => {
  let save = createInitialSaveGame();

  save = advanceQuestObjective(save, {
    type: "advance",
    trigger: "garden-action",
  });
  expect(getCurrentObjective(save)).toBe(
    "Speak with Guide Mira near the east hedge.",
  );

  save = advanceQuestObjective(save, {
    type: "advance",
    trigger: "dialogue",
    targetId: "guide-mira",
  });
  expect(save.quests[TRIAL_QUEST_ID]?.state).toBe("available");
  expect(getCurrentObjective(save)).toBe(
    "Win a Route 1 battle and acquire a wild body.",
  );

  save = advanceQuestObjective(save, {
    type: "advance",
    trigger: "body-acquired",
  });
  save = advanceQuestObjective(save, {
    type: "advance",
    trigger: "circle-managed",
  });
  save = applyQuestActionToSave(save, {
    type: "start",
    questId: TRIAL_QUEST_ID,
  });
  save = advanceQuestObjective(save, {
    type: "advance",
    trigger: "trial-completed",
    targetId: "first-trial",
  });
  save = advanceQuestObjective(save, {
    type: "advance",
    trigger: "sovereign-hint",
    targetId: "sovereign-weights",
  });

  expect(save.quests[MAIN_QUEST_ID]?.state).toBe("readyToTurnIn");
  for (const objective of QUEST_DEFINITIONS[MAIN_QUEST_ID].objectives) {
    expect(
      isQuestObjectiveComplete(save.quests, MAIN_QUEST_ID, objective.id),
    ).toBe(true);
  }

  save = completeQuestAndClaimRewards(save, MAIN_QUEST_ID);
  expect(save.questFlags["quest.main.chapterOneComplete"]).toBe(true);
});

test("quest prerequisites can use flags, bodies, and items from save context", () => {
  const originalPrerequisites = QUEST_DEFINITIONS[TRIAL_QUEST_ID].prerequisites;
  const contextPrerequisites: QuestCondition[] = [
    {
      type: "flag",
      flag: "quest.context.ready",
      value: true,
    },
    {
      type: "has-body",
      bodyId: "reedling",
    },
    {
      type: "has-item",
      itemId: "trial-pass",
      count: 2,
    },
  ];

  try {
    QUEST_DEFINITIONS[TRIAL_QUEST_ID].prerequisites = contextPrerequisites;

    const unavailable = validateQuestState(createInitialQuestState(), {});
    expect(unavailable?.[TRIAL_QUEST_ID]?.state).toBe("inactive");

    const available = validateQuestState(createInitialQuestState(), {
      questFlags: { "quest.context.ready": true },
      acquiredBodies: ["glowbud", "reedling"],
      inventory: { "trial-pass": 2 },
    });

    expect(available?.[TRIAL_QUEST_ID]?.state).toBe("available");
    expect(createInitialQuestState()[TRIAL_QUEST_ID]?.state).toBe("inactive");

    QUEST_DEFINITIONS[TRIAL_QUEST_ID].prerequisites = [
      {
        type: "has-item",
        itemId: "patch-pulse",
        count: 3,
      },
    ];

    const rewarded = completeQuestAndClaimRewards(
      createInitialSaveGame(),
      BODY_RESEARCH_QUEST_ID,
    );

    expect(rewarded.inventory["patch-pulse"]).toBe(3);
    expect(rewarded.quests[TRIAL_QUEST_ID]?.state).toBe("available");
  } finally {
    QUEST_DEFINITIONS[TRIAL_QUEST_ID].prerequisites = originalPrerequisites;
  }
});

test("quest rewards apply once to save data", () => {
  const save = createInitialSaveGame();
  const completed = completeQuestAndClaimRewards(save, BODY_RESEARCH_QUEST_ID);
  const repeated = completeQuestAndClaimRewards(
    completed,
    BODY_RESEARCH_QUEST_ID,
  );

  expect(completed.inventory["patch-pulse"]).toBe(3);
  expect(repeated.inventory["patch-pulse"]).toBe(3);
  expect(repeated.quests[BODY_RESEARCH_QUEST_ID]?.rewardsClaimed).toBe(true);
});

test("quest journal exposes titles, categories, objectives, and rewards", () => {
  const save = advanceQuestObjective(createInitialSaveGame(), {
    type: "advance",
    trigger: "garden-action",
    targetId: "feed",
  });
  const mainEntry = getQuestJournalEntries(save).find(
    (entry) => entry.id === MAIN_QUEST_ID,
  );

  expect(mainEntry?.title).toBe(QUEST_DEFINITIONS[MAIN_QUEST_ID].title);
  expect(mainEntry?.category).toBe("main");
  expect(mainEntry?.currentObjective).toBe(
    "Speak with Guide Mira near the east hedge.",
  );
  expect(mainEntry?.rewardText).toContain("quest.main.chapterOneComplete");
});

test("quest actions persist state through save-shaped data", () => {
  const save = applyQuestActionToSave(createInitialSaveGame(), {
    type: "advance",
    trigger: "garden-action",
  });

  expect(save.quests[MAIN_QUEST_ID]?.objectiveProgress["care-for-luma"]).toBe(
    1,
  );
});

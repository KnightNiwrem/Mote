import { expect, test } from "bun:test";
import {
  BODY_RESEARCH_QUEST_ID,
  MAIN_QUEST_ID,
  QUEST_DEFINITIONS,
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
  const state = questReducer(createInitialQuestState(), {
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

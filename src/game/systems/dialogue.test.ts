import { expect, test } from "bun:test";
import {
  CAL_VENN_DIALOGUE_ID,
  DIALOGUES,
  GUIDE_MIRA_DIALOGUE_ID,
  LUMA_DIALOGUE_ID,
  WILD_BODY_DIALOGUE_ID,
} from "@/game/data/dialogue";
import {
  BODY_RESEARCH_QUEST_ID,
  MAIN_QUEST_ID,
  TRIAL_QUEST_ID,
} from "@/game/data/quests";
import { createInitialSaveGame } from "@/game/systems/save";
import {
  advanceDialogue,
  applyDialogueEffects,
  getDialogueDefinition,
  getDialogueStartView,
  getDialogueView,
} from "./dialogue";
import { advanceQuestObjective, getQuestJournalEntries } from "./quests";

test("dialogue condition selection picks first-talk, repeat, and post-Trial variants", () => {
  const save = createInitialSaveGame();
  const firstTalk = getDialogueStartView(GUIDE_MIRA_DIALOGUE_ID, save);

  expect(firstTalk.view.type).toBe("line");
  expect(firstTalk.view.type === "line" ? firstTalk.view.text : "").toContain(
    "splits bodies from minds",
  );

  const repeatTalk = getDialogueStartView(GUIDE_MIRA_DIALOGUE_ID, {
    ...save,
    questFlags: { "story.mira.met": true },
  });

  expect(repeatTalk.view.type === "line" ? repeatTalk.view.text : "").toContain(
    "Route 1 is still the best teacher",
  );

  const questGatedRepeat = getDialogueStartView(GUIDE_MIRA_DIALOGUE_ID, {
    ...save,
    quests: {
      ...save.quests,
      [MAIN_QUEST_ID]: {
        ...save.quests[MAIN_QUEST_ID],
        objectiveProgress: {
          ...save.quests[MAIN_QUEST_ID]?.objectiveProgress,
          "meet-guide-mira": 1,
        },
      },
    },
  });

  expect(
    questGatedRepeat.view.type === "line" ? questGatedRepeat.view.text : "",
  ).toContain("Route 1 is still the best teacher");

  const postTrial = getDialogueStartView(GUIDE_MIRA_DIALOGUE_ID, {
    ...save,
    quests: {
      ...save.quests,
      [TRIAL_QUEST_ID]: {
        ...save.quests[TRIAL_QUEST_ID],
        state: "completed",
      },
    },
  });

  expect(postTrial.view.type === "line" ? postTrial.view.text : "").toContain(
    "Sovereign signals",
  );

  const lumaPostTrial = getDialogueStartView(LUMA_DIALOGUE_ID, {
    ...save,
    quests: {
      ...save.quests,
      [TRIAL_QUEST_ID]: {
        ...save.quests[TRIAL_QUEST_ID],
        state: "completed",
      },
    },
  });

  expect(
    lumaPostTrial.view.type === "line" ? lumaPostTrial.view.text : "",
  ).toContain("after the mark");
});

test("dialogue graph traversal advances from line to choice", () => {
  const save = createInitialSaveGame();
  const definition = getDialogueDefinition(WILD_BODY_DIALOGUE_ID);
  const start = getDialogueView(definition, "start", save, {
    bodyName: "Reedling",
  });
  const result = advanceDialogue({
    dialogueId: WILD_BODY_DIALOGUE_ID,
    nodeId: "start",
    save,
    variables: { bodyName: "Reedling" },
  });

  expect(start.type === "line" ? start.text : "").toContain("Reedling");
  expect(result.nextNodeId).toBe("assignment");
  expect(result.view.type).toBe("choice");
  expect(result.view.type === "choice" ? result.view.choices : []).toHaveLength(
    2,
  );
});

test("dialogue effects update flags, quests, and commands", () => {
  const save = createInitialSaveGame();
  const result = advanceDialogue({
    dialogueId: GUIDE_MIRA_DIALOGUE_ID,
    nodeId: "start",
    save,
  });

  expect(result.save.questFlags["story.mira.met"]).toBe(true);
  expect(
    result.save.quests[MAIN_QUEST_ID]?.objectiveProgress["meet-guide-mira"],
  ).toBe(1);
  expect(result.save.quests[TRIAL_QUEST_ID]?.state).toBe("active");
});

test("Guide Mira dialogue updates the quest journal to the Route 1 objective", () => {
  const save = advanceQuestObjective(createInitialSaveGame(), {
    type: "advance",
    trigger: "garden-action",
  });
  const result = advanceDialogue({
    dialogueId: GUIDE_MIRA_DIALOGUE_ID,
    nodeId: "start",
    save,
  });
  const mainEntry = getQuestJournalEntries(result.save).find(
    (entry) => entry.id === MAIN_QUEST_ID,
  );

  expect(mainEntry?.currentObjective).toBe(
    "Win a Route 1 battle and acquire a wild body.",
  );
});

test("dialogue effects can grant rewards, heal, open menus, and start battles", () => {
  const damagedSave = {
    ...createInitialSaveGame(),
    circle: createInitialSaveGame().circle.map((slot, index) =>
      index === 0 && slot.state === "occupied"
        ? { ...slot, currentHp: 2 }
        : slot,
    ),
  };
  const result = applyDialogueEffects(damagedSave, [
    {
      type: "giveItem",
      itemId: "patch-pulse",
      count: 1,
    },
    {
      type: "healCircle",
      amount: 3,
    },
    {
      type: "openMenu",
      menu: "quests",
    },
    {
      type: "startBattle",
      battleKind: "trial",
      trialId: "first-trial",
    },
  ]);

  expect(result.save.inventory["patch-pulse"]).toBe(3);
  expect(
    result.save.circle[0]?.state === "occupied"
      ? result.save.circle[0].currentHp
      : 0,
  ).toBe(5);
  expect(result.commands).toEqual([
    { type: "openMenu", menu: "quests" },
    { type: "startBattle", battleKind: "trial", trialId: "first-trial" },
  ]);
});

test("dialogue effects complete quests, claim rewards, and start cutscenes", () => {
  const result = applyDialogueEffects(createInitialSaveGame(), [
    {
      type: "completeQuest",
      questId: MAIN_QUEST_ID,
    },
    {
      type: "claimQuestRewards",
      questId: BODY_RESEARCH_QUEST_ID,
    },
    {
      type: "startCutscene",
      cutsceneId: "sovereign-hint",
    },
  ]);

  expect(result.save.quests[MAIN_QUEST_ID]?.state).toBe("completed");
  expect(result.save.questFlags["quest.main.chapterOneComplete"]).toBe(
    undefined,
  );
  expect(result.save.quests[BODY_RESEARCH_QUEST_ID]?.rewardsClaimed).toBe(true);
  expect(result.save.inventory["patch-pulse"]).toBe(3);
  expect(result.commands).toEqual([
    { type: "startCutscene", cutsceneId: "sovereign-hint" },
  ]);
});

test("choice node resolution ignores unavailable requested choices", () => {
  const nodes = DIALOGUES[WILD_BODY_DIALOGUE_ID].nodes;
  const originalAssignment = nodes.assignment;
  const originalDone = nodes.done;

  if (!originalAssignment) {
    throw new Error("Wild body assignment node is required for this test");
  }

  try {
    nodes.assignment = {
      type: "choice",
      prompt: "Assign this body?",
      choices: [
        {
          id: "assign",
          label: "Assign to Circle",
          conditions: [
            {
              type: "flag",
              flag: "debug.assignment.enabled",
              value: true,
            },
          ],
          effects: [
            {
              type: "setFlag",
              flag: "debug.assignment.choice",
              value: "assign",
            },
          ],
          next: "done",
        },
        {
          id: "keep",
          label: "Keep in inventory",
          effects: [
            {
              type: "setFlag",
              flag: "debug.assignment.choice",
              value: "keep",
            },
          ],
          next: "done",
        },
      ],
    };
    nodes.done = { type: "end" };

    const save = createInitialSaveGame();
    const view = getDialogueView(
      getDialogueDefinition(WILD_BODY_DIALOGUE_ID),
      "assignment",
      save,
    );
    const result = advanceDialogue({
      dialogueId: WILD_BODY_DIALOGUE_ID,
      nodeId: "assignment",
      choiceId: "assign",
      save,
    });

    expect(
      view.type === "choice" ? view.choices.map((choice) => choice.id) : [],
    ).toEqual(["keep"]);
    expect(result.save.questFlags["debug.assignment.choice"]).toBe("keep");
    expect(result.nextNodeId).toBe("done");
    expect(result.ended).toBe(true);
  } finally {
    nodes.assignment = originalAssignment;
    if (originalDone) {
      nodes.done = originalDone;
    } else {
      delete nodes.done;
    }
  }
});

test("Cal dialogue starts the Trial before completion and repeats after completion", () => {
  const start = advanceDialogue({
    dialogueId: CAL_VENN_DIALOGUE_ID,
    nodeId: "start",
    save: createInitialSaveGame(),
  });

  expect(start.commands).toEqual([
    { type: "startBattle", battleKind: "trial", trialId: "first-trial" },
  ]);

  const completed = advanceDialogue({
    dialogueId: CAL_VENN_DIALOGUE_ID,
    nodeId: "start",
    save: {
      ...createInitialSaveGame(),
      quests: {
        ...createInitialSaveGame().quests,
        [TRIAL_QUEST_ID]: {
          ...createInitialSaveGame().quests[TRIAL_QUEST_ID],
          state: "completed",
        },
      },
    },
  });

  expect(completed.commands).toEqual([]);
});

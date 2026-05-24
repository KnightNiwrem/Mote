import { expect, test } from "bun:test";
import {
  CAL_VENN_DIALOGUE_ID,
  GUIDE_MIRA_DIALOGUE_ID,
  WILD_BODY_DIALOGUE_ID,
} from "@/game/data/dialogue";
import { MAIN_QUEST_ID, TRIAL_QUEST_ID } from "@/game/data/quests";
import { createInitialSaveGame } from "@/game/systems/save";
import {
  advanceDialogue,
  applyDialogueEffects,
  getDialogueDefinition,
  getDialogueStartView,
  getDialogueView,
} from "./dialogue";

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

  const postTrial = getDialogueStartView(GUIDE_MIRA_DIALOGUE_ID, {
    ...save,
    questFlags: {
      "story.mira.met": true,
      "trial.first.completed": true,
    },
  });

  expect(postTrial.view.type === "line" ? postTrial.view.text : "").toContain(
    "Sovereign signals",
  );
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
      questFlags: { "trial.first.completed": true },
    },
  });

  expect(completed.commands).toEqual([]);
});

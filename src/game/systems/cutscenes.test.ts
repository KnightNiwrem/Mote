import { expect, test } from "bun:test";
import { SOVEREIGN_HINT_CUTSCENE_ID } from "@/game/data/cutscenes";
import { SOVEREIGN_HINT_DIALOGUE_ID } from "@/game/data/dialogue";
import { createInitialSaveGame } from "@/game/systems/save";
import { runCutscene, runCutsceneSteps } from "./cutscenes";

test("cutscene runner applies flags and rewards while returning commands", () => {
  const save = createInitialSaveGame();
  const result = runCutscene(save, SOVEREIGN_HINT_CUTSCENE_ID);

  expect(result.save.questFlags["story.sovereignWeightsHint"]).toBe(
    "introduced",
  );
  expect(
    result.save.questFlags["cutscene.sovereign-weights-hint.completed"],
  ).toBe(true);
  expect(result.save.inventory["material:signal-fragment"]).toBe(1);
  expect(result.commands).toEqual([
    { type: "sound", soundId: "signal" },
    { type: "wait", ms: 350 },
    { type: "say", dialogueId: SOVEREIGN_HINT_DIALOGUE_ID },
  ]);
});

test("cutscene runner skips already completed skippable cutscenes", () => {
  const firstRun = runCutscene(
    createInitialSaveGame(),
    SOVEREIGN_HINT_CUTSCENE_ID,
  );
  const secondRun = runCutscene(firstRun.save, SOVEREIGN_HINT_CUTSCENE_ID);

  expect(secondRun.skipped).toBe(true);
  expect(secondRun.commands).toEqual([]);
  expect(secondRun.save.inventory["material:signal-fragment"]).toBe(1);
});

test("cutscene interpreter supports movement, facing, wait, sound, reward, flag, and battle steps", () => {
  const result = runCutsceneSteps(createInitialSaveGame(), [
    {
      type: "moveActor",
      actorId: "mira",
      path: [{ x: 1, y: 2 }],
    },
    {
      type: "faceActor",
      actorId: "mira",
      direction: "left",
    },
    {
      type: "wait",
      ms: 100,
    },
    {
      type: "sound",
      soundId: "confirm",
    },
    {
      type: "reward",
      reward: {
        type: "item",
        itemId: "patch-pulse",
        count: 1,
      },
    },
    {
      type: "flag",
      flag: "test.cutscene",
      value: true,
    },
    {
      type: "battle",
      battleKind: "wild",
      enemyBodyId: "reedling",
    },
  ]);

  expect(result.save.inventory["patch-pulse"]).toBe(3);
  expect(result.save.questFlags["test.cutscene"]).toBe(true);
  expect(result.commands).toEqual([
    { type: "moveActor", actorId: "mira", path: [{ x: 1, y: 2 }] },
    { type: "faceActor", actorId: "mira", direction: "left" },
    { type: "wait", ms: 100 },
    { type: "sound", soundId: "confirm" },
    { type: "battle", battleKind: "wild", enemyBodyId: "reedling" },
  ]);
});

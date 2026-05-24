import { expect, test } from "bun:test";
import { MOTE_MOVES } from "@/game/data/moves";
import { getOccupiedCircleSlots } from "@/game/systems/moteCircle";
import type { OccupiedCircleSlot } from "@/game/types/save";
import {
  applyBattleResultToSave,
  calculateDamage,
  chooseWildEnemyMove,
  createWildBattleState,
  getTurnOrder,
  resolveBattleTurn,
} from "./battle";
import { createInitialSaveGame } from "./save";

test("battle damage is deterministic from body, mind, and move stats", () => {
  const state = createWildBattleState({
    playerSlot: getStarterSlot(),
    enemyBodyId: "reedling",
  });
  const sparkTap = MOTE_MOVES["spark-tap"];

  if (!sparkTap) {
    throw new Error("Expected Spark Tap move data to exist");
  }

  expect(calculateDamage(state.player, state.enemy, sparkTap)).toBe(15);
});

test("faster combatant moves first with player winning ties", () => {
  const state = createWildBattleState({
    playerSlot: getStarterSlot(),
    enemyBodyId: "reedling",
  });

  expect(getTurnOrder(state)).toEqual(["enemy", "player"]);
  expect(
    getTurnOrder({
      ...state,
      enemy: {
        ...state.enemy,
        stats: {
          ...state.enemy.stats,
          speed: state.player.stats.speed,
        },
      },
    }),
  ).toEqual(["player", "enemy"]);
});

test("wild enemy policy chooses the highest power damage move", () => {
  const state = createWildBattleState({
    playerSlot: getStarterSlot(),
    enemyBodyId: "stonelet",
  });

  expect(chooseWildEnemyMove(state)).toBe("stone-bump");
});

test("battle reducer resolves a one-on-one win", () => {
  const state = createWildBattleState({
    playerSlot: getStarterSlot(),
    enemyBodyId: "reedling",
  });
  const firstTurn = resolveBattleTurn(state, "spark-tap").state;
  const secondTurn = resolveBattleTurn(firstTurn, "spark-tap").state;

  expect(firstTurn.outcome).toBe("active");
  expect(firstTurn.enemy.currentHp).toBe(5);
  expect(secondTurn.outcome).toBe("player-win");
  expect(secondTurn.enemy.currentHp).toBe(0);
  expect(secondTurn.player.currentHp).toBe(2);
});

test("battle result updates saved HP, experience, and battle flags", () => {
  const save = createInitialSaveGame();
  const firstTurn = resolveBattleTurn(
    createWildBattleState({
      playerSlot: getStarterSlot(),
      enemyBodyId: "reedling",
    }),
    "spark-tap",
  ).state;
  const wonBattle = resolveBattleTurn(firstTurn, "spark-tap").state;
  const nextSave = applyBattleResultToSave(save, wonBattle);

  expect(nextSave.circle[0]).toEqual({
    state: "occupied",
    bodyId: "glowbud",
    mindId: "luma-companion",
    level: 1,
    experience: 5,
    bond: 2,
    currentHp: 2,
  });
  expect(nextSave.questFlags["battle.lastEnemy"]).toBe("reedling");
  expect(nextSave.questFlags["battle.lastOutcome"]).toBe("player-win");
  expect(nextSave.questFlags["battle.wildWins"]).toBe(1);
});

function getStarterSlot(): OccupiedCircleSlot {
  const slot = getOccupiedCircleSlots(createInitialSaveGame().circle)[0];

  if (!slot) {
    throw new Error("Expected starter save to include an occupied Circle slot");
  }

  return slot;
}

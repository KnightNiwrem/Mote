import { expect, test } from "bun:test";
import { MOTE_MOVES } from "@/game/data/moves";
import { getOccupiedCircleSlots } from "@/game/systems/moteCircle";
import type { OccupiedCircleSlot } from "@/game/types/save";
import {
  applyBattleResultToSave,
  assignAcquiredBodyToCircle,
  calculateDamage,
  chooseOptimaEnemyMove,
  chooseWildEnemyMove,
  createTrialBattleState,
  createWildBattleState,
  getBodyInventoryKey,
  getNewlyAcquiredBodyId,
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

  expect(calculateDamage(state.player, state.enemy, sparkTap)).toBe(16);
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

test("Optima trial policy chooses efficient damage before raw power", () => {
  const starterSlot = getStarterSlot();
  const state = createTrialBattleState({
    playerSlot: {
      ...starterSlot,
      currentHp: 1,
    },
  });

  expect(state.enemy.name).toBe("Cal Venn's Reedling");
  expect(state.enemy.mindId).toBe("optima-focus");
  expect(state.player.currentHp).toBe(state.player.maxHp);
  expect(chooseOptimaEnemyMove(state)).toBe("quick-loop");
});

test("battle reducer resolves a one-on-one win", () => {
  const state = createWildBattleState({
    playerSlot: getStarterSlot(),
    enemyBodyId: "reedling",
  });
  const firstTurn = resolveBattleTurn(state, "spark-tap").state;
  const secondTurn = resolveBattleTurn(firstTurn, "spark-tap").state;

  expect(firstTurn.outcome).toBe("active");
  expect(firstTurn.enemy.currentHp).toBe(4);
  expect(secondTurn.outcome).toBe("player-win");
  expect(secondTurn.enemy.currentHp).toBe(0);
  expect(secondTurn.player.currentHp).toBe(4);
});

test("starter can complete the first Trial battle with direct attacks", () => {
  const state = createTrialBattleState({
    playerSlot: getStarterSlot(),
  });
  const firstTurn = resolveBattleTurn(state, "spark-tap").state;
  const secondTurn = resolveBattleTurn(firstTurn, "spark-tap").state;

  expect(firstTurn.outcome).toBe("active");
  expect(firstTurn.enemy.currentHp).toBe(6);
  expect(secondTurn.outcome).toBe("player-win");
  expect(secondTurn.player.currentHp).toBe(3);
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
    currentHp: 4,
  });
  expect(nextSave.questFlags["battle.lastEnemy"]).toBe("reedling");
  expect(nextSave.questFlags["battle.lastOutcome"]).toBe("player-win");
  expect(nextSave.questFlags["battle.wildWins"]).toBe(1);
  expect(nextSave.acquiredBodies).toEqual(["glowbud", "reedling"]);
  expect(nextSave.inventory[getBodyInventoryKey("reedling")]).toBe(1);
});

test("wild battle rewards only newly acquired bodies", () => {
  const save = createInitialSaveGame();
  const wonBattle = winBattleAgainst("stonelet");
  const nextSave = applyBattleResultToSave(save, wonBattle);
  const repeatedSave = applyBattleResultToSave(nextSave, wonBattle);

  expect(getNewlyAcquiredBodyId(save, wonBattle)).toBe("stonelet");
  expect(getNewlyAcquiredBodyId(nextSave, wonBattle)).toBeNull();
  expect(repeatedSave.acquiredBodies).toEqual(["glowbud", "stonelet"]);
  expect(repeatedSave.inventory[getBodyInventoryKey("stonelet")]).toBe(1);
});

test("acquired bodies can be assigned to the Circle with the base mind", () => {
  const save = applyBattleResultToSave(
    createInitialSaveGame(),
    winBattleAgainst("driftcap"),
  );
  const nextSave = assignAcquiredBodyToCircle(save, "driftcap");

  expect(nextSave.circle[1]).toEqual({
    state: "occupied",
    bodyId: "driftcap",
    mindId: "base-mind",
    level: 1,
    experience: 0,
    bond: 0,
    currentHp: 22,
  });
});

function getStarterSlot(): OccupiedCircleSlot {
  const slot = getOccupiedCircleSlots(createInitialSaveGame().circle)[0];

  if (!slot) {
    throw new Error("Expected starter save to include an occupied Circle slot");
  }

  return slot;
}

function winBattleAgainst(enemyBodyId: string) {
  const state = createWildBattleState({
    playerSlot: getStarterSlot(),
    enemyBodyId,
  });

  return {
    ...state,
    enemy: {
      ...state.enemy,
      currentHp: 0,
    },
    outcome: "player-win" as const,
  };
}

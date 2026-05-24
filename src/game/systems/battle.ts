import { MOTE_BODIES } from "@/game/data/bodies";
import { BASE_MIND_ID, MOTE_MINDS } from "@/game/data/minds";
import { MOTE_MOVES } from "@/game/data/moves";
import { FIRST_TRIAL_ID, TRIALS, type TrialId } from "@/game/data/trials";
import { canUnlockWildBody } from "@/game/systems/encounters";
import {
  calculateMindBodyStats,
  getMindMoveModifier,
} from "@/game/systems/mindBody";
import {
  addCircleSlot,
  createCircleSlot,
  updateCircleSlot,
} from "@/game/systems/moteCircle";
import type {
  BattleCombatant,
  BattleEvent,
  BattleOutcome,
  BattleSide,
  BattleState,
  BattleTurnResult,
} from "@/game/types/battle";
import type {
  BattleStats,
  MoteBody,
  MoteMind,
  MoveDefinition,
} from "@/game/types/game";
import type { OccupiedCircleSlot, SaveGame } from "@/game/types/save";

export type CreateBattleCombatantInput = {
  side: BattleSide;
  bodyId: string;
  mindId: string;
  level?: number;
  currentHp?: number;
  name?: string;
};

export type CreateWildBattleStateInput = {
  playerSlot: OccupiedCircleSlot;
  enemyBodyId?: string;
};

export type CreateTrialBattleStateInput = {
  playerSlot: OccupiedCircleSlot;
  trialId?: TrialId;
};

const DEFAULT_WILD_BODY_ID = "reedling";
const MAX_LOG_LINES = 4;
const SUPPORT_SHIELD = 5;
const BODY_INVENTORY_PREFIX = "body:";

export function createWildBattleState({
  playerSlot,
  enemyBodyId = DEFAULT_WILD_BODY_ID,
}: CreateWildBattleStateInput): BattleState {
  const enemyBody = getBody(enemyBodyId);
  const player = createBattleCombatant({
    side: "player",
    bodyId: playerSlot.bodyId,
    mindId: playerSlot.mindId,
    level: playerSlot.level,
    currentHp: playerSlot.currentHp,
  });
  const enemy = createBattleCombatant({
    side: "enemy",
    bodyId: enemyBodyId,
    mindId: BASE_MIND_ID,
    name: `Wild ${enemyBody.name}`,
  });
  const message = `${enemy.name} appeared.`;

  return {
    kind: "wild",
    enemyPolicy: "wild",
    turn: 1,
    player,
    enemy,
    outcome: "active",
    log: [message],
  };
}

export function createTrialBattleState({
  playerSlot,
  trialId = FIRST_TRIAL_ID,
}: CreateTrialBattleStateInput): BattleState {
  const trial = TRIALS[trialId];
  const enemyBody = getBody(trial.enemyBodyId);
  const player = createBattleCombatant({
    side: "player",
    bodyId: playerSlot.bodyId,
    mindId: playerSlot.mindId,
    level: playerSlot.level,
  });
  const enemy = createBattleCombatant({
    side: "enemy",
    bodyId: trial.enemyBodyId,
    mindId: trial.enemyMindId,
    name: `${trial.rivalName}'s ${enemyBody.name}`,
  });

  return {
    kind: "trial",
    enemyPolicy: "optima-rival",
    trialId,
    turn: 1,
    player,
    enemy,
    outcome: "active",
    log: [`${trial.name} begins. Optima seeks the fastest clean line.`],
  };
}

export function createBattleCombatant({
  side,
  bodyId,
  mindId,
  level = 1,
  currentHp,
  name,
}: CreateBattleCombatantInput): BattleCombatant {
  const body = getBody(bodyId);
  const mind = getMind(mindId);
  const stats = calculateBattleStats(body, mind);
  const maxHp = stats.hp;

  return {
    side,
    bodyId,
    mindId,
    name: name ?? body.name,
    level,
    stats,
    maxHp,
    currentHp: clamp(currentHp ?? maxHp, 0, maxHp),
    shield: 0,
    moves: body.learnset,
  };
}

export function calculateBattleStats(
  body: MoteBody,
  mind: MoteMind,
): BattleStats {
  return calculateMindBodyStats(body, mind);
}

export function calculateDamage(
  attacker: BattleCombatant,
  defender: BattleCombatant,
  move: MoveDefinition,
): number {
  if (move.role !== "damage") {
    return 0;
  }

  return Math.max(
    1,
    move.power + attacker.stats.attack - defender.stats.defense,
  );
}

export function getTurnOrder(state: BattleState): BattleSide[] {
  if (state.player.stats.speed >= state.enemy.stats.speed) {
    return ["player", "enemy"];
  }

  return ["enemy", "player"];
}

export function chooseWildEnemyMove(state: BattleState): string {
  const recoveryMove = state.enemy.moves.find(
    (moveId) => getMove(moveId).role === "recovery",
  );

  if (state.enemy.currentHp * 2 <= state.enemy.maxHp && recoveryMove) {
    return recoveryMove;
  }

  const damageMoves = state.enemy.moves.filter(
    (moveId) => getMove(moveId).role === "damage",
  );
  damageMoves.sort((leftMoveId, rightMoveId) => {
    const powerDelta = getMove(rightMoveId).power - getMove(leftMoveId).power;

    return powerDelta || leftMoveId.localeCompare(rightMoveId);
  });

  return damageMoves[0] ?? state.enemy.moves[0] ?? "spark-tap";
}

export function chooseOptimaEnemyMove(state: BattleState): string {
  const damageMoves = state.enemy.moves
    .filter((moveId) => getMove(moveId).role === "damage")
    .map((moveId) => ({
      moveId,
      move: getMove(moveId),
      damage: calculateProjectedDamage(state.enemy, state.player, moveId),
    }));

  const finishingMoves = damageMoves
    .filter(({ damage }) => damage >= state.player.currentHp)
    .sort(
      (left, right) =>
        left.move.energyCost - right.move.energyCost ||
        right.damage - left.damage ||
        left.moveId.localeCompare(right.moveId),
    );

  if (finishingMoves[0]) {
    return finishingMoves[0].moveId;
  }

  damageMoves.sort((left, right) => {
    const leftEfficiency = left.damage / Math.max(1, left.move.energyCost);
    const rightEfficiency = right.damage / Math.max(1, right.move.energyCost);

    return (
      rightEfficiency - leftEfficiency ||
      right.damage - left.damage ||
      left.moveId.localeCompare(right.moveId)
    );
  });

  return damageMoves[0]?.moveId ?? state.enemy.moves[0] ?? "spark-tap";
}

export function resolveBattleTurn(
  state: BattleState,
  playerMoveId: string,
): BattleTurnResult {
  if (state.outcome !== "active") {
    return { state, events: [] };
  }

  const enemyMoveId = chooseEnemyMove(state);
  let nextState: BattleState = {
    ...state,
    turn: state.turn + 1,
  };
  const events: BattleEvent[] = [];

  for (const side of getTurnOrder(state)) {
    if (nextState.outcome !== "active") {
      break;
    }

    const moveId = side === "player" ? playerMoveId : enemyMoveId;
    const result = applyMove(nextState, side, moveId);
    nextState = result.state;
    events.push(...result.events);

    const outcome = getBattleOutcome(nextState);
    if (outcome !== "active") {
      const message =
        outcome === "player-win"
          ? `${nextState.enemy.name} faded from the fight.`
          : `${nextState.player.name} cannot continue.`;

      nextState = appendLog(
        {
          ...nextState,
          outcome,
        },
        message,
      );
      events.push({ type: "log", message }, { type: "battle-end", outcome });
    }
  }

  return {
    state: nextState,
    events,
  };
}

function chooseEnemyMove(state: BattleState): string {
  if (state.enemyPolicy === "optima-rival") {
    return chooseOptimaEnemyMove(state);
  }

  return chooseWildEnemyMove(state);
}

export function applyBattleResultToSave(
  save: SaveGame,
  battleState: BattleState,
): SaveGame {
  const savedHp =
    battleState.outcome === "enemy-win"
      ? 1
      : Math.max(1, battleState.player.currentHp);
  const currentWins =
    typeof save.questFlags["battle.wildWins"] === "number"
      ? save.questFlags["battle.wildWins"]
      : 0;
  const wonBattle = battleState.outcome === "player-win";
  const acquiredBodyId = getNewlyAcquiredBodyId(save, battleState);

  return {
    ...save,
    circle: updateCircleSlot(save.circle, 0, (slot) =>
      slot.state === "occupied"
        ? {
            ...slot,
            currentHp: savedHp,
            experience: slot.experience + (wonBattle ? 5 : 0),
          }
        : slot,
    ),
    questFlags: {
      ...save.questFlags,
      "battle.lastEnemy": battleState.enemy.bodyId,
      "battle.lastOutcome": battleState.outcome,
      "battle.wildWins": wonBattle ? currentWins + 1 : currentWins,
    },
    inventory: acquiredBodyId
      ? incrementBodyInventory(save.inventory, acquiredBodyId)
      : save.inventory,
    acquiredBodies: acquiredBodyId
      ? [...save.acquiredBodies, acquiredBodyId]
      : save.acquiredBodies,
  };
}

export function getNewlyAcquiredBodyId(
  save: SaveGame,
  battleState: BattleState,
): string | null {
  if (
    battleState.outcome !== "player-win" ||
    !canUnlockWildBody(battleState.enemy.bodyId) ||
    save.acquiredBodies.includes(battleState.enemy.bodyId)
  ) {
    return null;
  }

  return battleState.enemy.bodyId;
}

export function assignAcquiredBodyToCircle(
  save: SaveGame,
  bodyId: string,
): SaveGame {
  if (!save.acquiredBodies.includes(bodyId)) {
    throw new Error("Cannot assign a body before it is acquired");
  }

  const body = getBody(bodyId);

  return {
    ...save,
    circle: addCircleSlot(
      save.circle,
      createCircleSlot({
        bodyId,
        mindId: BASE_MIND_ID,
        currentHp: body.baseStats.hp,
      }),
    ),
  };
}

export function getBodyInventoryKey(bodyId: string): string {
  return `${BODY_INVENTORY_PREFIX}${bodyId}`;
}

function incrementBodyInventory(
  inventory: SaveGame["inventory"],
  bodyId: string,
): SaveGame["inventory"] {
  const inventoryKey = getBodyInventoryKey(bodyId);

  return {
    ...inventory,
    [inventoryKey]: (inventory[inventoryKey] ?? 0) + 1,
  };
}

function applyMove(
  state: BattleState,
  side: BattleSide,
  moveId: string,
): BattleTurnResult {
  const actor = getCombatant(state, side);
  const targetSide = getOpponentSide(side);
  const target = getCombatant(state, targetSide);
  const move = getMove(moveId);

  if (move.role === "recovery") {
    const healAmount = Math.min(
      move.power + getMindMoveModifier(getMind(actor.mindId), move),
      actor.maxHp - actor.currentHp,
    );
    const nextActor = {
      ...actor,
      currentHp: actor.currentHp + healAmount,
    };
    const message = `${actor.name} used ${move.name} and recovered ${healAmount} HP.`;

    return {
      state: appendLog(updateCombatant(state, side, nextActor), message),
      events: [
        { type: "heal", target: side, amount: healAmount },
        { type: "log", message },
      ],
    };
  }

  if (move.role === "support") {
    const shieldAmount =
      SUPPORT_SHIELD + getMindMoveModifier(getMind(actor.mindId), move);
    const nextActor = {
      ...actor,
      shield: Math.max(actor.shield, shieldAmount),
    };
    const message = `${actor.name} used ${move.name} and raised a guard.`;

    return {
      state: appendLog(updateCombatant(state, side, nextActor), message),
      events: [
        { type: "shield", target: side, amount: shieldAmount },
        { type: "log", message },
      ],
    };
  }

  const rawDamage =
    calculateDamage(actor, target, move) +
    getMindMoveModifier(getMind(actor.mindId), move);
  const damage = Math.max(1, rawDamage - target.shield);
  const nextTarget = {
    ...target,
    currentHp: Math.max(0, target.currentHp - damage),
    shield: 0,
  };
  const message = `${actor.name} used ${move.name} for ${damage} damage.`;

  return {
    state: appendLog(updateCombatant(state, targetSide, nextTarget), message),
    events: [
      { type: "damage", target: targetSide, amount: damage },
      { type: "log", message },
    ],
  };
}

function calculateProjectedDamage(
  attacker: BattleCombatant,
  defender: BattleCombatant,
  moveId: string,
): number {
  const move = getMove(moveId);
  const rawDamage =
    calculateDamage(attacker, defender, move) +
    getMindMoveModifier(getMind(attacker.mindId), move);

  return Math.max(1, rawDamage - defender.shield);
}

function getBattleOutcome(state: BattleState): BattleOutcome {
  if (state.enemy.currentHp <= 0) {
    return "player-win";
  }

  if (state.player.currentHp <= 0) {
    return "enemy-win";
  }

  return "active";
}

function appendLog(state: BattleState, message: string): BattleState {
  return {
    ...state,
    log: [...state.log, message].slice(-MAX_LOG_LINES),
  };
}

function getCombatant(state: BattleState, side: BattleSide): BattleCombatant {
  return side === "player" ? state.player : state.enemy;
}

function updateCombatant(
  state: BattleState,
  side: BattleSide,
  combatant: BattleCombatant,
): BattleState {
  return side === "player"
    ? { ...state, player: combatant }
    : { ...state, enemy: combatant };
}

function getOpponentSide(side: BattleSide): BattleSide {
  return side === "player" ? "enemy" : "player";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function getBody(bodyId: string): MoteBody {
  const body = MOTE_BODIES[bodyId];

  if (!body) {
    throw new Error(`Unknown Mote body: ${bodyId}`);
  }

  return body;
}

function getMind(mindId: string): MoteMind {
  const mind = MOTE_MINDS[mindId];

  if (!mind) {
    throw new Error(`Unknown Mote mind: ${mindId}`);
  }

  return mind;
}

function getMove(moveId: string): MoveDefinition {
  const move = MOTE_MOVES[moveId];

  if (!move) {
    throw new Error(`Unknown Mote move: ${moveId}`);
  }

  return move;
}

import type { BattleStats } from "@/game/types/game";

export type BattleSide = "player" | "enemy";
export type BattleOutcome = "active" | "player-win" | "enemy-win";

export type BattleCombatant = {
  side: BattleSide;
  bodyId: string;
  mindId: string;
  name: string;
  level: number;
  stats: BattleStats;
  maxHp: number;
  currentHp: number;
  shield: number;
  moves: string[];
};

export type BattleState = {
  turn: number;
  player: BattleCombatant;
  enemy: BattleCombatant;
  outcome: BattleOutcome;
  log: string[];
};

export type BattleEvent =
  | {
      type: "log";
      message: string;
    }
  | {
      type: "damage";
      target: BattleSide;
      amount: number;
    }
  | {
      type: "heal";
      target: BattleSide;
      amount: number;
    }
  | {
      type: "shield";
      target: BattleSide;
      amount: number;
    }
  | {
      type: "battle-end";
      outcome: Exclude<BattleOutcome, "active">;
    };

export type BattleTurnResult = {
  state: BattleState;
  events: BattleEvent[];
};

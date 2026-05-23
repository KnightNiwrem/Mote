export type FactionId =
  | "tessera"
  | "optima"
  | "northstar"
  | "asterion"
  | "sovereign";

export type BattleStats = {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
};

export type GrowthCurve = "steady" | "early" | "late" | "erratic";

export type MoteBody = {
  id: string;
  name: string;
  species: string;
  spriteKey: string;
  baseStats: BattleStats;
  traits: string[];
  learnset: string[];
  growthCurve: GrowthCurve;
  compatibleMindTags: string[];
};

export type MoteMind = {
  id: string;
  name: string;
  origin: FactionId | "base";
  personalityTags: string[];
  battleStyle:
    | "adaptive"
    | "efficient"
    | "reliable"
    | "experimental"
    | "volatile";
  statModifiers: Partial<BattleStats>;
  bondProfile: "warm" | "disciplined" | "steady" | "curious" | "unstable";
  compatibilityTags: string[];
};

export type MoveRole = "damage" | "support" | "recovery";

export type MoveDefinition = {
  id: string;
  name: string;
  role: MoveRole;
  power: number;
  accuracy: number;
  energyCost: number;
  tags: string[];
};

export type FactionDefinition = {
  id: FactionId;
  name: string;
  philosophy: string;
  gameplayIdentity: string[];
};

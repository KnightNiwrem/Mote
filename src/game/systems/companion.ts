export type GardenAction = "rest" | "feed" | "play" | "train";

export type CompanionState = {
  bond: number;
  energy: number;
  fullness: number;
  joy: number;
  focus: number;
  lastAction: GardenAction | null;
};

export type GardenActionDefinition = {
  id: GardenAction;
  label: string;
  message: string;
  delta: Partial<Omit<CompanionState, "lastAction">>;
};

export const COMPANION_NAME = "Luma";
export const COMPANION_MAX_VALUE = 10;

export const GARDEN_ACTIONS: readonly GardenActionDefinition[] = [
  {
    id: "rest",
    label: "Rest",
    message: "Luma settles into the warm grass.",
    delta: { bond: 1, energy: 3, fullness: -1 },
  },
  {
    id: "feed",
    label: "Feed",
    message: "Luma chirps over the garden berries.",
    delta: { bond: 1, energy: 1, fullness: 3 },
  },
  {
    id: "play",
    label: "Play",
    message: "Luma darts through the path lights.",
    delta: { bond: 2, energy: -1, fullness: -1, joy: 3 },
  },
  {
    id: "train",
    label: "Train",
    message: "Luma mirrors your timing step by step.",
    delta: { bond: 2, energy: -2, fullness: -1, focus: 3 },
  },
] as const;

export function createInitialCompanionState(): CompanionState {
  return {
    bond: 2,
    energy: 6,
    fullness: 5,
    joy: 4,
    focus: 3,
    lastAction: null,
  };
}

export function getGardenAction(
  actionId: GardenAction,
): GardenActionDefinition {
  const action = GARDEN_ACTIONS.find(({ id }) => id === actionId);

  if (!action) {
    throw new Error(`Unknown Garden action: ${actionId}`);
  }

  return action;
}

export function applyGardenAction(
  state: CompanionState,
  actionId: GardenAction,
  bondGainModifier = 0,
): CompanionState {
  const action = getGardenAction(actionId);
  const bondDelta =
    action.delta.bond === undefined
      ? undefined
      : action.delta.bond + bondGainModifier;

  return {
    bond: applyDelta(state.bond, bondDelta),
    energy: applyDelta(state.energy, action.delta.energy),
    fullness: applyDelta(state.fullness, action.delta.fullness),
    joy: applyDelta(state.joy, action.delta.joy),
    focus: applyDelta(state.focus, action.delta.focus),
    lastAction: action.id,
  };
}

export function getCompanionDialogue(state: CompanionState): string {
  if (state.bond >= 8) {
    return "The Garden feels like us now. Where should we grow next?";
  }

  if (state.bond >= 5) {
    return "I can hear your rhythm better today. What should we practice?";
  }

  return "I'm still learning this place. Will you stay close for a while?";
}

function applyDelta(value: number, delta = 0): number {
  return clampCompanionValue(value + delta);
}

function clampCompanionValue(value: number): number {
  return Math.min(Math.max(value, 0), COMPANION_MAX_VALUE);
}

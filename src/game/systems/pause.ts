import type { SaveSlotId, SaveSlotState } from "@/game/types/save";

export type PausePanel =
  | "root"
  | "motes"
  | "inventory"
  | "quests"
  | "save"
  | "options";

export type PauseState = {
  isPaused: boolean;
  panel: PausePanel;
  pendingOverwriteSlotId: SaveSlotId | null;
  notice: string | null;
};

export type PauseAction =
  | { type: "open"; canPause: boolean }
  | { type: "close" }
  | { type: "select-panel"; panel: PausePanel }
  | { type: "request-save"; slot: SaveSlotState }
  | { type: "confirm-overwrite" }
  | { type: "cancel-overwrite" }
  | { type: "saved"; slotId: SaveSlotId };

export const initialPauseState: PauseState = {
  isPaused: false,
  panel: "root",
  pendingOverwriteSlotId: null,
  notice: null,
};

export function pauseReducer(
  state: PauseState,
  action: PauseAction,
): PauseState {
  switch (action.type) {
    case "open":
      return action.canPause
        ? {
            ...state,
            isPaused: true,
            panel: "root",
            pendingOverwriteSlotId: null,
            notice: null,
          }
        : state;
    case "close":
      return initialPauseState;
    case "select-panel":
      return state.isPaused
        ? {
            ...state,
            panel: action.panel,
            pendingOverwriteSlotId: null,
            notice: null,
          }
        : state;
    case "request-save":
      if (!state.isPaused) {
        return state;
      }

      if (action.slot.status === "empty") {
        return {
          ...state,
          pendingOverwriteSlotId: null,
          notice: null,
        };
      }

      return {
        ...state,
        pendingOverwriteSlotId: action.slot.slotId,
        notice:
          action.slot.status === "corrupt"
            ? "Confirm replacing the corrupt slot."
            : "Confirm overwriting this slot.",
      };
    case "confirm-overwrite":
      return {
        ...state,
        pendingOverwriteSlotId: null,
        notice: null,
      };
    case "cancel-overwrite":
      return {
        ...state,
        pendingOverwriteSlotId: null,
        notice: null,
      };
    case "saved":
      return {
        ...state,
        pendingOverwriteSlotId: null,
        notice: `Saved ${formatSlotLabel(action.slotId)}.`,
      };
  }
}

export function formatSlotLabel(slotId: SaveSlotId): string {
  return `Slot ${slotId.slice(-1)}`;
}

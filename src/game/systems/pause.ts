import type { SaveSlotId, SaveSlotState } from "@/game/types/save";

export const PAUSE_MENU_ITEM_IDS = [
  "motes",
  "inventory",
  "quests",
  "save",
  "options",
  "return",
] as const;

export type PauseMenuItemId = (typeof PAUSE_MENU_ITEM_IDS)[number];

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
  selectedMenuItemId: PauseMenuItemId;
  pendingOverwriteSlotId: SaveSlotId | null;
  notice: string | null;
};

export type PauseAction =
  | { type: "open"; canPause: boolean }
  | { type: "close" }
  | { type: "move-menu"; delta: 1 | -1 }
  | { type: "select-menu-item"; itemId: PauseMenuItemId }
  | { type: "select-panel"; panel: PausePanel }
  | { type: "request-save"; slot: SaveSlotState }
  | { type: "confirm-overwrite" }
  | { type: "cancel-overwrite" }
  | { type: "saved"; slotId: SaveSlotId };

export const initialPauseState: PauseState = {
  isPaused: false,
  panel: "root",
  selectedMenuItemId: "motes",
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
            selectedMenuItemId: "motes",
            pendingOverwriteSlotId: null,
            notice: null,
          }
        : state;
    case "close":
      return initialPauseState;
    case "move-menu":
      return state.isPaused
        ? {
            ...state,
            selectedMenuItemId: movePauseMenuSelection(
              state.selectedMenuItemId,
              action.delta,
            ),
          }
        : state;
    case "select-menu-item":
      return state.isPaused
        ? {
            ...state,
            selectedMenuItemId: action.itemId,
          }
        : state;
    case "select-panel":
      return state.isPaused
        ? {
            ...state,
            panel: action.panel,
            selectedMenuItemId:
              action.panel === "root" ? state.selectedMenuItemId : action.panel,
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

export function isPauseMenuItemId(value: string): value is PauseMenuItemId {
  return PAUSE_MENU_ITEM_IDS.some((itemId) => itemId === value);
}

function movePauseMenuSelection(
  selectedMenuItemId: PauseMenuItemId,
  delta: 1 | -1,
): PauseMenuItemId {
  const currentIndex = PAUSE_MENU_ITEM_IDS.indexOf(selectedMenuItemId);
  const nextIndex =
    (currentIndex + delta + PAUSE_MENU_ITEM_IDS.length) %
    PAUSE_MENU_ITEM_IDS.length;

  return PAUSE_MENU_ITEM_IDS[nextIndex] ?? "motes";
}

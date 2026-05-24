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
  selectedInventoryCategoryIndex: number;
  selectedInventoryItemIndex: number;
  selectedCircleSlotIndex: number;
  pendingOverwriteSlotId: SaveSlotId | null;
  notice: string | null;
};

export type PauseAction =
  | { type: "open"; canPause: boolean }
  | { type: "close" }
  | { type: "move-menu"; delta: 1 | -1 }
  | { type: "select-menu-item"; itemId: PauseMenuItemId }
  | { type: "activate-menu-item"; itemId: PauseMenuItemId }
  | { type: "select-panel"; panel: PausePanel }
  | {
      type: "move-inventory-category";
      delta: 1 | -1;
      categoryCount: number;
    }
  | {
      type: "select-inventory-category";
      index: number;
      categoryCount: number;
    }
  | { type: "move-inventory-item"; delta: 1 | -1; itemCount: number }
  | { type: "select-inventory-item"; index: number; itemCount: number }
  | { type: "move-circle-slot"; delta: 1 | -1; slotCount: number }
  | { type: "select-circle-slot"; index: number; slotCount: number }
  | { type: "request-save"; slot: SaveSlotState }
  | { type: "confirm-overwrite" }
  | { type: "cancel-overwrite" }
  | { type: "saved"; slotId: SaveSlotId }
  | { type: "save-failed"; slotId: SaveSlotId };

export const initialPauseState: PauseState = {
  isPaused: false,
  panel: "root",
  selectedMenuItemId: "motes",
  selectedInventoryCategoryIndex: 0,
  selectedInventoryItemIndex: 0,
  selectedCircleSlotIndex: 0,
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
    case "activate-menu-item":
      if (!state.isPaused) {
        return state;
      }

      if (action.itemId === "return") {
        return initialPauseState;
      }

      return {
        ...state,
        panel: action.itemId,
        selectedMenuItemId: action.itemId,
        selectedInventoryItemIndex:
          action.itemId === "inventory" ? 0 : state.selectedInventoryItemIndex,
        selectedCircleSlotIndex:
          action.itemId === "motes" ? 0 : state.selectedCircleSlotIndex,
        pendingOverwriteSlotId: null,
        notice: null,
      };
    case "select-panel":
      return state.isPaused
        ? {
            ...state,
            panel: action.panel,
            selectedMenuItemId:
              action.panel === "root" ? state.selectedMenuItemId : action.panel,
            selectedInventoryItemIndex:
              action.panel === "inventory"
                ? 0
                : state.selectedInventoryItemIndex,
            selectedCircleSlotIndex:
              action.panel === "motes" ? 0 : state.selectedCircleSlotIndex,
            pendingOverwriteSlotId: null,
            notice: null,
          }
        : state;
    case "move-inventory-category":
      return state.isPaused
        ? {
            ...state,
            selectedInventoryCategoryIndex: movePanelSelection(
              state.selectedInventoryCategoryIndex,
              action.delta,
              action.categoryCount,
            ),
            selectedInventoryItemIndex: 0,
          }
        : state;
    case "select-inventory-category":
      return state.isPaused
        ? {
            ...state,
            selectedInventoryCategoryIndex: clampPanelSelection(
              action.index,
              action.categoryCount,
            ),
            selectedInventoryItemIndex: 0,
          }
        : state;
    case "move-inventory-item":
      return state.isPaused
        ? {
            ...state,
            selectedInventoryItemIndex: movePanelSelection(
              state.selectedInventoryItemIndex,
              action.delta,
              action.itemCount,
            ),
          }
        : state;
    case "select-inventory-item":
      return state.isPaused
        ? {
            ...state,
            selectedInventoryItemIndex: clampPanelSelection(
              action.index,
              action.itemCount,
            ),
          }
        : state;
    case "move-circle-slot":
      return state.isPaused
        ? {
            ...state,
            selectedCircleSlotIndex: movePanelSelection(
              state.selectedCircleSlotIndex,
              action.delta,
              action.slotCount,
            ),
          }
        : state;
    case "select-circle-slot":
      return state.isPaused
        ? {
            ...state,
            selectedCircleSlotIndex: clampPanelSelection(
              action.index,
              action.slotCount,
            ),
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
        notice: state.notice,
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
    case "save-failed":
      return {
        ...state,
        notice: `Could not save ${formatSlotLabel(action.slotId)}. Check browser storage and try again.`,
      };
  }
}

export function getActivePausePanel(state: PauseState): PausePanel {
  if (state.panel === "root" && state.selectedMenuItemId !== "return") {
    return state.selectedMenuItemId;
  }

  return state.panel;
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

function movePanelSelection(
  selectedIndex: number,
  delta: 1 | -1,
  itemCount: number,
): number {
  if (itemCount <= 0) {
    return 0;
  }

  return (selectedIndex + delta + itemCount) % itemCount;
}

function clampPanelSelection(index: number, itemCount: number): number {
  if (itemCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), itemCount - 1);
}

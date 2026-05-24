import { expect, test } from "bun:test";
import {
  formatSlotLabel,
  getActivePausePanel,
  initialPauseState,
  pauseReducer,
} from "./pause";
import { createInitialSaveGame } from "./save";

test("pause reducer only opens when free-roam allows pause", () => {
  expect(
    pauseReducer(initialPauseState, { type: "open", canPause: false }),
  ).toEqual(initialPauseState);

  expect(
    pauseReducer(initialPauseState, { type: "open", canPause: true }),
  ).toEqual({
    isPaused: true,
    panel: "root",
    selectedMenuItemId: "motes",
    selectedInventoryCategoryIndex: 0,
    selectedInventoryItemIndex: 0,
    selectedCircleSlotIndex: 0,
    pendingOverwriteSlotId: null,
    notice: null,
  });
});

test("pause reducer navigates menu items, panels, and closes cleanly", () => {
  const openState = pauseReducer(initialPauseState, {
    type: "open",
    canPause: true,
  });
  const selectedInventory = pauseReducer(openState, {
    type: "move-menu",
    delta: 1,
  });
  expect(selectedInventory.selectedMenuItemId).toBe("inventory");

  const inventoryState = pauseReducer(openState, {
    type: "select-panel",
    panel: "inventory",
  });

  expect(inventoryState.panel).toBe("inventory");
  expect(inventoryState.selectedMenuItemId).toBe("inventory");
  expect(pauseReducer(inventoryState, { type: "close" })).toEqual(
    initialPauseState,
  );
});

test("pause reducer activates selected menu items into subpanels", () => {
  const openState = pauseReducer(initialPauseState, {
    type: "open",
    canPause: true,
  });

  const questsState = pauseReducer(openState, {
    type: "activate-menu-item",
    itemId: "quests",
  });

  expect(questsState.panel).toBe("quests");
  expect(questsState.selectedMenuItemId).toBe("quests");
  expect(getActivePausePanel(questsState)).toBe("quests");

  expect(
    pauseReducer(questsState, {
      type: "activate-menu-item",
      itemId: "return",
    }),
  ).toEqual(initialPauseState);
});

test("pause reducer requires confirmation before overwriting occupied or corrupt slots", () => {
  const openState = pauseReducer(initialPauseState, {
    type: "open",
    canPause: true,
  });

  expect(
    pauseReducer(openState, {
      type: "request-save",
      slot: { status: "empty", slotId: "slot-1" },
    }),
  ).toEqual(openState);

  const pendingValid = pauseReducer(openState, {
    type: "request-save",
    slot: {
      status: "valid",
      slotId: "slot-2",
      record: {
        version: 1,
        slotId: "slot-2",
        metadata: {
          playerName: "Caretaker",
          mapId: "garden",
          mapName: "Mote Garden",
          chapterLabel: "Chapter 1 - Mote Garden",
          updatedAt: "2026-05-24T00:00:00.000Z",
          acquiredBodyCount: 1,
          trialMarks: [],
        },
        save: createInitialSaveGame(),
      },
    },
  });

  expect(pendingValid.pendingOverwriteSlotId).toBe("slot-2");
  expect(pendingValid.notice).toBe("Confirm overwriting this slot.");
  expect(
    pauseReducer(pendingValid, { type: "confirm-overwrite" })
      .pendingOverwriteSlotId,
  ).toBeNull();
  expect(pauseReducer(pendingValid, { type: "confirm-overwrite" }).notice).toBe(
    "Confirm overwriting this slot.",
  );

  const pendingCorrupt = pauseReducer(openState, {
    type: "request-save",
    slot: { status: "corrupt", slotId: "slot-3" },
  });

  expect(pendingCorrupt.pendingOverwriteSlotId).toBe("slot-3");
  expect(pendingCorrupt.notice).toBe("Confirm replacing the corrupt slot.");
});

test("pause reducer reports completed manual saves", () => {
  const savedState = pauseReducer(
    {
      isPaused: true,
      panel: "save",
      selectedMenuItemId: "save",
      selectedInventoryCategoryIndex: 0,
      selectedInventoryItemIndex: 0,
      selectedCircleSlotIndex: 0,
      pendingOverwriteSlotId: "slot-1",
      notice: null,
    },
    { type: "saved", slotId: "slot-1" },
  );

  expect(savedState.pendingOverwriteSlotId).toBeNull();
  expect(savedState.notice).toBe("Saved Slot 1.");
  expect(formatSlotLabel("slot-3")).toBe("Slot 3");
});

test("pause reducer tracks focused inventory and Circle selections", () => {
  const openState = pauseReducer(initialPauseState, {
    type: "open",
    canPause: true,
  });

  const inventoryState = pauseReducer(openState, {
    type: "activate-menu-item",
    itemId: "inventory",
  });
  const movedCategory = pauseReducer(inventoryState, {
    type: "move-inventory-category",
    delta: 1,
    categoryCount: 3,
  });
  const movedItem = pauseReducer(movedCategory, {
    type: "move-inventory-item",
    delta: -1,
    itemCount: 4,
  });

  expect(movedCategory.selectedInventoryCategoryIndex).toBe(1);
  expect(movedCategory.selectedInventoryItemIndex).toBe(0);
  expect(movedItem.selectedInventoryItemIndex).toBe(3);

  const circleState = pauseReducer(openState, {
    type: "activate-menu-item",
    itemId: "motes",
  });
  const movedCircle = pauseReducer(circleState, {
    type: "move-circle-slot",
    delta: -1,
    slotCount: 3,
  });

  expect(movedCircle.selectedCircleSlotIndex).toBe(2);
});

test("pause reducer reports failed manual saves without clearing pending overwrite", () => {
  const failedState = pauseReducer(
    {
      isPaused: true,
      panel: "save",
      selectedMenuItemId: "save",
      selectedInventoryCategoryIndex: 0,
      selectedInventoryItemIndex: 0,
      selectedCircleSlotIndex: 0,
      pendingOverwriteSlotId: "slot-2",
      notice: "Confirm overwriting this slot.",
    },
    { type: "save-failed", slotId: "slot-2" },
  );

  expect(failedState.pendingOverwriteSlotId).toBe("slot-2");
  expect(failedState.notice).toBe(
    "Could not save Slot 2. Check browser storage and try again.",
  );
});

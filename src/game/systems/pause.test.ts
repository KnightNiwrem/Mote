import { expect, test } from "bun:test";
import { formatSlotLabel, initialPauseState, pauseReducer } from "./pause";
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
    pendingOverwriteSlotId: null,
    notice: null,
  });
});

test("pause reducer navigates panels and closes cleanly", () => {
  const openState = pauseReducer(initialPauseState, {
    type: "open",
    canPause: true,
  });
  const inventoryState = pauseReducer(openState, {
    type: "select-panel",
    panel: "inventory",
  });

  expect(inventoryState.panel).toBe("inventory");
  expect(pauseReducer(inventoryState, { type: "close" })).toEqual(
    initialPauseState,
  );
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
      pendingOverwriteSlotId: "slot-1",
      notice: null,
    },
    { type: "saved", slotId: "slot-1" },
  );

  expect(savedState.pendingOverwriteSlotId).toBeNull();
  expect(savedState.notice).toBe("Saved Slot 1.");
  expect(formatSlotLabel("slot-3")).toBe("Slot 3");
});

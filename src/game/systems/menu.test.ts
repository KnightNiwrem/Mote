import { expect, test } from "bun:test";
import {
  createBattleMenuModel,
  createCircleMenuModel,
  createGardenMenuModel,
  createInventoryMenuModel,
  createOptionsMenuModel,
  createPauseMenuModel,
  createQuestMenuModel,
  createSaveMenuModel,
  createTitleMenuModel,
  getSelectedMenuItem,
  menuReducer,
} from "./menu";

test("menu reducer moves selection while skipping disabled items", () => {
  const model = createTitleMenuModel(false);
  const down = menuReducer(model, { type: "down" }).model;

  expect(getSelectedMenuItem(model)?.id).toBe("new-game");
  expect(getSelectedMenuItem(down)?.id).toBe("load");
});

test("menu reducer confirms enabled items and ignores disabled ones", () => {
  const title = createTitleMenuModel(false);
  const disabledContinue = { ...title, selectedIndex: 0 };
  const confirmDisabled = menuReducer(disabledContinue, { type: "confirm" });
  const confirmEnabled = menuReducer(title, { type: "confirm" });

  expect(confirmDisabled.confirmedItemId).toBeNull();
  expect(confirmEnabled.confirmedItemId).toBe("new-game");
});

test("menu reducer supports cancel and horizontal grid navigation", () => {
  const model = createBattleMenuModel([
    { id: "move-1", label: "Move 1" },
    { id: "move-2", label: "Move 2" },
    { id: "move-3", label: "Move 3" },
    { id: "move-4", label: "Move 4" },
  ]);
  const right = menuReducer(model, { type: "right" }).model;
  const down = menuReducer(right, { type: "down" }).model;
  const cancel = menuReducer(down, { type: "cancel" });

  expect(getSelectedMenuItem(right)?.id).toBe("move-2");
  expect(getSelectedMenuItem(down)?.id).toBe("move-4");
  expect(cancel.canceled).toBe(true);
});

test("menu builders cover title, pause, Garden, Circle, inventory, quests, battle, save, and options", () => {
  const item = { id: "sample", label: "Sample" };

  expect(createTitleMenuModel(true).id).toBe("title");
  expect(createPauseMenuModel("inventory").id).toBe("pause");
  expect(createGardenMenuModel([item]).id).toBe("garden");
  expect(createCircleMenuModel([item]).id).toBe("circle");
  expect(createInventoryMenuModel([item]).id).toBe("inventory");
  expect(createQuestMenuModel([item]).id).toBe("quests");
  expect(createBattleMenuModel([item]).id).toBe("battle");
  expect(createSaveMenuModel([item]).id).toBe("save");
  expect(createOptionsMenuModel([item]).id).toBe("options");
});

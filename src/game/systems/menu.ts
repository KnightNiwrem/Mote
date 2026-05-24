export type MenuId =
  | "title"
  | "pause"
  | "garden"
  | "circle"
  | "inventory"
  | "quests"
  | "battle"
  | "save"
  | "options";

export type MenuItem = {
  id: string;
  label: string;
  disabled?: boolean;
  description?: string;
};

export type MenuModel = {
  id: MenuId;
  title?: string;
  items: MenuItem[];
  selectedIndex: number;
  parent?: MenuId;
  columns?: number;
};

export type MenuAction =
  | { type: "up" }
  | { type: "down" }
  | { type: "left" }
  | { type: "right" }
  | { type: "confirm" }
  | { type: "cancel" };

export type MenuResult = {
  model: MenuModel;
  confirmedItemId: string | null;
  canceled: boolean;
};

export function createMenuModel(input: {
  id: MenuId;
  title?: string;
  items: MenuItem[];
  selectedIndex?: number;
  parent?: MenuId;
  columns?: number;
}): MenuModel {
  const selectedIndex = clampSelectedIndex(
    input.items,
    input.selectedIndex ?? 0,
  );

  return {
    id: input.id,
    title: input.title,
    items: input.items,
    selectedIndex,
    parent: input.parent,
    columns: input.columns,
  };
}

export function menuReducer(model: MenuModel, action: MenuAction): MenuResult {
  switch (action.type) {
    case "up":
      return {
        model: moveMenuSelection(model, -(model.columns ?? 1)),
        confirmedItemId: null,
        canceled: false,
      };
    case "down":
      return {
        model: moveMenuSelection(model, model.columns ?? 1),
        confirmedItemId: null,
        canceled: false,
      };
    case "left":
      return {
        model: moveMenuSelection(model, -1),
        confirmedItemId: null,
        canceled: false,
      };
    case "right":
      return {
        model: moveMenuSelection(model, 1),
        confirmedItemId: null,
        canceled: false,
      };
    case "confirm": {
      const item = getSelectedMenuItem(model);

      return {
        model,
        confirmedItemId: item && !item.disabled ? item.id : null,
        canceled: false,
      };
    }
    case "cancel":
      return {
        model,
        confirmedItemId: null,
        canceled: true,
      };
  }
}

export function moveMenuSelection(model: MenuModel, delta: number): MenuModel {
  if (model.items.length === 0) {
    return { ...model, selectedIndex: 0 };
  }

  let selectedIndex = model.selectedIndex;

  for (let offset = 0; offset < model.items.length; offset += 1) {
    selectedIndex =
      (selectedIndex + delta + model.items.length) % model.items.length;

    if (!model.items[selectedIndex]?.disabled) {
      return { ...model, selectedIndex };
    }
  }

  return model;
}

export function getSelectedMenuItem(model: MenuModel): MenuItem | null {
  return model.items[model.selectedIndex] ?? null;
}

export function createTitleMenuModel(canContinue: boolean): MenuModel {
  return createMenuModel({
    id: "title",
    title: "Mote",
    items: [
      { id: "continue", label: "Continue", disabled: !canContinue },
      { id: "new-game", label: "New Game" },
      { id: "load", label: "Load" },
      { id: "options", label: "Options" },
    ],
  });
}

export function createPauseMenuModel(selectedId: string | null): MenuModel {
  const items: MenuItem[] = [
    { id: "motes", label: "Motes" },
    { id: "inventory", label: "Inventory" },
    { id: "quests", label: "Quests" },
    { id: "save", label: "Save" },
    { id: "options", label: "Options" },
    { id: "return", label: "Return" },
  ];

  return createMenuModel({
    id: "pause",
    title: "Pause",
    items,
    selectedIndex: Math.max(
      0,
      items.findIndex((item) => item.id === selectedId),
    ),
  });
}

export function createGardenMenuModel(items: readonly MenuItem[]): MenuModel {
  return createMenuModel({
    id: "garden",
    title: "Garden",
    items: [...items],
  });
}

export function createCircleMenuModel(items: readonly MenuItem[]): MenuModel {
  return createMenuModel({
    id: "circle",
    title: "Circle",
    items: [...items],
    parent: "pause",
  });
}

export function createInventoryMenuModel(
  items: readonly MenuItem[],
): MenuModel {
  return createMenuModel({
    id: "inventory",
    title: "Inventory",
    items: [...items],
    parent: "pause",
  });
}

export function createQuestMenuModel(items: readonly MenuItem[]): MenuModel {
  return createMenuModel({
    id: "quests",
    title: "Quests",
    items: [...items],
    parent: "pause",
  });
}

export function createBattleMenuModel(items: readonly MenuItem[]): MenuModel {
  return createMenuModel({
    id: "battle",
    title: "Battle",
    items: [...items],
    columns: 2,
  });
}

export function createSaveMenuModel(items: readonly MenuItem[]): MenuModel {
  return createMenuModel({
    id: "save",
    title: "Save",
    items: [...items],
    parent: "pause",
  });
}

export function createOptionsMenuModel(items: readonly MenuItem[]): MenuModel {
  return createMenuModel({
    id: "options",
    title: "Options",
    items: [...items],
    parent: "pause",
  });
}

function clampSelectedIndex(
  items: readonly MenuItem[],
  selectedIndex: number,
): number {
  if (items.length === 0) {
    return 0;
  }

  const normalizedIndex =
    ((selectedIndex % items.length) + items.length) % items.length;

  if (!items[normalizedIndex]?.disabled) {
    return normalizedIndex;
  }

  return moveMenuSelection(
    {
      id: "pause",
      items: [...items],
      selectedIndex: normalizedIndex,
    },
    1,
  ).selectedIndex;
}

import { expect, test } from "bun:test";
import { getItemDefinition } from "@/game/data/items";
import { updateCircleSlot } from "@/game/systems/moteCircle";
import {
  addInventoryItem,
  applyInventoryItem,
  getInventoryEntries,
  removeInventoryItem,
} from "./inventory";
import { createInitialSaveGame } from "./save";

test("inventory add and remove update counts without mutating the original record", () => {
  const inventory = {};
  const added = addInventoryItem(inventory, "patch-pulse", 2);
  const removed = removeInventoryItem(added.inventory, "patch-pulse");

  expect(added.success).toBe(true);
  expect(added.inventory["patch-pulse"]).toBe(2);
  expect(inventory).toEqual({});
  expect(removed.inventory["patch-pulse"]).toBe(1);
});

test("usable inventory item changes gameplay state and consumes one item", () => {
  const save = createInitialSaveGame();
  const woundedSave = {
    ...save,
    circle: updateCircleSlot(save.circle, 0, (slot) =>
      slot.state === "occupied" ? { ...slot, currentHp: 5 } : slot,
    ),
  };
  const result = applyInventoryItem(woundedSave, "patch-pulse", {
    context: "menu",
  });
  const slot = result.save.circle[0];

  expect(result.success).toBe(true);
  expect(result.save.inventory["patch-pulse"]).toBe(1);
  expect(slot?.state === "occupied" ? slot.currentHp : 0).toBe(17);
});

test("invalid item use reports clear feedback and leaves save unchanged", () => {
  const save = createInitialSaveGame();
  const maxBondSave = {
    ...save,
    circle: updateCircleSlot(save.circle, 0, (slot) =>
      slot.state === "occupied" ? { ...slot, bond: 10 } : slot,
    ),
  };
  const result = applyInventoryItem(maxBondSave, "focus-bell", {
    context: "menu",
  });

  expect(result.success).toBe(false);
  expect(result.feedback).toBe(
    "No Circle member can gain more bond right now.",
  );
  expect(result.save).toEqual(maxBondSave);
});

test("stack limits cap additions", () => {
  const result = addInventoryItem({ "focus-bell": 4 }, "focus-bell", 4);

  expect(result.success).toBe(true);
  expect(result.changedCount).toBe(1);
  expect(result.inventory["focus-bell"]).toBe(5);
});

test("key items stack to one and cannot be used from the menu", () => {
  const added = addInventoryItem({ "key:garden-pass": 1 }, "key:garden-pass");
  const save = {
    ...createInitialSaveGame(),
    inventory: added.inventory,
  };
  const result = applyInventoryItem(save, "key:garden-pass", {
    context: "menu",
  });

  expect(getItemDefinition("key:garden-pass")?.category).toBe("key");
  expect(added.inventory["key:garden-pass"]).toBe(1);
  expect(result.success).toBe(false);
  expect(result.feedback).toBe("Garden Pass cannot be used here.");
});

test("inventory entries expose category, descriptions, disabled states, and battle restrictions", () => {
  const save = createInitialSaveGame();
  const woundedSave = {
    ...save,
    circle: updateCircleSlot(save.circle, 0, (slot) =>
      slot.state === "occupied" ? { ...slot, currentHp: 5 } : slot,
    ),
  };
  const battleEntries = getInventoryEntries(save.inventory, "battle");
  const keyEntries = getInventoryEntries(save.inventory, "key");
  const focusInBattle = applyInventoryItem(save, "focus-bell", {
    context: "battle",
  });
  const patchInBattle = applyInventoryItem(woundedSave, "patch-pulse", {
    context: "battle",
  });

  expect(battleEntries[0]?.name).toBe("Patch Pulse");
  expect(battleEntries[0]?.description).toContain("Restores");
  expect(battleEntries[0]?.canUse).toBe(true);
  expect(keyEntries[0]?.name).toBe("Garden Pass");
  expect(keyEntries[0]?.canUse).toBe(false);
  expect(focusInBattle.feedback).toBe("Focus Bell cannot be used here.");
  expect(patchInBattle.success).toBe(true);
});

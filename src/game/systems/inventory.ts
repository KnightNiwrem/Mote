import { MOTE_BODIES } from "@/game/data/bodies";
import {
  getItemDefinition,
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABELS,
} from "@/game/data/items";
import { MOTE_MINDS } from "@/game/data/minds";
import { calculateMindBodyStats } from "@/game/systems/mindBody";
import { updateCircleSlot } from "@/game/systems/moteCircle";
import type {
  InventoryUseContext,
  ItemCategory,
  ItemDefinition,
} from "@/game/types/game";
import type { CircleSlot, SaveGame } from "@/game/types/save";

export type InventoryMutationResult = {
  inventory: Record<string, number>;
  success: boolean;
  feedback: string;
  changedCount: number;
};

export type InventoryUseResult = {
  save: SaveGame;
  success: boolean;
  feedback: string;
};

export type InventoryEntry = {
  itemId: string;
  count: number;
  definition: ItemDefinition | null;
  category: ItemCategory | "unknown";
  name: string;
  description: string;
  canUse: boolean;
};

export type InventoryUseInput = {
  context: InventoryUseContext;
  targetSlotIndex?: number;
};

const UNKNOWN_STACK_LIMIT = 99;

export const INITIAL_INVENTORY: Record<string, number> = {
  "focus-bell": 1,
  "key:garden-pass": 1,
  "patch-pulse": 2,
};

export function addInventoryItem(
  inventory: Readonly<Record<string, number>>,
  itemId: string,
  count = 1,
): InventoryMutationResult {
  if (!Number.isInteger(count) || count <= 0) {
    return {
      inventory: { ...inventory },
      success: false,
      feedback: "Item count must be a positive whole number.",
      changedCount: 0,
    };
  }

  const currentCount = inventory[itemId] ?? 0;
  const stackLimit = getItemStackLimit(itemId);
  const nextCount = Math.min(stackLimit, currentCount + count);
  const changedCount = nextCount - currentCount;

  return {
    inventory: {
      ...inventory,
      [itemId]: nextCount,
    },
    success: changedCount > 0,
    feedback:
      changedCount > 0
        ? `Added ${changedCount} ${getInventoryItemName(itemId)}.`
        : `${getInventoryItemName(itemId)} stack is full.`,
    changedCount,
  };
}

export function removeInventoryItem(
  inventory: Readonly<Record<string, number>>,
  itemId: string,
  count = 1,
): InventoryMutationResult {
  if (!Number.isInteger(count) || count <= 0) {
    return {
      inventory: { ...inventory },
      success: false,
      feedback: "Item count must be a positive whole number.",
      changedCount: 0,
    };
  }

  const currentCount = inventory[itemId] ?? 0;
  if (currentCount < count) {
    return {
      inventory: { ...inventory },
      success: false,
      feedback: `Not enough ${getInventoryItemName(itemId)}.`,
      changedCount: 0,
    };
  }

  const nextInventory = { ...inventory };
  const nextCount = currentCount - count;

  if (nextCount > 0) {
    nextInventory[itemId] = nextCount;
  } else {
    delete nextInventory[itemId];
  }

  return {
    inventory: nextInventory,
    success: true,
    feedback: `Used ${count} ${getInventoryItemName(itemId)}.`,
    changedCount: count,
  };
}

export function applyInventoryItem(
  save: SaveGame,
  itemId: string,
  input: InventoryUseInput,
): InventoryUseResult {
  const definition = getItemDefinition(itemId);

  if (!definition) {
    return {
      save,
      success: false,
      feedback: "Unknown item cannot be used.",
    };
  }

  const count = save.inventory[itemId] ?? 0;
  if (count <= 0) {
    return {
      save,
      success: false,
      feedback: `${definition.name} is not in the inventory.`,
    };
  }

  if (!definition.usableFrom.includes(input.context)) {
    return {
      save,
      success: false,
      feedback: `${definition.name} cannot be used here.`,
    };
  }

  if (!definition.effect) {
    return {
      save,
      success: false,
      feedback: `${definition.name} cannot be used.`,
    };
  }

  if (definition.effect.type === "heal-circle") {
    return applyHealCircleItem(save, definition, input.targetSlotIndex);
  }

  return applyBondCircleItem(save, definition, input.targetSlotIndex);
}

export function canUseInventoryItem(
  save: SaveGame,
  itemId: string,
  context: InventoryUseContext,
): boolean {
  const definition = getItemDefinition(itemId);

  return Boolean(
    definition &&
      (save.inventory[itemId] ?? 0) > 0 &&
      definition.usableFrom.includes(context) &&
      definition.effect,
  );
}

export function getInventoryEntries(
  inventory: Readonly<Record<string, number>>,
  category?: ItemCategory,
  context: InventoryUseContext = "menu",
): InventoryEntry[] {
  return Object.entries(inventory)
    .filter(([, count]) => count > 0)
    .map(([itemId, count]) => {
      const definition = getItemDefinition(itemId);
      const itemCategory: InventoryEntry["category"] =
        definition?.category ?? "unknown";

      return {
        itemId,
        count,
        definition,
        category: itemCategory,
        name: definition?.name ?? formatUnknownItemName(itemId),
        description: definition?.description ?? "No item definition available.",
        canUse: Boolean(
          definition?.effect && definition.usableFrom.includes(context),
        ),
      };
    })
    .filter((entry) => !category || entry.category === category)
    .sort(compareInventoryEntries);
}

export function getInventoryCategoryLabel(category: ItemCategory): string {
  return INVENTORY_CATEGORY_LABELS[category];
}

export function getInventoryItemName(itemId: string): string {
  return getItemDefinition(itemId)?.name ?? formatUnknownItemName(itemId);
}

function applyHealCircleItem(
  save: SaveGame,
  definition: ItemDefinition,
  targetSlotIndex?: number,
): InventoryUseResult {
  const target = findCircleSlotTarget(save.circle, targetSlotIndex, (slot) => {
    if (slot.state !== "occupied") {
      return false;
    }

    return slot.currentHp < getCircleSlotMaxHp(slot);
  });

  if (!target) {
    return {
      save,
      success: false,
      feedback: "No Circle member needs healing.",
    };
  }

  const maxHp = getCircleSlotMaxHp(target.slot);
  const healedAmount = Math.min(
    definition.effect?.amount ?? 0,
    maxHp - target.slot.currentHp,
  );
  const removed = removeInventoryItem(save.inventory, definition.id);

  return {
    save: {
      ...save,
      inventory: removed.inventory,
      circle: updateCircleSlot(save.circle, target.index, (slot) =>
        slot.state === "occupied"
          ? {
              ...slot,
              currentHp: slot.currentHp + healedAmount,
            }
          : slot,
      ),
    },
    success: true,
    feedback: `${definition.name} restored ${healedAmount} HP.`,
  };
}

function applyBondCircleItem(
  save: SaveGame,
  definition: ItemDefinition,
  targetSlotIndex?: number,
): InventoryUseResult {
  const target = findCircleSlotTarget(save.circle, targetSlotIndex, (slot) =>
    slot.state === "occupied" ? slot.bond < 10 : false,
  );

  if (!target) {
    return {
      save,
      success: false,
      feedback: "No Circle member can gain more bond right now.",
    };
  }

  const bondGain = definition.effect?.amount ?? 0;
  const removed = removeInventoryItem(save.inventory, definition.id);

  return {
    save: {
      ...save,
      inventory: removed.inventory,
      circle: updateCircleSlot(save.circle, target.index, (slot) =>
        slot.state === "occupied"
          ? {
              ...slot,
              bond: Math.min(10, slot.bond + bondGain),
            }
          : slot,
      ),
    },
    success: true,
    feedback: `${definition.name} raised bond by ${bondGain}.`,
  };
}

function findCircleSlotTarget(
  circle: readonly CircleSlot[],
  targetSlotIndex: number | undefined,
  canTarget: (slot: CircleSlot) => boolean,
): { index: number; slot: Extract<CircleSlot, { state: "occupied" }> } | null {
  if (targetSlotIndex !== undefined) {
    const slot = circle[targetSlotIndex];

    return slot?.state === "occupied" && canTarget(slot)
      ? { index: targetSlotIndex, slot }
      : null;
  }

  for (const [index, slot] of circle.entries()) {
    if (slot.state === "occupied" && canTarget(slot)) {
      return { index, slot };
    }
  }

  return null;
}

function getCircleSlotMaxHp(slot: Extract<CircleSlot, { state: "occupied" }>) {
  const stats = calculateMindBodyStatsById(slot.bodyId, slot.mindId);

  return stats.hp;
}

function calculateMindBodyStatsById(bodyId: string, mindId: string) {
  const body = MOTE_BODIES[bodyId];
  const mind = MOTE_MINDS[mindId];

  if (!body || !mind) {
    throw new Error("Cannot use inventory item on an unknown Circle member");
  }

  return calculateMindBodyStats(body, mind);
}

function getItemStackLimit(itemId: string): number {
  return getItemDefinition(itemId)?.stackLimit ?? UNKNOWN_STACK_LIMIT;
}

function compareInventoryEntries(
  left: InventoryEntry,
  right: InventoryEntry,
): number {
  const leftCategoryIndex = getCategorySortIndex(left.category);
  const rightCategoryIndex = getCategorySortIndex(right.category);

  return (
    leftCategoryIndex - rightCategoryIndex ||
    left.name.localeCompare(right.name) ||
    left.itemId.localeCompare(right.itemId)
  );
}

function getCategorySortIndex(category: ItemCategory | "unknown"): number {
  return category === "unknown"
    ? INVENTORY_CATEGORIES.length
    : INVENTORY_CATEGORIES.indexOf(category);
}

function formatUnknownItemName(itemId: string): string {
  return itemId
    .split(/[:-]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

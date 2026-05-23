import type { CircleSlot, OccupiedCircleSlot } from "@/game/types/save";

export const MAX_CIRCLE_SLOTS = 7;

export type CircleSlotInput = {
  bodyId: string;
  mindId: string;
  level?: number;
  experience?: number;
  bond?: number;
  currentHp: number;
};

export function createEmptyCircle(): CircleSlot[] {
  return Array.from({ length: MAX_CIRCLE_SLOTS }, () => ({ state: "empty" }));
}

export function createCircleSlot(input: CircleSlotInput): OccupiedCircleSlot {
  return {
    state: "occupied",
    bodyId: input.bodyId,
    mindId: input.mindId,
    level: input.level ?? 1,
    experience: input.experience ?? 0,
    bond: input.bond ?? 0,
    currentHp: input.currentHp,
  };
}

export function isOccupiedCircleSlot(
  slot: CircleSlot,
): slot is OccupiedCircleSlot {
  return slot.state === "occupied";
}

export function getOccupiedCircleSlots(
  circle: readonly CircleSlot[],
): OccupiedCircleSlot[] {
  return circle.filter(isOccupiedCircleSlot);
}

export function setCircleSlot(
  circle: readonly CircleSlot[],
  index: number,
  slot: CircleSlot,
): CircleSlot[] {
  if (!Number.isInteger(index) || index < 0 || index >= MAX_CIRCLE_SLOTS) {
    throw new RangeError("Circle slot index must be between 0 and 6");
  }

  if (circle.length > MAX_CIRCLE_SLOTS) {
    throw new Error("Mote Circle cannot exceed seven slots");
  }

  const nextCircle = [...circle];
  while (nextCircle.length <= index) {
    nextCircle.push({ state: "empty" });
  }

  nextCircle[index] = slot;
  return nextCircle;
}

export function updateCircleSlot(
  circle: readonly CircleSlot[],
  index: number,
  update: (slot: CircleSlot) => CircleSlot,
): CircleSlot[] {
  return setCircleSlot(
    circle,
    index,
    update(circle[index] ?? { state: "empty" }),
  );
}

export function addCircleSlot(
  circle: readonly CircleSlot[],
  slot: OccupiedCircleSlot,
): CircleSlot[] {
  if (circle.length > MAX_CIRCLE_SLOTS) {
    throw new Error("Mote Circle cannot exceed seven slots");
  }

  const emptyIndex = circle.findIndex(
    (circleSlot) => circleSlot.state === "empty",
  );
  if (emptyIndex >= 0) {
    return setCircleSlot(circle, emptyIndex, slot);
  }

  if (circle.length >= MAX_CIRCLE_SLOTS) {
    throw new Error("Mote Circle cannot exceed seven slots");
  }

  return [...circle, slot];
}

export function removeCircleSlot(
  circle: readonly CircleSlot[],
  index: number,
): CircleSlot[] {
  return setCircleSlot(circle, index, { state: "empty" });
}

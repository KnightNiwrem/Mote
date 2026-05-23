import { expect, test } from "bun:test";
import {
  addCircleSlot,
  createCircleSlot,
  createEmptyCircle,
  getOccupiedCircleSlots,
  MAX_CIRCLE_SLOTS,
  removeCircleSlot,
} from "./moteCircle";

test("Circle helpers place occupied slots into empty positions", () => {
  const circle = addCircleSlot(
    createEmptyCircle(),
    createCircleSlot({
      bodyId: "glowbud",
      mindId: "luma-companion",
      currentHp: 24,
      bond: 2,
    }),
  );

  expect(circle).toHaveLength(MAX_CIRCLE_SLOTS);
  expect(circle[0]?.state).toBe("occupied");
  expect(getOccupiedCircleSlots(circle)).toHaveLength(1);
});

test("Circle helpers remove occupied slots without changing capacity", () => {
  const circle = addCircleSlot(
    createEmptyCircle(),
    createCircleSlot({
      bodyId: "glowbud",
      mindId: "luma-companion",
      currentHp: 24,
    }),
  );
  const nextCircle = removeCircleSlot(circle, 0);

  expect(nextCircle).toHaveLength(MAX_CIRCLE_SLOTS);
  expect(nextCircle[0]).toEqual({ state: "empty" });
  expect(getOccupiedCircleSlots(nextCircle)).toHaveLength(0);
});

test("Circle helpers reject more than seven occupied slots", () => {
  const fullCircle = Array.from({ length: MAX_CIRCLE_SLOTS }, (_, index) =>
    createCircleSlot({
      bodyId: "glowbud",
      mindId: "luma-companion",
      currentHp: 24,
      level: index + 1,
    }),
  );

  expect(() =>
    addCircleSlot(
      fullCircle,
      createCircleSlot({
        bodyId: "glowbud",
        mindId: "luma-companion",
        currentHp: 24,
      }),
    ),
  ).toThrow("Mote Circle cannot exceed seven slots");
});

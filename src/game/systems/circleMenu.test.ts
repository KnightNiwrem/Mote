import { expect, test } from "bun:test";
import {
  assignAcquiredMindToCircle,
  getAvailableMindIds,
} from "@/game/systems/mindBody";
import {
  createCircleMenuRows,
  getCircleAssignableMindOptions,
} from "./circleMenu";
import { createInitialSaveGame } from "./save";

test("Circle menu rows expose seven slots with combat and compatibility details", () => {
  const rows = createCircleMenuRows(createInitialSaveGame());
  const firstRow = rows[0];

  expect(rows).toHaveLength(7);
  expect(firstRow?.state).toBe("occupied");

  if (firstRow?.state !== "occupied") {
    throw new Error("Expected first Circle row to be occupied");
  }

  expect(firstRow.bodyName).toBe("Glowbud");
  expect(firstRow.mindName).toBe("Luma");
  expect(firstRow.currentHp).toBe(24);
  expect(firstRow.level).toBe(1);
  expect(firstRow.bond).toBe(2);
  expect(firstRow.compatibility).toContain("Resonant");
  expect(firstRow.activeOrder).toBe(1);
});

test("Circle mind assignment uses only acquired minds", () => {
  const save = {
    ...createInitialSaveGame(),
    acquiredMinds: ["base-mind"],
  };
  const assigned = assignAcquiredMindToCircle(save, 0, "base-mind");

  expect(getAvailableMindIds(["base-mind", "missing-mind"])).toEqual([
    "base-mind",
  ]);
  expect(getCircleAssignableMindOptions(save)).toEqual([
    { mindId: "base-mind", label: "Base Mind" },
  ]);
  expect(assigned.circle[0]?.state).toBe("occupied");
  expect(
    assigned.circle[0]?.state === "occupied" ? assigned.circle[0].mindId : null,
  ).toBe("base-mind");
  expect(() => assignAcquiredMindToCircle(save, 0, "optima-focus")).toThrow(
    "Cannot assign a mind before it is acquired",
  );
});

test("Circle mind assignment rejects empty slots", () => {
  const save = createInitialSaveGame();

  expect(() => assignAcquiredMindToCircle(save, 1, "base-mind")).toThrow(
    "Cannot assign a mind to an empty Circle slot",
  );
});

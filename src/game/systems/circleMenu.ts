import { MOTE_BODIES } from "@/game/data/bodies";
import { MOTE_MINDS } from "@/game/data/minds";
import {
  calculateMindBodyStats,
  getAvailableMindIds,
  getCircleSlotCompatibility,
} from "@/game/systems/mindBody";
import { MAX_CIRCLE_SLOTS } from "@/game/systems/moteCircle";
import type { SaveGame } from "@/game/types/save";

export type CircleMenuRow =
  | {
      state: "empty";
      index: number;
      activeOrder: number | null;
      label: string;
    }
  | {
      state: "occupied";
      index: number;
      activeOrder: number;
      bodyId: string;
      bodyName: string;
      mindId: string;
      mindName: string;
      currentHp: number;
      maxHp: number;
      level: number;
      bond: number;
      compatibility: string;
      label: string;
    };

export function createCircleMenuRows(save: SaveGame): CircleMenuRow[] {
  return Array.from({ length: MAX_CIRCLE_SLOTS }, (_, index) => {
    const slot = save.circle[index] ?? { state: "empty" };

    if (slot.state === "empty") {
      return {
        state: "empty",
        index,
        activeOrder: null,
        label: `Slot ${index + 1} Empty`,
      };
    }

    const body = MOTE_BODIES[slot.bodyId];
    const mind = MOTE_MINDS[slot.mindId];
    const stats = body && mind ? calculateMindBodyStats(body, mind) : null;

    return {
      state: "occupied",
      index,
      activeOrder: index + 1,
      bodyId: slot.bodyId,
      bodyName: body?.name ?? slot.bodyId,
      mindId: slot.mindId,
      mindName: mind?.name ?? slot.mindId,
      currentHp: slot.currentHp,
      maxHp: stats?.hp ?? slot.currentHp,
      level: slot.level,
      bond: slot.bond,
      compatibility: getCircleSlotCompatibility(slot),
      label: `Slot ${index + 1} ${body?.name ?? slot.bodyId}`,
    };
  });
}

export function getCircleAssignableMindOptions(save: SaveGame) {
  return getAvailableMindIds(save.acquiredMinds).map((mindId) => ({
    mindId,
    label: MOTE_MINDS[mindId]?.name ?? mindId,
  }));
}

import type { Direction } from "@/game/data/maps";

export const GAME_CONTROL_EVENT = "mote:control";

export type GameControlInput =
  | {
      type: "direction-start";
      direction: Direction;
    }
  | {
      type: "direction-end";
      direction: Direction;
    }
  | {
      type: "action";
    };

export function createGameControlEvent(input: GameControlInput) {
  return new CustomEvent<GameControlInput>(GAME_CONTROL_EVENT, {
    detail: input,
  });
}

export function dispatchGameControl(
  input: GameControlInput,
  target: EventTarget = window,
) {
  target.dispatchEvent(createGameControlEvent(input));
}

import type { Direction } from "@/game/data/maps";

export const GAME_CONTROL_EVENT = "mote:control";

export type ControlBinding = {
  action: string;
  keyboard: string;
  touch: string;
};

export const DEFAULT_CONTROL_BINDINGS: readonly ControlBinding[] = [
  {
    action: "Move",
    keyboard: "Arrow keys or WASD",
    touch: "D-pad",
  },
  {
    action: "Interact / Select",
    keyboard: "Space, E, or Enter",
    touch: "A button",
  },
  {
    action: "Menus",
    keyboard: "Arrow keys or WASD",
    touch: "D-pad + A",
  },
  {
    action: "Circle pairing",
    keyboard: "Left / Right",
    touch: "D-pad left / right",
  },
] as const;

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

export function formatControlBinding(binding: ControlBinding): string {
  return `${binding.action}: ${binding.keyboard} / ${binding.touch}`;
}

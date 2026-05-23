import { expect, test } from "bun:test";
import {
  createGameControlEvent,
  dispatchGameControl,
  GAME_CONTROL_EVENT,
  type GameControlInput,
} from "./input";

test("creates typed game control custom events", () => {
  const event = createGameControlEvent({
    type: "direction-start",
    direction: "left",
  });

  expect(event.type).toBe(GAME_CONTROL_EVENT);
  expect(event.detail).toEqual({
    type: "direction-start",
    direction: "left",
  });
});

test("dispatches game controls to the supplied event target", () => {
  const target = new EventTarget();
  let received: unknown;

  target.addEventListener(GAME_CONTROL_EVENT, (event) => {
    received = (event as CustomEvent<GameControlInput>).detail;
  });

  dispatchGameControl({ type: "action" }, target);

  expect(received).toEqual({ type: "action" });
});

import { expect, test } from "bun:test";
import {
  createGameControlEvent,
  DEFAULT_CONTROL_BINDINGS,
  dispatchGameControl,
  formatControlBinding,
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

test("publishes readable default controls for the controls panel", () => {
  expect(DEFAULT_CONTROL_BINDINGS).toHaveLength(4);
  const actionBinding = DEFAULT_CONTROL_BINDINGS[1];

  if (!actionBinding) {
    throw new Error("Expected an action binding");
  }

  expect(formatControlBinding(actionBinding)).toBe(
    "Interact / Select: Space, E, or Enter / A button",
  );
});

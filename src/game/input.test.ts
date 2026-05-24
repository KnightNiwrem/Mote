import { expect, test } from "bun:test";
import {
  createGameControlEvent,
  createGameRuntimeEvent,
  DEFAULT_CONTROL_BINDINGS,
  dispatchGameControl,
  dispatchGameRuntimeEvent,
  formatControlBinding,
  GAME_CONTROL_EVENT,
  GAME_RUNTIME_EVENT,
  type GameControlInput,
  type GameRuntimeEvent,
} from "./input";
import { createInitialSaveGame } from "./systems/save";

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
  expect(DEFAULT_CONTROL_BINDINGS).toHaveLength(5);
  const actionBinding = DEFAULT_CONTROL_BINDINGS[1];

  if (!actionBinding) {
    throw new Error("Expected an action binding");
  }

  expect(formatControlBinding(actionBinding)).toBe(
    "Interact / Select: Space, E, or Enter / A button",
  );
});

test("creates typed runtime events for the shell bridge", () => {
  const save = createInitialSaveGame();

  const event = createGameRuntimeEvent({
    type: "free-roam",
    canPause: true,
    save,
  });

  expect(event.type).toBe(GAME_RUNTIME_EVENT);
  expect(event.detail).toEqual({
    type: "free-roam",
    canPause: true,
    save,
  });
});

test("dispatches runtime events to the supplied event target", () => {
  const target = new EventTarget();
  let received: unknown;

  target.addEventListener(GAME_RUNTIME_EVENT, (event) => {
    received = (event as CustomEvent<GameRuntimeEvent>).detail;
  });

  dispatchGameRuntimeEvent({ type: "busy", canPause: false }, target);

  expect(received).toEqual({ type: "busy", canPause: false });
});

import { expect, test } from "bun:test";
import { createServeOptions } from "./server";

test("serves the React app through a single static fallback route", () => {
  const options = createServeOptions({ development: false });

  expect(Object.keys(options.routes)).toEqual(["/*"]);
  expect("fetch" in options).toBe(false);
  expect(options.development).toBe(false);
});

test("enables Bun development helpers for local source serving", () => {
  const options = createServeOptions({ development: true });

  expect(options.development).toEqual({
    hmr: true,
    console: true,
  });
});

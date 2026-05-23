import { expect, test } from "bun:test";
import { createServeOptions } from "./server";

test("serves the React app through a single static fallback route", () => {
  const options = createServeOptions({ development: false, env: {} });

  expect(Object.keys(options.routes)).toEqual(["/*"]);
  expect("fetch" in options).toBe(false);
  expect(options.development).toBe(false);
});

test("enables Bun development helpers for local source serving", () => {
  const options = createServeOptions({ development: true, env: {} });

  expect(options.development).toEqual({
    hmr: true,
    console: true,
  });
});

test("uses PORT for local source serving", () => {
  expect(createServeOptions({ env: { PORT: "4321" } }).port).toBe(4321);
});

test("defaults local source serving to port 3000", () => {
  expect(createServeOptions({ env: {} }).port).toBe(3000);
});

test("uses explicit port overrides for local source serving", () => {
  expect(createServeOptions({ env: {}, port: "4000" }).port).toBe(4000);
});

test("uses NODE_ENV to disable development helpers in production", () => {
  const options = createServeOptions({ env: { NODE_ENV: "production" } });

  expect(options.development).toBe(false);
});

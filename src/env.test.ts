import { expect, test } from "bun:test";
import { parseEnv, parsePort } from "./env";

test("parses env defaults", () => {
  expect(parseEnv({})).toEqual({
    NODE_ENV: "development",
    PORT: 3000,
  });
});

test("parses numeric ports from env", () => {
  expect(parseEnv({ PORT: "4321" }).PORT).toBe(4321);
});

test("parses a custom default port", () => {
  expect(parseEnv({}, { defaultPort: 4173 }).PORT).toBe(4173);
});

test("treats blank ports as missing", () => {
  expect(parsePort("")).toBe(3000);
});

test("rejects invalid ports", () => {
  expect(() => parseEnv({ PORT: "not-a-port" })).toThrow();
});

test("rejects invalid NODE_ENV values", () => {
  expect(() => parseEnv({ NODE_ENV: "staging" })).toThrow();
});

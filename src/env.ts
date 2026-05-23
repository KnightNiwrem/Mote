import { z } from "zod";

export const DEFAULT_PORT = 3000;

export type RuntimeEnv = Record<string, string | undefined>;

const emptyStringToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const nodeEnvSchema = z.preprocess(
  emptyStringToUndefined,
  z.enum(["development", "production", "test"]).default("development"),
);

export function createPortSchema(defaultPort = DEFAULT_PORT) {
  return z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(0).max(65_535).default(defaultPort),
  );
}

export const portSchema = createPortSchema();

type ParseEnvOptions = {
  defaultPort?: number;
};

export function createEnvSchema({
  defaultPort = DEFAULT_PORT,
}: ParseEnvOptions = {}) {
  return z.object({
    NODE_ENV: nodeEnvSchema,
    PORT: createPortSchema(defaultPort),
  });
}

export const envSchema = createEnvSchema();

export type Env = z.infer<typeof envSchema>;

export function parsePort(
  port: string | number | undefined,
  defaultPort = DEFAULT_PORT,
): number {
  return createPortSchema(defaultPort).parse(port);
}

export function parseEnv(
  env: RuntimeEnv = process.env,
  options: ParseEnvOptions = {},
): Env {
  return createEnvSchema(options).parse(env);
}

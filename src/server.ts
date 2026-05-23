import { parseEnv, parsePort, type RuntimeEnv } from "./env";
import index from "./index.html";

type StaticRoute = "/*";

type StaticServeOptions = Bun.Serve.Options<undefined, StaticRoute> & {
  routes: Bun.Serve.Routes<undefined, StaticRoute>;
  development: Bun.Serve.Development;
};

type CreateServeOptionsInput = {
  development?: boolean;
  port?: string | number;
  env?: RuntimeEnv;
};

export function createServeOptions({
  development,
  env = process.env,
  port,
}: CreateServeOptionsInput = {}): StaticServeOptions {
  const parsedEnv = parseEnv(env);

  return {
    port: parsePort(port ?? parsedEnv.PORT),
    routes: {
      "/*": index,
    },
    development:
      (development ?? parsedEnv.NODE_ENV !== "production")
        ? {
            hmr: true,
            console: true,
          }
        : false,
  };
}

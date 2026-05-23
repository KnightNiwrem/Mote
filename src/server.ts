import index from "./index.html";

type StaticRoute = "/*";

type StaticServeOptions = Bun.Serve.Options<undefined, StaticRoute> & {
  routes: Bun.Serve.Routes<undefined, StaticRoute>;
  development: Bun.Serve.Development;
};

type CreateServeOptionsInput = {
  development?: boolean;
};

export function createServeOptions({
  development = process.env.NODE_ENV !== "production",
}: CreateServeOptionsInput = {}): StaticServeOptions {
  return {
    routes: {
      "/*": index,
    },
    development: development
      ? {
          hmr: true,
          console: true,
        }
      : false,
  };
}

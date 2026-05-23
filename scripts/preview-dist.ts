#!/usr/bin/env bun
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const indexPath = path.join(distDir, "index.html");
const port = process.env.PORT ?? "4173";

function resolveDistPath(url: URL): string | undefined {
  let pathname: string;

  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return undefined;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(distDir, relativePath);

  if (filePath !== distDir && !filePath.startsWith(`${distDir}${path.sep}`)) {
    return undefined;
  }

  return filePath;
}

async function responseForFile(
  filePath: string,
): Promise<Response | undefined> {
  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    return undefined;
  }

  const headers = file.type ? { "Content-Type": file.type } : undefined;

  return new Response(file, { headers });
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const filePath = resolveDistPath(new URL(request.url));

    if (filePath === undefined) {
      return new Response("Bad request", { status: 400 });
    }

    const response = await responseForFile(filePath);

    if (response !== undefined) {
      return response;
    }

    const fallback = await responseForFile(indexPath);

    if (fallback !== undefined) {
      return fallback;
    }

    return new Response("Missing dist/index.html. Run `bun run build` first.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });
  },
});

console.log(`Static preview running at ${server.url}`);

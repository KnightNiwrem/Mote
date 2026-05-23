# Bun React Static Template

A client-only React 19 + TypeScript template for building static sites with Bun.

This template uses Bun for dependency management, local development serving, HTML
bundling, and tests. Production builds are emitted to `dist/` and are intended to
be deployed on a static host.

## Stack

- Bun `1.3.14`
- React `19`
- TypeScript `5.9`
- Tailwind CSS `4`
- shadcn/ui-style components with Radix primitives
- Biome for linting and formatting
- `bun:test` for tests

## Scripts

| Command | Description |
| --- | --- |
| `bun install` | Install dependencies |
| `bun run dev` | Serve `src/index.html` through Bun with hot reloading |
| `bun run serve:source` | Serve the source app locally without hot reloading |
| `bun run build` | Build static production assets into `dist/` |
| `bun run preview` | Build and serve `dist/` locally as static files |
| `bun run check` | Run Biome linting, formatting, and import checks |
| `bun run check:fix` | Auto-fix Biome issues |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run test` | Run Bun tests |
| `bun run validate` | Run check, typecheck, test, and build |

## Development

```bash
bun install
bun run dev
```

The local Bun server defaults to `http://localhost:3000`. Use `PORT` to run on a
different port:

```bash
PORT=4000 bun run dev
```

## Static Builds

```bash
bun run build
```

The generated `dist/` directory is the production artifact. Upload it to a static
host such as Cloudflare Pages, Netlify, Vercel static output, S3, or any server
that can serve files with an SPA fallback to `index.html`.

For a local static-host smoke test:

```bash
bun run preview
```

## Project Layout

```text
src/
  index.ts        Bun local server entrypoint
  server.ts       Testable Bun serve options for the local app shell
  index.html      HTML entrypoint for Bun HTML bundling
  frontend.tsx    React entrypoint
  App.tsx         Main React component
  components/ui/  shadcn/ui-style components
  lib/utils.ts    Shared helpers
scripts/
  preview-dist.ts Local static preview server for dist/
styles/
  globals.css     Tailwind and shadcn theme tokens
```

## Notes

- This template does not include backend API routes.
- Keep `src/index.ts` as a thin local-serving wrapper.
- Add application logic to React components and testable modules.
- Run `bun run validate` before committing template changes.

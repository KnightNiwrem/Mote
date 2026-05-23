# Instructions for Agents

## Tech Stack

- **Runtime/Bundler**: Bun (pinned to v1.3.14)
- **Frontend**: React 19, TypeScript 5.9+
- **Styling**: Tailwind CSS 4, tw-animate-css
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Linting/Formatting**: Biome 2.3+
- **Testing**: Bun's built-in test runner

## Project Structure

```
├── src/
│   ├── index.ts          # Thin Bun local server entry point
│   ├── server.ts         # Testable Bun serve options for the local app shell
│   ├── index.html        # HTML entry point
│   ├── index.css         # Global styles and Tailwind imports
│   ├── frontend.tsx      # React app entry point
│   ├── App.tsx           # Main React component
│   ├── components/ui/    # shadcn/ui components (button, card, input, etc.)
│   ├── lib/utils.ts      # Utility functions (cn helper for classnames)
│   └── *.test.ts(x)      # Tests colocated with the code they cover
├── scripts/
│   └── preview-dist.ts   # Local static preview server for dist/
├── styles/globals.css    # Additional global styles
├── build.ts              # Custom build script
├── biome.json            # Biome linting/formatting config
└── tsconfig.json         # TypeScript configuration
```

## Dev Environment Setup

1. Always run `bun install` first to ensure dependencies are installed
2. Use `bun run dev` to start the local source server with hot reloading
3. The server runs at `http://localhost:3000` by default. Use `PORT=4000 bun run dev` to override it.

## Available Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server with hot reloading |
| `bun run serve:source` | Serve the source app locally without hot reloading |
| `bun run build` | Build static production assets into `dist/` |
| `bun run preview` | Build and serve `dist/` locally as static files |
| `bun run check` | Run Biome linting, formatting, and import checks |
| `bun run check:fix` | Auto-fix linting, formatting, and import issues |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run test` | Run tests with Bun's test runner |
| `bun run validate` | Run check, typecheck, test, and build |

## Validation Requirements

Before completing any task, ensure all checks pass:

```bash
bun run check && bun run typecheck && bun run test && bun run build
```

Run these commands in sequence. If any fail, fix the issues before proceeding.

## Code Style Guidelines

### TypeScript
- Strict mode is enabled with `noUncheckedIndexedAccess`
- Use path alias `@/*` for imports from `src/` directory
- Prefer explicit types over `any`

### Formatting (Biome)
- Indent with spaces
- Use double quotes for strings

### React Components
- Use functional components with TypeScript
- shadcn/ui components are in `src/components/ui/`
- Use the `cn()` helper from `@/lib/utils` for conditional classnames
- Prefer composition with Radix UI Slot pattern for component variants

### Styling
- Use Tailwind CSS utility classes
- Custom animations available via tw-animate-css
- Tailwind directives are enabled in CSS files

## Testing Guidelines

- Test files use `.test.ts` or `.test.tsx` suffix
- Tests use Bun's built-in test runner (`import { expect, test } from "bun:test"`)
- Place tests alongside the source files they cover
- Add or update tests for any code changes

Example test pattern:
```typescript
import { expect, test } from "bun:test";
import { myFunction } from "./myModule";

test("description of what is being tested", () => {
  expect(myFunction(input)).toBe(expectedOutput);
});
```

## Static App Development

- This template is for client-only React apps built to static assets
- Do not add backend API routes unless the generated project explicitly needs a backend
- Keep `src/index.ts` as a thin wrapper that starts `Bun.serve`
- Keep testable local-serving configuration in `src/server.ts`
- The production artifact is `dist/`; deploy it to a static host with an SPA fallback to `index.html`

## Adding shadcn/ui Components

Components are manually added to `src/components/ui/`. When adding new shadcn/ui components:
1. Check the shadcn/ui documentation for the component
2. Create the component file in `src/components/ui/`
3. Ensure proper imports from Radix UI and class-variance-authority

## Common Gotchas

- Always import React types properly for TSX files
- The `bun-plugin-tailwind` handles Tailwind CSS processing during source serving and build
- CSS files support `@tailwind` directives
- Use `bun run build` for production builds

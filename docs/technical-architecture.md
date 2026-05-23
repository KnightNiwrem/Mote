# Mote Technical Architecture

## Overview

Mote should be implemented as a client-only React and Phaser application built with Bun. React owns the application shell, routed panels, settings, and durable UI overlays. Phaser owns the active game canvas, scenes, sprites, maps, input processing, camera, collisions, and battle presentation.

The architecture should keep simulation rules independent from rendering. Battle math, Mote Circle rules, save serialization, quest state, and mind/body compatibility should live in plain TypeScript modules so they can be tested with Bun's built-in test runner.

## Current Stack

- Runtime and package manager: Bun 1.3.14
- UI: React 19 and TypeScript
- Styling: Tailwind CSS 4
- Components: shadcn/ui-style components and Radix primitives
- Game runtime: Phaser 4.1.0
- Validation: Biome, TypeScript, Bun test, production build

## Proposed Runtime Additions

### Phaser 4

Use Phaser 4 for the game canvas. Phaser provides scene lifecycles, spritesheet animation, cameras, input, tilemap loading, and Arcade Physics for top-down movement and collisions.

Because Mote is a greenfield project, target Phaser 4 APIs directly. Keep the first slice on standard Phaser objects and systems such as scenes, sprites, text, tilemaps, cameras, and Arcade Physics. Avoid Phaser 3-era renderer pipelines, custom renderer internals, and shader assumptions unless a later milestone explicitly requires custom rendering.

### Tiled

Use Tiled as the map authoring tool and export maps as JSON. Store exported maps and tilesets under version control once the asset pipeline stabilizes.

## Application Boundaries

```text
React shell
  App layout
  Settings
  Save slot UI
  Menus and overlays
  Optional debug panels

Phaser game
  Boot/loading scene
  World and Garden scenes
  Battle scene
  UI scene for canvas-native dialogue and prompts

Pure TypeScript systems
  Battle rules
  Mote Circle state
  Mind/body compatibility
  Quest flags
  Save data
  Encounter tables
```

React and Phaser should communicate through a narrow event bridge instead of sharing mutable scene internals.

## Recommended Source Layout

```text
src/
  game/
    GameHost.tsx
    config.ts
    events.ts
    scenes/
      BootScene.ts
      GardenScene.ts
      WorldScene.ts
      BattleScene.ts
      UIScene.ts
    systems/
      battle.ts
      dialogue.ts
      encounters.ts
      interaction.ts
      mindBody.ts
      moteCircle.ts
      movement.ts
      quests.ts
      save.ts
    data/
      bodies.ts
      factions.ts
      maps.ts
      minds.ts
      moves.ts
      quests.ts
    types/
      game.ts
      save.ts
  assets/
    maps/
    sprites/
    tilesets/
    audio/
```

## Scene Architecture

### BootScene

Responsibilities:

- Configure pixel rendering
- Load static asset manifests
- Load core spritesheets, tilemaps, fonts, and audio
- Initialize game-wide registries
- Start the Garden or World scene based on save state

### GardenScene

Responsibilities:

- Render the player's private Garden
- Show first companion and Circle members
- Handle rest, feed, play, train, and exit interactions
- Emit events for React menus when needed

### WorldScene

Responsibilities:

- Render Motehaven maps
- Handle player movement and collision
- Process NPC interactions
- Trigger wild encounters and trainer battles
- Transition between maps

### BattleScene

Responsibilities:

- Present turn-based battles
- Display active Motes, moves, HP, and battle log
- Invoke pure battle system functions
- Resolve rewards, acquisition, quest flags, and scene return

### UIScene

Responsibilities:

- Render canvas-native dialogue boxes and prompt menus
- Keep dialogue usable when React overlays are hidden
- Coordinate input priority during conversations and battles

## Data Model

### MoteBody

```typescript
export type MoteBody = {
  id: string;
  name: string;
  species: string;
  spriteKey: string;
  baseStats: BattleStats;
  traits: string[];
  learnset: string[];
  growthCurve: "steady" | "early" | "late" | "erratic";
  compatibleMindTags: string[];
};
```

### MoteMind

```typescript
export type MoteMind = {
  id: string;
  name: string;
  origin: "tessera" | "optima" | "northstar" | "asterion" | "sovereign" | "base";
  personalityTags: string[];
  battleStyle: "adaptive" | "efficient" | "reliable" | "experimental" | "volatile";
  statModifiers: Partial<BattleStats>;
  bondProfile: "warm" | "disciplined" | "steady" | "curious" | "unstable";
  compatibilityTags: string[];
};
```

### CircleSlot

```typescript
export type CircleSlot =
  | { state: "empty" }
  | {
      state: "occupied";
      bodyId: string;
      mindId: string;
      level: number;
      experience: number;
      bond: number;
      currentHp: number;
    };
```

### SaveGame

```typescript
export type SaveGame = {
  version: number;
  player: {
    name: string;
    currentMapId: string;
    position: { x: number; y: number };
  };
  circle: CircleSlot[];
  inventory: Record<string, number>;
  questFlags: Record<string, boolean | number | string>;
  acquiredBodies: string[];
  acquiredMinds: string[];
};
```

## Battle System

The battle system should be deterministic and testable. Rendering code should submit commands such as `selectMove`, `useItem`, `switchMote`, or `attemptEscape`; the battle system should return a new state plus a list of display events.

```text
Battle input
  Player action
  Enemy action policy
  Current battle state

Battle reducer
  Validate action
  Determine turn order
  Apply move effects
  Apply mind/body modifiers
  Apply status effects
  Check win/loss

Battle output
  Next battle state
  Ordered battle events
```

Enemy AI for the vertical slice should be simple and deterministic:

- Wild Motes choose weighted moves based on HP and move role.
- Optima trainers prefer efficient damage and finishing moves.
- Tessera trainers prefer bond/support moves when threatened.
- Sovereign encounters can use volatile high-risk moves with clear narrative framing.

## Mind Adapter Boundary

Real local AI should not be required for the first slice. Add an adapter boundary for future integration:

```typescript
export type MindDecisionContext = {
  battleState?: unknown;
  relationshipState?: unknown;
  recentEvents: string[];
};

export type MindAdapter = {
  getDialogue(context: MindDecisionContext): Promise<string>;
  chooseBattleAction(context: MindDecisionContext): Promise<string>;
};
```

Initial implementation:

- `ProfileMindAdapter`: deterministic dialogue and battle tendencies from local data.

Future implementation:

- `LocalModelMindAdapter`: optional local model inference.
- `FallbackMindAdapter`: safe base behavior when model access is unavailable.

## Asset Pipeline

- Use original pixel art assets.
- Author maps in Tiled.
- Export maps as JSON.
- Store source map files and exported map JSON in `src/assets/maps/` or `public/assets/maps/`.
- Use fixed-size spritesheets for characters and Motes.
- Keep tiles and sprites crisp with nearest-neighbor rendering.

## Persistence

Use browser local storage for the first slice. Wrap persistence behind a save service so the storage backend can change later.

Requirements:

- Version every save file.
- Validate loaded saves before applying them.
- Provide migration functions when save schema changes.
- Keep save data free of Phaser objects.

## Testing Strategy

Use Bun tests for:

- Battle damage and turn-order calculations
- Mind/body compatibility scoring
- Mote Circle slot rules
- Encounter table selection
- Save serialization, validation, and migration
- Quest flag transitions

Use browser-based smoke checks for:

- Canvas mounts successfully
- Garden scene renders
- World map renders
- Player can move without layout shifts
- Battle scene opens and exits

## Build and Validation

Before completing implementation work, run:

```bash
bun run check
bun run typecheck
bun run test
bun run build
```

The project also exposes:

```bash
bun run validate
```

but the required validation sequence should be run explicitly when preparing a task for completion.

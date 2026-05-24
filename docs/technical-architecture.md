# Mote Technical Architecture

## Architecture Goal

Mote is a production-ready client-only React, Bun, TypeScript, and Phaser RPG architecture for a classic 2D aerial-view creature game. The game may ship early chapters with placeholder art, sprites, animation, music, and sound effects, but it must not ship with placeholder core systems.

The architecture must support:

- Deterministic and testable simulation rules.
- Data-driven maps, NPCs, dialogue, quests, battles, items, rewards, bodies, and minds.
- Explicit scene and interaction state machines.
- Save/load with schema validation and migrations.
- Static production builds with no backend dependency.
- Expansion into additional regions, factions, Trials, Garden features, and optional local AI adapters.

## Current Architecture Audit

### What Works

- React owns the browser shell and mounts Phaser through `GameHost`.
- Phaser owns canvas rendering, scenes, input, movement, camera, battle presentation, generated textures, and generated audio.
- Core simulation rules are partially separated into testable systems:
  - `battle.ts`
  - `moteCircle.ts`
  - `mindBody.ts`
  - `movement.ts`
  - `encounters.ts`
  - `save.ts`
  - `trials.ts`
- Save data is versioned and validated before use.
- The current slice supports Garden care, overworld movement, NPC interaction, map transitions, wild encounters, battle rewards, body acquisition, Circle assignment, mind/body pairing, Trial completion, and local persistence.

### Architectural Gaps

- `WorldScene` and `BattleScene` are too large. They mix rendering, input handling, menu state, dialogue, persistence, encounter orchestration, battle transitions, and gameplay decisions.
- There is no explicit game runtime state machine. Scene transitions are direct Phaser calls, and interaction modes are local string unions.
- Garden-specific logic lives inside `WorldScene`.
- Dialogue is not a system. NPCs store string arrays, but scenes cannot branch, gate by quest state, trigger effects, or run cutscenes.
- Cutscenes are absent.
- Quests are freeform save flags, not typed definitions with objectives, conditions, rewards, and validation.
- Inventory is a raw record without item definitions, categories, effects, or menu behavior.
- Menus are scene-local text objects. There is no shared menu model for battle, Circle, inventory, settings, save slots, or dialogue choices.
- Map data is hardcoded TypeScript ASCII rows. This is useful for prototyping but not enough for production content.
- Battle is deterministic and testable, but it has no command reducer for Fight, Mote, Item, and Run. Energy and accuracy exist in data but are not enforced.
- Art and music are generated in code. That is acceptable for placeholder polish, but there is no asset manifest, preload plan, or replacement path.
- Browser smoke coverage is not automated yet, so Phaser lifecycle, mobile input, and layout regressions are under-tested.

## Runtime Boundaries

### React Shell

React owns browser-level application concerns:

- Game mount lifecycle.
- Title screen and save slot selection.
- New Game, Continue, Load, and Options flow.
- Browser-level settings and accessibility panels.
- Mobile virtual controls.
- Optional debug panels.
- Durable overlays that should survive Phaser scene changes.

React must not read or mutate Phaser scene internals. Communication with Phaser happens through a narrow typed bridge.

Recommended modules:

```text
src/game/runtime/GameHost.tsx
src/game/runtime/events.ts
src/game/runtime/gameConfig.ts
src/game/runtime/inputBridge.ts
src/game/runtime/saveSlots.ts
```

### Phaser Runtime

Phaser owns real-time game presentation:

- Canvas rendering.
- Scene lifecycle.
- Cameras.
- Tilemap rendering.
- Sprites and animation.
- Collision presentation.
- Scene-local visual effects.
- Battle presentation.
- Canvas-native dialogue and menus needed during play.

Phaser scenes may call pure systems, but they should not contain business rules that can be expressed as reducers or content interpreters.

### Pure TypeScript Domain Layer

Pure systems own game rules and state transitions:

```text
src/game/domain/
  battle/
  circle/
  companion/
  dialogue/
  inventory/
  menu/
  quests/
  save/
  world/
```

Domain modules must:

- Accept serializable state and content definitions.
- Return new serializable state plus events and effects.
- Avoid Phaser, DOM, React, timers, localStorage, and audio APIs.
- Be covered by Bun tests.

The current `src/game/systems/` modules can migrate incrementally into this shape. Do not perform a large rename-only refactor before the production shell, inventory, and quest systems require it.

## Authoritative Game State

Use one serializable `GameState` as the authoritative gameplay state. Phaser scenes render this state and dispatch commands against it.

```typescript
export type GameState = {
  schemaVersion: number;
  player: PlayerState;
  world: WorldState;
  circle: CircleSlot[];
  companion: CompanionState;
  inventory: InventoryState;
  quests: QuestState;
  flags: FlagState;
  acquiredBodies: string[];
  acquiredMinds: string[];
  completedTrials: string[];
  battle?: BattleState;
  runtime: RuntimeState;
};
```

### Durable State

Saved to local storage:

- Player name.
- Current map and position.
- Facing direction.
- Circle slots.
- Acquired bodies.
- Acquired minds.
- Inventory.
- Quest progress.
- Story flags.
- Companion care state.
- Completed Trials.
- Options.
- Schema version.

### Ephemeral State

Not saved directly:

- Active Phaser objects.
- Tweens.
- Cameras.
- Currently held keys.
- Audio nodes.
- Scene transition effects.
- DOM nodes.
- Runtime menu cursor positions unless explicitly required.

## Command And Effect Pattern

Scenes and React dispatch typed commands.

```typescript
export type GameCommand =
  | { type: "world.move"; direction: Direction }
  | { type: "world.interact" }
  | { type: "dialogue.advance"; choiceId?: string }
  | { type: "battle.chooseMove"; moveId: string }
  | { type: "battle.useItem"; itemId: string }
  | { type: "battle.switchMote"; slotIndex: number }
  | { type: "battle.escape" }
  | { type: "menu.open"; menuId: MenuId }
  | { type: "menu.back" }
  | { type: "inventory.use"; itemId: string; target?: InventoryTarget }
  | { type: "quest.track"; questId: string }
  | { type: "save.write"; slotId: string };
```

Reducers return:

```typescript
export type CommandResult = {
  state: GameState;
  events: GameEvent[];
  effects: RuntimeEffect[];
};
```

`GameEvent` is gameplay history. `RuntimeEffect` is an instruction for the presentation layer.

Example effects:

- Play sound.
- Start music.
- Fade scene.
- Load map.
- Start battle.
- Open menu.
- Close menu.
- Show dialogue.
- Write save.
- Show toast.

No reducer should directly call Phaser, React, DOM, localStorage, or audio APIs.

## Scenes

### Required Phaser Scenes

```text
BootScene
PreloadScene
WorldScene
BattleScene
UIScene
```

The current implementation only has Boot, World, and Battle. Add `PreloadScene` and `UIScene` when the asset manifest and shared menu/dialogue systems are introduced.

### BootScene

Responsibilities:

- Configure pixel rendering.
- Initialize runtime services.
- Load minimal boot assets.
- Validate content registries in development.
- Load or create save metadata.
- Transition to `PreloadScene` or the title flow.

### PreloadScene

Responsibilities:

- Load asset manifests.
- Load tilemaps, tilesets, spritesheets, fonts, and audio.
- Expose preload failures clearly in development.
- Start `WorldScene` and `UIScene`.

### WorldScene

Responsibilities:

- Render maps.
- Render player and NPC sprites.
- Animate tile movement.
- Detect interaction targets.
- Dispatch world commands.
- React to domain events such as `battle.requested`, `map.transitioned`, `dialogue.started`, and `menu.opened`.

World rules should move to pure systems. `WorldScene` should not decide quest progression, inventory rewards, battle rewards, or save schema behavior.

### BattleScene

Responsibilities:

- Render combatants, HP, energy, status, move menus, item menus, switch menus, and battle log.
- Dispatch battle commands.
- Animate battle events returned by the battle reducer.
- Emit completion events back to the runtime.

Battle math, enemy policy, rewards, and post-battle state changes stay in pure systems.

### UIScene

Responsibilities:

- Dialogue boxes.
- Choice prompts.
- Shared canvas-native menu renderer.
- Interaction prompts.
- Cutscene blocking overlay.
- Input ownership while menus, dialogue, and cutscenes are active.

React may render browser-level title, settings, and save slot surfaces. Phaser `UIScene` renders in-play menus that need to layer over the game canvas.

## Interaction State Machine

Replace scene-local string modes with explicit state.

```typescript
export type InteractionState =
  | { mode: "free-roam" }
  | {
      mode: "moving";
      direction: Direction;
      from: GridPosition;
      to: GridPosition;
    }
  | { mode: "dialogue"; dialogueId: string; nodeId: string }
  | { mode: "menu"; menuId: MenuId }
  | { mode: "cutscene"; cutsceneId: string; stepIndex: number }
  | { mode: "transition"; transitionId: string }
  | { mode: "battle" };
```

Rules:

- Only one input owner is active at a time.
- Movement input is ignored during dialogue, menu, cutscene, transition, and battle.
- Pause can open only from allowed states.
- Save writes happen only after reducer-confirmed durable changes.

## Content Layout

Production content should be data-driven and validated.

Recommended layout:

```text
src/game/content/
  assets.ts
  bodies.ts
  minds.ts
  moves.ts
  items.ts
  maps/
  npcs.ts
  encounters.ts
  battles.ts
  dialogues.ts
  cutscenes.ts
  quests.ts
  trials.ts
```

The existing `src/game/data/` files can remain while the content pipeline is introduced. New production systems should prefer the `content` terminology when a migration is already necessary.

## Map Architecture

During prototyping, hardcoded TypeScript maps are acceptable. For production, maps should come from Tiled JSON or generated TypeScript based on Tiled exports.

```typescript
export type MapDefinition = {
  id: string;
  name: string;
  dimensions: { width: number; height: number };
  start: GridPosition;
  tilemapKey: string;
  tilesets: TilesetRef[];
  collision: CollisionLayerDefinition[];
  npcs: NpcPlacement[];
  transitions: MapTransition[];
  encounterZones: EncounterZone[];
  interactables: InteractablePlacement[];
  scripts: MapScriptHook[];
};
```

Content validation must ensure:

- Map dimensions match tile layers.
- Transitions target known maps and valid walkable tiles.
- NPC ids are unique per map.
- NPC placements reference known NPC definitions.
- NPC positions are valid.
- Encounter tables exist.
- Blocked tiles and collision layers are consistent.
- Script hooks reference known dialogue, quest, battle, item, or cutscene ids.

## NPC, Dialogue, And Cutscene Architecture

NPCs reference dialogue, battle, quest, or cutscene ids instead of embedding raw scene logic.

```typescript
export type NpcDefinition = {
  id: string;
  name: string;
  defaultFacing: Direction;
  spriteKey: string;
  interaction: InteractionDefinition;
};
```

Dialogue is content:

```typescript
export type DialogueDefinition = {
  id: string;
  startNodeId: string;
  nodes: Record<string, DialogueNode>;
};

export type DialogueNode =
  | {
      type: "line";
      speaker: string;
      text: string;
      next?: string;
      effects?: DialogueEffect[];
    }
  | {
      type: "choice";
      prompt: string;
      choices: DialogueChoice[];
    }
  | {
      type: "end";
      effects?: DialogueEffect[];
    };
```

Dialogue effects may:

- Set flags.
- Start quests.
- Advance objectives.
- Give items.
- Heal the Circle.
- Open a menu.
- Start a battle.
- Start a cutscene.

Cutscenes are interpreted sequences:

```typescript
export type CutsceneStep =
  | { type: "say"; dialogueId: string }
  | { type: "moveActor"; actorId: string; path: GridPosition[] }
  | { type: "faceActor"; actorId: string; direction: Direction }
  | { type: "wait"; ms: number }
  | { type: "playSound"; soundId: string }
  | { type: "setFlag"; flag: string; value: FlagValue }
  | { type: "giveReward"; rewardId: string }
  | { type: "startBattle"; battleId: string };
```

Cutscenes must not store Phaser objects in save data. Previously completed cutscenes should be skippable where appropriate.

## Quest Architecture

Replace freeform quest flags with typed quest definitions and progress state.

```typescript
export type QuestDefinition = {
  id: string;
  title: string;
  category:
    | "main"
    | "trial"
    | "companion"
    | "collection"
    | "research"
    | "faction"
    | "errand"
    | "hidden";
  objectives: QuestObjective[];
  rewards: RewardDefinition[];
  prerequisites?: Condition[];
};

export type QuestProgress = {
  state: "inactive" | "available" | "active" | "readyToTurnIn" | "completed" | "failed";
  objectiveProgress: Record<string, number | boolean>;
  trackedObjectiveId?: string;
};
```

Flags may still exist for simple story gates, but quest progress should use quest ids and objective ids.

Quest reducer responsibilities:

- Start quests.
- Advance objective progress.
- Detect completion.
- Apply rewards.
- Emit story and UI events.
- Persist progress safely.

## Inventory Architecture

Inventory should be backed by item definitions.

```typescript
export type ItemDefinition = {
  id: string;
  name: string;
  category:
    | "body"
    | "mind-license"
    | "care"
    | "battle"
    | "key"
    | "material"
    | "trial-mark";
  description: string;
  stackLimit: number;
  usableFrom: Array<"world" | "battle" | "menu" | "garden">;
  effect?: ItemEffect;
};

export type InventoryState = {
  items: Record<string, number>;
  currency: Record<string, number>;
};
```

Body and mind acquisition can remain separate collections for rules, but any visible reward should have an item or collection definition for UI consistency.

Inventory reducer responsibilities:

- Add items.
- Remove items.
- Validate counts and stack limits.
- Use items in legal contexts.
- Apply item effects.
- Emit feedback for invalid use.

## Menu Architecture

Menus should use shared declarative models.

```typescript
export type MenuModel = {
  id: MenuId;
  title?: string;
  items: MenuItem[];
  selectedIndex: number;
  parent?: MenuId;
};

export type MenuItem = {
  id: string;
  label: string;
  disabled?: boolean;
  description?: string;
  command?: GameCommand;
};
```

The same model should drive:

- Pause menu.
- Garden actions.
- Circle management.
- Mind assignment.
- Inventory.
- Quest log.
- Battle commands.
- Battle moves.
- Battle items.
- Switch menu.
- Save/settings menus.

All menu navigation should share confirm, cancel, up, down, left, right semantics across keyboard and touch controls.

## Save Architecture

Keep localStorage for the client-only build, behind a storage service.

Requirements:

- Every save has `schemaVersion`.
- Every load validates and migrates before use.
- Invalid saves are ignored or quarantined, never partially applied.
- Save data contains no Phaser, React, DOM, audio, or function references.
- Writes happen after reducer-confirmed durable state changes.
- Autosave boundaries are explicit.
- Manual save confirms slot, timestamp, and location.

Autosave should run after:

- Map transitions.
- Battle resolution.
- Quest completion.
- Garden actions.
- Inventory changes.
- Circle assignment.
- Trial completion.

Use existing manual validation or migrate content/save validation to Zod consistently. Since `zod` is already a dependency, prefer Zod for new content schemas and save schemas when touching those systems.

## Battle Architecture

Battle must become a command reducer, not a scene procedure.

```typescript
export type BattleCommand =
  | { type: "chooseMove"; actor: BattleSide; moveId: string }
  | { type: "useItem"; actor: BattleSide; itemId: string }
  | { type: "switch"; actor: BattleSide; slotIndex: number }
  | { type: "escape"; actor: BattleSide };
```

Battle reducer responsibilities:

- Validate command legality.
- Enforce accuracy if accuracy is part of visible rules.
- Enforce energy or move limits if energy is part of visible rules.
- Apply turn order.
- Apply damage, healing, shield, and status.
- Apply mind/body modifiers.
- Select enemy actions through policy adapters.
- Emit ordered battle events.
- Determine outcome.
- Determine rewards.
- Apply post-battle state through a separate reward/progression reducer.

Battle scene responsibilities:

- Render state.
- Render command menus.
- Dispatch commands.
- Animate events.
- Show result and reward feedback.
- Return to world through runtime effects.

## Mind Adapter Boundary

Real local AI is not required for the first production chapter. Keep a future-facing adapter boundary with deterministic fallback behavior.

```typescript
export type MindDecisionContext = {
  battleState?: BattleState;
  relationshipState?: CompanionState;
  recentEvents: string[];
  questState?: QuestState;
};

export type MindAdapter = {
  getDialogue(context: MindDecisionContext): Promise<string>;
  chooseBattleAction(context: MindDecisionContext): Promise<string>;
};
```

Initial implementation:

- `ProfileMindAdapter`: deterministic dialogue and battle tendencies from local content.

Future implementations:

- `LocalModelMindAdapter`: optional local model inference.
- `FallbackMindAdapter`: safe base behavior when model access is unavailable.

## Asset Pipeline

Placeholder assets are acceptable, but asset ids must be stable.

Required manifest categories:

- Tilesets.
- Tilemaps.
- Character sprites.
- Mote overworld sprites.
- Mote battle sprites.
- Portraits.
- UI frames.
- Fonts.
- Sound effects.
- Music loops.

Recommended pixel direction:

- Preserve crisp nearest-neighbor rendering.
- Keep tile size stable.
- Keep overworld sprites readable at the configured viewport.
- Keep UI frames and text boxes consistent.
- Avoid changing gameplay ids when replacing placeholder assets.

Asset validation must detect missing keys before runtime play.

## Data Validation

Add content validation tests that run in `bun test`.

Validate:

- Body ids are unique.
- Body learnsets reference known moves.
- Body sprite keys exist in the asset manifest.
- Mind ids are unique.
- Mind origins are known factions.
- Move ids are unique.
- Item ids are unique.
- Item effects reference known effect handlers.
- Battle policies are registered.
- Map transitions target known maps.
- Encounter tables reference known bodies.
- NPCs reference known dialogue, battle, quest, or cutscene ids.
- Trials reference known body and mind ids.
- Rewards reference known item, body, mind, or currency ids.
- Quest objectives reference known trigger types.
- Dialogue graphs have valid `next` links and reachable ends.
- Save migrations produce valid current saves.

## Testing Strategy

### Pure Unit Tests

- Battle reducer.
- Enemy policies.
- Status effects.
- Energy and accuracy, if enabled.
- Mind/body compatibility.
- Circle slot rules.
- Garden care rules.
- Quest objective transitions.
- Inventory effects.
- Dialogue graph traversal.
- Cutscene interpreter.
- Save validation and migration.
- Content registry validation.

### Integration Tests

- World command reducer movement and transitions.
- NPC interaction starts correct dialogue, cutscene, battle, or menu.
- Battle result applies rewards and quest progress.
- Acquired body assignment updates Circle and inventory correctly.
- Save slot migration from the current single-save format.

### Browser Smoke Tests

Use the in-app browser or Playwright-style checks for:

- Title to new game.
- Continue/load save.
- Canvas mounts.
- Boot to world.
- Player movement.
- Dialogue open, advance, and close.
- Pause menu open and close.
- Inventory item use.
- Quest log update.
- Garden menu interaction.
- Wild encounter to battle.
- Battle win and return to world.
- Trial completion.
- Mobile virtual controls.
- Desktop and mobile viewport text fit.

## Extensibility Decisions

- New regions are added through map and content definitions, not new scene classes.
- New NPC behavior is added through dialogue, cutscene, quest, and interaction hooks.
- New battle mechanics are added through reducer effects and event types.
- New item behavior is added through typed item effects.
- New factions are content plus enemy policy modules.
- Optional local AI integrates only through the `MindAdapter` boundary.
- Art and audio replacement happens through manifests without changing domain systems.

## Architecture Risks

- Scene bloat will slow every future feature unless UI, dialogue, quests, inventory, and battle orchestration are extracted.
- Freeform flags will become unmaintainable as soon as multiple questlines overlap.
- Hardcoded maps are fast now but will block larger content production.
- Battle data already exposes accuracy and energy, but rules do not enforce them. This creates design and UI mismatch.
- Without content validation, missing ids will surface as runtime errors during play.
- Without browser smoke tests, pure tests will miss Phaser lifecycle, mobile input, and text layout regressions.
- Asset replacement needs a manifest boundary before real art and audio production starts, otherwise content ids and sprite keys will drift.

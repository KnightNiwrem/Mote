# Mote Implementation Plan

## Strategy

Build Mote as a sequence of playable vertical slices. Each milestone should end with a working build, tests for new pure systems, and a clear player-facing improvement. Avoid adding real local AI inference until movement, Garden interaction, Mote Circle management, battles, and save/load are already coherent.

## Milestone 0: Planning and Setup

Goal: prepare the project for Phaser-based game development.

Tasks:

- Add Phaser 4.1.0 as an exact dependency.
- Add `src/game/` structure.
- Create `GameHost.tsx` to mount and destroy the Phaser instance from React.
- Add a minimal Phaser 4 config with pixel-art rendering.
- Add placeholder asset folders.
- Add smoke test coverage for any pure setup helpers.

Acceptance criteria:

- React app renders the Phaser canvas.
- Canvas is destroyed cleanly when the host unmounts.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run build` pass.

## Milestone 1: Tile Overworld Foundation

Goal: make a small top-down map playable.

Tasks:

- Create a placeholder tilemap.
- Implement four-direction player movement.
- Add collision against blocked tiles.
- Add camera follow.
- Add interaction key handling.
- Add one NPC with a dialogue prompt.
- Add map transition trigger points.

Acceptance criteria:

- Player can move around a small map.
- Player cannot walk through collision tiles.
- Player can speak to an NPC.
- Player can transition between at least two maps.

## Milestone 2: Garden Slice

Goal: establish the emotional home base and first companion.

Tasks:

- Create the initial Mote Garden map.
- Add the first companion Mote as an interactable sprite.
- Add rest, feed, play, and train interactions.
- Add a bond value for the first companion.
- Add companion dialogue variants based on bond.
- Add a Garden exit to the first Motehaven route.

Acceptance criteria:

- Player starts in the Garden.
- Player can interact with the first companion.
- At least one Garden action changes companion state.
- Player can leave the Garden and return.

## Milestone 3: Core Data and Save System

Goal: make player progress durable and testable.

Tasks:

- Define `MoteBody`, `MoteMind`, `CircleSlot`, and `SaveGame` types.
- Add initial body, mind, move, and faction data.
- Implement Circle slot helpers.
- Implement save/load service with schema versioning.
- Add save validation and migration hooks.
- Add tests for Circle rules and save serialization.

Acceptance criteria:

- Save data persists current map, player position, Circle state, acquired bodies, acquired minds, inventory, and quest flags.
- Invalid save data is rejected safely.
- Circle cannot exceed seven slots.

## Milestone 4: Battle MVP

Goal: implement deterministic one-on-one turn-based battles.

Tasks:

- Add battle state types.
- Add move definitions.
- Add damage, turn order, HP, and win/loss calculations.
- Add simple wild Mote enemy policy.
- Add BattleScene UI for HP, move choices, and battle log.
- Add transition from overworld encounter into battle and back.
- Add tests for battle calculations.

Acceptance criteria:

- Player can complete a one-on-one battle.
- Battle results update the game state.
- Battle math is covered by tests.
- Battle scene works with keyboard input.

## Milestone 5: Wild Encounters and Body Acquisition

Goal: make exploration feed the collection loop.

Tasks:

- Add encounter zones to map data.
- Add three wild Mote bodies.
- Add weighted encounter tables.
- Add body acquisition reward flow.
- Add acquired body inventory.
- Add a Circle assignment prompt after acquisition.

Acceptance criteria:

- Walking through encounter zones can trigger wild battles.
- Winning selected wild encounters can unlock a body.
- Newly acquired bodies can be assigned to the Circle.
- Bodies without specialized minds receive a standard base mind.

## Milestone 6: Mind/Body Pairing

Goal: make the game's central strategic distinction visible.

Tasks:

- Add three initial mind profiles.
- Add compatibility scoring between bodies and minds.
- Add battle modifiers from mind profiles.
- Add bond gain modifiers.
- Add Circle management UI.
- Add tests for compatibility and modifier behavior.

Acceptance criteria:

- Player can change which mind powers an acquired body.
- Pairing choices affect at least one battle-relevant stat or behavior.
- Compatibility feedback is visible in the UI.

## Milestone 7: First Trial and Rival

Goal: introduce structured progression and ideological conflict.

Tasks:

- Add one Optima rival NPC.
- Add one Trial arena map.
- Add Trial battle rules and reward.
- Add faction-specific dialogue.
- Add quest flags for Trial completion.
- Add one Sovereign Weights story hint after the Trial.

Acceptance criteria:

- Player can challenge and complete the first Trial.
- Optima's performance-centered philosophy is expressed through battle behavior and dialogue.
- Trial completion updates progression state.
- Sovereign Weights is introduced as a future threat without resolving the arc.

## Milestone 8: Vertical Slice Polish

Goal: make the first 20-30 minutes feel shippable.

Tasks:

- Replace placeholder art for the Garden, route, first companion, wild Motes, and rival.
- Add battle and overworld sound effects.
- Add basic music loops.
- Add scene transitions.
- Add title/save slot flow if needed.
- Add control remapping or a controls panel.
- Run browser smoke checks across desktop and mobile-sized viewports.

Acceptance criteria:

- The vertical slice can be played from start through first Trial completion.
- UI text fits in dialogue boxes, battle menus, and Circle screens.
- The game builds to static production assets.
- Validation commands pass.

## Milestone 9: Expansion Track

Goal: grow the vertical slice into the full RPG.

Future work:

- Additional regions and routes
- More Trials
- Full Mote League arc
- Garden upgrades
- More bodies, minds, moves, traits, and status effects
- Questlines for Tessera, Optima, Northstar, Asterion, and Sovereign Weights
- Optional local model integration through the Mind Adapter boundary
- Accessibility and localization passes
- Controller support
- Balance tooling

## Validation Checklist

Run the required validation sequence before completing implementation tasks:

```bash
bun run check
bun run typecheck
bun run test
bun run build
```

For substantial frontend or gameplay changes, also start the local server and verify the game in the browser:

```bash
bun run dev
```

## Initial Commit Scope

The initial documentation commit should include only:

- `docs/product-requirements.md`
- `docs/technical-architecture.md`
- `docs/implementation-plan.md`

Runtime dependencies, Phaser setup, asset folders, and game code should be added in the first implementation milestone.

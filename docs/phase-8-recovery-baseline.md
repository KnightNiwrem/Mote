# Phase 8 Recovery Baseline

## Scope Classification

Phase 8 classifies the current game as a prototype recovery baseline. It is not a complete vertical slice and is not first-chapter complete.

The current baseline exists to preserve and regression-test the playable systems that already work while later phases replace prototype shell, menu, quest, dialogue, battle, and content assumptions with production-ready first-chapter systems.

## Source Document Alignment

- `docs/product-requirements.md` targets a production-ready first chapter and names the current build as a useful foundation with missing load-bearing RPG features.
- `docs/technical-architecture.md` targets a production-ready client-only RPG architecture and names the architectural gaps that block scalable first-chapter content.
- `docs/implementation-plan.md` treats the current build as a prototype baseline, defines the golden path regression route, and sequences later phases around player-facing production systems.

## Baseline Systems To Preserve

- React and Phaser mount lifecycle.
- Boot, World, and Battle scenes.
- Generated placeholder tiles, sprites, audio, and music.
- Garden, Route 1, and Optima Trial maps.
- Four-direction tile movement, collision, NPC prompts, and map transitions.
- Garden care actions and companion bond state.
- Circle slots, acquired bodies, acquired minds, and mind/body compatibility.
- Wild encounter zones, deterministic one-on-one battles, body acquisition, and Trial completion.
- Local storage save/load with schema validation.
- Bun tests for current core systems.

## Explicit Gap Task Notes

### Title And Save

- Add a real title screen with `New Game`, `Continue`, `Load`, and `Options`.
- Add at least three save slots with player-facing metadata.
- Migrate the current single autosave format without losing map, position, Circle, bodies, minds, inventory keys, quest flags, HP, bond, or Trial completion.
- Handle empty slots, corrupt slots, and overwrite confirmation.

### Pause And Shared Menu

- Add an exploration pause menu with `Motes`, `Inventory`, `Quests`, `Save`, `Options`, and `Return`.
- Define input ownership so pause/menu input cannot break movement, dialogue, battles, transitions, or virtual controls.
- Introduce a shared menu model before expanding title, pause, Circle, inventory, quest, battle, save, and options surfaces.

### Inventory

- Replace raw inventory records with player-facing item definitions, categories, descriptions, counts, disabled states, and use feedback.
- Include body, mind license, care, battle, key, material, and Trial mark categories.
- Implement at least one usable item, one key item, invalid-use feedback, battle-use restrictions or one battle item, and save/load persistence.

### Quests

- Replace freeform quest flags with typed quest definitions and quest progress state.
- Add a quest journal reachable from pause.
- Ensure the player has a visible current objective and quest progress persists through save/load.

### Dialogue And Cutscenes

- Replace raw NPC line arrays and one-off story code with dialogue graphs, state-gated lines, choices, repeat variants, and effects.
- Add a cutscene runner for simple dialogue, actor movement, waits, sounds, flags, rewards, battles, and story events.
- Convert Garden onboarding, Guide Mira, body acquisition, Optima Trial, and Sovereign Weights hint into data-driven story content.

### Content Pipeline

- Replace hardcoded production content with map, NPC, encounter, interaction, asset, and content registries.
- Add validation for map references, transitions, collisions, encounter tables, NPC hooks, dialogue ids, quest ids, battle ids, item ids, cutscene ids, and asset keys.
- Keep placeholder assets replaceable through an asset manifest and preload plan.

### Battle Commands

- Replace move-only battle interaction with a command model for Fight, Mote, Item, and Run.
- Add switch, item, and escape command behavior or explicit restrictions where a command is unavailable.
- Enforce battle resource rules such as energy, accuracy, status, rewards, and post-battle cadence through testable systems.

## Golden Path Regression Route

Use the current golden path from `docs/implementation-plan.md` as the baseline manual route until the production first chapter replaces it:

1. Start a new game.
2. Perform one Garden action with Luma.
3. Leave the Garden for Route 1.
4. Trigger or interact with a wild Mote battle.
5. Win the wild battle.
6. Acquire a body.
7. Assign the body to the Circle or store it.
8. Open Circle management.
9. Change or inspect a mind/body pairing.
10. Enter the Optima Trial Arena.
11. Defeat Cal Venn.
12. See the Sovereign Weights hint.
13. Save and reload without losing progress.

## Current Validation Status

Last confirmed: 2026-05-24.

Required validation gate passed:

```bash
bun run check      # pass
bun run typecheck  # pass
bun run test       # pass, 52 tests
bun run build      # pass
```

## Smoke Status

Current smoke result: partial pass.

- `bun run dev` started the source server on `http://localhost:3000/`.
- A localhost HTTP smoke returned `200 text/html;charset=utf-8`.
- The in-app browser backend was unavailable in this session, so full canvas rendering and keyboard-input smoke could not be completed.
- A domain-level golden path script confirmed Garden action, Route 1 wild battle win, body acquisition, Circle assignment, Circle mind assignment, Optima Trial win, Sovereign Weights hint flag, Precision Mark reward, and save serialize/reload.

# Phase 8 Recovery Baseline

## Scope Classification

Phase 8 classified the then-current game as a prototype recovery baseline. It was not a complete vertical slice and was not first-chapter complete.

This document now serves two purposes: it preserves the historical Phase 8 assessment, and it records which Phase 8 gaps have been recovered by the end of Phase 11. It should not be read as a claim that Phase 12, Phase 13, or later work is complete.

The Phase 8 baseline existed to preserve and regression-test the playable systems that already worked while later phases replaced prototype shell, menu, quest, dialogue, battle, and content assumptions with production-ready first-chapter systems.

## Source Document Alignment

- `docs/product-requirements.md` targets a production-ready first chapter, preserves the historical Phase 8 foundation/gap assessment, and records end-of-Phase-11 recovery progress.
- `docs/technical-architecture.md` targets a production-ready client-only RPG architecture and names the architectural gaps that block scalable first-chapter content.
- `docs/implementation-plan.md` treats Phase 8 as the historical prototype baseline, defines the golden path regression route, records end-of-Phase-11 status, and sequences later phases around remaining player-facing production systems.

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

These notes were opened from the Phase 8 recovery baseline. Their status below reflects end-of-Phase-11 progress.

### Title And Save

Status: recovered through Phase 9.

- Added a real title screen with `New Game`, `Continue`, `Load`, and `Options`.
- Added save slots with player-facing metadata.
- Migrated the Phase 8 single autosave format without losing map, position, Circle, bodies, minds, inventory keys, quest flags, HP, bond, or Trial completion.
- Added handling for empty slots, corrupt slots, and overwrite confirmation.

### Pause And Shared Menu

Status: recovered through Phase 10 for title, pause, Circle, inventory, quests, save, and options shell/menu flow. Battle command menu depth remains later Phase 13+ work.

- Added an exploration pause menu with `Motes`, `Inventory`, `Quests`, `Save`, `Options`, and `Return`.
- Defined input ownership so pause/menu input cannot break movement, dialogue, battles, transitions, or virtual controls.
- Introduced a shared menu model used by the recovered shell and player-facing menu surfaces.

### Inventory

Status: recovered through Phase 10 for player-facing inventory, categories, item feedback, and persistence. Deeper battle-item behavior remains tied to later battle command work.

- Replaced raw inventory records with player-facing item definitions, categories, descriptions, counts, disabled states, and use feedback.
- Included body, mind license, care, battle, key, material, and Trial mark categories.
- Implemented usable/key item behavior, invalid-use feedback, restrictions where applicable, and save/load persistence.

### Quests

Status: recovered through Phase 11.

- Replaced freeform quest flags with typed quest definitions and quest progress state.
- Added a quest journal reachable from pause.
- Added visible current objectives and quest progress persistence through save/load.

### Dialogue And Cutscenes

Status: recovered through Phase 11 for the foundation and converted critical path content. Richer authored content breadth remains later work.

- Replaced raw NPC line arrays and one-off story code with dialogue graphs, state-gated lines, choices, repeat variants, and effects.
- Added a cutscene runner for simple dialogue, actor movement, waits, sounds, flags, rewards, battles, and story events.
- Converted Garden onboarding, Guide Mira, body acquisition, Optima Trial, and Sovereign Weights hint into data-driven story content.

### Content Pipeline

Status: still open for Phase 12.

- Replace hardcoded production content with map, NPC, encounter, interaction, asset, and content registries.
- Add validation for map references, transitions, collisions, encounter tables, NPC hooks, dialogue ids, quest ids, battle ids, item ids, cutscene ids, and asset keys.
- Keep placeholder assets replaceable through an asset manifest and preload plan.

### Battle Commands

Status: still open for Phase 13+ beyond the Phase 11 story/quest recovery. Do not treat this as complete.

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

Required validation gate passed after Phase 11:

```bash
bun run check      # pass
bun run typecheck  # pass
bun run test       # pass, 108 tests
bun run build      # pass
```

## Smoke Status

Current smoke result: partial pass with browser limitation.

- `bun run dev` started the source server on `http://localhost:3000/`.
- A localhost HTTP smoke returned `200 text/html;charset=utf-8`.
- The in-app browser backend was unavailable in this session, so full canvas rendering and keyboard-input smoke was not run.
- Pure/system coverage and domain-level golden path coverage now include title/start and save-slot behavior, pause/menu flow, inventory visibility and item feedback, Circle inspection and assignment, quest journal/objective updates, dialogue/cutscene effects, Route 1 battle/body acquisition, Optima Trial completion, Sovereign Weights hook persistence, and save serialize/reload where applicable.
- This evidence does not replace a future browser smoke pass for rendered canvas behavior, keyboard input, virtual controls, and layout.

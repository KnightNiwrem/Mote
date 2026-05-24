# Mote Implementation Plan

## Strategy

The current build is a useful prototype, not a finished vertical slice. From this point forward, Mote should be developed as a sequence of production-oriented RPG increments. Every phase must end with a playable, saveable, player-facing improvement that is reachable through the normal game flow.

The target is a production-ready first chapter with placeholder assets allowed. Core RPG features are not optional polish. Title flow, pause menu, inventory, quest log, save/load, story progression, Garden, Circle management, and battle commands are part of the minimum game.

## Roadmap Rules

Each phase must satisfy these rules before it can close:

- The feature is reachable from the normal app entry point.
- New progression state is typed, saved, loaded, validated, and migrated when schema changes.
- New gameplay has keyboard support.
- Mobile virtual controls are supported where the feature is used in the game canvas.
- UI is readable at desktop and mobile-sized viewports.
- Pure rules have Bun tests.
- Runtime flows receive browser smoke coverage when behavior depends on rendering, input, or Phaser lifecycle.
- Placeholder assets are named, integrated, consistently styled, and replaceable through the asset/content pipeline.
- The phase adds at least one player-facing end-to-end slice. Scaffolding alone is not enough.

## Current Baseline

The existing implementation includes:

- React and Phaser mount lifecycle.
- Boot, World, and Battle scenes.
- Generated placeholder tiles, sprites, audio, and music.
- Mote Garden map.
- Motehaven Route 1 map.
- Optima Trial Arena map.
- Four-direction tile movement.
- Collision.
- NPC prompts.
- Garden care actions.
- Companion bond state.
- Circle slots with seven-slot limit.
- Mind/body compatibility.
- Wild encounter zones.
- One-on-one deterministic battles.
- Wild body acquisition.
- Trial completion and reward flags.
- localStorage save/load with schema validation.
- Bun tests for several core systems.

Known limitations:

- No real title flow.
- No save slot selection.
- No pause menu.
- No player-facing inventory.
- No quest log.
- No typed quest definitions.
- No dialogue or cutscene system.
- No shared menu model.
- No item use.
- No battle switch, item, or run commands.
- No production map or asset pipeline.
- No content validation suite.
- No automated browser smoke tests.

## Golden Path

Use this path as the baseline regression route until the first production chapter replaces it:

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

## Phase 8: Recovery Baseline

Goal: convert the current prototype into a stable baseline for production-oriented development.

Deliverables:

- Document the implemented systems and known limitations.
- Reclassify the current build as a prototype recovery baseline, not vertical slice polish.
- Define the golden path above as the minimum manual regression route.
- Confirm current validation status.
- Create issues or task notes for title/save, pause/menu, inventory, quests, dialogue, content pipeline, and battle command gaps.
- Phase 8 task note: `docs/phase-8-recovery-baseline.md`.

Definition of done:

- Product requirements, architecture, and implementation plan all target a production-ready first chapter.
- Existing prototype behavior is classified as baseline rather than complete product scope.
- The next phase starts from explicit gaps instead of implied polish work.

Validation gate:

```bash
bun run check
bun run typecheck
bun run test
bun run build
```

Browser smoke:

- Run the current golden path manually or with the in-app browser where feasible.

## Phase 9: Title, Save Slots, Pause, And Options Shell

Goal: add the RPG shell that every later system depends on.

Dependencies:

- Phase 8.

Deliverables:

- Title screen with `New Game`, `Continue`, `Load`, and `Options`.
- At least three save slots.
- Slot metadata: player name, map, chapter or quest label, timestamp or play time, acquired body count, Trial marks.
- Empty slot state.
- Corrupt slot handling.
- Explicit overwrite confirmation.
- Migration from the current single autosave to the new slot format.
- Pause menu reachable from free-roam exploration.
- Pause entries: `Motes`, `Inventory`, `Quests`, `Save`, `Options`, `Return`.
- Options model for sound volume, music volume, text speed, reduced motion, and control display.
- Input ownership rules so pause cannot break dialogue, movement, battles, or transitions.

Definition of done:

- A player can start a new game from title.
- A player can continue an existing save.
- A player can load a specific slot.
- A player can manually save from the pause menu.
- Existing autosave users migrate without losing map, position, Circle, bodies, minds, inventory, quest flags, HP, bond, or Trial completion.
- Pause opens and closes cleanly without breaking movement, dialogue, battles, or virtual controls.

Tests:

- Save slot create, read, update, delete where supported.
- Save metadata generation.
- Old save migration.
- Corrupt save handling.
- Options defaults and persistence.
- Pause state reducer.

Browser smoke:

- Fresh profile.
- Existing old save.
- Corrupt save.
- Desktop keyboard navigation.
- Mobile viewport with virtual controls.

## Phase 10: Shared Menu Spine And Inventory

Goal: implement the core handheld-style menu layer before adding more content.

Dependencies:

- Phase 9.

Deliverables:

- Shared declarative menu model for title, pause, Garden, Circle, inventory, quests, battle, save, and options.
- Shared confirm, cancel, up, down, left, right behavior.
- Inventory item definitions.
- Inventory categories: body, mind license, care, battle, key, material, Trial mark.
- Inventory screen reachable from pause menu.
- Item counts, descriptions, disabled states, and use feedback.
- At least one usable item.
- At least one key item.
- Battle item restrictions or one battle-usable item.
- Circle screen upgraded from prototype dialogue text into a real menu.
- Circle menu shows seven slots, body, mind, HP, level, bond, compatibility, and active order.
- Mind assignment uses only acquired minds.

Definition of done:

- The player can inspect Circle and inventory from the pause menu.
- The player can use an item and see gameplay state change.
- Invalid item use gives clear feedback.
- Inventory changes persist through save/load.
- Circle management no longer depends on a Garden-only dialogue panel.

Tests:

- Menu navigation reducer.
- Inventory add/remove/use.
- Invalid item use.
- Stack limits.
- Key item behavior.
- Circle menu rules.
- Save persistence.

Browser smoke:

- Pause to inventory.
- Use item.
- Pause to Circle.
- Change or inspect pairing.
- Save.
- Reload.

## Phase 11: Quest, Story, Dialogue, And Cutscene Foundation

Goal: replace hardcoded story moments with reusable quest and event systems.

Dependencies:

- Phase 9.
- Phase 10.

Deliverables:

- Typed quest definitions with id, title, category, objectives, prerequisites, rewards, and journal text.
- Quest progress state with `inactive`, `available`, `active`, `readyToTurnIn`, `completed`, and `failed` where needed.
- Quest reducer for start, advance, completion, reward, and persistence.
- Quest journal reachable from pause menu.
- Dialogue graph format with lines, choices, conditions, effects, and repeat variants.
- Dialogue effects for flags, quests, rewards, healing, menus, battles, and cutscenes.
- Cutscene runner for simple say, move actor, face actor, wait, sound, flag, reward, and battle steps.
- Convert Garden onboarding, Guide Mira, body acquisition prompt, Optima Trial, and Sovereign Weights hint into data-driven quest/story content.

Definition of done:

- The player always has a visible current objective.
- NPC dialogue changes based on quest state and Trial completion.
- Trial completion and Sovereign hint are quest/story events, not one-off scene code.
- Quest progress persists and reloads correctly.
- Every critical NPC has first-talk, repeat-talk, and relevant state-gated dialogue.

Tests:

- Quest transitions.
- Objective counters.
- Reward application.
- Dialogue condition selection.
- Dialogue graph traversal.
- Dialogue effects.
- Cutscene interpreter.
- Save migration and persistence.

Browser smoke:

- New game objective.
- Guide Mira dialogue.
- Quest journal update.
- Trial completion.
- Post-Trial Sovereign hook.
- Reload after completion.

## Phase 12: Content Pipeline And 2D RPG Presentation

Goal: stop relying on hardcoded map and presentation code for production content.

Dependencies:

- Phase 11.

Deliverables:

- Map content pipeline using Tiled JSON or generated TypeScript from Tiled exports.
- Asset manifest for tilesets, sprites, portraits, battle sprites, UI frames, fonts, sound effects, and music.
- Original pixel-art direction guide for tile size, sprite dimensions, palette rules, animation frame rules, UI frame style, and placeholder standards.
- Data-driven maps for Garden, Tessera onboarding room, Route 1, hub or facility space, and Optima Trial Arena.
- Map object layers for collision, transitions, NPCs, encounters, interactables, scripted events, and quest triggers.
- Animation support for player, NPCs, and Motes.
- Content validation tests for maps and asset keys.

Definition of done:

- A map can be modified without editing scene logic.
- Placeholder visuals read as a coherent top-down 2D RPG rather than generated debug surfaces.
- Existing gameplay works after the map/data migration.
- Missing asset or content ids fail tests before runtime.

Tests:

- Map dimensions.
- Collision parsing.
- Transition targets.
- NPC placements.
- Encounter zone parsing.
- Script hook ids.
- Asset manifest references.

Browser smoke:

- Walk every converted map.
- Use each transition.
- Talk to critical NPCs.
- Trigger encounter.
- Open dialogue and menus without layout breakage.

## Phase 13: Battle, Collection, And Progression Depth

Goal: turn the battle and collection prototype into a durable RPG loop.

Dependencies:

- Phase 10.
- Phase 11.
- Phase 12.

Deliverables:

- Battle command reducer with Fight, Mote, Item, and Run.
- Switch Mote command.
- Item use in battle.
- Escape rules for wild battles.
- Trainer/Trial battle definitions separate from wild encounters.
- Status effects if needed for first-chapter depth.
- Energy or move limits implemented if displayed, or removed from visible UI until supported.
- Accuracy implemented if displayed, or first-chapter moves constrained to guaranteed hit.
- Experience thresholds and level-up contract, or explicit first-chapter fixed-level contract.
- Learnset progression where needed.
- Rewards for experience, items, Trial marks, currency, bodies, minds, and quest progress.
- Loss recovery that returns the player safely without hard-failing the chapter.
- Balance tables for Route 1 and the first Trial.

Definition of done:

- Battle is no longer only "select one of four moves until someone faints."
- Collection, inventory, Circle management, and quests all connect through battle outcomes.
- Wild battle, trainer battle, and Trial battle all have clear intro, outcome, reward, and loss paths.
- The first Trial is beatable with intended preparation and not accidental tuning.

Tests:

- Battle command legality.
- Switching.
- Item use.
- Escape.
- Enemy policies.
- Status effects if included.
- Energy and accuracy if included.
- Rewards.
- Acquisition.
- Level progression.
- Loss recovery.
- Quest integration.

Browser smoke:

- Wild battle win.
- Wild battle run.
- Trainer battle.
- Trial battle.
- Battle item use.
- Switch Mote.
- Loss and retry.
- Save/reload after battle.

## Phase 14: Garden And Companion Production Loop

Goal: make the Garden the emotional and mechanical home base promised by the product.

Dependencies:

- Phase 10.
- Phase 11.

Deliverables:

- Garden state model for mood, care history, rest recovery, training, feeding, play, focus, and unlocks.
- Companion dialogue driven by bond, quest state, recent care, body/mind pairing, and story progress.
- Garden menu using the shared menu spine.
- Rest/heal flow.
- Storage or body inventory access.
- At least one Garden unlock tied to first Trial completion.
- Clear distinction between Luma's narrative role and normal Circle members while preserving shared slot rules.

Definition of done:

- Returning to the Garden after exploration changes available choices or dialogue.
- Garden care has visible consequences without becoming mandatory busywork.
- Luma feels authored and persistent, not just a stat row.
- Garden state persists and reloads.

Tests:

- Garden state transitions.
- Care limits.
- Rest/heal.
- Bond effects.
- Unlocks.
- Save persistence.
- Dialogue variants.

Browser smoke:

- Care action.
- Leave Garden.
- Battle.
- Return.
- Rest.
- Trial completion unlock.
- Reload.

## Phase 15: Production First Chapter

Goal: produce a complete 20-30 minute first chapter with beginning, middle, and end.

Dependencies:

- Phase 9.
- Phase 10.
- Phase 11.
- Phase 12.
- Phase 13.
- Phase 14.

Deliverables:

- Playable sequence: title, onboarding or lab, Garden, Route 1, first wild acquisition, Circle and mind management, Optima Trial, post-Trial Sovereign hook, save and continue.
- At least four bodies including the starter.
- At least four minds including Base Mind and Luma.
- At least eight moves.
- At least eight item definitions.
- At least one usable item.
- At least one key item.
- One rival.
- One Trial.
- Several authored NPCs.
- Quest journal covers the whole chapter.
- Inventory and Circle are useful during the chapter.
- Placeholder dialogue replaced with authored first-chapter text.
- Prototype-only debug or temporary UX removed from the player path.

Definition of done:

- A new player can complete the full chapter without developer guidance.
- The chapter survives reloads at multiple points.
- Every major product acceptance criterion is represented in playable form.
- The game clearly points to the next chapter after the Sovereign Weights hook.

Tests:

- Full quest chain.
- Save/reload at major chapter stages.
- Inventory and reward progression.
- Trial completion.
- Content validation.

Browser smoke:

- Full golden-path playthrough on desktop.
- Full or sampled golden-path playthrough on mobile-sized viewport.
- Reload after onboarding.
- Reload after acquisition.
- Reload before Trial.
- Reload after Trial.

## Phase 16: Production Hardening And Release Candidate

Goal: make the first chapter shippable as a static production build.

Dependencies:

- Phase 15.

Deliverables:

- Accessibility pass for contrast, keyboard-only flow, reduced motion, readable text, and focus handling for React surfaces.
- Performance pass for bundle size, asset size, load time, scene transitions, and memory cleanup.
- Content QA pass for spelling, text overflow, quest blockers, softlocks, balance, and save corruption recovery.
- Audio options and mute behavior verified.
- Static hosting preview with SPA fallback.
- Release checklist.
- Known issues list.

Definition of done:

- No known progression blockers.
- No known save blockers.
- No known menu dead ends.
- Build artifacts are ready for static deployment.
- The game can be completed from a clean browser profile and from saved mid-run states.
- Remaining issues are documented and explicitly non-blocking.

Validation gate:

```bash
bun run validate
```

Additional release validation:

- Production preview smoke test.
- Full playthrough from clean save.
- Reload tests at each major quest stage.
- Mobile viewport check.
- Keyboard-only check.
- Text overflow check across title, pause, inventory, quests, Circle, dialogue, battle, and save UI.

## Future Expansion Track

Start this only after Phase 16.

Potential expansion areas:

- Additional routes and regions.
- Additional Trials.
- Mote League arc.
- Garden upgrades.
- More bodies, minds, moves, traits, and status effects.
- Tessera, Optima, Northstar, Asterion, and Sovereign faction questlines.
- Optional local model integration through the Mind Adapter boundary.
- Accessibility and localization passes.
- Controller support.
- Balance tooling.
- Content authoring tooling.

Future expansion must continue to obey the anti-POC gate.

## Anti-POC Gate

No future phase may close with only a prototype, mock, or isolated subsystem. A phase is incomplete if any of the following are true:

- The feature is not reachable from the normal title, pause, world, Garden, or battle flow.
- The feature does not persist through save/load when it changes player progress.
- The feature has no player-facing use case in the current chapter.
- The feature requires debug instructions to access.
- The feature bypasses the shared menu, quest, inventory, save, or content pipeline when one exists.
- The implementation adds new hardcoded story or map logic where a data-driven system is already planned or available.
- Tests cover only constructors or happy paths while invalid state, migration, or progression blockers are untested.

## Standard Validation

Before completing implementation tasks, run these commands in sequence:

```bash
bun run check
bun run typecheck
bun run test
bun run build
```

For substantial frontend or gameplay changes, also start the local server and verify the relevant flow in the browser:

```bash
bun run dev
```

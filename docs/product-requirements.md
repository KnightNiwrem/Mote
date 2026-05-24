# Mote Product Requirements

## Product Definition

Mote is a client-only 2D aerial-view creature RPG set in Motehaven, a shared digital world created by Tessera Research. The game should feel structurally complete in the way classic handheld top-down RPGs feel complete: tile exploration, readable map routes, NPC dialogue, party management, inventory, quests, save/load, turn-based battles, and authored story progression.

The target is no longer a proof-of-concept vertical slice. The target is a production-ready first chapter. Final custom art, sprite polish, animation polish, music, and sound design may remain placeholder quality, but the core game must behave like a real RPG rather than a systems demo.

Production-ready for this project means:

- A player can start, continue, save, reload, progress, lose, recover, and finish the first chapter without developer guidance.
- Core RPG surfaces exist: title flow, pause menu, Circle menu, inventory, quest log, save menu, options, dialogue, Garden, overworld, and battle commands.
- Gameplay state is durable, validated, migrated, and represented in player-facing UI.
- Content is authored and paced, not only hardcoded as one-off scene behavior.
- Placeholder assets are coherent, readable, replaceable, and good enough for playtesting.

## Current Phase 8 Assessment

The current build proves useful foundations:

- Phaser mounts through React.
- The player can move on tile maps.
- Garden actions exist.
- Wild encounters and one-on-one battles work.
- Body acquisition and Circle assignment exist.
- Mind/body compatibility affects stats.
- One Optima Trial exists.
- Save data persists map, position, Circle, inventory keys, acquired bodies, acquired minds, and quest flags.
- Core rules have Bun tests.

However, the result still feels subpar because the requirements allowed a technical loop to pass without the surrounding RPG structure. The current game lacks several load-bearing features:

- No title screen with continue/load/options.
- No pause menu.
- No player-facing inventory.
- No quest log or typed quest objectives.
- No authored story spine beyond isolated dialogue lines.
- No explicit save-slot UX.
- No battle commands beyond move selection.
- No item use, switching, run command, status, or reward screen cadence.
- No reusable dialogue, cutscene, menu, quest, or content pipeline.
- No clear first-chapter end-to-end definition of done.

The revised requirements below correct that gap.

## Product Pillars

### Companion-First RPG

The first companion, Luma, is the emotional anchor of the game. The player should understand that Motes are not just battle units. They rest, bond, react, grow, and shape the player's relationship to Motehaven.

### Mind/Body Strategy

Every Mote has a body and a mind. Bodies define form, stats, learnsets, traits, and acquisition source. Minds define personality, tactical behavior, bond behavior, compatibility, dialogue tone, and faction origin.

The strongest Circle should not be "seven rare bodies" or "seven powerful minds." It should be the right combination of body, mind, player habits, and team role.

### Classic RPG Readability

The game should be easy to parse at a glance:

- Tile-based movement.
- Four-direction facing.
- Compact NPC dialogue.
- Obvious doors, gates, paths, and encounter zones.
- Menu-first commands.
- Clear save/load behavior.
- Deterministic progression gates.

### Authored First Chapter

The first chapter needs a beginning, middle, and end. A new player should always know:

- Where they are.
- What changed.
- What their current objective is.
- Why the next Trial matters.
- What reward or story beat they earned.

### Systems That Scale

Maps, NPCs, dialogue, quests, items, battles, bodies, minds, rewards, and saves must be data-driven enough to support more regions and chapters later.

## Target Player Experience

The player launches Mote, sees a title screen, starts or continues a save, and enters the first playable chapter.

They begin in the Mote Garden with Luma, their first true companion mind and Mote body. Through short interactions, the player learns that Luma has bond, energy, mood, and a special narrative role.

The player leaves the Garden, meets Guide Mira, explores Route 1, encounters wild Motes powered by the World AI, battles at least one wild Mote, acquires a Mote body, assigns it to the Circle, and sees that acquired bodies can use a Base Mind until a specialized mind is available.

The player then opens the Circle menu, compares body/mind compatibility, changes a pairing, uses an inventory item, checks a quest objective, manually saves, reloads, and continues.

The first chapter culminates in the Optima Precision Trial against Cal Venn. Cal's dialogue and battle behavior demonstrate Optima's philosophy: intelligence should earn its compute. After the Trial, the player receives a clear reward and a Sovereign Weights story hook that points toward the next chapter.

## First Chapter Scope

The first production chapter should target 20-30 minutes of complete play.

### Required Areas

- Title screen.
- Mote Garden.
- Tessera onboarding room or lab interior.
- Motehaven Route 1.
- One small hub or facility space.
- Optima Precision Trial arena.
- Post-Trial story hook location or event.

### Required Characters

- Player caretaker.
- Luma, the first companion.
- Guide Mira, onboarding and Route 1 guide.
- Cal Venn, Optima rival and first Trial opponent.
- At least two Route 1 NPCs who teach body acquisition, World AI, inventory, or quests through short dialogue.
- At least one Tessera lab NPC who explains Base Mind and specialized mind licenses.
- Optional teaser NPCs for Northstar or Asterion.

### Required Collectibles And Combat Content

- At least four Mote bodies, including the starter body.
- At least four minds, including Base Mind and Luma.
- At least eight moves.
- At least eight item definitions.
- At least one usable healing or care item.
- At least one key item.
- At least one Trial mark.
- At least one wild encounter table.
- At least one trainer or Trial battle definition.

### Required Story Beats

1. Prologue: player wakes or starts in the Garden with Luma.
2. Onboarding: Guide Mira introduces Motehaven and the body/mind distinction.
3. Wild body loop: player finds and acquires a wild Mote body.
4. Pairing choice: player changes or inspects a body/mind pairing with visible effect.
5. Precision Trial: player challenges Cal Venn.
6. Post-Trial hook: Sovereign Weights interrupts, appears, or leaves a signal that reframes the League conflict.

## Core Game Loop

1. Start or continue a save.
2. Review current objective.
3. Care for Motes or manage the Circle in the Garden.
4. Explore maps and talk to NPCs.
5. Find wild encounters, items, gates, and quest triggers.
6. Battle wild Motes, trainers, or Trial opponents.
7. Acquire bodies, minds, items, marks, or story flags.
8. Use inventory and mind/body pairing to prepare.
9. Save progress and continue the story.

## Required Systems

### Title And Save Flow

The first screen must be a game shell, not a marketing page.

Required actions:

- Continue.
- New Game.
- Load.
- Options.

Save flow requirements:

- At least three save slots.
- Save metadata: player name, map name, chapter or quest label, play time or timestamp, acquired body count, Trial marks.
- Empty slot state.
- Corrupt slot handling.
- New Game overwrite confirmation.
- Migration from the current single autosave format.

### Pause Menu

During free-roam exploration, the player can open a pause menu.

Required entries:

- Motes.
- Inventory.
- Quests.
- Save.
- Options.
- Return.

The pause menu must not open during movement transitions, battle animations, blocking dialogue, or cutscenes unless the relevant state explicitly allows it.

### Mote Circle

The player can load up to seven Mote bodies into the Circle.

Each occupied slot tracks:

- Body id.
- Mind id.
- Level.
- Experience.
- Bond.
- Current HP.
- Status where applicable.
- Compatibility rating.

The Circle menu must show:

- Seven slots.
- Body name.
- Mind name.
- HP.
- Level.
- Bond.
- Compatibility.
- Battle order or active marker.

The player must be able to inspect pairings and assign available minds to acquired bodies. Full Circle acquisition must fall back to body inventory or storage rather than failing silently.

### Inventory

Inventory must be a real player-facing system, not only a `Record<string, number>` in save data.

Required item categories:

- Body.
- Mind license.
- Care.
- Battle.
- Key.
- Material.
- Trial mark.

Required item behavior:

- View item list by category.
- See item count and description.
- Use at least one item from the menu.
- Use at least one supported item in battle or explicitly mark battle use as unavailable.
- Prevent invalid use with clear feedback.
- Persist item changes through save/load.

Recommended first-chapter items:

- Patch Pulse: restores HP.
- Garden Berry: improves fullness or care state.
- Focus Bell: improves focus or bond training.
- Precision Mark: Trial reward key item.
- Garden Pass or Route Gate Token: early progression key item.
- Memory Shard or Signal Fragment: story or research material.

### Quest Log

Quest state must be visible to the player.

Required quest categories:

- Main quest.
- Trial quest.
- Companion quest.
- Collection quest.
- Research task.
- Faction quest.
- World errand.
- Hidden or exploration quest.

The first chapter must include at least:

- One main quest chain.
- One Trial quest.
- One collection or research side objective.

Quest entries must show:

- Title.
- Current objective.
- Status.
- Reward.
- Completion state.

Quest states should standardize as:

- Inactive.
- Available.
- Active.
- Ready to turn in.
- Completed.
- Failed, only if needed later.

### Dialogue And Story

Dialogue must support:

- Multiple lines.
- State-gated variants.
- Branching choices where needed.
- Quest effects.
- Item rewards.
- Battle starts.
- Cutscene starts.
- Repeat and completed variants.

Every named critical NPC needs:

- First-talk dialogue.
- Repeat-talk dialogue.
- Relevant quest-state dialogue.
- Post-Trial dialogue where appropriate.

Dialogue should teach through short in-world lines, not tutorial walls.

### Garden

The Garden is the home base.

Required Garden functions:

- Rest or heal.
- Feed.
- Play.
- Train.
- Talk with Luma.
- Inspect Circle.
- Access storage or body inventory.
- Trigger story events.
- Reflect chapter progression.

Garden care must have visible consequences without becoming mandatory busywork.

### Overworld

The overworld must support:

- Tile-based maps.
- Four-direction movement.
- Collision.
- Camera follow.
- NPC facing and interaction.
- Dialogue boxes.
- Map transitions.
- Interiors.
- Signposts or terminals.
- Encounter zones.
- Item pickups.
- Flag-gated gates or blockers.
- Quest triggers.

Prompt verbs should include:

- Talk.
- Care.
- Battle.
- Trial.
- Inspect.
- Pick Up.
- Enter.

### Battles

Battles must feel like an RPG command system, not only a move-selection demo.

Required commands:

- Fight.
- Mote.
- Item.
- Run, for wild battles.

Required battle behavior:

- One active Mote per side for the first chapter.
- Four move slots.
- HP.
- Energy or move limits if displayed.
- Accuracy if displayed, or explicitly keep first-chapter moves at guaranteed hit.
- Enemy policies for wild and Optima opponents.
- Win, loss, and escape outcomes.
- Item use where supported.
- Mote switching where multiple usable Circle members exist.
- Rewards screen or clear reward log.
- Return to the correct map/tile after battle.
- Loss recovery that avoids hard-failing the first chapter.

Battle types:

- Wild.
- Trainer.
- Trial.
- Story or faction encounter.

### Progression

Progression axes:

- Circle size.
- Acquired bodies.
- Acquired minds.
- Bond.
- Experience and level.
- Trial marks.
- Quest completion.
- Faction reputation.
- Map access.
- Garden upgrades.

For the first chapter, avoid grinding as a requirement. Battles and quests should support experimentation and teaching, not stat walls.

### Options And Accessibility

Options must include:

- Sound volume or mute.
- Music volume or mute.
- Text speed.
- Reduced motion where applicable.
- Control display.

Accessibility requirements:

- Keyboard-only play.
- Touch controls for small viewports.
- Readable text contrast.
- Do not rely on color alone.
- Stable menu dimensions.
- Text must not overflow dialogue, battle, inventory, quest, or save UI.
- Motion effects must be modest and skippable where possible.

## Factions

### Tessera Research

Philosophy: intelligence grows through relationship.

Gameplay identity:

- Bond growth.
- Adaptability.
- Support.
- Recovery.
- Longer-fight resilience.

### Optima Systems

Philosophy: intelligence should earn its compute.

Gameplay identity:

- Speed.
- Precision.
- Efficient damage.
- Predictable tactical behavior.
- Clear Trial scoring or performance language.

### Northstar Cognition

Gameplay identity:

- Reliability.
- Defensive consistency.
- Status resistance.
- Coordination bonuses.

### Asterion Intelligence

Gameplay identity:

- Experimental power.
- High variance.
- Unusual moves.
- Strong but costly effects.

### Sovereign Weights

Philosophy: local means loyal.

Gameplay identity:

- Rule-breaking tactics.
- High risk.
- Unstable bonuses.
- Narrative danger around cracked or unsafe minds.

The first chapter should introduce Sovereign Weights as a threat or ideology, not resolve the arc.

## Non-Goals

- No online multiplayer.
- No trading.
- No online tournaments.
- No accounts.
- No cloud saves.
- No backend API routes.
- No real local AI inference in the first production chapter.
- No full region.
- No full League.
- No large roster.
- No breeding.
- No crafting economy.
- No procedural world generation.
- No copied assets, creature designs, map layouts, names, UI, or audio from existing franchises.

## Acceptance Criteria

The first production chapter is successful when:

- A new player can launch the app, start a new game from a title screen, meet Luma, complete onboarding, leave the Garden, explore Route 1, acquire at least one body, manage the Circle, use inventory, complete a quest objective, manually save, reload, defeat the Optima Trial, and see the next story hook.
- The player can continue from an existing save and load a selected slot.
- The pause menu is available during exploration and exposes Motes, Inventory, Quests, Save, and Options.
- Inventory is player-facing: at least one item can be earned, viewed, used, persisted, and reflected in gameplay.
- Quest state is player-facing: at least one main quest and one side objective are visible, update through play, and resolve with rewards or progression.
- Battle commands include Fight, Mote, Item, and Run where appropriate.
- Mind/body pairing visibly affects compatibility and at least one tactical or bond behavior.
- The Optima Trial expresses Optima's ideology through dialogue and battle behavior.
- The Sovereign Weights hook appears after Trial completion and persists correctly.
- Save/load restores map, position, facing, Circle, acquired bodies, acquired minds, inventory, quest progress, HP, bond, Garden state, and Trial completion.
- The first chapter is completable in 20-30 minutes without grinding.
- The game builds to static production assets.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run build` pass.

## Required Test Coverage

Core systems must have deterministic tests for:

- Save slots, validation, and migrations.
- Inventory counts, invalid use, valid use, and persistence.
- Quest start, advance, completion, rewards, and persistence.
- Dialogue condition selection and effects.
- Mote Circle limits, assignment, and switching rules.
- Mind/body compatibility and stat modifiers.
- Garden care state.
- Encounter table selection.
- Battle commands, enemy policy, rewards, escape, switching, item use, and loss recovery.
- Trial completion and story flags.
- Content registry validation.

## Anti-POC Product Gate

A feature is not complete if:

- It is not reachable from normal title, pause, world, Garden, or battle flow.
- It changes player progress but does not save and load.
- It has no player-facing purpose in the current chapter.
- It requires debug instructions.
- It exists only as stored data with no UI or gameplay use.
- It bypasses an established menu, quest, inventory, save, or content system.
- It has no invalid-state tests.

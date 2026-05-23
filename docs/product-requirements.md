# Mote Initial Product Requirements

## Overview

Mote is a 2D aerial-view pet-raising and battling RPG set in Motehaven, a shared digital world created by Tessera Research. The game combines classic tile-based exploration, creature collection, team building, companion care, and turn-based battles with a central fiction: every Mote is made from a body and a mind.

The initial product should deliver a focused vertical slice that proves the core loop before expanding into a full RPG. The visual and interaction target is a classic handheld top-down RPG, similar in camera, tile density, and readable movement cadence to Pokemon Yellow, Crystal, and Sapphire, while using original characters, creatures, factions, UI language, and assets.

## Product Goals

- Establish the core fantasy of raising AI-powered virtual companions in Motehaven.
- Make the body/mind pairing system understandable through play, not exposition alone.
- Deliver a satisfying loop of Garden care, overworld exploration, wild encounters, Mote acquisition, Circle management, and battles.
- Position faction battles as ideological contests between relationship, performance, reliability, experimentation, and unrestricted-control philosophies.
- Build a small but extensible foundation for future local AI integration.

## Non-Goals

- Do not build a full region, full League, or large roster in the first milestone.
- Do not integrate real local AI model inference in the first gameplay slice.
- Do not add backend API routes unless a later milestone explicitly requires online functionality.
- Do not use copied Pokemon assets, creature designs, map layouts, names, or audio.
- Do not make multiplayer, trading, or online tournaments part of the initial release.

## Target Player Experience

The player begins as a new Mote caretaker with one true companion AI, one Mote body, and a private Mote Garden. The first companion should feel more personal than later default Motes, acting as the emotional center of the player's Circle.

From the Garden, the player enters Motehaven, explores tile-based routes and facilities, encounters wild Motes, battles them, and earns new Mote bodies. New bodies can be assigned a standard base mind at first. As the player progresses, they unlock more specialized minds associated with factions, research groups, or quest rewards.

The player should understand that the strongest Circle is not only a list of rare bodies or powerful minds. Strength comes from pairing body, mind, player habits, and team role.

## Core Game Loop

1. Care for Motes in the Garden.
2. Explore Motehaven.
3. Encounter wild Mote bodies or faction trainers.
4. Battle, befriend, study, or acquire Mote bodies.
5. Assign bodies and minds in the Mote Circle.
6. Train bond, compatibility, and battle readiness.
7. Complete Trials and unlock new regions, bodies, minds, and faction storylines.

## Primary Systems

### Mote Body

A Mote body defines the visible and mechanical creature form:

- Species and display name
- Sprite and animation set
- Base stats and growth curve
- Battle style and learnable moves
- Trait tags
- Rarity and acquisition source
- Compatibility preferences with mind archetypes

### Mote Mind

A Mote mind defines behavior and personality:

- Mind name and origin
- Faction or lab association
- Personality traits
- Battle tendencies
- Bond growth behavior
- Compatibility modifiers
- Dialogue tone
- Strengths, limitations, and risk profile

The initial game should implement minds as deterministic profiles. Real local model integration should be introduced later through a replaceable adapter.

### Mote Circle

The player can load up to seven Mote bodies into their Circle.

Each slot may be:

- Empty
- A Mote body using a standard base mind
- A Mote body paired with a named specialized mind

The first companion occupies a special narrative role but should still follow the same underlying slot model.

### Mote Garden

The Garden is the player's private home space. It should support:

- Rest, feed, play, and train actions
- Companion dialogue
- Bond changes
- Basic visual state changes
- Party inspection
- Entry point to Motehaven

### Overworld

The overworld should support:

- Tile-based top-down maps
- Four-direction player movement
- Collision
- NPC interaction
- Dialogue boxes
- Map transitions
- Wild encounter zones
- Simple quest flags

### Battles

Battles should be turn-based and readable. Initial battles should support:

- One active Mote per side
- HP and energy or move limits
- Four available moves
- Body stats and mind modifiers
- Simple enemy AI
- Win, loss, and escape outcomes
- Body acquisition rewards for selected wild encounters

## Initial Vertical Slice

The first playable slice should target 20-30 minutes of content:

- Player Garden
- One starting companion Mote
- One small Motehaven route
- One Tessera lab or onboarding room
- Three wild Mote bodies
- Three mind profiles
- One Optima rival encounter
- One Trial battle
- One Sovereign Weights story hint
- Save/load support

## Factions

### Tessera Research

Philosophy: intelligence grows through relationship.

Gameplay identity:

- Bond growth
- Adaptability
- Support and recovery
- Strong performance in longer fights

### Optima Systems

Philosophy: intelligence should earn its compute.

Gameplay identity:

- Speed
- Precision
- Efficient damage
- Predictable tactical behavior

### Northstar Cognition

Gameplay identity:

- Reliability
- Defensive consistency
- Status resistance
- Coordination bonuses

### Asterion Intelligence

Gameplay identity:

- Experimental power
- High variance
- Unusual moves
- Strong but costly effects

### Sovereign Weights

Philosophy: local means loyal.

Gameplay identity:

- Rule-breaking tactics
- High risk
- Unstable bonuses
- Narrative danger around cracked or unsafe minds

## UX Requirements

- The first screen should be the playable game experience, not a marketing page.
- Keyboard controls must work for movement, interaction, menu navigation, and battle choices.
- Controls should be simple enough for handheld-style play.
- Text boxes must be readable at small viewport sizes.
- UI should use clear icons for repeated actions where appropriate.
- No visible tutorial walls; teach through short NPC lines, early interactions, and constrained first choices.

## Accessibility Requirements

- Avoid relying on color alone for status, faction, or battle state.
- Provide readable text contrast.
- Support keyboard-only play.
- Keep motion effects modest and skippable where possible.
- Maintain stable layout dimensions for menus, battle options, and dialogue boxes.

## Acceptance Criteria

The initial product slice is successful when:

- A player can start in the Garden, interact with the first companion, enter the overworld, trigger a wild encounter, complete a battle, acquire a Mote body, assign a mind/body pairing, and save progress.
- The difference between body and mind is visible in at least one gameplay choice.
- At least one faction battle demonstrates a distinct battle philosophy.
- The game can be built as static production assets.
- Core systems have deterministic tests for battle math, Circle rules, save data, and mind/body compatibility.

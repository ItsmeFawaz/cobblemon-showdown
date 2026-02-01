# Cobblemon Raid Den Battle Format

## Overview

The Raid Den Battle format implements Pokemon Raid Battles where multiple participants team up to battle against a single powerful boss Pokemon.

## Format Details

- **Format ID**: `cobblemonraidden`
- **Game Type**: Singles (with special mechanics)
- **Mod**: Cobblemon
- **Ruleset**: Raid Den Rule

## Battle Structure

### Participants (p1 side)
- Multiple players (configurable, typically 3-6)
- Each participant controls 1 Pokemon
- No switching allowed
- Each participant must make a move choice each turn

### Boss (p2 side)
- Single Pokemon (the raid boss)
- Makes 1-3 moves per turn (random, configurable)
- Each move targets a random participant
- Ignores stat validation (can have ridiculous stats)

## Special Mechanics

### Boss Multiple Moves
The boss Pokemon makes multiple moves each turn:
- Number of moves is randomly chosen between `bossMinMoves` and `bossMaxMoves` (default: 1-3)
- Each move targets a random living participant
- If all participants die before completing all moves, remaining moves are cancelled

### End-of-Turn Effects
After each turn's residual phase:
1. **Boss Status Cleared**: Any status conditions (paralysis, burn, poison, sleep, freeze) on the boss are healed
2. **Boss Stat Debuffs Reset**: Any negative stat changes on the boss are reset to 0
3. **Participant Stat Buffs Reset**: Any positive stat changes on participants are reset to 0

### Win Conditions

The battle ends when one of these conditions is met:

1. **Participants Win**: The boss Pokemon faints
2. **Boss Wins - All Participants Faint**: All participant Pokemon faint (their team is eliminated)
3. **Boss Wins - Time Limit**: Maximum number of turns is reached (default: 10 turns)

## Configuration

The raid configuration is stored in `battle.formatData.raidDenConfig` and includes:

```typescript
{
  maxTurns: 10,        // Maximum turns before boss wins
  bossMinMoves: 1,     // Minimum moves boss makes per turn
  bossMaxMoves: 3      // Maximum moves boss makes per turn
}
```

You can customize these values by modifying the `Raid Den Rule` in `/data/rulesets.ts`.

## Using with BattleStream

### Starting a Raid Battle

```javascript
const {BattleStreams} = require('./sim');

// Create battle stream
const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());

// Start raid battle
streams.omniscient.write('>start {"formatid":"cobblemonraidden"}');

// Set up participants (p1)
streams.p1.write('>player p1 {"name":"Participants","team":[
  {"species":"Pikachu","moves":["thunderbolt","quickattack","thunder","agility"]},
  {"species":"Charizard","moves":["flamethrower","airslash","dragonpulse","roost"]},
  {"species":"Blastoise","moves":["surf","icebeam","flashcannon","rapidspin"]}
]}');

// Set up boss (p2)
streams.p2.write('>player p2 {"name":"Raid Boss","team":[
  {"species":"Mewtwo","level":100,"moves":["psychic","aurasphere","thunder","recover"]}
]}');
```

### Making Choices

#### Participant Side (p1)
Participants must provide choices for each of their active Pokemon:

```javascript
// Option 1: Comma-separated for all Pokemon
streams.p1.write('>choose move 1, move 2, move 1');

// Option 2: Individual Pokemon choices (for more control)
streams.p1.write('>choose p1a move thunderbolt');
streams.p1.write('>choose p1b move flamethrower');
streams.p1.write('>choose p1c move surf');
```

#### Boss Side (p2)
The boss side is automated and doesn't require explicit choices:

```javascript
// Boss choices are generated automatically
// You can still send a choice if desired, but it will be overridden
streams.p2.write('>choose default');
```

## Example Battle Flow

```
Turn 1:
- Participant 1 uses Thunder Bolt → Boss
- Participant 2 uses Flamethrower → Boss
- Participant 3 uses Surf → Boss
- Boss uses Psychic → Participant 2 (random)
- Boss uses Aura Sphere → Participant 1 (random)
[End of turn: Boss status cleared, boss debuffs reset, participant buffs reset]

Turn 2:
- Participant 1 uses Quick Attack → Boss
- Participant 2 (fainted, skips)
- Participant 3 uses Ice Beam → Boss
- Boss uses Thunder → Participant 3
[End of turn: Effects reset]

...

Turn 8:
- Boss faints
- Participants win!
```

## Implementation Files

- `/config/custom-formats.ts` - Format definition
- `/data/rulesets.ts` - Raid Den Rule with initialization
- `/data/mods/cobblemon/scripts.ts` - Core raid mechanics (runAction, checkWin)

## Notes

- The boss should be configured with significantly higher stats than participants to provide a challenge
- No stat validation is performed on the boss Pokemon
- Participants cannot switch Pokemon during battle
- If a participant's Pokemon faints before its turn, it simply doesn't make a move that turn
- The boss continues to make moves until it completes its move count or all participants faint

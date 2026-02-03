# Cobblemon Raid Den Battle Format

## Overview

The Raid Den Battle format implements Pokemon Raid Battles where multiple participants team up to battle against a single powerful boss Pokemon. Participants' fainted Pokemon are revived at the end of each round (unless all participants are eliminated).

## Format Details

- **Format ID**: `cobblemonraidden`
- **Game Type**: Singles (with special raid mechanics)
- **Mod**: Cobblemon
- **Ruleset**: Raid Den Rule

## Battle Structure

### Participants (p1 side)
- Multiple players (default: 3, configurable)
- Each participant controls 1 Pokemon
- No switching needed (each participant has party of 1 Pokemon)
- Each participant must make a move choice each turn
- **Fainted participants are revived at end of turn** (at 50% HP)

### Boss (p2 side)
- Single Pokemon (the raid boss)
- Makes 1-3 moves per turn (random, default range, configurable)
- Each move targets a random participant
- Ignores stat validation (can have ridiculous stats)

## Special Mechanics

### Boss Multiple Moves
The boss Pokemon makes multiple moves each turn:
- Number of moves is randomly chosen between `bossMinMoves` and `bossMaxMoves` (default: 1-3)
- Each move targets a random living participant
- If all participants die before completing all moves, remaining moves are cancelled

### Revival Mechanic (NEW)
At the end of each turn:
- **Fainted participants are automatically revived** at 50% of their max HP
- Revival only occurs if **at least one participant is still alive**
- If all participants faint in the same turn, the boss wins (no revival)

### End-of-Turn Effects
After each turn's residual phase:
1. **Boss Status Cleared**: Any status conditions (paralysis, burn, poison, sleep, freeze) on the boss are healed
2. **Boss Stat Debuffs Reset**: Any negative stat changes on the boss are reset to 0
3. **Participant Stat Buffs Reset**: Any positive stat changes on participants are reset to 0
4. **Revival**: Fainted participants are revived (if at least one is alive)

### Win Conditions

The battle ends when one of these conditions is met:

1. **Participants Win**: The boss Pokemon faints
2. **Boss Wins - All Participants Faint**: All participant Pokemon faint in the same turn (before revival can occur)
3. **Boss Wins - Time Limit**: Maximum number of turns is reached (default: 10 turns)

## Configuration

The raid configuration has default values but can be customized:

```javascript
// Default configuration
{
  maxTurns: 10,          // Maximum turns before boss wins
  bossMinMoves: 1,       // Minimum moves boss makes per turn
  bossMaxMoves: 3,       // Maximum moves boss makes per turn
  participantCount: 3    // Number of participants (for display)
}
```

### Customizing Configuration

You can customize these values before starting the battle:

```javascript
// When creating battle
const battle = new Battle(options);

// Before battle starts, modify the configuration
battle.formatData.raidDenConfig = {
  maxTurns: 15,
  bossMinMoves: 2,
  bossMaxMoves: 4,
  participantCount: 5
};
```

## Using with BattleStream

### Starting a Raid Battle

```javascript
const {BattleStreams} = require('./sim');

// Create battle stream
const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());

// Start raid battle
streams.omniscient.write('>start {"formatid":"cobblemonraidden"}');

// Set up participants (p1) - each with single Pokemon
streams.p1.write('>player p1 {"name":"Participants","team":[
  {"species":"Pikachu","moves":["thunderbolt","quickattack","thunder","agility"]},
  {"species":"Charizard","moves":["flamethrower","airslash","dragonpulse","roost"]},
  {"species":"Blastoise","moves":["surf","icebeam","flashcannon","rapidspin"]}
]}');

// Set up boss (p2) - single Pokemon
streams.p2.write('>player p2 {"name":"Raid Boss","team":[
  {"species":"Mewtwo","level":100,"moves":["psychic","aurasphere","thunder","recover"]}
]}');
```

### Making Choices

#### Participant Side (p1)
Participants must provide choices for each of their Pokemon:

```javascript
// Option 1: Comma-separated for all Pokemon
streams.p1.write('>choose move 1, move 2, move 1');

// Option 2: Individual Pokemon choices
streams.p1.write('>choose move thunderbolt, move flamethrower, move surf');
```

#### Boss Side (p2)
The boss side choices are automated:

```javascript
// Boss choices are generated automatically
// You can still send choices if desired
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
- Participant 2 (fainted, skips move)
- Participant 3 uses Ice Beam → Boss
- Boss uses Thunder → Participant 3
[End of turn: Participant 2 revived at 50% HP! Effects reset]

Turn 3:
- All participants attack
- Boss attacks 2 times
[End of turn: All participants still alive, no revival needed]

...

Turn 8:
- Boss faints
- Participants win!
```

## Example: All Participants Faint Scenario

```
Turn 5:
- Boss uses powerful attack → All participants faint
- Boss wins immediately (no revival because all fainted)
```

## Implementation Files

- `/config/custom-formats.ts` - Format definition
- `/data/rulesets.ts` - Raid Den Rule with all mechanics (onBegin, onAfterMove, onResidual, onFaint, onBeforeTurn)
- `/data/mods/cobblemon/scripts.ts` - Base scripts (no overrides needed)

## Technical Details

The implementation uses Pokemon Showdown's event hook system:
- **onBegin**: Initialize configuration
- **onAfterMove**: Queue additional boss moves
- **onResidual**: End-of-turn cleanup and revival
- **onFaint**: Check win conditions  
- **onBeforeTurn**: Check max turns

This approach avoids problematic method overrides and uses the battle engine's native event system.

## Notes

- The boss should be configured with significantly higher stats than participants to provide a challenge
- No stat validation is performed on the boss Pokemon
- Participants cannot switch Pokemon during battle (each has party of 1)
- If a participant's Pokemon faints before its turn, it simply doesn't make a move that turn
- The boss continues to make moves until it completes its move count or all participants faint
- **Revival occurs automatically at end of each turn** (unless all participants are dead)
- Revival HP is set to 50% of max HP

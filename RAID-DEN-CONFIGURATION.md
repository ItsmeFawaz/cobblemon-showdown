# Raid Den Configuration Guide

## Overview

The Raid Den format is fully configurable. You can customize the number of participants, max turns, and boss move ranges when creating a battle.

## Default Configuration

```javascript
{
  maxTurns: 10,           // Battle ends after 10 turns (boss wins)
  bossMinMoves: 1,        // Boss makes at least 1 move per turn
  bossMaxMoves: 3,        // Boss makes at most 3 moves per turn
  participantCount: 3     // Expected number of participants (for display)
}
```

## Customizing Configuration

### Method 1: Modify formatData Before Battle Starts

```javascript
const {Battle} = require('./dist/sim');

// Create battle
const battle = new Battle({formatid: 'cobblemonraidden'});

// Customize configuration BEFORE setting players
battle.formatData.raidDenConfig = {
  maxTurns: 20,           // Longer battle
  bossMinMoves: 2,        // Boss always makes 2-4 moves
  bossMaxMoves: 4,
  participantCount: 6     // More participants
};

// Now set up players
battle.setPlayer('p1', {...});
battle.setPlayer('p2', {...});
```

### Method 2: Using BattleStream

```javascript
const {BattleStreams} = require('./dist/sim');

const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());

// Start battle
streams.omniscient.write('>start {"formatid":"cobblemonraidden"}');

// The battle is created, you can access it and modify config
// (Note: This requires access to the battle object)
```

### Method 3: Create Custom Format

Create a new format variant in `config/custom-formats.ts`:

```javascript
{
  name: "Cobblemon Raid Den (Hard Mode)",
  threads: [],
  mod: 'cobblemon',
  ruleset: ['Raid Den Rule'],
  gameType: "singles",
  // Custom defaults for this variant
  battle: {
    onBegin() {
      // Override default config
      this.formatData.raidDenConfig = {
        maxTurns: 5,        // Very short battle
        bossMinMoves: 3,    // Boss makes 3-5 moves
        bossMaxMoves: 5,
        participantCount: 3
      };
    }
  }
}
```

## Configuration Parameters

### maxTurns (number)
- **Description**: Maximum number of turns before the boss automatically wins
- **Default**: 10
- **Range**: Any positive integer
- **Example**: Set to 20 for longer battles, 5 for quick raids

### bossMinMoves (number)
- **Description**: Minimum number of moves the boss makes per turn
- **Default**: 1
- **Range**: 1 to bossMaxMoves
- **Example**: Set to 2 to ensure boss always makes at least 2 moves

### bossMaxMoves (number)
- **Description**: Maximum number of moves the boss makes per turn
- **Default**: 3
- **Range**: bossMinMoves to any reasonable number
- **Example**: Set to 5 for very aggressive boss

### participantCount (number)
- **Description**: Expected number of participants (informational, shown in rule message)
- **Default**: 3
- **Range**: Any positive integer
- **Note**: Actual participant count determined by team size on p1 side

## Common Configurations

### Easy Mode
```javascript
battle.formatData.raidDenConfig = {
  maxTurns: 15,     // More time
  bossMinMoves: 1,  // Boss less aggressive
  bossMaxMoves: 2,
  participantCount: 4
};
```

### Hard Mode
```javascript
battle.formatData.raidDenConfig = {
  maxTurns: 8,      // Less time
  bossMinMoves: 2,  // Boss more aggressive
  bossMaxMoves: 4,
  participantCount: 3
};
```

### Ultra Hard Mode
```javascript
battle.formatData.raidDenConfig = {
  maxTurns: 5,      // Very limited time
  bossMinMoves: 3,  // Boss very aggressive
  bossMaxMoves: 5,
  participantCount: 2  // Fewer participants
};
```

### Endurance Mode
```javascript
battle.formatData.raidDenConfig = {
  maxTurns: 30,     // Long battle
  bossMinMoves: 1,  // Standard aggression
  bossMaxMoves: 3,
  participantCount: 6  // Many participants
};
```

## Notes

1. **Configuration must be set before battle starts** (before setPlayer calls)
2. **participantCount is informational** - actual count determined by p1 team size
3. **Boss move count is random** between min and max each turn
4. **Revival mechanic is always active** - cannot be disabled
5. **All other rules apply** regardless of configuration:
   - Boss status cleared each turn
   - Boss debuffs reset each turn
   - Participant buffs reset each turn
   - Participants revive at 50% HP (if any alive)

## Example: Dynamic Difficulty

```javascript
function createRaidBattle(difficulty) {
  const battle = new Battle({formatid: 'cobblemonraidden'});
  
  // Configure based on difficulty
  const configs = {
    easy: {maxTurns: 15, bossMinMoves: 1, bossMaxMoves: 2, participantCount: 4},
    normal: {maxTurns: 10, bossMinMoves: 1, bossMaxMoves: 3, participantCount: 3},
    hard: {maxTurns: 8, bossMinMoves: 2, bossMaxMoves: 4, participantCount: 3},
    ultra: {maxTurns: 5, bossMinMoves: 3, bossMaxMoves: 5, participantCount: 2}
  };
  
  battle.formatData.raidDenConfig = configs[difficulty] || configs.normal;
  
  return battle;
}

// Use it
const easyRaid = createRaidBattle('easy');
const hardRaid = createRaidBattle('hard');
```

## Accessing Current Configuration

```javascript
// During battle
const config = battle.formatData.raidDenConfig;

console.log(`Max Turns: ${config.maxTurns}`);
console.log(`Boss Moves: ${config.bossMinMoves}-${config.bossMaxMoves}`);
console.log(`Participants: ${config.participantCount}`);
```

## Troubleshooting

### Configuration Not Applied
- Ensure you set config BEFORE calling `battle.setPlayer()`
- Config must be set after battle creation but before player setup

### Boss Not Making Multiple Moves
- Check that boss is on p2 side
- Verify config is properly set in formatData
- Check battle log for move queuing

### Wrong Number of Participants
- participantCount is just a label in the rule message
- Actual participant count is determined by p1 team size
- Each Pokemon in p1 team is a separate participant

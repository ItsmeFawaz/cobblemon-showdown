# Testing Raid Den Format

## Known Issue: movesInfo Error

The Cobblemon mod has a pre-existing issue where it expects `set.movesInfo` to be defined when creating Pokemon. This affects all battle creation in the Cobblemon mod, not just Raid Den battles.

```javascript
// Error in sim/pokemon.ts line 348:
pp: set.movesInfo[i].pp,  // movesInfo is undefined
```

This issue needs to be fixed in the Cobblemon codebase before battles can be created programmatically.

## Manual Testing (When movesInfo is Fixed)

Once the movesInfo issue is resolved, you can test the Raid Den format using:

### 1. Node.js Script
```bash
node RAID-DEN-EXAMPLE.js
```

### 2. Mocha Tests
```bash
npx mocha test/sim/misc/raid-den.js
```

### 3. Interactive Testing

Use the BattleStream API to test interactively:

```javascript
const {Battle} = require('./dist/sim');

const battle = new Battle({formatid: 'cobblemonraidden'});

// Set up players
battle.setPlayer('p1', {
  name: 'Participants',
  team: [/* Pokemon with movesInfo */]
});

battle.setPlayer('p2', {
  name: 'Boss',
  team: [/* Pokemon with movesInfo */]
});

// Make choices
battle.makeChoices('move 1, move 1, move 1', 'move 1');
```

## Verifying Implementation (TypeScript)

The implementation can be verified without runtime testing:

### Check TypeScript Compilation
```bash
npm run tsc
```
Should show no errors in:
- `config/custom-formats.ts`
- `data/rulesets.ts`
- `data/mods/cobblemon/scripts.ts`

### Review Code
All raid den mechanics are implemented in `data/rulesets.ts` using event hooks:

1. **onBegin()** - Initializes configuration
2. **onAfterMove()** - Queues additional boss moves
3. **onResidual()** - Handles end-of-turn cleanup and revival
4. **onFaint()** - Checks win conditions
5. **onBeforeTurn()** - Checks max turns

## Expected Behavior

When the movesInfo issue is fixed, the Raid Den format should:

1. ✅ Allow boss to make 1-3 moves per turn (random targets)
2. ✅ Clear boss status conditions at end of turn
3. ✅ Reset boss stat debuffs at end of turn
4. ✅ Reset participant stat buffs at end of turn
5. ✅ Revive fainted participants at 50% HP (if at least one alive)
6. ✅ End battle when boss faints (participants win)
7. ✅ End battle when all participants faint (boss wins)
8. ✅ End battle after max turns (boss wins)

## Configuration Testing

Test custom configuration by modifying `formatData` before battle starts:

```javascript
const battle = new Battle({formatid: 'cobblemonraidden'});

// Customize before setting players
battle.formatData.raidDenConfig = {
  maxTurns: 15,
  bossMinMoves: 2,
  bossMaxMoves: 4,
  participantCount: 5
};

// Then set up players...
```

## Workaround for movesInfo

To work around the movesInfo issue, you would need to either:

1. Fix the Cobblemon mod to not require movesInfo
2. Ensure all Pokemon sets include movesInfo property:
```javascript
{
  species: 'Pikachu',
  moves: ['thunderbolt', 'quickattack'],
  movesInfo: [
    {pp: 15, maxPp: 15},
    {pp: 30, maxPp: 30}
  ]
}
```

However, this is outside the scope of the Raid Den implementation.

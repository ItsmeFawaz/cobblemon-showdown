/**
 * Raid Den Battle Example
 * 
 * This example shows how to create and run a Raid Den battle
 * with configurable parameters.
 */

const {Battle} = require('./dist/sim');

// Example 1: Basic Raid Den Battle with defaults
function example1() {
console.log('\n=== Example 1: Basic Raid Den Battle ===\n');

const battle = new Battle({
formatid: 'cobblemonraidden',
seed: [1, 2, 3, 4], // For reproducible results
});

// Set up participants (p1 side) - 3 Pokemon
battle.setPlayer('p1', {
name: 'Participants',
team: [
{species: 'Pikachu', level: 50, moves: ['thunderbolt', 'quickattack', 'thunder', 'agility']},
{species: 'Charizard', level: 50, moves: ['flamethrower', 'airslash', 'dragonpulse', 'roost']},
{species: 'Blastoise', level: 50, moves: ['surf', 'icebeam', 'flashcannon', 'rapidspin']},
],
});

// Set up boss (p2 side) - 1 powerful Pokemon
battle.setPlayer('p2', {
name: 'Raid Boss',
team: [
{species: 'Mewtwo', level: 75, moves: ['psychic', 'aurasphere', 'thunder', 'recover']},
],
});

console.log('Format:', battle.format.name);
console.log('Config:', battle.formatData.raidDenConfig);
console.log('\n--- Battle Log ---\n');

// Run a few turns
for (let i = 0; i < 3; i++) {
console.log(`Turn ${battle.turn + 1}:`);
battle.makeChoices('move 1, move 1, move 1', 'move 1');
}

console.log('\nBattle ended:', battle.ended);
}

// Example 2: Customized Raid Den Battle
function example2() {
console.log('\n=== Example 2: Customized Raid Den Battle ===\n');

const battle = new Battle({
formatid: 'cobblemonraidden',
seed: [1, 2, 3, 4],
});

// Customize raid configuration BEFORE setting up players
battle.formatData.raidDenConfig = {
maxTurns: 5,           // Shorter battle
bossMinMoves: 2,       // Boss always makes 2-3 moves
bossMaxMoves: 3,
participantCount: 5,   // More participants
};

// Set up participants - 5 Pokemon this time
battle.setPlayer('p1', {
name: 'Raid Team',
team: [
{species: 'Pikachu', level: 40, moves: ['thunderbolt', 'quickattack']},
{species: 'Charizard', level: 40, moves: ['flamethrower', 'airslash']},
{species: 'Blastoise', level: 40, moves: ['surf', 'icebeam']},
{species: 'Venusaur', level: 40, moves: ['gigadrain', 'sludgebomb']},
{species: 'Snorlax', level: 40, moves: ['bodyslam', 'earthquake']},
],
});

// Set up stronger boss
battle.setPlayer('p2', {
name: 'Ultra Beast',
team: [
{species: 'Necrozma', level: 100, moves: ['photongeyser', 'earthquake', 'xscissor', 'recover']},
],
});

console.log('Format:', battle.format.name);
console.log('Custom Config:', battle.formatData.raidDenConfig);
console.log('Max Turns:', battle.formatData.raidDenConfig.maxTurns);
console.log('Boss Moves per turn:', `${battle.formatData.raidDenConfig.bossMinMoves}-${battle.formatData.raidDenConfig.bossMaxMoves}`);
}

// Example 3: Demonstrating Revival Mechanic
function example3() {
console.log('\n=== Example 3: Revival Mechanic ===\n');

const battle = new Battle({
formatid: 'cobblemonraidden',
seed: [1, 2, 3, 4],
});

// Set up weak participants that will faint
battle.setPlayer('p1', {
name: 'Participants',
team: [
{species: 'Pidgey', level: 5, moves: ['tackle']},
{species: 'Rattata', level: 5, moves: ['tackle']},
],
});

// Set up strong boss
battle.setPlayer('p2', {
name: 'Boss',
team: [
{species: 'Gyarados', level: 50, moves: ['waterfall', 'earthquake']},
],
});

console.log('Initial HP:');
console.log('Pidgey:', battle.p1.pokemon[0].hp + '/' + battle.p1.pokemon[0].maxhp);
console.log('Rattata:', battle.p1.pokemon[1].hp + '/' + battle.p1.pokemon[1].maxhp);

// Make choices - participants will likely faint
battle.makeChoices('move tackle, move tackle', 'move waterfall');

console.log('\nAfter Turn 1 (with revival):');
console.log('Pidgey fainted?', battle.p1.pokemon[0].fainted, '- HP:', battle.p1.pokemon[0].hp);
console.log('Rattata fainted?', battle.p1.pokemon[1].fainted, '- HP:', battle.p1.pokemon[1].hp);
console.log('(Note: If any participant survived, fainted ones will be revived at 50% HP)');
}

// Run examples
console.log('\n╔════════════════════════════════════════════╗');
console.log('║  Cobblemon Raid Den Battle Examples       ║');
console.log('╚════════════════════════════════════════════╝');

try {
example1();
example2();
example3();

console.log('\n✅ Examples completed successfully!\n');
} catch (error) {
console.error('Error running examples:', error.message);
console.error(error.stack);
}

'use strict';

const assert = require('./../../assert');
const common = require('./../../common');

let battle;

describe('Raid Den', function () {
	afterEach(function () {
		battle.destroy();
	});

	it(`should support basic raid den mechanics`, function () {
		battle = common.createBattle({formatid: 'cobblemonraidden'}, [[
			{species: 'pikachu', moves: ['tackle', 'thundershock']},
		], [
			{species: 'snorlax', moves: ['tackle', 'bodyslam', 'rest', 'snore']},
		]]);
		
		// Boss (p2) should be able to make moves
		// Participants (p1) should be able to make moves
		battle.makeChoices('move tackle', 'move tackle');
		assert.equal(battle.turn, 2);
	});

	it(`should heal boss status after each turn`, function () {
		battle = common.createBattle({formatid: 'cobblemonraidden'}, [[
			{species: 'pikachu', moves: ['thunderwave', 'tackle']},
		], [
			{species: 'snorlax', moves: ['tackle', 'bodyslam']},
		]]);
		
		battle.makeChoices('move thunderwave', 'move tackle');
		// Boss should be paralyzed after turn 1
		assert.strictEqual(battle.p2.active[0].status, 'par');
		
		// After residual, boss status should be cleared
		battle.makeChoices('move tackle', 'move tackle');
		assert.strictEqual(battle.p2.active[0].status, '');
	});

	it(`should reset boss stat debuffs after each turn`, function () {
		battle = common.createBattle({formatid: 'cobblemonraidden'}, [[
			{species: 'pikachu', moves: ['growl', 'tackle']},
		], [
			{species: 'snorlax', moves: ['tackle', 'bodyslam']},
		]]);
		
		battle.makeChoices('move growl', 'move tackle');
		// Boss attack should be lowered after turn 1
		assert.strictEqual(battle.p2.active[0].boosts.atk, -1);
		
		// After residual, boss debuff should be cleared
		battle.makeChoices('move tackle', 'move tackle');
		assert.strictEqual(battle.p2.active[0].boosts.atk, 0);
	});

	it(`should reset participant stat buffs after each turn`, function () {
		battle = common.createBattle({formatid: 'cobblemonraidden'}, [[
			{species: 'pikachu', moves: ['swordsdance', 'tackle']},
		], [
			{species: 'snorlax', moves: ['tackle', 'bodyslam']},
		]]);
		
		battle.makeChoices('move swordsdance', 'move tackle');
		// Participant attack should be raised after turn 1
		assert.strictEqual(battle.p1.active[0].boosts.atk, 2);
		
		// After residual, participant buff should be cleared
		battle.makeChoices('move tackle', 'move tackle');
		assert.strictEqual(battle.p1.active[0].boosts.atk, 0);
	});

	it(`should end battle when boss faints`, function () {
		battle = common.createBattle({formatid: 'cobblemonraidden'}, [[
			{species: 'pikachu', level: 100, moves: ['thunderbolt']},
		], [
			{species: 'pidgey', level: 1, moves: ['tackle']},
		]]);
		
		battle.makeChoices('move thunderbolt', 'move tackle');
		// Boss should faint and participants should win
		assert.fainted(battle.p2.active[0]);
		assert(battle.ended);
	});

	it(`should end battle when all participants faint`, function () {
		battle = common.createBattle({formatid: 'cobblemonraidden'}, [[
			{species: 'pidgey', level: 1, moves: ['tackle']},
		], [
			{species: 'snorlax', level: 100, moves: ['bodyslam']},
		]]);
		
		battle.makeChoices('move tackle', 'move bodyslam');
		// Participant should faint and boss should win
		assert.fainted(battle.p1.active[0]);
		assert(battle.ended);
	});

	it(`should end battle after max turns`, function () {
		battle = common.createBattle({formatid: 'cobblemonraidden'}, [[
			{species: 'blissey', level: 100, moves: ['softboiled']},
		], [
			{species: 'blissey', level: 100, moves: ['softboiled']},
		]]);
		
		// Run for 10 turns (max turns)
		for (let i = 0; i < 10; i++) {
			battle.makeChoices('move softboiled', 'move softboiled');
		}
		
		// Battle should end after max turns
		assert(battle.ended);
		assert.strictEqual(battle.winner, battle.p2.name);
	});
});

'use strict';

const assert = require('./../../assert');
const common = require('./../../common');

let battle;

describe('Free-for-all', function () {
	afterEach(function () {
		battle.destroy();
	});

	it(`should support forfeiting`, function () {
		battle = common.createBattle({gameType: 'freeforall'}, [[
			{species: 'wynaut', moves: ['vitalthrow']},
		], [
			{species: 'scyther', moves: ['sleeptalk']},
		], [
			{species: 'scyther', moves: ['sleeptalk', 'uturn']},
			{species: 'wynaut', moves: ['vitalthrow']},
		], [
			{species: 'scyther', moves: ['sleeptalk']},
		]]);
		battle.makeChoices();
		battle.lose('p2');
		assert(battle.p2.activeRequest.wait);
		battle.makeChoices('auto', '', 'move uturn', 'auto');
		battle.lose('p3');
		battle.makeChoices();
		assert.equal(battle.turn, 4);
	});
});

describe('N-Player Free-for-all', function () {
	afterEach(function () {
		battle.destroy();
	});

	it(`should support 6 players each with one active pokemon`, function () {
		battle = common.createBattle({formatid: 'cobblemon6playerfreeforall'}, [[
			{species: 'wynaut', moves: ['splash']},
		], [
			{species: 'wynaut', moves: ['splash']},
		], [
			{species: 'wynaut', moves: ['splash']},
		], [
			{species: 'wynaut', moves: ['splash']},
		], [
			{species: 'wynaut', moves: ['splash']},
		], [
			{species: 'wynaut', moves: ['splash']},
		]]);
		assert.equal(battle.sides.length, 6);
		assert.equal(battle.p1.active.length, 1);
		assert.equal(battle.p6.active.length, 1);
		battle.makeChoices('move 1', 'move 1', 'move 1', 'move 1', 'move 1', 'move 1');
		assert.equal(battle.turn, 2);
	});

	it(`should support 5 players each with one active pokemon`, function () {
		battle = common.createBattle({formatid: 'cobblemon5playerfreeforall'}, [[
			{species: 'wynaut', moves: ['splash']},
		], [
			{species: 'wynaut', moves: ['splash']},
		], [
			{species: 'wynaut', moves: ['splash']},
		], [
			{species: 'wynaut', moves: ['splash']},
		], [
			{species: 'wynaut', moves: ['splash']},
		]]);
		assert.equal(battle.sides.length, 5);
		assert.equal(battle.p5.active.length, 1);
		battle.makeChoices('move 1', 'move 1', 'move 1', 'move 1', 'move 1');
		assert.equal(battle.turn, 2);
	});

	it(`should win when only one player has pokemon remaining`, function () {
		battle = common.createBattle({formatid: 'cobblemon6playerfreeforall'}, [[
			{species: 'shedinja', moves: ['splash']},
		], [
			{species: 'wynaut', moves: ['vitalthrow']},
		], [
			{species: 'wynaut', moves: ['vitalthrow']},
		], [
			{species: 'wynaut', moves: ['vitalthrow']},
		], [
			{species: 'wynaut', moves: ['vitalthrow']},
		], [
			{species: 'wynaut', moves: ['vitalthrow']},
		]]);
		battle.lose('p2');
		battle.lose('p3');
		battle.lose('p4');
		battle.lose('p5');
		battle.lose('p6');
		assert(battle.ended);
		assert.equal(battle.winner, 'Player 1');
	});
});

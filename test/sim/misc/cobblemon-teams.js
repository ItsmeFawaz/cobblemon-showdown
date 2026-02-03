'use strict';

const assert = require('./../../assert');
const {Teams} = require('./../../../dist/sim');

describe('Cobblemon Teams Pack/Unpack', function () {
it('should pack and unpack teams with Cobblemon fields', function () {
const team = [
{
name: "Pikachu",
species: "Pikachu",
uuid: "test-uuid-123",
currentHealth: 100,
status: "par",
statusDuration: 3,
item: "Light Ball",
ability: "Static",
moves: ["Thunderbolt", "Quick Attack", "Iron Tail", "Volt Tackle"],
movesInfo: [
{pp: 15, maxPp: 15},
{pp: 30, maxPp: 30},
{pp: 15, maxPp: 15},
{pp: 15, maxPp: 15}
],
nature: "Jolly",
evs: {hp: 252, atk: 252, def: 0, spa: 0, spd: 4, spe: 0},
ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
gender: "M",
level: 50,
shiny: false,
happiness: 255
}
];

const packed = Teams.pack(team);
const unpacked = Teams.unpack(packed);

assert.equal(unpacked[0].uuid, team[0].uuid);
assert.equal(unpacked[0].currentHealth, team[0].currentHealth);
assert.equal(unpacked[0].status, team[0].status);
assert.equal(unpacked[0].statusDuration, team[0].statusDuration);
assert.equal(unpacked[0].species, team[0].species);
assert.equal(unpacked[0].item, team[0].item);
assert.equal(unpacked[0].ability, team[0].ability);
assert.equal(unpacked[0].movesInfo.length, team[0].movesInfo.length);
assert.equal(unpacked[0].movesInfo[0].pp, team[0].movesInfo[0].pp);
assert.equal(unpacked[0].movesInfo[0].maxPp, team[0].movesInfo[0].maxPp);
});

it('should handle teams without Cobblemon fields', function () {
const team = [
{
name: "Charizard",
species: "Charizard",
item: "Leftovers",
ability: "Blaze",
moves: ["Flamethrower", "Air Slash", "Dragon Pulse", "Roost"],
nature: "Modest",
evs: {hp: 252, atk: 0, def: 0, spa: 252, spd: 4, spe: 0},
gender: "M",
level: 100
}
];

const packed = Teams.pack(team);
const unpacked = Teams.unpack(packed);

assert.equal(unpacked[0].uuid, "");
assert.equal(unpacked[0].status, "");
assert.equal(unpacked[0].species, team[0].species);
assert.equal(unpacked[0].item, team[0].item);
assert.equal(unpacked[0].ability, team[0].ability);
});

it('should maintain roundtrip consistency', function () {
const team = [
{
name: "Blastoise",
species: "Blastoise",
uuid: "uuid-003",
currentHealth: 200,
item: "Focus Sash",
ability: "Torrent",
moves: ["Surf", "Ice Beam", "Flash Cannon", "Rapid Spin"],
movesInfo: [
{pp: 15, maxPp: 15},
{pp: 10, maxPp: 10},
{pp: 10, maxPp: 10},
{pp: 40, maxPp: 40}
],
nature: "Timid",
evs: {hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252},
gender: "F",
level: 50,
shiny: true
}
];

const packed1 = Teams.pack(team);
const unpacked = Teams.unpack(packed1);
const packed2 = Teams.pack(unpacked);

assert.equal(packed1, packed2, 'Pack-unpack-repack should produce identical results');
});

it('should handle mixed teams with and without Cobblemon fields', function () {
const team = [
{
name: "Pikachu",
species: "Pikachu",
uuid: "uuid-001",
currentHealth: 100,
status: "par",
statusDuration: 3,
item: "Light Ball",
ability: "Static",
moves: ["Thunderbolt"],
movesInfo: [{pp: 15, maxPp: 15}],
nature: "Jolly",
evs: {hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4},
level: 50
},
{
name: "Charizard",
species: "Charizard",
item: "Leftovers",
ability: "Blaze",
moves: ["Flamethrower"],
nature: "Modest",
evs: {hp: 252, atk: 0, def: 0, spa: 252, spd: 4, spe: 0},
level: 100
}
];

const packed = Teams.pack(team);
const unpacked = Teams.unpack(packed);

assert.equal(unpacked.length, 2);
assert.equal(unpacked[0].uuid, "uuid-001");
assert.equal(unpacked[0].currentHealth, 100);
assert.equal(unpacked[1].uuid, "");
assert(isNaN(unpacked[1].currentHealth));
});
});

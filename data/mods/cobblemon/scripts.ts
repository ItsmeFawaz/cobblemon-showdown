export const Scripts: ModdedBattleScriptsData = {
inherit: 'base',

// Override runAction to handle raid den mechanics
runAction(action) {
const isRaidDen = !!this.formatData.raidDenConfig;

// Handle boss multiple moves
if (isRaidDen && action.choice === 'move' && action.pokemon?.side.id === 'p2') {
// This is the boss making a move
// Check if we need to queue additional moves
if (!this.formatData.raidDenBossMoveCount) {
// First move of the turn - decide how many moves total
const config = this.formatData.raidDenConfig;
this.formatData.raidDenBossMovesThisTurn = this.random(
config.bossMaxMoves - config.bossMinMoves + 1
) + config.bossMinMoves;
this.formatData.raidDenBossMoveCount = 0;
}

this.formatData.raidDenBossMoveCount++;

// Execute current move
const result = this.runAction.call(this, action);

// Check if we need more moves and if participants are still alive
if (this.formatData.raidDenBossMoveCount < this.formatData.raidDenBossMovesThisTurn) {
const participantsAlive = this.sides[0].active.filter((p: any) => p && !p.fainted);
if (participantsAlive.length > 0 && !action.pokemon.fainted) {
// Queue another boss move
const boss = action.pokemon;
const possibleMoves = boss.getMoves().filter((m: any) => !m.disabled);

if (possibleMoves.length > 0) {
const randomMove = this.sample(possibleMoves);
const targets = participantsAlive;
const randomTarget = this.sample(targets);

// Queue the next boss move
this.queue.unshift({
choice: 'move',
order: action.order,
priority: 0,
speed: boss.speed,
pokemon: boss,
targetLoc: randomTarget.getLocOf(boss),
moveid: randomMove.id,
} as any);
}
}
}

return result;
}

// Handle residual - clear statuses and boosts
if (isRaidDen && action.choice === 'residual') {
// Reset move counter for next turn
this.formatData.raidDenBossMoveCount = 0;
this.formatData.raidDenBossMovesThisTurn = 0;

// Execute normal residual
const result = this.runAction.call(this, action);

// Clear boss status conditions
for (const pokemon of this.sides[1].active) {
if (pokemon && !pokemon.fainted) {
if (pokemon.status) {
this.add('-curestatus', pokemon, pokemon.status, '[silent]');
pokemon.setStatus('');
this.add('-message', `${pokemon.name}'s status was healed!`);
}

// Reset boss stat debuffs (negative boosts)
let hasDebuffs = false;
const boosts: Partial<BoostsTable> = {};
for (const stat in pokemon.boosts) {
if (pokemon.boosts[stat as BoostID] < 0) {
boosts[stat as BoostID] = -pokemon.boosts[stat as BoostID];
hasDebuffs = true;
}
}
if (hasDebuffs) {
this.boost(boosts, pokemon);
this.add('-message', `${pokemon.name}'s stat drops were reset!`);
}
}
}

// Reset participant stat buffs (positive boosts)
for (const pokemon of this.sides[0].active) {
if (pokemon && !pokemon.fainted) {
let hasBuffs = false;
const boosts: Partial<BoostsTable> = {};
for (const stat in pokemon.boosts) {
if (pokemon.boosts[stat as BoostID] > 0) {
boosts[stat as BoostID] = -pokemon.boosts[stat as BoostID];
hasBuffs = true;
}
}
if (hasBuffs) {
this.boost(boosts, pokemon);
this.add('-message', `${pokemon.name}'s stat boosts were reset!`);
}
}
}

return result;
}

// Default behavior
return this.runAction.call(this, action);
},

// Override checkWin to handle raid den win conditions
checkWin(faintData) {
const isRaidDen = !!this.formatData.raidDenConfig;

if (isRaidDen) {
// Check if max turns reached
const config = this.formatData.raidDenConfig;
if (this.turn >= config.maxTurns) {
this.add('-message', `Max turns (${config.maxTurns}) reached! Boss wins!`);
this.win(this.sides[1]);
return true;
}

// Check if boss died
const bossAlive = this.sides[1].pokemon.some((p: any) => !p.fainted);
if (!bossAlive) {
this.add('-message', 'The raid boss has been defeated!');
this.win(this.sides[0]);
return true;
}

// Check if all participants died in this turn
const participantsAlive = this.sides[0].active.filter((p: any) => p && !p.fainted).length;
if (participantsAlive === 0 && this.sides[0].pokemon.every((p: any) => p.fainted)) {
this.add('-message', 'All participants have fainted! Boss wins!');
this.win(this.sides[1]);
return true;
}
}

// Call parent checkWin
return this.checkWin.call(this, faintData);
},
};

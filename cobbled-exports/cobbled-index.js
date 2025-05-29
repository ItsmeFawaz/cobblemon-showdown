/*
 * Copyright (C) 2023 Cobblemon Contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*-----------------------------------------------------------------------------------------------------------------
NOTE: The functions in this file are used by GraalShowdownService, the default Showdown environment for Cobblemon.
For the corresponding SocketShowdownService methods, see cobbled-debug-server.ts. For where the interface is 
defined and configured, See ShowdownService.kt on the  main Cobblemon repo .
-----------------------------------------------------------------------------------------------------------------*/

// eslint-disable-next-line strict
const BS = require('./sim/battle-stream');
const Dex = require('./sim/dex').Dex;
const Cobblemon = require('./sim/cobblemon/cobblemon').Cobblemon

const battleMap = new Map();
const toID = Dex.toID;

function startBattle(graalShowdown, battleId, requestMessages) {
	const battleStream = new BS.BattleStream();
	battleMap.set(battleId, battleStream);

	// Join messages with new line
	try {
		for (const element of requestMessages) {
			battleStream.write(element);
		}
	} catch (err) {
		graalShowdown.log(err.stack);
	}

	// Any battle output then gets written to the execution helper logging mechanism
	(async () => {
		for await (const output of battleStream) {
			graalShowdown.sendFromShowdown(battleId, output);
		}
	})();
}

function sendBattleMessage(battleId, messages) {
	const battleStream = battleMap.get(battleId);
	for (const element of messages) {
		battleStream.write(element);
	}
}

function getAbilityIds() {
	let combined = Array.from(Dex.mod(Cobblemon.modId).abilities.all());
		Cobblemon.abilityRegistry.contents.forEach((ability, id) => {
			let existing = combined.find((_ability) => _ability.id == id);
			if (existing) {
				combined[combined.indexOf(existing)] = ability;
			} else {
				combined.push(ability);
			}
		});
	return JSON.stringify(combined.map(ability => ability.id));
}

function getHeldItemIds() {
	return JSON.stringify(Dex.mod(Cobblemon.modId).items.all().map(item => item.id));
}

function getMoves() {
	let combined = Array.from(Dex.mod(Cobblemon.modId).moves.all());
	Cobblemon.moveRegistry.contents.forEach((move, id) => {
		let existing = combined.find((_move) => _move.id == id);
		if (existing) {
			combined[combined.indexOf(existing)] = move;
		} else {
			combined.push(move);
		}
	});
	const payload = JSON.stringify(combined);
	return payload;
}

function getTypeChart() {
	return JSON.stringify(Dex.data.TypeChart);
}

function receiveAbilityData(abilityId, ability) {
	Cobblemon.abilityRegistry.register(ability, toID(abilityId));
}

function receiveBagItemData(itemId, bagItem) {
	Cobblemon.bagItemRegistry.register(bagItem, toID(itemId));
}

function receiveHeldItemData(itemId, heldItem) {
	Cobblemon.heldItemRegistry.register(heldItem, toID(itemId));
}

function receiveMoveData(moveId, move) {
	Cobblemon.moveRegistry.register(move, toID(moveId));
}

function receiveSpeciesData(speciesArray) {
	Cobblemon.speciesRegistry.reset();
	speciesArray.forEach((speciesJson) => {
		const speciesData = JSON.parse(speciesJson);
		Cobblemon.speciesRegistry.register(speciesData);
	});
}

function afterSpeciesInit() {
	Dex.modsLoaded = false;
	Dex.includeMods();
}


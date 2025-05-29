import {BattleStream} from "../battle-stream";
import {Dex} from "../dex";
import * as Net from "net";

const toID = Dex.toID
import { Species } from "../dex-species";
import { Cobblemon } from "./cobblemon";

/*-----------------------------------------------------------------------------------------------------------------
NOTE: The functions in this file are used by SocketShowdownService, the debug/remote Showdown environment. For the
corresponding GraalShowdownService methods, see cobbled-index.js in this repo. 
See ShowdownService.kt for where the interface is defined and configured on the main Cobblemon repo.
-----------------------------------------------------------------------------------------------------------------*/

export function startServer(port: number): void {
	const server = Net.createServer();
	const battleMap = new Map<string, BattleStream>();

	server.listen(port, () => {
		console.log('Server listening for connection requests on socket localhost: ' + port);
	});

	server.on('connection', socket => onConnection(socket, battleMap));
}

function onData(socket: Net.Socket, chunk: Buffer, battleMap: Map<string, BattleStream>) {
	const data = chunk.toString();
	const lines = data.split('\n');
	lines.forEach(line => {
		console.log('Data received from client: ' + line.toString());
		if (line.startsWith('>startbattle')) {
			const battleId = line.split(' ')[1];
			battleMap.set(battleId, new BattleStream());
			socket.write('ACK');
		} else if (line.startsWith('>receiveAbilityData')) {
			const abilityId = line.split(' ')[1]
			try {
				var content = line.slice(line.indexOf(abilityId) + abilityId.length + 1);
				Cobblemon.abilityRegistry.register(content, toID(abilityId));
				socket.write('ACK');
			} catch (e) {
				console.error(e);
				socket.write('ERR')
			}
		} else if (line.startsWith('>receiveBagItemData')) {
			const itemId = line.split(' ')[1]
			try {
				var content = line.slice(line.indexOf(itemId) + itemId.length + 1);
				Cobblemon.bagItemRegistry.register(content, toID(itemId));
				socket.write('ACK');
			} catch (e) {
				console.error(e);
				socket.write('ERR')
			} 
		} else if (line.startsWith('>receiveHeldItemData')) { // TODO: mod-side implementation
			const itemId = line.split(' ')[1]
			try {
				var content = line.slice(line.indexOf(itemId) + itemId.length + 1);
				Cobblemon.heldItemRegistry.register(content, toID(itemId));
				socket.write('ACK');
			} catch (e) {
				console.error(e);
				socket.write('ERR')
			}
		} else if (line.startsWith('>receiveMoveData')) {
			const moveId = line.split(' ')[1]
			try {
				var content = line.slice(line.indexOf(moveId) + moveId.length + 1);
				Cobblemon.moveRegistry.register(content, toID(moveId));
				socket.write('ACK');
			} catch (e) {
				console.error(e);
				socket.write('ERR')
			}
		} else if (line === '>getMoves') {
			getMoves(socket);
		} else if (line === '>getAbilityIds') {
			getAbilityIds(socket);
		} else if (line === '>getHeldItemIds') {
			getHeldItemIds(socket);
		} else if (line === '>getTypeChart') {
			getTypeChart(socket)
		} else if (line === '>resetSpeciesData') {
			Cobblemon.speciesRegistry.reset();
			socket.write('ACK');
		} else if (line.startsWith('>receiveSpeciesData')) {
			const speciesJson = line.replace(`>receiveSpeciesData `, '');
			const species = JSON.parse(speciesJson) as Species;
			Cobblemon.speciesRegistry.register(species);
			socket.write('ACK');
		} else if (line === '>afterSpeciesInit') {
			afterSpeciesInit();
			socket.write('ACK');
		} else {
			const [battleId, showdownMsg] = line.split('~');
			const battleStream = battleMap.get(battleId);
			if (battleStream) {
				try {
					void battleStream.write(showdownMsg);
				} catch (err: any) {
					console.error(err.stack);
				}

				writeBattleOutput(socket, battleStream);
			}
		}
	});
}

function writeBattleOutput(socket: Net.Socket, battleStream: BattleStream) {
	const messages = battleStream.buf;
	if (messages.length !== 0) {
		socket.write(padNumber(messages.length, 8));
		for (const message of messages) {
			socket.write(padNumber(message.length, 8) + message);
		}
	} else {
		writeVoid(socket);
	}
	battleStream.buf = [];
}

function writeVoid(socket: Net.Socket) {
	socket.write('00000000');
}

function onConnection(socket: Net.Socket, battleMap: Map<string, BattleStream>) {
	socket.on('data', (chunk) => {
		try {
			onData(socket, chunk, battleMap);
		} catch (error) {
			console.error(error);
		}
	});
	socket.on('end', () => console.log('Closing connection with the client'));
	socket.on('error', (err) => console.error(err.stack));
}

function getMoves(socket: Net.Socket) {
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
	socket.write(padNumber(payload.length, 8) + payload);
}

function getAbilityIds(socket: Net.Socket) {
	let combined = Array.from(Dex.mod(Cobblemon.modId).abilities.all());
	Cobblemon.abilityRegistry.contents.forEach((ability, id) => {
		let existing = combined.find((_ability) => _ability.id == id);
		if (existing) {
			combined[combined.indexOf(existing)] = ability;
		} else {
			combined.push(ability);
		}
	});
	const payload = JSON.stringify(combined.map(ability => ability.id));
	socket.write(padNumber(payload.length, 8) + payload);
}

function getHeldItemIds(socket: Net.Socket) {
	const payload = JSON.stringify(Dex.mod(Cobblemon.modId).items.all().map(item => item.id));
	socket.write(padNumber(payload.length, 8) + payload);
}

function getTypeChart(socket: Net.Socket) {
	const payload = JSON.stringify(Dex.data.TypeChart);
	socket.write(padNumber(payload.length, 8) + payload);
}

function afterSpeciesInit() {
	Dex.modsLoaded = false;
	Dex.includeMods();
}

function padNumber(num: number, size: number): string {
	let numStr = num.toString();
	while (numStr.length < size) numStr = "0" + numStr;
	return numStr;
}


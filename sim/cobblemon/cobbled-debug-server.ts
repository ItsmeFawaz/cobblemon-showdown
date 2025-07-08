import {BattleStream} from "../battle-stream";
import {Dex, toID} from "../dex";
import * as Net from "net";
import {Cobblemon} from "./cobblemon";

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
        console.log('Data received from client: ' + line);
        const parts = line.split(' ');
        const command = parts[0];

        switch (command) {
            case '>startbattle': {
                const battleId = parts[1];
                if (battleId) {
                    battleMap.set(battleId, new BattleStream());
                    socket.write('ACK');
                } else {
                    console.error("Command '>startbattle' requires a battleId.");
                    socket.write('ERR');
                }
                break;
            }
            case '>receiveData': {
				const type = parts[1];
                const registry = Cobblemon.getRegistry(type);
                try {
					if (!registry) throw new Error();

                    const data = line.substring(command.length + type.length + 2);
					const obj = () => { 
						try { return JSON.parse(data); } 
						catch { return eval(`(${data})`); }
					};
                    for (const [key, value] of Object.entries(obj())) {
    					registry.register(value as any, toID(key));
					};
					registry.invalidate();

                    socket.write('ACK');
                } catch (e) {
                    console.error(`Error processing >receiveData for type ${type}:`, e);
                    socket.write('ERR');
                }
                break;
            }
			case '>receiveEntry': {
				const type = parts[1];
                const registry = Cobblemon.getRegistry(type);
                try {
					if (!registry) throw new Error();

                    const data = line.substring(command.length + type.length + 2);
					const obj = () => { 
						try { return JSON.parse(data); } 
						catch { return eval(`(${data})`); }
					};
    				registry.register(obj());
					registry.invalidate();

                    socket.write('ACK');
                } catch (e) {
                    console.error(`Error processing >receiveData for type ${type}:`, e);
                    socket.write('ERR');
                }
                break;
            }
			case '>getData': {
				const type = parts[1];
				var registry = Cobblemon.getRegistry(type);
				try {
					if (!registry) throw new Error();

					const payload = JSON.stringify(registry.all());
					socket.write(padNumber(payload.length, 16) + payload);
				} catch (e) {
					console.error(`Error processing >receiveData for type ${type}:`, e);
                    socket.write('ERR');
				}

				break;
			}
			case '>resetAll': {
				for (const key of Cobblemon.registryKeys) {
					Cobblemon.registries[key].reset();
				}
			}
			case '>resetData': {
				const type = parts[1];
				var registry = Cobblemon.getRegistry(type);

                try {
					if (!registry) throw new Error();
					
					registry.reset();
					socket.write('ACK');
				} catch (e) {
					console.error(`Invalid registry type for >getData: ${type}`);
                    socket.write('ERR');
				}

				break;
			}
			case '>getTypeChart': {
				const payload = JSON.stringify(Dex.data.TypeChart);
				socket.write(padNumber(payload.length, 8) + payload);
                break;
			}
			case '>afterSpeciesInit': {
				Dex.modsLoaded = false;
				Dex.includeMods();
                socket.write('ACK');
				break;
			}
            default: {
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

                break;
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

function padNumber(num: number, size: number): string {
	let numStr = num.toString();
	while (numStr.length < size) numStr = "0" + numStr;
	return numStr;
}


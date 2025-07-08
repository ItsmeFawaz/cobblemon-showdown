import * as Reg from "./registries";

export namespace Cobblemon {
	export const modId = "cobblemon";
	type RegistryKey = typeof registryKeys[number];
	export const registryKeys = ["ability", "bagItem", "heldItem", "move", "species"] as const;
	export const registries = {
		ability: new Reg.AbilityRegistry(),
		bagItem: new Reg.BagItemRegistry(),
		heldItem: new Reg.HeldItemRegistry(),
		move: new Reg.MoveRegistry(),
		species: new Reg.SpeciesRegistry()
	};

	export function getRegistry(key: string): Reg.CobbleRegistry<any> | undefined {
		if (registryKeys.includes(key as RegistryKey)) {
			return registries[key as RegistryKey];
		}
		return undefined;
	}
}


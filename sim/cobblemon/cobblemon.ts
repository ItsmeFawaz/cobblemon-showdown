import { AbilityRegistry, BagItemRegistry, HeldItemRegistry, MoveRegistry, SpeciesRegistry } from "./registries";

export const Cobblemon = {
	modId: 'cobblemon',
	abilityRegistry: new AbilityRegistry(),
	bagItemRegistry: new BagItemRegistry(),
	heldItemRegistry: new HeldItemRegistry(),
	moveRegistry: new MoveRegistry(),
	speciesRegistry: new SpeciesRegistry()	
}

/**
 * This exists mainly as a way to avoid boilerplate for data handlers between Showdown and Cobblemon and so we can extend in the future if needed.
 * Be sure to check cobblemon.ts for the related data if you add/remove any registries.
 */

import {Ability} from "../dex-abilities";
import {BagItem} from "./bag-item";
import {DataMove, Move} from "../dex-moves";
import {Species} from "../dex-species";
import {Dex} from "../dex";
import {Cobblemon} from "./cobblemon";

export abstract class CobbleRegistry<T> {
	contents: Map<ID, T> = new Map<ID, T>();
	all(): readonly T[] { return Array.from(this.contents.values()); }
	get(id: ID): T | undefined { return this.contents.get(id); }
	has(id: ID): boolean { return this.contents.has(id); }
	reset() { this.contents.clear(); this.invalidate(); }

	/**
	 * The main function used to handle incoming data and prepare it for registration.
	 * @param data The raw data to be coaxed into T inside the function.
	 * @param _id Optional manual ID in case the data doesn't have one. Underscored because 'id' is often what we need to set.
	 */
	abstract register(data: AnyObject, _id?: ID): T;

	/**
	 * Nullifies/mark dirty any additional caches etc. while keeping any Cobblemon-registered data intact.
	 * This allows entries to be registered in multiple commands without erasing existing entries. This is automatically run by the reset command as well.
	 * Mainly for use with Dex-related "allCache" stores. If the registry doesn't have any Showdown-side data to reset (e.g. bag items) then simply return.
	 */
	abstract invalidate(): void;
}

export interface Registries {
	ability: AbilityRegistry;
	bagItem: BagItemRegistry;
	heldItem: HeldItemRegistry;
	move: MoveRegistry;
	species: SpeciesRegistry;
}

export class AbilityRegistry extends CobbleRegistry<Ability> {
	override all() { return Dex.mod(Cobblemon.modId).abilities.all(); }
	invalidate() { Dex.mod(Cobblemon.modId).abilities.allCache = null; }
	register(data: AnyObject, _id: ID) {
		const raw = data as Mutable<Ability>;
		raw.id = _id;
		const abilityObj = new Ability(raw);
		this.contents.set(_id, abilityObj);
		return abilityObj;
	}
}

export class BagItemRegistry extends CobbleRegistry<BagItem> {
	invalidate() { return; }
	register(data: AnyObject, _id: ID) {
		const script = data as BagItem;
		this.contents.set(_id, script);
		return script;
	}
}

// TODO: cobblemon-side implementation for datapacks etc.
export class HeldItemRegistry extends CobbleRegistry<Item> {
	override all() { return Dex.mod(Cobblemon.modId).items.all(); }
	invalidate() { Dex.mod(Cobblemon.modId).items.allCache = null; }
	register(data: AnyObject, _id: ID) {
		const raw = data as Mutable<Item>;
		raw.id = _id;
		const itemObj = raw as Item;
		this.contents.set(_id, itemObj);
		return itemObj;
	}
}

export class MoveRegistry extends CobbleRegistry<Move> {
	override all() { return Dex.mod(Cobblemon.modId).moves.all(); }
	invalidate() { Dex.mod(Cobblemon.modId).moves.allCache = null; }
	register(data: AnyObject, _id: ID) {
		const raw = data as Mutable<Move>;
		raw.id = _id;
		const moveObj = new DataMove(raw);
		this.contents.set(_id, moveObj);
		return moveObj;
	}
}

export class SpeciesRegistry extends CobbleRegistry<Species> {
	override all() { return Dex.mod(Cobblemon.modId).species.all(); }
	invalidate() { Dex.mod(Cobblemon.modId).species.allCache = null; }
	register(data: AnyObject): Species {
		const species = new Species(data);
		this.contents.set(species.id, species);
		return species;
	}
}


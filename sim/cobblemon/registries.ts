/**
 * This exists mainly as a way to avoid boilerplate for data handlers between Showdown and Cobblemon and so we can extend in the future if needed.
 */

import { Ability } from "../dex-abilities";
import { BagItem } from "./bag-item";
import { DataMove, Move } from "../dex-moves";
import { Species } from "../dex-species";

export abstract class CobbleRegistry<T> {
	contents: Map<ID, T> = new Map<ID, T>();

	all(): T[] { return Array.from(this.contents.values()); }
	get(id: ID): T | undefined { return this.contents.get(id); }
	has(id: ID): boolean { return this.contents.has(id); }
	reset() { this.contents.clear(); }

	/**
	 * The main function used to handle incoming data and prepare it for registration.
	 * @param data The raw data to be coaxed into T inside the function.
	 * @param _id Optional manual ID in case the data doesn't have one. Underscored because 'id' is often what we need to set.
	 */
	abstract register(data: AnyObject, _id?: ID): T;
}

export class AbilityRegistry extends CobbleRegistry<Ability> {
	register(data: String, _id: ID) {
		const raw = eval(`(${data})`) as Mutable<Ability>;
		raw.id = _id;
		raw.exists = true;
		const abilityObj = new Ability(raw);
		this.contents.set(_id, abilityObj);
		return abilityObj;
	}
}

export class BagItemRegistry extends CobbleRegistry<BagItem> {
	register(data: String, _id: ID) {
		const script = eval(`(${data})`);
		this.contents.set(_id, script);
		return script;
	}
}

// TODO: cobblemon-side implementation
export class HeldItemRegistry extends CobbleRegistry<Item> {
	register(data: String, _id: ID) {
		const raw = eval(`(${data})`) as Mutable<Item>;
		raw.id = _id;
		raw.exists = true;
		const itemObj = raw as Item;
		this.contents.set(_id, itemObj);
		return itemObj;
	}
}

export class MoveRegistry extends CobbleRegistry<Move> {
	register(data: String, _id: ID) {
		const raw = eval(`(${data})`) as Mutable<Move>;
		raw.id = _id;
		raw.exists = true;
		const moveObj = new DataMove(raw);
		this.contents.set(_id, moveObj);
		return moveObj;
	}
}

export class SpeciesRegistry extends CobbleRegistry<Species> {
	register(data: AnyObject): Species {
		const species = new Species(data);
		this.contents.set(species.id, species);
		return species;
	}
}


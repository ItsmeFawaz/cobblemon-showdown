import { Pokemon } from "../pokemon";

export interface BagItem {
	use: (battle: Battle, pokemon: Pokemon, itemId: string, data: string[]) => void;
};


export const Formats: FormatList = [

	{
		section: "Cobblemon",
	},
	{
		name: "Cobblemon Singles",
		threads: [],

		mod: 'cobblemon',
		ruleset: [],
		gameType: "singles"
	},
	{
		name: "Cobblemon Doubles",
		threads: [],

		mod: 'cobblemon',
		ruleset: [],
		gameType: "doubles"
	},
	{
		name: "Cobblemon Triples",
		threads: [],

		mod: 'cobblemon',
		ruleset: [],
		gameType: "triples"
	},
	{
		name: "Cobblemon Rotation",
		threads: [],

		mod: 'cobblemon',
		ruleset: [],
		gameType: "rotation"
	},
	{
		name: "Cobblemon Multi",
		threads: [],

		mod: 'cobblemon',
		ruleset: [],
		gameType: "multi"
	},
	{
		name: "Cobblemon Free for All",
		threads: [],

		mod: 'cobblemon',
		ruleset: [],
		gameType: "freeforall"
	},
	{
		name: "Cobblemon Raid",
		threads: [],
		desc: `5 challengers each bring 1 Pokémon to defeat a powerful Raid Boss. ` +
			`The boss makes 2-4 moves per round. Fainted challengers are revived each round. ` +
			`The boss wins only if all 5 challengers faint in the same round.`,

		mod: 'cobblemon',
		gameType: 'raid',
		ruleset: ['Cobblemon Raid Rule'],

		// Override the standard win condition so that player Pokémon fainting mid-round
		// does NOT immediately end the battle.  The raid ruleset's onResidual handler
		// performs the real check and heals fainted players at the end of every round.
		battle: {
			checkWin(faintData?: Battle['faintQueue'][0]) {
				// Boss side has exactly 1 active slot; challenger side has 5.
				const bossSide = this.sides.find(s => s.active.length === 1);
				const challengerSide = this.sides.find(s => s.active.length > 1);
				// Players win immediately if the boss faints.
				if (bossSide && !bossSide.pokemonLeft) {
					this.win(challengerSide!);
					return true;
				}
				// Challenger win-loss is handled in onResidual; suppress the
				// default "all on one side fainted → other side wins" check.
				return undefined;
			},
		},
	},
];

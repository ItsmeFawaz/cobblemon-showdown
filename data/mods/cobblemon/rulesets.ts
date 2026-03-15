export const Rulesets: {[k: string]: FormatData} = {

	cobblemonraidrule: {
		effectType: 'ValidatorRule',
		name: 'Cobblemon Raid Rule',
		desc: "Rules for Cobblemon Raid battles: 1 boss vs 5 player Pokémon.",

		/**
		 * Overrides the battle's win-condition logic so that player Pokémon fainting
		 * mid-round does NOT immediately trigger a boss victory.  Instead, the real
		 * end-of-round check is done inside onResidual (which also revives challengers).
		 *
		 * This fires for EVERY way the format can be specified — registered formatid,
		 * nested `format` object, or flat top-level `>start` properties — because
		 * onBegin is called unconditionally for every active ruleset entry.
		 */
		onBegin() {
			if (this.gameType !== 'raid') return;
			// Use the same Object.assign pattern as format.battle in custom-formats.ts so
			// the override is typed via ModdedBattleScriptsData rather than AnyObject.
			Object.assign(this, {
				checkWin(this: Battle) {
					// Challengers win immediately if the boss faints.
					if (!this.sides[0].pokemonLeft) {
						this.win(this.sides[1]);
						return true as const;
					}
					// Challenger faint/revive is handled by onResidual; suppress the
					// default "all on one side fainted → other side wins" logic.
					return undefined;
				},
			} as ModdedBattleScriptsData);
		},

		/**
		 * Runs once per active Pokémon at the start of each turn (BeforeTurn event).
		 *
		 * - Resets the per-turn residual-done guard (using the boss Pokémon's event so it
		 *   fires exactly once before the boss's own move is chosen).
		 * - For the boss Pokémon only: injects 1-3 extra move actions so the boss makes
		 *   2-4 moves per round in total.
		 */
		onBeforeTurn(pokemon: Pokemon) {
			if (this.gameType !== 'raid') return;

			// Reset the end-of-round guard when we see the boss's BeforeTurn event.
			if (pokemon.side.n === 0) {
				(this.formatData as AnyObject).raidResidualDone = false;
			}

			// Only inject extra moves for the boss Pokémon.
			if (pokemon.side.n !== 0) return;
			if (pokemon.fainted || !pokemon.hp) return;

			const playerActives = this.sides[1].active.filter(
				(p): p is Pokemon => !!(p && !p.fainted && p.hp)
			);
			if (!playerActives.length) return;

			// Add 1–3 extra boss moves so the boss uses 2–4 moves per round total.
			// this.random(1, 4) returns an integer in [1, 4) → 1, 2, or 3 extra moves.
			const extraCount = this.random(1, 4);
			for (let i = 0; i < extraCount; i++) {
				const validMoves = pokemon.moveSlots.filter(slot => slot.pp > 0);
				if (!validMoves.length) break;
				const moveSlot = this.sample(validMoves);
				const move = this.dex.getActiveMove(moveSlot.id);
				const target = this.sample(playerActives);
				this.queue.insertChoice({
					choice: 'move',
					pokemon,
					move,
					targetLoc: pokemon.getLocOf(target),
				}, true);
			}
		},

		/**
		 * Runs once per active Pokémon during the residual (end-of-turn) phase.
		 * A guard flag prevents the raid-specific logic from executing more than once
		 * per turn.
		 *
		 * End-of-round effects applied here:
		 *  1. Any status condition on the boss is cured.
		 *  2. Negative stat stages on the boss are reset to 0.
		 *  3. Positive stat stages on each player Pokémon are reset to 0.
		 *  4. If every player Pokémon has fainted this round → boss wins.
		 *  5. Otherwise, all fainted player Pokémon are fully revived.
		 */
		onResidualOrder: 29, // run after most per-Pokémon residuals (orders 1-28)
		onResidual(target: Pokemon) {
			if (this.gameType !== 'raid') return;
			// Guard: only run the end-of-round logic once per turn.
			if ((this.formatData as AnyObject).raidResidualDone) return;
			(this.formatData as AnyObject).raidResidualDone = true;

			const bossSide = this.sides[0];
			const playerSide = this.sides[1];
			const boss = bossSide.active[0];

			// --- 1 & 2: Status / negative-boost reset on the boss ---
			if (boss && !boss.fainted && boss.hp) {
				if (boss.status) {
					this.add('-message', 'The Raid Boss shook off its status condition!');
					this.add('-curestatus', boss, boss.status, '[from] Raid');
					boss.setStatus('');
				}
				let debuffCleared = false;
				for (const stat of Object.keys(boss.boosts) as BoostID[]) {
					if ((boss.boosts[stat] as number) < 0) {
						(boss.boosts[stat] as number) = 0;
						debuffCleared = true;
					}
				}
				if (debuffCleared) {
					this.add('-message', 'The Raid Boss cleared its negative stat changes!');
					this.add('-clearnegativeboost', boss, '[from] Raid');
				}
			}

			// --- 3: Positive-boost reset on all player Pokémon ---
			for (const player of playerSide.active) {
				if (!player || player.fainted || !player.hp) continue;
				let buffCleared = false;
				for (const stat of Object.keys(player.boosts) as BoostID[]) {
					if ((player.boosts[stat] as number) > 0) {
						(player.boosts[stat] as number) = 0;
						buffCleared = true;
					}
				}
				if (buffCleared) {
					this.add('-message', `${player.name}'s stat boosts were reset by the Raid.`);
				}
			}

			// --- 4: Check if boss wins (all players fainted this round) ---
			const allPlayersFainted = playerSide.active.every(p => !p || p.fainted || !p.hp);
			if (allPlayersFainted) {
				if (!bossSide.pokemonLeft) {
					// Both sides downed simultaneously – call it a tie.
					this.win(null);
				} else {
					this.add('-message', 'All challengers have fainted! The Raid Boss wins!');
					this.win(bossSide);
				}
				return;
			}

			// --- 5: Revive all fainted player Pokémon at full HP ---
			for (const player of playerSide.active) {
				if (!player || !player.fainted) continue;
				playerSide.pokemonLeft++;
				player.fainted = false;
				player.faintQueued = false;
				player.subFainted = false;
				player.setStatus('');
				player.hp = player.maxhp;
				player.clearVolatile();
				this.add('-heal', player, player.getHealth, '[from] Raid Revival');
			}
		},
	},

};

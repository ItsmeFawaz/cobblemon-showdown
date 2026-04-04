# Cobblemon Raid Battle Format

This document is the authoritative reference for integrating the **Cobblemon Raid** battle format into a Cobblemon server.  It covers:

1. [Format overview](#1-format-overview)
2. [Field layout and Pokémon identifiers](#2-field-layout-and-pokémon-identifiers)
3. [Team format (Cobblemon packed format)](#3-team-format-cobblemon-packed-format)
4. [Starting a battle](#4-starting-a-battle)
5. [Submitting choices each turn](#5-submitting-choices-each-turn)
6. [Simulator output messages](#6-simulator-output-messages)
7. [Win conditions](#7-win-conditions)
8. [End-of-round automatic effects](#8-end-of-round-automatic-effects)
9. [Complete worked example](#9-complete-worked-example)

---

## 1. Format overview

The **Cobblemon Raid** format (`cobblemonraid`) pits **one Raid Boss player** against **five Challenger players**.
The boss and challengers can join as either p1 or p2 — the simulator detects which side is the boss by team size (1 Pokémon = boss).

| Property | Value |
|---|---|
| Format ID | `cobblemonraid` |
| Game type | `raid` |
| Mod | `cobblemon` |
| Ruleset | `Cobblemon Raid Rule` |

### Core rules

* **Boss side** — brings exactly **1 Pokémon** (the Raid Boss). Can be p1 or p2.
* **Player side** — brings exactly **5 Pokémon**, one per challenger. Can be p1 or p2.  
  From the simulator's perspective this is a single team sent as p2's team string.
* **Each round (turn)**:
  * Every challenger Pokémon submits **1 move**.
  * The Raid Boss executes **2 – 4 moves** total (the first is chosen by the boss player; 1 – 3 extra moves are auto-injected by the ruleset before turn resolution).
* **End of each round** (automatic, no input required):
  * The boss's status condition is cured.
  * The boss's negative stat stages are reset to 0.
  * Every challenger's positive stat stages are reset to 0.
  * If **all 5 challengers fainted** during the round → the boss wins.
  * Otherwise, every fainted challenger Pokémon is **fully revived** at max HP.
* **Win conditions**:
  * Challengers win the instant the Raid Boss's HP reaches 0.
  * The boss wins if every challenger Pokémon faints in the **same round** (evaluated at end-of-round).

---

## 2. Field layout and Pokémon identifiers

### Slot letters

Each active Pokémon is identified by a **slot string** of the form `PLAYERID + LETTER`.

| Slot string | Description |
|---|---|
| `p1a` | The Raid Boss (only slot on p1's side) |
| `p2a` | Challenger 1 (leftmost from p2's perspective) |
| `p2b` | Challenger 2 |
| `p2c` | Challenger 3 |
| `p2d` | Challenger 4 |
| `p2e` | Challenger 5 |

### Field diagram

```
             p2's perspective
        p1a  (Raid Boss, 1 slot)

  p2a  p2b  p2c  p2d  p2e
  (Challenger 1–5, 5 slots)
```

All challenger slots are **always adjacent** to the boss (cross-side adjacency rules are bypassed for the asymmetric field).

### Full Pokémon ID format

Protocol messages identify a Pokémon as `SLOT: NAME`, e.g.:

```
p1a: Charizard
p2c: Pikachu
```

> **Cobblemon note:** In Cobblemon Showdown, `NAME` is the Pokémon's **UUID** (the `uuid` field from the packed team), not the species name or nickname.  The Cobblemon server acts as an intermediary and translates UUIDs back to Cobblemon entity references.  All protocol messages (switches, damage, moves, etc.) will therefore use the UUID string wherever a standard Pokémon Showdown client would show the nickname.

When the Pokémon is not active (benched / fainted), the slot letter is omitted:

```
p2: Pikachu
```

---

## 3. Team format (Cobblemon packed format)

Cobblemon Showdown uses an **extended** version of the standard Pokémon Showdown packed team format.  You must use this extended format; standard PS packed strings will be rejected.

### Standard PS packed format (reference)

```
NICKNAME|SPECIES|ITEM|ABILITY|MOVES|NATURE|EVS|GENDER|IVS|SHINY|LEVEL|HAPPINESS,...
```

### Cobblemon packed format

The Cobblemon format inserts **four extra fields** immediately after `SPECIES`:

```
NICKNAME|SPECIES|UUID|CURRENTHP|STATUS|STATUSDURATION|ITEM|ABILITY|MOVES|MOVESINFO|NATURE|EVS|GENDER|IVS|SHINY|LEVEL|HAPPINESS,...
```

Field-by-field breakdown:

| # | Field | Notes |
|---|---|---|
| 1 | `NICKNAME` | Display name; leave blank if same as species |
| 2 | `SPECIES` | Species ID (e.g. `charizard`); blank if same as nickname |
| 3 | `UUID` | **COBBLEMON** — unique Pokémon UUID from the Cobblemon mod |
| 4 | `CURRENTHP` | **COBBLEMON** — current HP integer (e.g. `245`).  Used to initialise the Pokémon at less than full HP |
| 5 | `STATUS` | **COBBLEMON** — non-volatile status at battle start (`par`, `brn`, `slp`, `frz`, `psn`, `tox`) or blank for none |
| 6 | `STATUSDURATION` | **COBBLEMON** — number of turns already elapsed for sleep/toxic; blank or `0` otherwise |
| 7 | `ITEM` | Held item ID (e.g. `leftovers`) |
| 8 | `ABILITY` | Ability ID (e.g. `blaze`) |
| 9 | `MOVES` | Comma-separated move IDs (e.g. `flamethrower,earthquake,roost,willowisp`) |
| 10 | `MOVESINFO` | **COBBLEMON** — comma-separated `CURRENTPP/MAXPP` pairs, one per move (e.g. `15/16,10/10,8/8,20/20`) |
| 11 | `NATURE` | Nature name (e.g. `Timid`) |
| 12 | `EVS` | `HP,ATK,DEF,SPA,SPD,SPE`; blank slots = 0 |
| 13 | `GENDER` | `M`, `F`, or blank |
| 14 | `IVS` | `HP,ATK,DEF,SPA,SPD,SPE`; blank slots = 31 |
| 15 | `SHINY` | `S` for shiny, blank otherwise |
| 16 | `LEVEL` | Blank for level 100 |
| 17 | `HAPPINESS,...` | Same trailing fields as standard PS format |

Multiple Pokémon are separated by `]`.

#### Example: Boss team (1 Pokémon)

```
Charizard||abc-uuid-001|340|brn|0|charcoal|blaze|flamethrower,earthquake,airslash,roost|15/16,10/10,20/24,7/8|Modest|4,,,252,,252||,,,30,,30||50|
```

Breaking it down:

| Field | Value |
|---|---|
| NICKNAME | `Charizard` (same as species, so SPECIES field is blank) |
| SPECIES | *(blank – same as nickname)* |
| UUID | `abc-uuid-001` |
| CURRENTHP | `340` |
| STATUS | `brn` (burned) |
| STATUSDURATION | `0` |
| ITEM | `charcoal` |
| ABILITY | `blaze` |
| MOVES | `flamethrower,earthquake,airslash,roost` |
| MOVESINFO | `15/16,10/10,24/24,8/8` |
| NATURE | `Modest` |
| EVS | `4,,,252,,252` |
| GENDER | *(blank)* |
| IVS | `,,,30,,30` |
| SHINY | *(blank)* |
| LEVEL | `50` |

#### Example: Challenger team (5 Pokémon, one per challenger)

Each challenger supplies one Pokémon.  The five sets are concatenated with `]` into a single team string that is passed as p2's team.

```
Pikachu||pid-001|200||0|lightball|static|thunderbolt,quickattack,ironhead,voltswitch|10/16,30/30,5/8,20/24|Hardy||M||||50|]
Bulbasaur||pid-002|185||0||overgrow|vinewhip,leechseed,synthesis,sludgebomb|25/25,10/15,5/8,10/16|Bold|252,,252,,,4||||||]
Squirtle||pid-003|220||0|mysticwater|torrent|watergun,icebeam,aquatail,protect|10/16,8/8,5/16,15/16|Calm|252,,4,,252,||||||]
Charmander||pid-004|165|par|2|oran|blaze|ember,scratch,growl,smokescreen|15/16,30/30,30/35,25/30|Naive||||F|||45|]
Caterpie||pid-005|105||0|||shielddust|tackle,stringshot,,,|25/25,20/20,,|Hardy||||||25|
```

---

## 4. Starting a battle

The battle stream accepts text commands prefixed with `>`.  All commands end with `\n`.

### Command sequence

```
>start OPTIONS
>player p1 PLAYEROPTIONS
>player p2 PLAYEROPTIONS
```

#### `>start OPTIONS`

`OPTIONS` is a JSON object.  There are **two supported styles**:

**Style A – registered format name (recommended)**

```json
{
  "formatid": "cobblemonraid",
  "seed": [12345, 67890, 11111, 22222]
}
```

| Property | Type | Required | Notes |
|---|---|---|---|
| `formatid` | `string` | **Yes** | Must be `"cobblemonraid"` |
| `seed` | `number[4]` | No | PRNG seed for deterministic replays.  Omit for random seed. |
| `p1` | `PLAYEROPTIONS` | No | Can be inlined; see `>player` below |
| `p2` | `PLAYEROPTIONS` | No | Can be inlined; see `>player` below |

**Style B – inline format definition**

Pass the format properties directly at the top level of `OPTIONS`.  This is useful when the format is built dynamically on the client side without relying on a server-side format registry entry.

```json
{
  "mod": "cobblemon",
  "gameType": "raid",
  "gen": 9,
  "ruleset": ["Cobblemon Raid Rule"],
  "effectType": "Format",
  "seed": [12345, 67890, 11111, 22222]
}
```

| Property | Type | Required | Notes |
|---|---|---|---|
| `effectType` | `"Format"` | **Yes** | Tells the engine to treat `OPTIONS` as an inline format definition |
| `mod` | `string` | **Yes** | Must be `"cobblemon"` |
| `gameType` | `"raid"` | **Yes** | Selects the raid field layout (1 boss slot + 5 challenger slots) |
| `ruleset` | `string[]` | **Yes** | Must include `"Cobblemon Raid Rule"` for boss multi-move and end-of-round effects |
| `gen` | `number` | No | Generation number (default: `9`) |
| `seed` | `number[4]` | No | PRNG seed |

#### `>player PLAYERID PLAYEROPTIONS`

`PLAYERID` is `p1` or `p2`; either can be the boss (1 Pokémon) or the challengers (5 Pokémon).

`PLAYEROPTIONS` is a JSON object:

```json
{
  "name": "Player display name",
  "avatar": "charizard",
  "team": "PACKED_TEAM_STRING"
}
```

| Property | Type | Notes |
|---|---|---|
| `name` | `string` | Display name shown in protocol messages |
| `avatar` | `string` | Avatar identifier (cosmetic) |
| `team` | `string` | Cobblemon packed team (see §3) |

#### Full start examples

**Style A (formatid)**

```
>start {"formatid":"cobblemonraid","seed":[1000,2000,3000,4000]}
>player p1 {"name":"Raid Boss","team":"Charizard||abc-uuid-001|340||0|charcoal|blaze|flamethrower,earthquake,airslash,roost|16/16,10/10,24/24,8/8|Modest|4,,,252,,252||,,,30,,30||50|"}
>player p2 {"name":"Challengers","team":"Pikachu||pid-001|200||0|lightball|static|thunderbolt,quickattack,ironhead,voltswitch|16/16,30/30,8/8,24/24|Hardy||M||||50|]Bulbasaur||pid-002|185||0||overgrow|vinewhip,leechseed,synthesis,sludgebomb|25/25,15/15,8/8,16/16|Bold|252,,252,,,4||||||]Squirtle||pid-003|220||0|mysticwater|torrent|watergun,icebeam,aquatail,protect|16/16,8/8,16/16,16/16|Calm|252,,4,,252,||||||]Charmander||pid-004|165||0||blaze|ember,scratch,growl,smokescreen|16/16,30/30,35/35,30/30|Naive||||F|||45|]Caterpie||pid-005|105||0||shielddust|tackle,stringshot|25/25,20/20|Hardy||||||25|"}
```

**Style B (inline format)**

```
>start {"mod":"cobblemon","gameType":"raid","gen":9,"ruleset":["Cobblemon Raid Rule"],"effectType":"Format","seed":[1000,2000,3000,4000]}
>player p1 {"name":"Raid Boss","team":"Charizard||abc-uuid-001|340||0|charcoal|blaze|flamethrower,earthquake,airslash,roost|16/16,10/10,24/24,8/8|Modest|4,,,252,,252||,,,30,,30||50|"}
>player p2 {"name":"Challengers","team":"Pikachu||pid-001|200||0|lightball|static|thunderbolt,quickattack,ironhead,voltswitch|16/16,30/30,8/8,24/24|Hardy||M||||50|]Bulbasaur||pid-002|185||0||overgrow|vinewhip,leechseed,synthesis,sludgebomb|25/25,15/15,8/8,16/16|Bold|252,,252,,,4||||||]Squirtle||pid-003|220||0|mysticwater|torrent|watergun,icebeam,aquatail,protect|16/16,8/8,16/16,16/16|Calm|252,,4,,252,||||||]Charmander||pid-004|165||0||blaze|ember,scratch,growl,smokescreen|16/16,30/30,35/35,30/30|Naive||||F|||45|]Caterpie||pid-005|105||0||shielddust|tackle,stringshot|25/25,20/20|Hardy||||||25|"}
```

Once both players are set the battle begins automatically.

---

## 5. Submitting choices each turn

After the battle starts the simulator sends `sideupdate` messages to each player containing a `|request|` JSON that lists available moves.  After reading that request each side must submit a `CHOICE`.

### Syntax

```
>p1 CHOICE
>p2 CHOICE
```

### p1 (Boss) choice

The boss has 1 active Pokémon and submits a single move choice.  The ruleset **automatically injects 1 – 3 additional boss moves** on top of this choice, so the boss always acts 2 – 4 times per round without the boss player needing to do anything extra.

```
>p1 move 1
```

| Syntax | Meaning |
|---|---|
| `move N` | Use the Nth move (1-indexed) |
| `move MOVENAME` | Use the named move (case/space insensitive) |
| `move N +2` | Use move N targeting challenger slot 2 (rarely needed; boss targets challengers automatically) |

### p2 (Challengers) choice

The challenger side has 5 active Pokémon.  Choices are separated by `,` in slot order (p2a first, p2e last):

```
>p2 CHOICE_a, CHOICE_b, CHOICE_c, CHOICE_d, CHOICE_e
```

Each per-slot `CHOICE` is one of:

| Syntax | Meaning |
|---|---|
| `move N` | Use the Nth move (1-indexed) |
| `move MOVENAME` | Use the named move |
| `move N +1` | Use move N targeting boss slot +1 (the only foe slot) |
| `pass` | Challenger slot is fainted; pass this slot (the revive happens at end-of-round, not mid-turn) |
| `default` | Auto-pick the first legal move |

#### Example p2 choice

```
>p2 move 1, move thunderbolt +1, move 2, pass, move 1 +1
```

* Challenger 1 (p2a) uses their first move.
* Challenger 2 (p2b) uses Thunderbolt aimed at the boss.
* Challenger 3 (p2c) uses their second move.
* Challenger 4 (p2d) is fainted – passes.
* Challenger 5 (p2e) uses their first move aimed at the boss.

### Target location for challengers

From a challenger's perspective the boss is always at target location `+1` (the only opposing slot).  Specifying `+1` explicitly is optional for single-target moves that can only hit foes, but recommended for clarity.

### Request object

The simulator sends a `sideupdate` to each side before they must choose.  The JSON in `|request|REQUEST` looks like:

#### p1 request (Boss)

```json
{
  "active": [
    {
      "moves": [
        {"move": "Flamethrower", "id": "flamethrower", "pp": 15, "maxpp": 16, "target": "normal", "disabled": false},
        {"move": "Earthquake",   "id": "earthquake",   "pp": 10, "maxpp": 10, "target": "normal", "disabled": false},
        {"move": "Air Slash",    "id": "airslash",     "pp": 20, "maxpp": 24, "target": "normal", "disabled": false},
        {"move": "Roost",        "id": "roost",        "pp":  7, "maxpp":  8, "target": "self",   "disabled": false}
      ]
    }
  ],
  "side": {
    "name": "Raid Boss",
    "id": "p1",
    "pokemon": [ ... ]
  },
  "rqid": 2
}
```

#### p2 request (Challengers)

The `active` array has **5 entries** (one per challenger slot).  Fainted challengers still have an entry but their moves will be empty or the slot will be marked with `"fainted": true` (the standard PS faint-request pattern).

```json
{
  "active": [
    {"moves": [{"move": "Thunderbolt", "id": "thunderbolt", "pp": 10, "maxpp": 16, "target": "normal", "disabled": false}, ...]},
    {"moves": [{"move": "Vine Whip",   "id": "vinewhip",    "pp": 25, "maxpp": 25, "target": "normal", "disabled": false}, ...]},
    {"moves": [{"move": "Water Gun",   "id": "watergun",    "pp": 10, "maxpp": 16, "target": "normal", "disabled": false}, ...]},
    {"moves": [{"move": "Ember",       "id": "ember",       "pp": 15, "maxpp": 16, "target": "normal", "disabled": false}, ...]},
    {"moves": [{"move": "Tackle",      "id": "tackle",      "pp": 25, "maxpp": 25, "target": "normal", "disabled": false}, ...]}
  ],
  "side": {
    "name": "Challengers",
    "id": "p2",
    "pokemon": [ ... ]
  },
  "rqid": 2
}
```

---

## 6. Simulator output messages

The simulator produces a stream of newline-delimited protocol messages.  Messages are split into three categories:

* `update` — sent to all parties / spectators
* `sideupdate` — sent to one specific side only (e.g. `|request|`)
* `end` — sent once at battle end

A full specification of every message type is in [`sim/SIM-PROTOCOL.md`](sim/SIM-PROTOCOL.md).  This section documents the **raid-specific** messages and highlights the most important generic ones.

### 6.1 Battle initialisation messages

Emitted once when the battle starts (in an `update` block).

```
|player|p1|Raid Boss|charizard|
|player|p2|Challengers|ash|
|teamsize|p1|1
|teamsize|p2|5
|gametype|raid
|gen|9
|tier|Cobblemon Raid
|rule|Cobblemon Raid Rule: Rules for Cobblemon Raid battles: 1 boss vs 5 player Pokémon.
|
|start
```

Notable differences from a standard battle:

* `|gametype|raid` — clients should use this to switch to raid layout rendering.
* `|teamsize|p1|1` and `|teamsize|p2|5` — the asymmetric team sizes.

### 6.2 Turn-start messages

At the beginning of every turn the simulator sends choice requests to each side (via `sideupdate`) and emits the turn counter:

```
|turn|N
```

### 6.3 Move execution messages

For every move that executes (including the auto-injected boss moves) the following sequence appears:

```
|move|p1a: Charizard|Flamethrower|p2c: Squirtle
|-supereffective|p2c: Squirtle
|-damage|p2c: Squirtle|0 fnt
|faint|p2c: Squirtle
```

| Message | Meaning |
|---|---|
| `\|move\|POKEMON\|MOVE\|TARGET` | Pokémon used move on target |
| `\|-supereffective\|TARGET` | Move was super effective |
| `\|-resisted\|TARGET` | Move was not very effective |
| `\|-immune\|TARGET` | Target was immune |
| `\|-miss\|SOURCE\|TARGET` | Move missed |
| `\|-damage\|POKEMON\|HP STATUS` | Pokémon took damage; `HP STATUS` e.g. `120/340` or `0 fnt` |
| `\|-heal\|POKEMON\|HP STATUS` | Pokémon regained HP |
| `\|faint\|POKEMON` | Pokémon fainted |
| `\|-crit\|TARGET` | Critical hit |

### 6.4 Raid-specific end-of-round messages

After all moves have resolved the ruleset runs its end-of-round logic and emits these messages (in order):

#### Boss status cure

```
|-message|The Raid Boss shook off its status condition!
|-curestatus|p1a: Charizard|brn|[from] Raid
```

Emitted only if the boss had a non-volatile status condition.

#### Boss negative-boost clear

```
|-message|The Raid Boss cleared its negative stat changes!
|-clearnegativeboost|p1a: Charizard|[from] Raid
```

Emitted only if the boss had at least one negative stat stage.

#### Challenger positive-boost clear

For each challenger that had a positive stat stage:

```
|-message|Pikachu's stat boosts were reset by the Raid.
```

#### Boss wins (all challengers fainted)

```
|-message|All challengers have fainted! The Raid Boss wins!
|win|Raid Boss
```

#### Challenger revival (fainted challengers are healed)

For each challenger that was fainted and is now revived:

```
|-heal|p2c: Squirtle|220/220|[from] Raid Revival
```

### 6.5 Win messages

**Challengers win (boss fainted):**

```
|win|Challengers
```

**Boss wins (all 5 challengers fainted in same round):**

```
|-message|All challengers have fainted! The Raid Boss wins!
|win|Raid Boss
```

**Tie (both sides faint simultaneously):**

```
|tie
```

### 6.6 End message

After `|win|` or `|tie|` the simulator sends an `end` block with a JSON summary:

```
end
{"winner":"Challengers","turns":7,"endType":"normal","seed":[...],...}
```

---

## 7. Win conditions

| Condition | Who wins | When |
|---|---|---|
| Boss HP reaches 0 | Challengers (p2) | Immediately on the killing hit |
| All 5 challengers fainted in the same round | Boss (p1) | Evaluated at end-of-round, **after** all moves complete |
| Both sides reach 0 HP simultaneously | Tie | Evaluated at end-of-round |

> **Important:** If a challenger Pokémon faints mid-turn, the battle does **not** end immediately (unlike standard PS battles).  The `checkWin` override in the format suppresses that check.  The game only ends when the boss faints, or when end-of-round logic finds all challengers fainted.

---

## 8. End-of-round automatic effects

These effects happen **automatically** after every round (turn), in this order.  No player input is required.

1. **Boss status cure** — if the boss has a non-volatile status (burn, paralysis, sleep, freeze, poison, bad poison), it is instantly cured.
2. **Boss negative-stat reset** — every stat stage on the boss that is below 0 is set back to 0 (Attack, Defence, Sp.Atk, Sp.Def, Speed, Accuracy, Evasion).
3. **Challenger positive-stat reset** — every stat stage on each challenger that is above 0 is set back to 0.
4. **Win check** — if every challenger Pokémon is fainted the boss wins (§7).
5. **Challenger revival** — every fainted challenger Pokémon is restored to full HP, cleared of status, and all volatile conditions are removed.

---

## 9. Complete worked example

This example walks through two turns of a raid battle to illustrate the complete input/output cycle.

### Setup

* **Boss (p1):** Charizard, level 50, `blaze`, moves: Flamethrower / Earthquake / Air Slash / Roost; full HP.
* **Challengers (p2):** Pikachu, Bulbasaur, Squirtle, Charmander, Caterpie; all level 25 or 50.

### Input stream

```
>start {"formatid":"cobblemonraid","seed":[1,2,3,4]}
>player p1 {"name":"Raid Boss","team":"Charizard||uuid-boss|340||0|charcoal|blaze|flamethrower,earthquake,airslash,roost|16/16,10/10,24/24,8/8|Modest|4,,,252,,252||,,,30,,30||50|"}
>player p2 {"name":"Challengers","team":"Pikachu||uuid-1|200||0|lightball|static|thunderbolt,quickattack,ironhead,voltswitch|16/16,30/30,8/8,24/24|Hardy||M||||50|]Bulbasaur||uuid-2|185||0||overgrow|vinewhip,leechseed,synthesis,sludgebomb|25/25,15/15,8/8,16/16|Bold|252,,252,,,4||||||]Squirtle||uuid-3|220||0|mysticwater|torrent|watergun,icebeam,aquatail,protect|16/16,8/8,16/16,16/16|Calm|252,,4,,252,||||||]Charmander||uuid-4|165||0||blaze|ember,scratch,growl,smokescreen|16/16,30/30,35/35,30/30|Naive||||F|||45|]Caterpie||uuid-5|105||0||shielddust|tackle,stringshot|25/25,20/20|Hardy||||||25|"}
```

### Output: Battle initialisation

```
update
|player|p1|Raid Boss||
|player|p2|Challengers||
|teamsize|p1|1
|teamsize|p2|5
|gametype|raid
|gen|9
|tier|Cobblemon Raid
|rule|Cobblemon Raid Rule: Rules for Cobblemon Raid battles: 1 boss vs 5 player Pokémon.
|
|start
|switch|p1a: uuid-boss|Charizard, L50|340/340
|switch|p2a: uuid-1|Pikachu, L50, M|200/200
|switch|p2b: uuid-2|Bulbasaur|185/185
|switch|p2c: uuid-3|Squirtle|220/220
|switch|p2d: uuid-4|Charmander, L45, F|165/165
|switch|p2e: uuid-5|Caterpie, L25|105/105
|turn|1
```

> **Note:** The first field after the slot string (`uuid-boss`, `uuid-1`, etc.) is the Pokémon's UUID — the same `UUID` field from the packed team string.  The second field (`Charizard, L50`, `Pikachu, L50, M`) is the standard Pokémon Showdown DETAILS string (species + optional level/gender/shiny).  Your server should look up the Cobblemon entity by UUID.

### Input: Turn 1 choices

```
>p1 move 1
>p2 move thunderbolt +1, move vinewhip +1, move watergun +1, move ember +1, move tackle +1
```

The boss chose Flamethrower (move 1).  The ruleset will automatically add 1 – 3 more boss moves before resolution.

### Output: Turn 1 resolution

```
update
|move|p2a: uuid-1|Thunderbolt|p1a: uuid-boss
|-resisted|p1a: uuid-boss
|-damage|p1a: uuid-boss|280/340
|move|p2b: uuid-2|Vine Whip|p1a: uuid-boss
|-resisted|p1a: uuid-boss
|-damage|p1a: uuid-boss|265/340
|move|p2c: uuid-3|Water Gun|p1a: uuid-boss
|-damage|p1a: uuid-boss|240/340
|move|p2d: uuid-4|Ember|p1a: uuid-boss
|-resisted|p1a: uuid-boss
|-damage|p1a: uuid-boss|230/340
|move|p2e: uuid-5|Tackle|p1a: uuid-boss
|-damage|p1a: uuid-boss|215/340
|move|p1a: uuid-boss|Flamethrower|p2e: uuid-5
|-supereffective|p2e: uuid-5
|-damage|p2e: uuid-5|0 fnt
|faint|p2e: uuid-5
|move|p1a: uuid-boss|Air Slash|p2b: uuid-2
|-damage|p2b: uuid-2|60/185
|move|p1a: uuid-boss|Earthquake|p2a: uuid-1
|-immune|p2a: uuid-1
```

*(Boss received 1 extra move (Air Slash) and 1 more (Earthquake) — 3 moves total this round.)*

**End-of-round effects:**

```
|-heal|p2e: uuid-5|105/105|[from] Raid Revival
|turn|2
```

*(Caterpie fainted but not all 5 challengers — so it is revived.  The boss had no status or debuffs to clear, and no challenger had positive boosts.)*

### Input: Turn 2 choices

```
>p1 move roost
>p2 move thunderbolt +1, move leechseed +1, move icebeam +1, move ember +1, move tackle +1
```

### Output: Turn 2 resolution (abbreviated)

```
update
|move|p2a: uuid-1|Thunderbolt|p1a: uuid-boss
...
|move|p1a: uuid-boss|Roost|p1a: uuid-boss
|-heal|p1a: uuid-boss|265/340
|move|p1a: uuid-boss|Flamethrower|p2d: uuid-4
|-supereffective|p2d: uuid-4
|-damage|p2d: uuid-4|0 fnt
|faint|p2d: uuid-4
|move|p1a: uuid-boss|Earthquake|p2b: uuid-2
|-damage|p2b: uuid-2|20/185
...
|-heal|p2d: uuid-4|165/165|[from] Raid Revival
|turn|3
```

---

## Further reading

| Document | Contents |
|---|---|
| [`sim/SIMULATOR.md`](sim/SIMULATOR.md) | How to start the simulator process, write commands, read output |
| [`sim/SIM-PROTOCOL.md`](sim/SIM-PROTOCOL.md) | Complete list of all simulator output messages |
| [`sim/TEAMS.md`](sim/TEAMS.md) | Standard PS packed format; team conversion utilities |
| [`README-COBBLEMON.md`](README-COBBLEMON.md) | Cobblemon debug server, building, updating from Smogon |
| [`config/custom-formats.ts`](config/custom-formats.ts) | Format registration and `checkWin` override |
| [`data/mods/cobblemon/rulesets.ts`](data/mods/cobblemon/rulesets.ts) | Full source of the `Cobblemon Raid Rule` |
| [`sim/battle.ts`](sim/battle.ts) | `activePerHalf` and `validTargetLoc` raid handling |
| [`sim/side.ts`](sim/side.ts) | Active slot count per side for raid |
| [`sim/pokemon.ts`](sim/pokemon.ts) | `isAdjacent` raid override |

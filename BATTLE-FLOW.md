Battle Room & Turn Loop
=======================

This document explains how a battle room is created on the server, how it connects to the core simulator, and how each turn is processed end-to-end.

---

Table of contents
-----------------

1. [High-level overview](#1-high-level-overview)
2. [Battle room lifecycle](#2-battle-room-lifecycle)
3. [Turn loop step-by-step](#3-turn-loop-step-by-step)
4. [Action queue & priority order](#4-action-queue--priority-order)
5. [Event system](#5-event-system)
6. [Timer system](#6-timer-system)
7. [Key source files](#7-key-source-files)

---

## 1. High-level overview

A battle is split into two layers:

```
┌─────────────────────────────────────────────────────┐
│  Game server  (server/)                             │
│                                                     │
│   RoomBattle – one per active battle room           │
│     • Manages players, timer, room chat             │
│     • Forwards player choices to the simulator      │
│     • Receives protocol messages and sends to UI    │
└──────────────────────┬──────────────────────────────┘
                       │  ObjectReadWriteStream
                       │  (one-way text protocol)
┌──────────────────────▼──────────────────────────────┐
│  Battle simulator  (sim/)                           │
│                                                     │
│   Battle – stateless game logic                     │
│     • Maintains game state (HP, stat stages, etc.)  │
│     • Executes turn actions in priority order       │
│     • Fires the event system for mechanics          │
└─────────────────────────────────────────────────────┘
```

The server and the simulator communicate exclusively through a newline-delimited text stream defined in [`sim/SIMULATOR.md`](./sim/SIMULATOR.md).  The sim never touches Node sockets or timers; the server never runs game logic directly.

---

## 2. Battle room lifecycle

### 2.1 Construction (`server/room-battle.ts` – `RoomBattle` constructor)

```
Rooms.createBattle(options)
  └─> new RoomBattle(room, options)
        1. Create ObjectReadWriteStream   ← spawns sim worker via PM
        2. stream.write(">start {...}")   ← kick off simulator
        3. listen()                       ← async loop reading sim output
        4. addPlayer() × playerCap        ← create RoomBattlePlayer objects
        5. new RoomBattleTimer(this)      ← set up turn clock
        6. this.start()                   ← send team/player data to sim
```

### 2.2 Player joins / sends team

When a player connects or submits a team, the server writes to the stream:

```
>player p1 {"name":"Alice","team":"..."}
>player p2 {"name":"Bob","team":"..."}
```

Once both players have teams the simulator fires `start()` internally (see §3).

### 2.3 Player makes a choice (`RoomBattle.choose`)

```typescript
// server/room-battle.ts  line 609
override choose(user, data) {
  // 1. Reject if battle is frozen/paused
  // 2. Validate request ID matches current turn
  // 3. Mark player's request as isWait = true
  // 4. Forward raw choice to sim:
  void this.stream.write(`>${player.slot} ${choice}`);
}
```

### 2.4 Server receives simulator output (`RoomBattle.receive`)

```
sim output line       server action
────────────────────  ──────────────────────────────────────────
update                Broadcast all |…| lines to room
sideupdate p1 …       Send |request| or |error| to that player only
end                   Parse winner, update ladder, close room
```

After an `update` message the server also calls `this.timer.nextRequest()` to restart the turn clock for the next decision.

### 2.5 Battle end

The simulator emits an `end` line containing a JSON log.  `RoomBattle.end()` then:

1. Marks the battle as ended.
2. Updates the rated ladder (if applicable).
3. Saves the replay.
4. Closes the room after a short delay.

---

## 3. Turn loop step-by-step

The core loop lives in `sim/battle.ts`.  The diagram below shows one complete turn.

```
                   ┌─────────────────────────────────┐
                   │         Battle.start()          │
                   │  • link sides as foes            │
                   │  • fire onBegin / onTeamPreview  │
                   │  • queue.addChoice('start')      │
                   │  • go()                          │
                   └──────────────┬──────────────────┘
                                  │
                   ┌──────────────▼──────────────────┐
       ┌───────────┤           go()                  ├─────────────┐
       │           │  1. If !midTurn:                 │             │
       │           │       insert 'beforeTurn'        │             │
       │           │       add 'residual'             │             │
       │           │       midTurn = true             │             │
       │           │  2. Dequeue & runAction() loop   │             │
       │           └──────────────┬──────────────────┘             │
       │                          │                                 │
       │           ┌──────────────▼──────────────────┐             │
       │           │         runAction(action)        │             │
       │           │  switch action.choice:           │             │
       │           │   'start'     → switchIn starters│             │
       │           │   'beforeTurn'→ priority charges │             │
       │           │   'move'      → actions.runMove  │             │
       │           │   'switch'    → actions.runSwitch│             │
       │           │   'megaEvo'   → Mega Evolution   │             │
       │           │   'residual'  → end-of-turn FX   │             │
       │           └──────────────┬──────────────────┘             │
       │                          │                                 │
       │        requestState set? │ (faint / U-turn / normal move)  │
       │           ┌──────────────▼──────────────────┐             │
       │      yes  │  Pause – wait for player input   │  no         │
       │  ◄────────┤  (requestState = 'move'|'switch')├─────────────►
       │           └─────────────────────────────────┘             │
       │                                                            │
       │  Players call choose() on the server                       │
       │  Server streams ">p1 move 1" etc. to sim                   │
       │  Battle.choose() → side.choose() → isChoiceDone()          │
       │  When allChoicesDone() → commitDecisions()                 │
       │                                                            │
       │           ┌────────────────────────────────┐              │
       └───────────►      commitDecisions()          │              │
                   │  1. updateSpeed()               │              │
                   │  2. queue all choices           │              │
                   │  3. queue.sort()  ← priority   │              │
                   │  4. clearRequest()              │              │
                   │  5. go()  ← restart loop        │              │
                   └──────────────┬─────────────────┘              │
                                  │ (loop continues…)               │
                                  │                                 │
                   ┌──────────────▼─────────────────┐              │
         all       │       (queue empty after        │ battle       │
       actions     │        'residual' fires)        │  ended?      │
      processed ──►│       nextTurn()                ├──────────────►  win()
                   │  • turn++                       │
                   │  • clear per-turn state         │
                   │  • re-run DisableMove events    │
                   │  • issue new requests to sides  │
                   └─────────────────────────────────┘
                          ▲                │
                          └──── go() ──────┘  (next turn begins)
```

### 3.1 `go()` – the execution engine (`battle.ts` line 2855)

```typescript
go() {
  // Insert beforeTurn and residual markers on first call of a new turn
  if (!this.midTurn) {
    this.queue.insertChoice({choice: 'beforeTurn'});
    this.queue.addChoice({choice: 'residual'});
    this.midTurn = true;
  }

  let action;
  while ((action = this.queue.shift())) {
    this.runAction(action);
    if (this.requestState || this.ended) return; // pause for input
  }

  // Queue exhausted → prepare next turn
  this.nextTurn();
  this.midTurn = false;
  this.queue.clear();
}
```

`go()` pauses whenever the simulator needs player input (`requestState !== ''`) or the battle has ended.  It resumes via `commitDecisions()` after all players have chosen.

### 3.2 `nextTurn()` – between-turn cleanup (`battle.ts` line 1475)

Called once all queued actions (including the `residual` action) are processed:

1. Increment `this.turn`.
2. Remove expired Dynamax status (after 3 turns).
3. For every active Pokémon: reset `moveThisTurn`, `newlySwitched`, `usedItemThisTurn`, stat-change flags, and per-move `disabled` flags.
4. Re-fire `DisableMove` events so abilities like Torment and Encore can re-disable moves.
5. Check and update trapped-Pokémon state.
6. Request new choices from each side (which sets `requestState` and sends `|request|` to clients).

### 3.3 `commitDecisions()` – locking in choices (`battle.ts` line 2910)

```typescript
commitDecisions() {
  this.updateSpeed();           // recalculate Speed (Tailwind, Trick Room, etc.)
  this.queue.clear();
  // log choices to inputLog for replays
  for (const side of this.sides) {
    this.queue.addChoice(side.choice.actions);
  }
  this.queue.sort();            // determine action order
  this.requestState = '';
  this.go();                    // execute
}
```

---

## 4. Action queue & priority order

`sim/battle-queue.ts` sorts actions using `comparePriority()`.  The ordering is:

| Field              | Rule                           |
|--------------------|-------------------------------|
| `order`            | Lower fires first (start=2, switch=103, move=200, residual=300) |
| `priority`         | Higher fires first (Quick Attack = +1, most moves = 0) |
| `fractionalPriority` | Gen 8+ sub-priority tiebreak |
| `speed`            | Higher Speed acts first        |
| Ties               | Random (50/50)                 |

Composite actions resolve in sub-order: Mega Evolution (order 104) fires just before the associated move (order 200), so speed calculations are done on the evolved form.

---

## 5. Event system

`Battle.runEvent(eventid, target, source, sourceEffect, relayVar)` is the central hook that every mechanic goes through:

```
runEvent('TryHit', target, attacker, move)
  ├─ Collects all handlers on target, move, field, abilities, items
  ├─ Sorts by priority / speed
  └─ Calls each handler in order, threading relayVar through
     (e.g. false = block move; number = modified damage)
```

Common event ids used during a turn:

| Event id       | When it fires                        |
|----------------|--------------------------------------|
| `BeforeTurn`   | Start of each turn (priority charges)|
| `BeforeMove`   | Just before a move is used           |
| `BasePower`    | Calculate modified base power        |
| `TryHit`       | Accuracy / immunity check            |
| `Damage`       | Apply and modify damage              |
| `AfterHit`     | Secondary effects after damage       |
| `SetStatus`    | Attempt to inflict a status condition|
| `Residual`     | End-of-turn effects (burn, weather…) |
| `DisableMove`  | Re-evaluate which moves are usable   |

---

## 6. Timer system

`RoomBattleTimer` (`server/room-battle.ts` line 161) enforces per-turn time limits.

Default settings (may be overridden by format rules):

| Setting        | Default | Meaning                               |
|----------------|---------|---------------------------------------|
| `starting`     | 150 s   | Total time bank per player            |
| `addPerTurn`   | 10 s    | Added to bank each turn               |
| `maxPerTurn`   | 150 s   | Hard cap on time allowed for one turn |
| `maxFirstTurn` | 150 s   | Turn-time cap for the very first turn (same as `maxPerTurn` by default; challenge battles use 300 s) |
| Tick interval  | 5 s     | How often the timer decrements        |

Flow:

```
server receives 'update' from sim
  └─> timer.nextRequest()
        • add time to each player's bank (up to starting)
        • set turnSecondsLeft = min(bank, maxPerTurn)
        • send |inactive| notice to room
        • schedule nextTick() in 5 s

nextTick() (every 5 s)
  • deduct 5 s from secondsLeft and turnSecondsLeft (or dcSecondsLeft if disconnected)
  • checkTimeout()
      – if secondsLeft ≤ 0 or turnSecondsLeft ≤ 0 → player forfeits
      – otherwise reschedule nextTick()
```

---

## 7. Key source files

| File | Purpose |
|------|---------|
| `server/room-battle.ts` | `RoomBattle` and `RoomBattleTimer` – server-side room, player management, stream I/O, timer |
| `server/room-game.ts`   | Abstract `RoomGame` base class |
| `sim/battle.ts`         | `Battle` – core game-state machine, `go()`, `runAction()`, `nextTurn()`, `commitDecisions()` |
| `sim/battle-queue.ts`   | `BattleQueue` – action queue, priority sorting |
| `sim/battle-actions.ts` | `BattleActions` – move execution, switch mechanics, Mega/Z/Dynamax/Tera |
| `sim/battle-stream.ts`  | `BattleStream` – wraps `Battle` in a readable/writable stream |
| `sim/side.ts`           | `Side` – team state, choice validation |
| `sim/pokemon.ts`        | `Pokemon` – per-Pokémon state (HP, stat stages, volatiles) |
| `sim/field.ts`          | `Field` – weather, terrain, trick room |
| `sim/SIMULATOR.md`      | Full simulator stream protocol reference |
| `sim/SIM-PROTOCOL.md`   | All `|…|` message types and choice syntax |

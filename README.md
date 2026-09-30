# ARENA — Gladiator Manager

Playable first prototype of a modern, nonmagical gladiator club management game. Korean interface, anime portrait pool, low-poly 3D match viewer. Static ES-module application with vendored Three.js assets. No runtime CDN dependency for the game engine or renderer.

## Implemented

- Seeded random player generation, 30-player roster, youth promotion, recruitment events and free-agent contracts.
- 100 historical/mythological motif records with random appearance schedules, no duplicate motif in a saved world. Prototype traits include ten specific traits and five shared behavioral templates.
- 22 player attributes, weapon proficiency, role-specific overall, hidden potential, training and basic annual physical decline.
- Five-set, first-to-three match series: 11v11 elimination, 20v20 capture-the-flag, 9v9 deathmatch (180-second respawn), 5v5 king hunt, 1v1 ace duel. Every set has a 3600-second in-game maximum.
- Sensor-style damage, stamina, hit/guard checks, disarm and weapon recovery, kill/assist/objective records. Fatigue carries between sets; damage resets.
- Four arena environments: urban, jungle, snow, mountain. Snow slows movement, forest reduces distant ranged accuracy, mountain uses balance for mobility. Terrain props currently sit beside movement lanes; there is no full obstacle navigation or line-of-sight solver yet.
- Eight-team, double round-robin domestic season. Other fixtures simulated per round, table and history, weekly wages, prize revenue.
- Facilities/staff team upgrades, scout estimates, adult-player affection/trust conversations and consensual relationship state.
- Browser-local save plus JSON export/import. A match is committed only at the end of the series; reloading mid-match restarts that fixture.

## Prototype scope

The agreed long-term design includes 24 countries, multiple domestic divisions, continental and world competition, individual staff careers, transfers between clubs, advanced tactics, retirement and mentoring. Those are not complete in this version. Promotion/relegation is currently a season outcome flag; the next season still uses the same eight clubs. Rival squads are generated for each fixture and do not yet have persistent player careers. Scouting-market records initially start unproven.

Portraits use sixteen generated adult-woman portraits assigned consistently to profiles; male generated profiles use a neutral initial avatar. Full individual portraits for all 100 uniques, live AI generation, uniform/age edits and portrait expression variants are not yet implemented. The 3D models are schematic anime-inspired athletes, not detailed character assets.

This is a local single-player save, not a shared/server account. No live image API or credentials are required. Gameplay runs entirely in the browser.

## Provisional rules

- Elimination: maximum 60 minutes, no respawn; eliminate all opponents to win early.
- Capture: maximum 60 minutes, three flags in each team's territory. Steal one enemy flag at a time and bring it within the friendly base's delivery radius. First to deliver all three wins early, otherwise compare delivered flags at time limit. No respawn. Eliminating opponents alone does not end the set. A carrier moves 15% slower and drops their flag on elimination. Teammates of the flag's owner can touch a dropped flag to return it home; opponents can pick it up. Captured flags leave play. These supplemental rules are prototype defaults.
- Deathmatch: 60 minutes, highest kill count, 3-minute respawn. No victory by temporary elimination of the whole opposing team.
- King hunt: maximum 60 minutes, publicly identified king; first selected player is king. King elimination ends the set early.
- Ace duel: maximum 60 minutes, highest-role-overall player selected. Opponent elimination ends the set early.
- Time-limit tie-break: objective/kill score, then summed remaining damage capacity, then seeded draw for an exact tie. This is provisional and should be redesigned for competitive rules.

## Development

Serve `dist/` from an ES-module-compatible static HTTP server. `npm install` restores Three.js; the deployed build already contains `dist/assets/three.module.js` and `three.core.js`. Run `node scripts/check-engine.mjs` for deterministic simulation and season invariants and `node scripts/check-rules.mjs` for flag, respawn and time-limit rules. Browser WebGL hardware acceleration is needed for 3D; textual match simulation can continue if it is unavailable.

## Validation

Engine checks cover all five match modes, finite positions/health, deterministic generation, duplicate-free motif schedules and a complete 14-round season. DOM integration checks covered roster/release/signing, facility upgrades, relationship events, day advancement, tactics, a full best-of-five series, save readback. Actual browser/WebGL visual QA was unavailable in this execution environment.

## Player presentation

The motif catalog, rarity labels, stars and explicit historical/mythological identity are not shown in the interface. Special behavioral traits use the same profile presentation as other player characteristics. Motif generation, appearance schedules and mechanics remain internal. Old discovery news is normalized on load and import so existing saves do not expose the hidden identity.

import assert from "node:assert/strict";
import { createWorld, player, Battle, rand, roles } from "../dist/engine.js";
import {
  hiddenAttributes,
  ensurePlayerAttributes,
  matchReadiness,
  roleEffect,
  injuryRisk,
  foulRisk,
  trainingMotivation,
  coachObservations,
} from "../dist/attributes.js";
const s = createWorld(212),
  p = s.players[0];
for (const x of [...s.players, ...s.market, ...s.youth]) {
  assert.ok(
    Object.values(x.stats).every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 20,
    ),
  );
  assert.ok(
    Object.values(x.hidden).every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 20,
    ),
  );
  assert.equal(Object.keys(x.hidden).length, 16);
}
const portraits = new Set();
for (let i = 0; i < 100; i++)
  portraits.add(player(s, { unique: i }).portraitKey);
assert.equal(portraits.size, 100);
const legacy = structuredClone(p);
delete legacy.hidden;
delete legacy.portraitKey;
ensurePlayerAttributes(legacy);
const migrated = structuredClone(legacy);
ensurePlayerAttributes(legacy);
assert.deepEqual(legacy, migrated);
const a = structuredClone(p),
  b = structuredClone(p);
a.hidden.consistency = 20;
b.hidden.consistency = 1;
const ar = { seed: 55 },
  br = { seed: 55 };
let strong = 0,
  weak = 0;
for (let i = 0; i < 1000; i++) {
  if (matchReadiness(a, () => rand(ar)) === 1) strong++;
  if (matchReadiness(b, () => rand(br)) === 1) weak++;
}
assert.ok(strong > 700 && weak < 100);
a.hidden.importantMatches = 20;
a.hidden.pressure = 20;
b.hidden.importantMatches = 1;
b.hidden.pressure = 1;
assert.ok(matchReadiness(a, () => 0, true) > matchReadiness(b, () => 0, true));
const offrole = roles.find((r) => r !== a.role);
a.hidden.versatility = 20;
b.hidden.versatility = 1;
assert.ok(roleEffect(a, offrole) > roleEffect(b, offrole));
a.hidden.injuryProneness = 20;
b.hidden.injuryProneness = 1;
assert.ok(injuryRisk(a, 20, 1) > injuryRisk(b, 20, 1));
assert.ok(injuryRisk(a, 20, 5) < injuryRisk(a, 20, 1));
a.hidden.dirtiness = 20;
b.hidden.dirtiness = 1;
assert.ok(foulRisk(a) > foulRisk(b));
a.hidden.professionalism = 20;
b.hidden.professionalism = 1;
assert.ok(trainingMotivation(a) > trainingMotivation(b));
const report = coachObservations(a, 100).join(" ");
assert.ok(!report.includes("/20"));
assert.ok(!report.includes("집착도"));
const roster = s.players.slice(0, 9),
  battle = new Battle([roster, s.market.slice(0, 9)], 2, 77);
const unit = battle.units[0];
unit.alive = false;
unit.disqualified = true;
unit.respawn = 0;
battle.step(0.5);
assert.equal(unit.alive, false);
console.log(
  JSON.stringify({
    passed: true,
    checks: [
      "public-and-hidden-1-to-20",
      "100-fixed-identities",
      "stable-migration",
      "consistency-distribution",
      "important-match-pressure",
      "role-versatility",
      "injury-load-medical",
      "discipline",
      "professional-training",
      "qualitative-report",
      "no-disqualified-respawn",
    ],
  }),
);

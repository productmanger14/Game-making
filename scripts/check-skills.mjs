import assert from "node:assert/strict";
import { createWorld, player, Battle, modes } from "../dist/engine.js";
import {
  createCareer,
  migrateCareer,
  nextSeason,
  advanceCareer,
  pendingNews,
  resolveNews,
} from "../dist/career.js";
import { clubRoster, leagueId, advanceWorld } from "../dist/world.js";
import {
  ensureSkills,
  commonSkills,
  signatureSkills,
  skillDefinitions,
  setSkillTraining,
  forgetSkill,
  trainSkill,
  gainMatchSkills,
  addSkillXP,
  xpNeeded,
  skillEffects,
  skillMatchRating,
  skillBehavior,
} from "../dist/skills.js";
const s = createWorld(600),
  p = structuredClone(s.players.find((p) => p.unique == null));
const ids = new Set();
for (let i = 0; i < 100; i++) {
  const u = player(s, { unique: i }),
    signature = u.skills.filter(
      (sk) => skillDefinitions[sk.id].signature != null,
    );
  assert.equal(signature.length, 1);
  assert.equal(signature[0].id, `signature-${i}`);
  ids.add(signature[0].id);
  assert.ok(u.skills.length <= 7);
  assert.equal(signature[0].level, 3);
  assert.throws(() => forgetSkill(u, signature[0].id), /정리할 수/);
  const c = structuredClone(u);
  ensureSkills(c);
  assert.deepEqual(c, u);
}
assert.equal(ids.size, 100);
assert.equal(commonSkills.length, 23);
assert.throws(() => setSkillTraining(p, "signature-54"), /배울 수/);
const old = structuredClone(p);
delete old.skills;
delete old.skillsVersion;
ensureSkills(old);
const once = structuredClone(old);
ensureSkills(old);
assert.deepEqual(old, once);
p.skills = [];
for (const d of commonSkills.slice(0, 7)) {
  setSkillTraining(p, d.id);
  assert.equal(trainSkill(p, 99), null);
  assert.equal(p.skills.length, commonSkills.indexOf(d));
  const event = trainSkill(p, 1);
  assert.equal(event.learned, true);
  assert.equal(event.level, 1);
}
assert.equal(p.skills.length, 7);
assert.throws(() => setSkillTraining(p, "footwork"), /최대 7/);
setSkillTraining(p, "sword");
const before = p.skills[0].level;
trainSkill(p, xpNeeded(before));
assert.equal(p.skills[0].level, before + 1);
addSkillXP(p, "sword", 1e6);
assert.equal(p.skills[0].level, 10);
assert.equal(p.skills[0].xp, 0);
assert.throws(() => setSkillTraining(p, "sword"), /최고/);
forgetSkill(p, "shield");
setSkillTraining(p, "footwork");
trainSkill(p, 50);
setSkillTraining(p, "shield");
assert.equal(p.skillTraining.xp, 0);
setSkillTraining(p, "footwork");
assert.equal(p.skillTraining.xp, 0);
p.injury = 3;
assert.equal(trainSkill(p, 1000), null);
assert.equal(p.skillTraining.xp, 0);
p.injury = 0;
trainSkill(p, 100);
assert.equal(p.skills.length, 7);
assert.equal(p.skills.find((s) => s.id === "footwork").level, 1);
const beforeSkills = structuredClone(p.skills);
gainMatchSkills(p);
assert.ok(p.skills.some((x, i) => x.xp > beforeSkills[i].xp));
const context = {
  armed: true,
  ranged: false,
  time: 1,
  mode: 4,
  terrain: "city",
  hp: 100,
  nearAlly: false,
  focus: false,
  protect: false,
  zone: false,
  outnumbered: false,
  counter: false,
  carrying: false,
};
const q = structuredClone(p);
q.weapon = 0;
q.skills = [{ id: "shield", level: 10, xp: 0 }];
assert.equal(skillEffects(q, context).guard, 0.12);
assert.equal(skillEffects(q, { ...context, armed: false }).guard, 0);
q.weapon = 4;
assert.equal(skillEffects(q, context).guard, 0);
q.skills = [{ id: "signature-54", level: 10, xp: 0 }];
q.weapon = 2;
assert.equal(skillEffects(q, context).hit, 0.12);
assert.equal(skillEffects(q, { ...context, mode: 0 }).hit, 0);
q.skills = [{ id: "signature-1", level: 10, xp: 0 }];
assert.equal(skillEffects(q, context).hit, 0);
assert.equal(skillEffects(q, { ...context, focus: true }).hit, 0.13);
q.skills = [{ id: "grapple", level: 10, xp: 0 }];
assert.equal(skillEffects(q, { ...context, armed: false }).damage, 0.2);
assert.equal(skillEffects(q, context).damage, 0);
q.skills = [{ id: "terrain", level: 10, xp: 0 }];
assert.equal(skillEffects(q, context).speed, 0);
assert.equal(skillEffects(q, { ...context, terrain: "snow" }).speed, 0.12);
q.skills = [{ id: "signature-12", level: 10, xp: 0 }];
assert.ok(skillMatchRating(q, 0, "city") > 1);
// Validate every definition has real bounded effects under its documented conditions.
for (const d of Object.values(skillDefinitions)) {
  q.skills = [{ id: d.id, level: 10, xp: 0 }];
  q.weapon = d.weapons?.[0] ?? d.weapon ?? 0;
  const c = {
    ...context,
    armed: d.when !== "unarmed",
    ranged: d.when === "ranged" || [4, 10].includes(q.weapon),
    terrain: "mountain",
    hp: 30,
    nearAlly: true,
    focus: true,
    protect: true,
    zone: true,
    outnumbered: true,
    counter: true,
    carrying: true,
  };
  assert.ok(
    Object.values(skillEffects(q, c)).some((n) => n !== 0),
    d.id + " has no applicable effects",
  );
}
function duel(skills, weapon = 0) {
  const a = structuredClone(p),
    b = structuredClone(p);
  a.id = 1;
  b.id = 2;
  a.unique = null;
  b.unique = null;
  a.skills = structuredClone(skills);
  b.skills = [];
  a.weapon = weapon;
  b.weapon = 0;
  a.fatigue = b.fatigue = 0;
  a.matchForm = b.matchForm = 1;
  const battle = new Battle([[a], [b]], 4, 77);
  const [u, t] = battle.units;
  u.x = 0;
  u.z = 0;
  t.x = 1.5;
  t.z = 0;
  u.cooldown = 0;
  t.cooldown = 999;
  return battle;
}
// Real engine damage and movement, beyond formula-only checks.
let baseDamage = 0,
  trainedDamage = 0;
for (let seed = 1; seed <= 200; seed++)
  for (const [out, skills] of [
    [false, []],
    [true, [{ id: "sword", level: 10, xp: 0 }]],
  ]) {
    const b = duel(skills);
    b.rng.seed = seed;
    b.step(0.5);
    const damage = 100 - b.units[1].hp;
    if (out) trainedDamage += damage;
    else baseDamage += damage;
  }
assert.ok(trainedDamage > baseDamage * 1.06, { baseDamage, trainedDamage });
const kite = duel([{ id: "skirmish", level: 10, xp: 0 }], 4);
kite.units[1].x = 4;
kite.step(0.5);
assert.ok(kite.units[0].x < 0, "Skirmisher must step away from close pressure");
const normal = duel([]);
normal.units[1].x = 15;
normal.units[0].cooldown = 999;
normal.step(0.5);
const mobile = duel([{ id: "footwork", level: 10, xp: 0 }]);
mobile.units[1].x = 15;
mobile.units[0].cooldown = 999;
mobile.step(0.5);
assert.ok(mobile.units[0].x > normal.units[0].x);
const flanking = duel([{ id: "flanking", level: 10, xp: 0 }]);
assert.equal(flanking.units[0].behavior, "flank");
const ally = { ...flanking.units[0], id: 3, targetId: 4, alive: true };
const distant = { ...flanking.units[1], id: 4, x: 4, alive: true };
flanking.units.push(ally, distant);
assert.equal(
  flanking.styleTarget(
    flanking.units[0],
    [flanking.units[1], distant],
    flanking.units[1],
  ).id,
  4,
);
// A king's escort follows the protected unit instead of charging a distant enemy.
const guardTeam = s.players
  .slice(0, 5)
  .map((x) => ({ ...structuredClone(x), injury: 0 }));
const guardEnemy = s.market
  .slice(0, 5)
  .map((x) => ({ ...structuredClone(x), injury: 0 }));
const royal = new Battle([guardTeam, guardEnemy], 3, 909);
for (const unit of royal.units) {
  unit.x = unit.team ? 25 : -25;
  unit.z = 0;
  unit.cooldown = 999;
}
const king = royal.units.find((u) => u.team === 0 && u.king),
  escort = royal.units.find((u) => u.team === 0 && !u.king);
king.x = -20;
king.z = 15;
escort.x = -20;
escort.z = -15;
escort.behavior = "escort";
royal.step(0.5);
assert.ok(escort.z > -15, "Escort must move toward the allied king");
// Real calendar training and foreign save/rollover continuity.
let career = createCareer(
  {
    country: "한국",
    city: "서울",
    club: "기술 테스트",
    manager: "감독",
    age: 30,
  },
  602,
);
const trainee = career.players.find((p) => p.unique == null);
setSkillTraining(trainee, trainee.skills[0].id);
trainee.skills[0].xp = xpNeeded(trainee.skills[0].level) - 1;
trainee.injury = 0;
advanceCareer(career);
assert.ok(career.skillHistory.some((h) => h.playerId === trainee.id));
assert.ok(career.news.some((n) => n.title === "기술 숙련 향상"));
const trained = structuredClone(trainee.skills);
const resumed = migrateCareer(JSON.parse(JSON.stringify(career)));
assert.deepEqual(
  resumed.players.find((p) => p.id === trainee.id).skills,
  trained,
);
assert.deepEqual(migrateCareer(structuredClone(resumed)), resumed);
career.day = 96;
advanceWorld(career);
const foreignId = leagueId("브라질"),
  beforeForeign = structuredClone(
    clubRoster(career, foreignId, 0).map((p) => p.skills),
  );
assert.deepEqual(
  clubRoster(
    migrateCareer(JSON.parse(JSON.stringify(career))),
    foreignId,
    0,
  ).map((p) => p.skills),
  beforeForeign,
);
career.round = 14;
nextSeason(career);
assert.deepEqual(
  clubRoster(career, foreignId, 0).map((p) => p.skills),
  beforeForeign,
);
assert.deepEqual(trainee.skills, trained);
const bytes = Buffer.byteLength(JSON.stringify(career), "utf16le");
assert.ok(bytes < 4 * 1024 * 1024, `save too large: ${bytes}`);
console.log(
  JSON.stringify({
    passed: true,
    commonSkills: 23,
    signatureSkills: 100,
    saveBytes: bytes,
    baseDamage,
    trainedDamage,
    checks: [
      "seven-slot-cap",
      "level-1-to-10",
      "signature-ownership",
      "deterministic-migration",
      "acquisition-and-forgetting",
      "injury-restraints",
      "conditional-effects",
      "real-combat-damage",
      "movement-and-target-behavior",
      "calendar-training-and-news",
      "foreign-save-continuity",
      "season-persistence",
    ],
  }),
);

import assert from "node:assert/strict";
import { createWorld, nextFixture, stats } from "../dist/engine.js";
import {
  countries,
  createCareer,
  migrateCareer,
  advanceCareer,
  pendingNews,
  resolveNews,
  trainingDay,
  setTrainingSlot,
  beginSeries,
  suggestLineup,
  prepareSet,
  completeSet,
  addNews,
  nextSeason,
} from "../dist/career.js";
const config = {
  country: "브라질",
  city: "마나우스",
  club: "정글 레이븐",
  manager: "윤 감독",
  age: 30,
};
const fresh = (seed) => createCareer(config, seed);
for (const c of countries) {
  const s = createCareer({ ...config, country: c.name, city: c.cities[0] }, 3);
  assert.equal(s.country, c.name);
  assert.equal(s.homeTerrain, c.terrains[0]);
  assert.equal(s.players.length, 30);
  assert.ok(s.players.every((p) => p.country === c.name));
  assert.equal(s.table[0].name, config.club);
}
assert.throws(() => createCareer({ ...config, age: 17 }), /나이/);
const old = createWorld(44);
old.day = 47;
old.round = 4;
old.budget = 123;
const players = structuredClone(old.players);
const migrated = migrateCareer(old);
assert.deepEqual(
  migrated.players.map((p) => p.record),
  players.map((p) => p.record),
);
assert.equal(migrated.budget, 123);
assert.equal(migrated.round, 4);
assert.ok(nextFixture(migrated).day > 47);
const seed = migrated.seed;
assert.deepEqual(migrateCareer(structuredClone(migrated)), migrated);
assert.equal(migrated.seed, seed);
const s = fresh(22);
assert.equal(trainingDay(s, 4).am, "전술");
assert.equal(trainingDay(s, 5).am, "경기");
assert.equal(trainingDay(s, 6).pm, "휴식");
assert.throws(() => beginSeries(s), /경기일/);
const advanced = advanceCareer(s, true);
assert.equal(advanced.reason, "news");
assert.equal(s.day, 2);
const sponsor = pendingNews(s);
const before = s.budget;
resolveNews(s, sponsor.id, "accept");
assert.equal(s.budget, before + 25);
assert.throws(() => resolveNews(s, sponsor.id, "accept"), /이미/);
assert.equal(advanceCareer(s, true).reason, "match");
assert.equal(s.day, 5);
assert.equal(advanceCareer(s, true).days, 0);
const series = beginSeries(s);
const initialRound = s.round;
assert.throws(
  () => prepareSet(s, series, [s.players[0].id], s.setPlans[0]),
  /11명/,
);
assert.throws(
  () => prepareSet(s, series, Array(11).fill(s.players[0].id), s.setPlans[0]),
  /11명/,
);
assert.equal(advanceCareer(s, true).days, 0);
while (!series.finished) {
  const mode = series.mode,
    ids = suggestLineup(s, mode, series.rosters[0]);
  const battle = prepareSet(s, series, ids, {
    tactic: "공격",
    formation: "분산",
    target: "약한 적",
  });
  assert.equal(battle.units.filter((u) => u.team === 0).length, ids.length);
  assert.throws(() => prepareSet(s, series, ids, s.setPlans[mode]), /준비/);
  for (let i = 0; i <= 7200 && !battle.done; i++) battle.step(0.5);
  completeSet(s, series, battle);
  assert.throws(() => completeSet(s, series, battle), /세트/);
  if (!series.finished) {
    assert.equal(series.mode, mode + 1);
    const resumed = migrateCareer(
      JSON.parse(JSON.stringify({ ...s, matchSeries: series })),
    );
    assert.deepEqual(resumed.matchSeries.wins, series.wins);
    assert.equal(resumed.matchSeries.phase, "preparation");
  }
}
assert.equal(s.round, initialRound + 1);
assert.equal(s.day, 5);
assert.equal(s.matchSeries, null);
assert.ok(series.wins.includes(3));
assert.equal(s.table[0].played, 1);
const low = fresh(7),
  high = fresh(7);
for (const world of [low, high]) {
  world.round = 14;
  world.schedule = [];
  world.autoRecovery = false;
}
// Daily training uses the same advancing path; schedule the first game far enough away.
for (const world of [low, high]) {
  world.round = 0;
  world.schedule = fresh(7).schedule;
  world.fixtureDays = world.schedule.map((_, i) => 200 + i * 7);
}
for (let i = 0; i < 7; i++) {
  setTrainingSlot(low, i, "am", "휴식");
  setTrainingSlot(low, i, "pm", "휴식");
  setTrainingSlot(high, i, "am", "체력");
  setTrainingSlot(high, i, "pm", "체력");
  setTrainingSlot(high, i, "intensity", "강하게");
}
for (let d = 0; d < 35; d++) {
  for (const world of [low, high]) {
    if (pendingNews(world))
      resolveNews(world, pendingNews(world).id, "decline");
    advanceCareer(world);
  }
}
assert.ok(
  high.players.reduce((n, p) => n + p.fatigue, 0) >
    low.players.reduce((n, p) => n + p.fatigue, 0),
);
assert.ok(high.growthLog.length > 0);
assert.equal(low.growthLog.length, 0);
const sale = fresh(18),
  p = sale.players[0],
  offer = addNews(sale, {
    category: "이적",
    title: "이적",
    text: "이적 제안",
    mustRespond: true,
    action: { kind: "transfer", playerId: p.id, clubId: 1, amount: 80 },
  });
const money = sale.budget;
resolveNews(sale, offer.id, "accept");
assert.equal(sale.budget, money + 80);
assert.ok(!sale.players.some((x) => x.id === p.id));
assert.ok(sale.opponentSquads[1].some((x) => x.id === p.id));
assert.equal(sale.opponentSquads[1].length, 30);
assert.equal(sale.transferHistory.length, 1);
sale.players = sale.players.slice(0, 20);
const blocked = addNews(sale, {
  title: "이적",
  text: "",
  action: {
    kind: "transfer",
    playerId: sale.players[0].id,
    clubId: 2,
    amount: 90,
  },
});
assert.throws(() => resolveNews(sale, blocked.id, "accept"), /20명/);
const season = fresh(11);
season.round = 14;
season.elapsed = 123;
season.talkDay[season.players[0].id] = 0;
nextSeason(season);
assert.equal(season.day, 0);
assert.equal(season.round, 0);
assert.equal(season.elapsed, 123);
assert.equal(season.season, 2027);
assert.equal(Object.keys(season.talkDay).length, 0);
console.log(
  JSON.stringify({
    passed: true,
    checks: [
      "12-countries",
      "legacy-save-migration",
      "calendar-gating",
      "mandatory-inbox-response",
      "idempotent-decisions",
      "training-load-and-growth",
      "five-set-preparation",
      "lineup-validation",
      "checkpoint-resume",
      "transfer-completion",
      "roster-minimum",
      "new-season",
    ],
  }),
);

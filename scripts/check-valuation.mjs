import assert from "node:assert/strict";
import { value } from "../dist/engine.js";
import {
  createCareer,
  migrateCareer,
  nextSeason,
  beginSeries,
  prepareSet,
  completeSet,
  suggestLineup,
  addNews,
  resolveNews,
} from "../dist/career.js";
import {
  advanceWorld,
  clubRoster,
  leagueId,
  finishDomesticRound,
} from "../dist/world.js";
import {
  emptyRecord,
  recordKeys,
  seasonStats,
  recordSet,
  ensureSeasonRecord,
} from "../dist/valuation.js";

const config = {
  country: "한국",
  city: "서울",
  club: "시즌 평가",
  manager: "감독",
  age: 30,
};
const fresh = () => createCareer(config, 511);
const clone = (s) => migrateCareer(JSON.parse(JSON.stringify(s)));
const s = fresh();
const p = s.players.find((p) => p.unique == null);
p.age = 24;
p.fame = 20;
assert.equal(value(p), 36);
Object.assign(p.seasonRecord, {
  games: 20,
  kills: 40,
  assists: 20,
  deaths: 20,
  objectives: 4,
});
assert.equal(value(p), 77);
p.record.kills = 100000;
assert.equal(value(p), 77, "Lifetime exploits must not affect current value");
p.fame = 80;
assert.equal(
  value(p),
  125,
  "Reputation must increase value with identical season stats",
);
p.unique = 0;
assert.equal(
  value(p),
  149,
  "Existing internal motif multiplier remains compatible",
);
p.unique = null;
Object.assign(p.seasonRecord, emptyRecord(), { games: 1, kills: 10 });
assert.equal(value(p), 114, "Small samples use a five-set denominator");
Object.assign(p.seasonRecord, { games: 5 });
assert.equal(value(p), 114);
Object.assign(p.seasonRecord, { games: 10 });
assert.equal(value(p), 99);
p.fame = 0;
p.seasonRecord.deaths = 10000;
assert.equal(value(p), 6);

// Actual series integration: collect each played set once at match completion,
// even when saving and restoring between sets.
let live = fresh();
live.day = 5;
let series = beginSeries(live);
for (const winner of [0, 1, 0, 1, 0]) {
  const ids = suggestLineup(live, series.mode, series.rosters[0]);
  const battle = prepareSet(live, series, ids, {
    tactic: "균형",
    formation: "균형",
    target: "가까운 적",
  });
  battle.done = true;
  battle.winner = winner;
  for (const u of battle.units) {
    u.kills = u.team === winner ? 2 : 1;
    u.assists = 1;
    u.deaths = 1;
    u.objectives = series.mode === 1 ? 1 : 0;
  }
  completeSet(live, series, battle);
  if (!series.finished) {
    live = clone(live);
    series = live.matchSeries;
  }
}
for (const records of [
  series.records.filter((r) => r.team === 0),
  series.records.filter((r) => r.team === 1),
]) {
  const roster =
    records[0].team === 0
      ? live.players
      : live.opponentSquads[series.opponentId];
  for (const player of roster) {
    const expected = emptyRecord();
    for (const r of records.filter((r) => r.id === player.id)) {
      expected.games++;
      for (const key of ["kills", "deaths", "assists", "objectives"])
        expected[key] += r[key];
      expected.aceWins += +r.aceWin;
    }
    for (const key of recordKeys) {
      assert.equal(player.record[key], expected[key]);
      assert.equal(player.seasonRecord[key], expected[key]);
    }
  }
}
const serialized = JSON.stringify(live);
assert.equal(
  JSON.stringify(clone(live)),
  serialized,
  "Reload cannot credit another appearance",
);

// Same domestic and foreign recording rules, persistent fame, and no reroll on load.
const foreignId = leagueId("스위스");
const foreign = clubRoster(live, foreignId, 0);
assert.ok(foreign.some((p) => p.record.games > 0));
for (const p of foreign)
  for (const key of recordKeys)
    assert.equal(p.record[key], seasonStats(p)[key]);
assert.deepEqual(
  clubRoster(clone(live), foreignId, 0).map((p) => [
    p.fame,
    value(p),
    p.seasonRecord,
  ]),
  foreign.map((p) => [p.fame, value(p), p.seasonRecord]),
);

const moved = live.players.find((p) => p.record.games > 0);
const current = structuredClone(moved.seasonRecord),
  cumulative = structuredClone(moved.record);
const bid = addNews(live, {
  category: "이적",
  title: "이적",
  text: "제안",
  action: {
    kind: "transfer",
    playerId: moved.id,
    clubId: 1,
    amount: value(moved),
  },
});
const cash = live.budget,
  fee = value(moved);
resolveNews(live, bid.id, "accept");
assert.equal(Math.round(live.budget - cash), fee);
assert.ok(live.opponentSquads[1].includes(moved));
assert.deepEqual(
  moved.seasonRecord,
  current,
  "Transfers retain the whole current season",
);
assert.deepEqual(moved.record, cumulative);

// Reset every population without erasing career achievements or reputation.
const foreignBefore = foreign.map((p) => ({
  record: { ...p.record },
  fame: p.fame,
}));
live.round = 14;
nextSeason(live);
for (const p of [
  ...live.players,
  ...live.market,
  ...live.youth,
  ...Object.values(live.opponentSquads).flat(),
]) {
  assert.equal(p.seasonRecord.season, 2027);
  for (const key of recordKeys) assert.equal(p.seasonRecord[key], 0);
}
assert.deepEqual(moved.record, cumulative);
const nextForeign = clubRoster(live, foreignId, 0);
nextForeign.forEach((p, i) => {
  assert.deepEqual(p.record, foreignBefore[i].record);
  assert.equal(p.fame, foreignBefore[i].fame);
  assert.equal(p.seasonRecord.games, 0);
  assert.equal(p.seasonRecord.season, 2027);
});
live.day = 5;
advanceWorld(live);
finishDomesticRound(live, [3, 0]);
for (const [i, p] of nextForeign.entries())
  for (const key of recordKeys)
    assert.equal(
      p.record[key] - foreignBefore[i].record[key],
      p.seasonRecord[key],
    );
assert.deepEqual(clone(live).world, live.world);

function oldSave(s) {
  delete s.valuationVersion;
  for (const p of [
    ...s.players,
    ...s.market,
    ...s.youth,
    ...Object.values(s.opponentSquads).flat(),
  ])
    delete p.seasonRecord;
  delete s.world.valuationVersion;
  for (const l of s.world.leagues)
    for (const club of l.table) delete club.seasonRecords;
  return JSON.parse(JSON.stringify(s));
}
const oldFirst = oldSave(fresh());
oldFirst.players[0].record = { ...emptyRecord(), games: 10, kills: 30 };
migrateCareer(oldFirst);
assert.equal(oldFirst.players[0].seasonRecord.kills, 30);
assert.equal(oldFirst.players[0].seasonRecord.partial, false);
const oldLater = oldSave(live);
const before = { ...oldLater.players[0].record },
  fameBefore = oldLater.players[0].fame;
migrateCareer(oldLater);
assert.deepEqual(oldLater.players[0].record, before);
assert.equal(oldLater.players[0].fame, fameBefore);
assert.equal(oldLater.players[0].seasonRecord.games, 0);
assert.equal(oldLater.players[0].seasonRecord.partial, true);
assert.equal(
  clubRoster(oldLater, foreignId, 0).find((p) => p.record.games > 0)
    .seasonRecord.games,
  0,
);
assert.equal(
  oldLater.news.filter((n) => n.title === "시즌 실적 기반 선수 평가").length,
  1,
);
assert.deepEqual(clone(oldLater), oldLater);
const migratedPlayer = oldLater.players[0];
recordSet(migratedPlayer, 2027, { games: 1, kills: 3 });
assert.equal(migratedPlayer.seasonRecord.kills, 3);
assert.equal(migratedPlayer.record.kills, before.kills + 3);
ensureSeasonRecord(migratedPlayer, 2028);
assert.equal(migratedPlayer.seasonRecord.partial, false);
assert.equal(migratedPlayer.seasonRecord.kills, 0);
console.log(
  JSON.stringify({
    passed: true,
    checks: [
      "current-season-only-value",
      "reputation-weight",
      "small-sample-stability",
      "five-set-match-and-resume",
      "foreign-fame-persistence",
      "transfer-record-continuity",
      "all-rosters-season-reset",
      "legacy-first-season-recovery",
      "legacy-multiseason-no-invented-stats",
      "migration-idempotence",
    ],
  }),
);

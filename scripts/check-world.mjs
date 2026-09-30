import assert from "node:assert/strict";
import {
  createCareer,
  migrateCareer,
  advanceCareer,
  resolveNews,
  pendingNews,
  nextSeason,
} from "../dist/career.js";
import { countries } from "../dist/countries.js";
import {
  allLeagues,
  getLeague,
  leagueId,
  clubRoster,
  leagueFixtures,
  leaguePlayers,
  advanceWorld,
  finishDomesticRound,
} from "../dist/world.js";

const config = {
  country: "한국",
  city: "서울",
  club: "탐색 테스트",
  manager: "감독",
  age: 30,
};
const s = createCareer(config, 403);
assert.equal(allLeagues(s).length, 12);
assert.equal(s.world.leagues.length, 11);
const foreignId = leagueId("브라질");
const beforeSeed = s.seed,
  beforeId = s.nextId;
const ids = new Set();
for (const league of allLeagues(s))
  for (const club of league.table) {
    const roster = clubRoster(s, league.id, club.id);
    assert.equal(roster.length, 30);
    for (const p of roster) {
      assert.ok(!ids.has(p.id));
      ids.add(p.id);
    }
  }
assert.equal(ids.size, 2880);
assert.equal(s.seed, beforeSeed);
assert.equal(s.nextId, beforeId);
assert.strictEqual(clubRoster(s, leagueId(s.country), 0), s.players);
assert.strictEqual(clubRoster(s, leagueId(s.country), 1), s.opponentSquads[1]);
const identity = clubRoster(s, foreignId, 0).map((p) => ({
  id: p.id,
  name: p.name,
  portrait: p.portrait,
  stats: p.stats,
  hidden: p.hidden,
}));
assert.deepEqual(
  clubRoster(migrateCareer(JSON.parse(JSON.stringify(s))), foreignId, 0).map(
    (p) => ({
      id: p.id,
      name: p.name,
      portrait: p.portrait,
      stats: p.stats,
      hidden: p.hidden,
    }),
  ),
  identity,
);
advanceCareer(s, true);
assert.equal(s.day, 2);
assert.equal(getLeague(s, foreignId).round, 0);
resolveNews(s, pendingNews(s).id, "accept");
advanceCareer(s, true);
assert.equal(s.day, 5);
assert.equal(getLeague(s, foreignId).round, 1);
assert.equal(getLeague(s, leagueId(s.country)).round, 0);
const snapshot = JSON.stringify(s.world);
advanceWorld(s);
assert.equal(JSON.stringify(s.world), snapshot);
const paused = migrateCareer(JSON.parse(JSON.stringify(s)));
assert.equal(JSON.stringify(paused.world), snapshot);
assert.ok(
  leaguePlayers(s, foreignId).some(({ player }) => player.record.games > 0),
);
finishDomesticRound(s, [3, 1]);
assert.equal(getLeague(s, leagueId(s.country)).results.length, 4);
assert.equal(s.table[0].wins, 1);
assert.ok(
  Object.values(s.opponentSquads)
    .flat()
    .some((p) => p.record.games > 0),
);
assert.deepEqual(
  leagueFixtures(s, leagueId(s.country)).find(
    (f) => f.round === 1 && (f.home === 0 || f.away === 0),
  ).score,
  [3, 1],
);
// Local incoming transfers must immediately replace the browse roster without copies.
const moved = s.players.pop();
moved.team = 1;
s.opponentSquads[1].pop();
s.opponentSquads[1].push(moved);
assert.ok(clubRoster(s, leagueId(s.country), 1).includes(moved));
assert.ok(!clubRoster(s, leagueId(s.country), 0).includes(moved));
s.day = 96;
advanceWorld(s);
for (const league of s.world.leagues) {
  assert.equal(league.results.length, 56);
  assert.equal(league.round, 14);
  assert.equal(
    league.table.reduce((n, t) => n + t.wins, 0),
    56,
  );
  assert.equal(
    league.table.reduce((n, t) => n + t.losses, 0),
    56,
  );
  for (const t of league.table) assert.equal(t.played, 14);
  const totals = leaguePlayers(s, league.id).reduce(
    (r, { player: p }) => {
      for (const k of ["kills", "deaths"]) r[k] += p.record[k];
      return r;
    },
    { kills: 0, deaths: 0 },
  );
  assert.equal(totals.kills, totals.deaths);
  for (const result of league.results) {
    assert.equal(Math.max(...result.score), 3);
    assert.ok(Math.min(...result.score) < 3);
  }
  for (const t of league.table) {
    const matches = league.results.filter(
      (r) => r.home === t.id || r.away === t.id,
    );
    assert.equal(
      matches.reduce((sum, r) => sum + r.score[r.home === t.id ? 0 : 1], 0),
      t.for,
    );
  }
}
const same = migrateCareer(JSON.parse(JSON.stringify(s)));
assert.deepEqual(same.world, s.world);
const pastAge = clubRoster(s, foreignId, 0)[0].age;
const pastRecord = { ...clubRoster(s, foreignId, 0)[0].record };
s.round = 14;
nextSeason(s);
assert.equal(getLeague(s, foreignId).round, 0);
assert.equal(getLeague(s, foreignId).results.length, 0);
assert.equal(clubRoster(s, foreignId, 0)[0].age, pastAge + 1);
assert.deepEqual(clubRoster(s, foreignId, 0)[0].record, pastRecord);
assert.equal(getLeague(s, foreignId).season, s.season);
s.day = 5;
advanceWorld(s);
assert.equal(getLeague(s, foreignId).round, 1);
const savedBytes = Buffer.byteLength(JSON.stringify(s), "utf16le");
assert.ok(
  savedBytes < 4 * 1024 * 1024,
  `Save exceeds safe localStorage budget: ${savedBytes}`,
);
// Upgrade a progressed v0.3 save: keep table/player/budget, recover known own scores,
// and do not fabricate unavailable historical scores of other local clubs.
const legacy = createCareer(config, 102);
legacy.day = 5;
finishDomesticRound(legacy, [3, 2]);
delete legacy.world;
const table = structuredClone(legacy.table),
  roster = structuredClone(legacy.players),
  budget = legacy.budget;
migrateCareer(legacy);
assert.deepEqual(legacy.table, table);
assert.deepEqual(legacy.players, roster);
assert.equal(legacy.budget, budget);
assert.equal(legacy.world.localResults.length, 1);
assert.equal(
  leagueFixtures(legacy, leagueId(legacy.country)).filter(
    (f) => f.round === 1 && f.played && !f.score,
  ).length,
  3,
);
for (const c of countries) {
  const countrySave = createCareer(
    { ...config, country: c.name, city: c.cities[0] },
    3,
  );
  assert.equal(getLeague(countrySave, leagueId(c.name)).local, true);
  assert.equal(allLeagues(countrySave).length, 12);
}
console.log(
  JSON.stringify({
    passed: true,
    clubs: 96,
    players: 2880,
    backgroundMatches: 616,
    savedBytes,
    checks: [
      "stable-player-identity",
      "read-only-browsing",
      "calendar-sync",
      "save-resume-no-duplicate",
      "scores-and-table-agree",
      "local-transfer-reflection",
      "season-reset-and-ageing",
      "legacy-migration",
      "bounded-save-size",
    ],
  }),
);

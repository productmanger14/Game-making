import { countries } from "./countries.js";
import {
  player,
  rand,
  overall,
  modes,
  finishFixture,
  clamp,
} from "./engine.js";
import { matchReadiness } from "./attributes.js";
import { emptyRecord, ensureSeasonRecord, recordSet } from "./valuation.js";

const rosterCache = new WeakMap();
const suffixes = [
  "이클립스",
  "타이탄",
  "발키리",
  "센티널",
  "블레이즈",
  "아르테미스",
  "레이븐",
  "노바",
];
const hash = (text) => {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
};
const emptyStanding = () => ({
  played: 0,
  wins: 0,
  losses: 0,
  for: 0,
  against: 0,
});
export const leagueId = (country) =>
  `national-${countries.findIndex((c) => c.name === country)}`;
export const rankTable = (table) =>
  [...table].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.for - b.against - (a.for - a.against) ||
      b.for - a.for ||
      a.id - b.id,
  );

// Keep only seeds and changing records in saves. Full foreign profiles are
// deterministic and cached in memory, so browsing cannot reroll a player.
export function ensureWorld(s) {
  if (s.world?.version === 1) {
    ensureWorldSeasonRecords(s);
    return s.world;
  }
  s.world = {
    version: 1,
    seed: hash(`${s.seed}:world`),
    originSeason: s.season,
    localResults: [],
    leagues: [],
  };
  for (const [index, country] of countries.entries()) {
    if (country.name === s.country) continue;
    const id = leagueId(country.name);
    s.world.leagues.push({
      id,
      country: country.name,
      season: s.season,
      round: 0,
      results: [],
      table: country.cities.map((city, i) => ({
        id: i,
        name: `${city} ${suffixes[i]}`,
        city,
        terrain: country.terrains[i],
        ...emptyStanding(),
        seed: hash(`${s.world.seed}:${id}:${i}`),
        playerBase: -1000000 - index * 10000 - i * 100,
        records: Array.from({ length: 30 }, emptyRecord),
      })),
    });
  }
  // Old saves retain their existing table and career records. Only results
  // actually saved by earlier versions are shown; never invent old scores.
  for (const h of s.history.filter((h) => h.season === s.season)) {
    const pair = s.schedule[h.round - 1]?.find((p) => p.includes(0));
    const score = h.score.split(":").map(Number);
    if (pair && score.length === 2 && score.every(Number.isFinite))
      s.world.localResults.push({
        round: h.round,
        day: h.day,
        home: pair[0],
        away: pair[1],
        score: pair[0] === 0 ? score : score.reverse(),
      });
  }
  ensureWorldSeasonRecords(s);
  return s.world;
}
function ensureWorldSeasonRecords(s) {
  if (s.world.valuationVersion === 1) return;
  for (const league of s.world.leagues)
    for (const club of league.table)
      club.seasonRecords = club.records.map((record) =>
        ensureSeasonRecord(
          { record },
          s.season,
          s.season === s.world.originSeason,
        ),
      );
  s.world.valuationVersion = 1;
}
export function getLeague(s, id = leagueId(s.country)) {
  ensureWorld(s);
  if (id === leagueId(s.country))
    return {
      id,
      country: s.country,
      name: `${s.country} 도시 리그`,
      season: s.season,
      local: true,
      round: s.round,
      table: s.table,
      results: s.world.localResults,
    };
  const league = s.world.leagues.find((l) => l.id === id);
  return league
    ? { ...league, name: `${league.country} 도시 리그`, local: false }
    : null;
}
export function allLeagues(s) {
  return countries.map((c) => getLeague(s, leagueId(c.name)));
}
export function clubRoster(s, id, clubId) {
  const league = getLeague(s, id);
  if (!league || !league.table.some((t) => t.id === clubId)) return [];
  if (league.local)
    return clubId === 0 ? s.players : s.opponentSquads[clubId] || [];
  const saved = s.world.leagues.find((l) => l.id === id);
  let cache = rosterCache.get(saved);
  if (!cache) {
    cache = new Map();
    rosterCache.set(saved, cache);
  }
  const club = saved.table.find((t) => t.id === clubId);
  if (!cache.has(clubId)) {
    const generator = {
      seed: club.seed,
      nextId: club.playerBase,
      season: s.season,
    };
    const years = s.season - s.world.originSeason;
    const roster = Array.from({ length: 30 }, (_, i) => {
      const p = player(generator, {
        country: league.country,
        team: clubId,
        level: club.seed % 3,
      });
      p.record = club.records[i];
      p.seasonRecord = club.seasonRecords[i];
      p.fame = club.fames?.[i] ?? p.fame;
      p.age += years;
      p.contract += years;
      for (const k of ["speed", "accel", "agility"])
        p.stats[k] = Math.max(
          1,
          p.stats[k] -
            Math.floor(Math.max(0, p.age - 30) / 4) +
            Math.floor(Math.max(0, p.age - years - 30) / 4),
        );
      return p;
    });
    cache.set(clubId, roster);
  }
  return cache.get(clubId);
}

function distribute(rng, lineup, key, amount, once = false) {
  const available = [...lineup];
  for (let n = 0; n < amount && available.length; n++) {
    const index = Math.floor(rand(rng) * available.length);
    available[index].record[key]++;
    if (once) available.splice(index, 1);
  }
}
// Background matches use the same five modes and a best-of-five series,
// with an aggregate model rather than running thousands of 3D battles.
function quickMatch(s, id, home, away, round) {
  const rng = {
    seed: hash(`${s.world.seed}:${s.season}:${id}:${round}:${home}`),
  };
  const rosters = [clubRoster(s, id, home), clubRoster(s, id, away)];
  const form = new Map(
    rosters
      .flat()
      .map((p) => [p.id, matchReadiness(p, () => rand(rng), round >= 12)]),
  );
  const score = [0, 0];
  for (let mode = 0; mode < 5 && Math.max(...score) < 3; mode++) {
    const n = modes[mode].n;
    const lineups = rosters.map((roster) =>
      [...roster]
        .filter((p) => !p.injury)
        .map((p) => ({
          p,
          rating: overall(p) * form.get(p.id) + rand(rng) * 12,
        }))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, n)
        .map((x) => ({ ...x.p, record: emptyRecord() })),
    );
    if (lineups.some((l) => !l.length)) {
      score[lineups[0].length ? 0 : 1] = 3;
      break;
    }
    const strength = lineups.map(
      (l) => l.reduce((a, p) => a + overall(p) * form.get(p.id), 0) / l.length,
    );
    const winner =
      rand(rng) <
      clamp(0.5 + (strength[0] - strength[1]) / 70 + 0.03, 0.15, 0.85)
        ? 0
        : 1;
    score[winner]++;
    for (const lineup of lineups) for (const p of lineup) p.record.games++;
    const loser = 1 - winner;
    let wins = n,
      losses = Math.floor(rand(rng) * n);
    if (mode === 2) {
      wins = 30 + Math.floor(rand(rng) * 61);
      losses = Math.floor(wins * (0.45 + rand(rng) * 0.5));
    }
    if (mode === 1) {
      wins = 6 + Math.floor(rand(rng) * 15);
      losses = Math.floor(rand(rng) * 20);
      distribute(rng, lineups[winner], "objectives", 3);
      distribute(rng, lineups[loser], "objectives", Math.floor(rand(rng) * 3));
    }
    if (mode === 3) {
      wins = 1 + Math.floor(rand(rng) * 5);
      losses = Math.floor(rand(rng) * 5);
    }
    if (mode !== 2) {
      wins = Math.min(wins, lineups[loser].length);
      losses = Math.min(losses, Math.max(0, lineups[winner].length - 1));
    }
    distribute(rng, lineups[winner], "kills", wins);
    distribute(rng, lineups[loser], "deaths", wins, mode !== 2);
    distribute(rng, lineups[loser], "kills", losses);
    distribute(rng, lineups[winner], "deaths", losses, mode !== 2);
    if (mode !== 4) {
      distribute(rng, lineups[winner], "assists", Math.floor(wins * rand(rng)));
      distribute(
        rng,
        lineups[loser],
        "assists",
        Math.floor(losses * rand(rng)),
      );
    } else lineups[winner][0].record.aceWins++;
    for (let team = 0; team < 2; team++)
      for (const appearance of lineups[team])
        recordSet(
          rosters[team].find((p) => p.id === appearance.id),
          s.season,
          appearance.record,
        );
  }
  const foreign = s.world.leagues.find((l) => l.id === id);
  if (foreign)
    for (const [team, clubId] of [home, away].entries())
      foreign.table.find((t) => t.id === clubId).fames = rosters[team].map(
        (p) => p.fame,
      );
  return { round, day: s.fixtureDays[round - 1], home, away, score };
}
function applyResult(table, result) {
  const [a, b] = [table[result.home], table[result.away]];
  const [sa, sb] = result.score;
  a.played++;
  b.played++;
  a.for += sa;
  a.against += sb;
  b.for += sb;
  b.against += sa;
  (sa > sb ? a : b).wins++;
  (sa > sb ? b : a).losses++;
}
export function advanceWorld(s) {
  ensureWorld(s);
  for (const league of s.world.leagues) {
    while (
      league.round < s.schedule.length &&
      s.fixtureDays[league.round] <= s.day
    ) {
      for (const [home, away] of s.schedule[league.round]) {
        const result = quickMatch(s, league.id, home, away, league.round + 1);
        applyResult(league.table, result);
        league.results.push(result);
      }
      league.round++;
    }
  }
}
export function finishDomesticRound(s, score, options = {}) {
  ensureWorld(s);
  const round = s.round + 1,
    id = leagueId(s.country);
  const pairs = s.schedule[s.round];
  if (!pairs) throw Error("시즌이 종료되었습니다.");
  const other = pairs
    .filter((pair) => !pair.includes(0))
    .map(([a, b]) => quickMatch(s, id, a, b, round));
  const pair = pairs.find((p) => p.includes(0));
  const own = {
    round,
    day: s.day,
    home: pair[0],
    away: pair[1],
    score: pair[0] === 0 ? [...score] : [score[1], score[0]],
  };
  finishFixture(s, score, other, options);
  s.world.localResults.push(...other, own);
  advanceWorld(s);
}
export function resetWorldSeason(s) {
  ensureWorld(s);
  for (const league of s.world.leagues) {
    league.lastSeason = {
      season: s.season,
      champion: rankTable(league.table)[0].name,
    };
    league.season = s.season + 1;
    league.round = 0;
    league.results = [];
    for (const t of league.table) {
      Object.assign(t, emptyStanding());
      t.seasonRecords = t.records.map(() =>
        ensureSeasonRecord({ record: emptyRecord() }, s.season + 1, true),
      );
    }
    rosterCache.delete(league);
  }
  s.world.localResults = [];
}
export function leagueFixtures(s, id) {
  const league = getLeague(s, id);
  if (!league) return [];
  return s.schedule.flatMap((pairs, round) =>
    pairs.map(([home, away]) => ({
      round: round + 1,
      day: s.fixtureDays[round],
      home,
      away,
      played: round < league.round,
      score:
        league.results.find(
          (r) => r.round === round + 1 && r.home === home && r.away === away,
        )?.score || null,
    })),
  );
}
export function leaguePlayers(s, id) {
  const league = getLeague(s, id);
  return league
    ? league.table.flatMap((club) =>
        clubRoster(s, id, club.id).map((p) => ({ player: p, club })),
      )
    : [];
}

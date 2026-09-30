// Career totals remain separate from the current season used by the market.
export const recordKeys = [
  "games",
  "kills",
  "deaths",
  "assists",
  "objectives",
  "aceWins",
];
export const emptyRecord = () =>
  Object.fromEntries(recordKeys.map((k) => [k, 0]));
const empty = Object.freeze(emptyRecord());
export const seasonStats = (p) => p.seasonRecord || empty;

export function ensureSeasonRecord(p, season, knownCurrentSeason = false) {
  if (p.seasonRecord?.season === season) return p.seasonRecord;
  const missing = !p.seasonRecord;
  p.seasonRecord = {
    season,
    ...emptyRecord(),
    partial: missing && !knownCurrentSeason && (p.record?.games || 0) > 0,
  };
  // Only migrate career totals when they are known to cover this season alone.
  if (missing && knownCurrentSeason)
    for (const k of recordKeys) p.seasonRecord[k] = p.record?.[k] || 0;
  return p.seasonRecord;
}

export function recordSet(p, season, result) {
  const current = ensureSeasonRecord(p, season);
  for (const k of recordKeys) {
    const amount = result[k] || 0;
    p.record[k] += amount;
    current[k] += amount;
  }
  p.fame = Math.min(100, p.fame + (result.kills > 0 ? 1 : 0));
}

export function valuation(p) {
  const r = seasonStats(p);
  const performance =
    (r.kills * 3 +
      r.assists * 1.5 +
      r.objectives * 8 +
      r.aceWins * 8 -
      r.deaths) /
    Math.max(5, r.games);
  const fame = Math.max(0, Math.min(100, p.fame || 0));
  const performanceValue = performance * 5;
  const reputationValue = fame * 0.8;
  const ageValue = p.age < 25 ? 8 : 0;
  const base = Math.max(6, 12 + performanceValue + reputationValue + ageValue);
  return {
    amount: Math.round(base * (p.unique != null ? 1.2 : 1)),
    performanceValue,
    reputationValue,
    ageValue,
    provisional: r.games < 5,
  };
}
export const marketValue = (p) => valuation(p).amount;

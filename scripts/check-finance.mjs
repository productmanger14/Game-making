import assert from "node:assert/strict";
import {
  createCareer,
  migrateCareer,
  nextSeason,
  advanceCareer,
  pendingNews,
  resolveNews,
  forfeitMatch,
  addNews,
} from "../dist/career.js";
import { finishDomesticRound } from "../dist/world.js";
import {
  ensureFinance,
  postTransaction,
  purchase,
  settleFinanceDay,
  signSponsor,
  sponsorOffers,
  setTicketPrice,
  estimateGate,
  weeklyCosts,
  monthlySummary,
  financeMonth,
  financeForecast,
  settleMatchFinance,
  settleSeasonPrize,
  money,
} from "../dist/finance.js";
const config = {
  country: "한국",
  city: "서울",
  club: "재정 테스트",
  manager: "감독",
  age: 30,
};
const fresh = (seed) => createCareer(config, seed);
function reconcile(s) {
  let balance = s.finance.openingBalance;
  for (const tx of s.finance.ledger) {
    balance = money(balance + tx.amount);
    assert.equal(tx.balance, balance);
  }
  assert.equal(balance, s.budget);
  const keys = s.finance.ledger.map((t) => t.key).filter(Boolean);
  assert.equal(new Set(keys).size, keys.length);
}
const s = fresh(500);
assert.equal(s.budget, 650);
assert.equal(s.finance.ledger.length, 0);
assert.equal(s.finance.broadcast.installments.length, 14);
const forecast = financeForecast(s);
assert.equal(forecast.contractIncome, 112);
assert.ok(forecast.operatingCosts > 0);
const offer = sponsorOffers(s)[0];
signSponsor(s, offer.id);
assert.equal(s.budget, 650 + offer.signing);
assert.throws(() => signSponsor(s, "challenge"), /이미/);
assert.equal(financeForecast(s).contractIncome, 160);
assert.equal(advanceCareer(s, true).reason, "news");
resolveNews(s, pendingNews(s).id, "accept");
advanceCareer(s, true);
assert.equal(s.day, 5);
assert.equal(
  s.finance.ledger.filter((t) => t.category === "broadcast").length,
  1,
);
const savedBudget = s.budget;
settleFinanceDay(s);
assert.equal(s.budget, savedBudget);
const plan = estimateGate(s, s.day);
finishDomesticRound(s, [3, 1]);
const gate = s.finance.ledger.find((t) => t.category === "tickets");
assert.equal(gate.meta.attendance, plan.attendance);
assert.equal(gate.amount, plan.revenue);
assert.equal(
  s.finance.ledger.find((t) => t.category === "eventCosts").amount,
  -plan.cost,
);
assert.equal(s.finance.ledger.find((t) => t.category === "match").amount, 30);
reconcile(s);
const balanceBeforeWeek = s.budget,
  costs = weeklyCosts(s);
s.day = 7;
settleFinanceDay(s);
assert.equal(
  s.budget,
  money(
    balanceBeforeWeek - Object.values(costs).reduce((n, x) => n + x, 0) + 12,
  ),
);
const stable = JSON.stringify(s.finance);
settleFinanceDay(s);
assert.equal(JSON.stringify(s.finance), stable);
const restored = migrateCareer(JSON.parse(JSON.stringify(s)));
assert.deepEqual(restored.finance, s.finance);
assert.equal(restored.budget, s.budget);
const current = financeMonth(s.season, s.day),
  month = monthlySummary(s, current);
assert.equal(month.closing, s.budget);
assert.equal(month.net, money(month.income - month.expense));
setTicketPrice(s, 10000);
const cheap = estimateGate(s, 12);
setTicketPrice(s, 40000);
const expensive = estimateGate(s, 12);
assert.ok(cheap.attendance > expensive.attendance);
assert.ok(cheap.attendance <= s.finance.capacity);
assert.throws(() => setTicketPrice(s, 45000));
assert.throws(() => setTicketPrice(s, 10500));
s.matchSeries = { finished: false };
assert.throws(() => setTicketPrice(s, 20000), /경기/);
s.matchSeries = null;
for (const [category, label] of [
  ["signing", "계약금"],
  ["release", "해지"],
  ["facilities", "시설"],
  ["staff", "보강"],
  ["scouting", "관찰"],
  ["youth", "모집"],
])
  purchase(s, 1.01, category, label);
reconcile(s);
assert.throws(() => purchase(s, 100000, "signing", "불가"), /잔액/);
assert.throws(() => purchase(s, -1, "signing", "불가"));
const sale = fresh(42),
  p = sale.players[0];
const news = addNews(sale, {
  title: "영입 제안",
  text: "",
  action: { kind: "transfer", playerId: p.id, clubId: 1, amount: 80 },
});
resolveNews(sale, news.id, "accept");
assert.equal(sale.finance.ledger.find((t) => t.category === "sale").amount, 80);
reconcile(sale);
// Imported budgets are opening balances, never reconstructed or retroactively paid.
const legacy = fresh(4);
delete legacy.finance;
legacy.day = 47;
legacy.budget = 123.45;
migrateCareer(legacy);
assert.equal(legacy.budget, 123.45);
assert.equal(legacy.finance.ledger.length, 0);
assert.ok(
  legacy.finance.broadcast.installments.some((i) => i.status === "previous"),
);
settleFinanceDay(legacy);
assert.equal(legacy.budget, 123.45);
reconcile(legacy);
const poor = fresh(8);
purchase(poor, 650, "facilities", "초기 투자");
poor.day = 7;
settleFinanceDay(poor);
assert.ok(poor.budget < 0);
assert.throws(() => purchase(poor, 1, "scouting", "관찰"), /잔액/);
assert.ok(poor.news.some((n) => n.title === "운영 자금 부족"));
reconcile(poor);
const cancelled = fresh(9);
cancelled.day = 5;
cancelled.players = cancelled.players.slice(0, 19);
forfeitMatch(cancelled);
assert.equal(
  cancelled.finance.ledger.filter((t) =>
    ["tickets", "match", "appearance"].includes(t.category),
  ).length,
  0,
);
assert.equal(
  cancelled.finance.ledger.find((t) => t.category === "fine").amount,
  -20,
);
reconcile(cancelled);
const season = fresh(12);
signSponsor(season, "challenge");
let featured = 0,
  home = 0;
for (let day = 1; day <= 96; day++) {
  season.day = day;
  settleFinanceDay(season);
  if (season.fixtureDays.includes(day)) {
    const pair = season.schedule[season.round].find((p) => p.includes(0));
    if (pair[0] === 0) home++;
    if (season.finance.broadcast.featuredRounds.includes(season.round + 1))
      featured++;
    finishDomesticRound(season, [3, 0]);
  }
}
assert.equal(
  season.finance.ledger.filter((t) => t.category === "broadcast").length,
  14,
);
assert.equal(
  season.finance.ledger.filter((t) => t.category === "appearance").length,
  featured,
);
assert.equal(
  season.finance.ledger.filter((t) => t.category === "tickets").length,
  home,
);
assert.equal(
  season.finance.ledger.filter((t) => t.category === "prize").length,
  1,
);
assert.equal(
  season.finance.ledger.find((t) => t.category === "prize").amount,
  240,
);
assert.equal(
  season.finance.ledger.filter((t) => t.label.includes("승리 보너스")).length,
  14,
);
assert.equal(
  season.finance.ledger.filter((t) => t.category === "wages").length,
  13,
);
const endBalance = season.budget;
settleSeasonPrize(season);
assert.equal(season.budget, endBalance);
reconcile(season);
const oldMonth = monthlySummary(season, "2026-01");
nextSeason(season);
assert.equal(season.finance.sponsor, null);
assert.equal(season.finance.broadcast.perRound, 32);
assert.equal(season.finance.seasonSummaries.length, 1);
assert.equal(season.finance.seasonSummaries[0].closing, endBalance);
assert.deepEqual(monthlySummary(season, "2026-01"), oldMonth);
assert.equal(monthlySummary(season, "2027-01").opening, endBalance);
signSponsor(season, "steady");
season.day = 5;
settleFinanceDay(season);
assert.equal(season.finance.ledger.at(-1).amount, 32);
reconcile(season);
console.log(
  JSON.stringify({
    passed: true,
    seasonTransactions: season.finance.ledger.length,
    checks: [
      "opening-balance-migration",
      "all-cash-movements-reconcile",
      "TV-installments-no-duplicate",
      "broadcast-appearance-fees",
      "weekly-itemized-costs",
      "sponsor-choice-and-bonuses",
      "home-gate-only",
      "ticket-demand",
      "forfeit-no-match-income",
      "monthly-close",
      "negative-cash",
      "sale-ledger",
      "season-prize-once",
      "contract-renewal",
      "historical-ledger-preserved",
    ],
  }),
);

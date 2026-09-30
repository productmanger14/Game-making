export const financeCategories = {
  broadcast: "TV 중계권",
  appearance: "편성 중계료",
  tickets: "입장 수입",
  sponsor: "후원",
  match: "경기 수당",
  prize: "시즌 상금",
  sale: "선수 매각",
  signing: "선수 계약금",
  wages: "1군 급료",
  youthWages: "유스 운영",
  staffWages: "스태프 급료",
  maintenance: "시설 유지",
  facilities: "시설 투자",
  staff: "스태프 보강",
  scouting: "스카우팅",
  youth: "유스 모집",
  release: "계약 해지",
  eventCosts: "경기 운영",
  fine: "기권 벌금",
};
export const money = (n) => Math.round(n * 100) / 100;
const limited = (n, a, b) => Math.max(a, Math.min(b, n));
export const financeDate = (season, day) =>
  new Date(Date.UTC(season, 0, 5 + day)).toISOString().slice(0, 10);
export const financeMonth = (season, day) =>
  financeDate(season, day).slice(0, 7);
const hash = (text) => {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
};
const sum = (list) => money(list.reduce((a, b) => a + b, 0));

function makeBroadcast(s, skipPast) {
  const rank = s.finance?.previousRank;
  const perRound = rank && rank <= 2 ? 32 : rank && rank <= 4 ? 30 : 28;
  return {
    name: "ARENA TV · 리그 공동 중계권",
    season: s.season,
    perRound,
    appearanceFee: 8,
    featuredRounds: s.schedule
      .map((_, i) => i + 1)
      .filter((r) => (r + hash(`${s.club}:${s.season}`)) % 3 === 0),
    installments: s.fixtureDays.map((day, i) => ({
      round: i + 1,
      day,
      amount: perRound,
      status: skipPast && day <= s.day ? "previous" : "scheduled",
    })),
  };
}
export function ensureFinance(s) {
  if (s.finance?.version === 1) return s.finance;
  s.budget = money(s.budget);
  s.finance = {
    version: 1,
    openingBalance: s.budget,
    started: { season: s.season, day: s.day },
    ledger: [],
    posted: {},
    notices: {},
    nextId: 1,
    ticketPrice: 20000,
    capacity: 4500,
    previousRank: null,
    sponsor: null,
    seasonSummaries: [],
    lastGate: null,
    reputation: Math.round(
      s.players.reduce((n, p) => n + p.fame, 0) / s.players.length,
    ),
  };
  s.finance.broadcast = makeBroadcast(s, true);
  return s.finance;
}
export function postTransaction(
  s,
  { key, category, label, amount, meta = null },
) {
  const f = ensureFinance(s);
  if (key && f.posted[key]) return null;
  if (!Number.isFinite(amount) || !financeCategories[category])
    throw Error("유효하지 않은 재정 거래입니다.");
  amount = money(amount);
  if (!amount) return null;
  const balance = (Math.round(s.budget * 100) + Math.round(amount * 100)) / 100;
  const entry = {
    id: f.nextId++,
    key: key || null,
    season: s.season,
    day: s.day,
    month: financeMonth(s.season, s.day),
    category,
    label,
    amount,
    balance,
    meta,
  };
  s.budget = balance;
  f.ledger.push(entry);
  if (key) f.posted[key] = true;
  return entry;
}
export function purchase(s, amount, category, label) {
  if (!Number.isFinite(amount) || amount <= 0)
    throw Error("지출 금액이 올바르지 않습니다.");
  if (Math.round(s.budget * 100) < Math.round(amount * 100))
    throw Error("잔액이 부족합니다. 재정센터에서 지급 일정을 확인하세요.");
  return postTransaction(s, { category, label, amount: -amount });
}
function notice(s, key, title, text) {
  const f = ensureFinance(s);
  if (f.notices[key]) return;
  f.notices[key] = true;
  s.nextNewsId ??= 1;
  s.news ??= [];
  s.news.unshift({
    id: s.nextNewsId++,
    day: s.day,
    season: s.season,
    category: "재정",
    title,
    text,
    sender: "재무 담당",
    read: false,
    action: null,
    mustRespond: false,
    playerId: null,
  });
}
export function weeklyCosts(s) {
  return {
    wages: sum(s.players.map((p) => p.wage)),
    youthWages: money(s.youth.reduce((n, p) => n + p.wage, 0) * 0.25),
    staffWages: Object.values(s.staff).reduce((a, b) => a + b, 0) * 2,
    maintenance: Object.values(s.facilities).reduce((a, b) => a + b, 0) * 3,
  };
}
export function sponsorOffers(s) {
  ensureFinance(s);
  const ratio = Math.max(0, s.schedule.length - s.round) / s.schedule.length;
  return [
    {
      id: "steady",
      name: "지역 기업 연합",
      type: "고정 지급형",
      weekly: 12,
      winBonus: 0,
      signing: money(20 * ratio),
    },
    {
      id: "challenge",
      name: "아레나 기어",
      type: "승리 보너스형",
      weekly: 7,
      winBonus: 10,
      signing: money(10 * ratio),
    },
  ];
}
export function signSponsor(s, id) {
  const f = ensureFinance(s);
  if (s.matchSeries && !s.matchSeries.finished)
    throw Error("경기가 끝난 뒤 계약할 수 있습니다.");
  if (f.sponsor?.season === s.season)
    throw Error("이번 시즌 후원 계약을 이미 체결했습니다.");
  if (s.round >= s.schedule.length)
    throw Error("다음 시즌에 후원 계약을 체결하세요.");
  const offer = sponsorOffers(s).find((o) => o.id === id);
  if (!offer) throw Error("유효한 후원 제안을 선택하세요.");
  f.sponsor = { ...offer, season: s.season, signedDay: s.day };
  postTransaction(s, {
    key: `sponsor-sign:${s.season}`,
    category: "sponsor",
    label: `${offer.name} 계약금`,
    amount: offer.signing,
  });
  notice(
    s,
    `sponsor-sign:${s.season}`,
    "시즌 후원 계약 체결",
    `${offer.name}과 시즌 종료까지 계약했습니다. 매주 ${offer.weekly}백만원, 승리 보너스 ${offer.winBonus}백만원. 계약금 ${offer.signing}백만원이 입금되었습니다.`,
  );
  return f.sponsor;
}
export function setTicketPrice(s, price) {
  if (s.matchSeries && !s.matchSeries.finished)
    throw Error("경기가 끝난 뒤 가격을 변경하세요.");
  if (
    !Number.isInteger(price) ||
    price < 10000 ||
    price > 40000 ||
    price % 1000
  )
    throw Error("입장권은 10,000~40,000원에서 1,000원 단위로 설정하세요.");
  ensureFinance(s).ticketPrice = price;
}
export function monthlySummary(s, month = financeMonth(s.season, s.day)) {
  const f = ensureFinance(s),
    rows = f.ledger.filter((t) => t.month === month);
  const income = sum(rows.filter((t) => t.amount > 0).map((t) => t.amount)),
    expense = -sum(rows.filter((t) => t.amount < 0).map((t) => t.amount));
  const opening = money(
    f.openingBalance +
      sum(f.ledger.filter((t) => t.month < month).map((t) => t.amount)),
  );
  return {
    month,
    rows,
    income,
    expense,
    net: money(income - expense),
    opening,
    closing: money(opening + income - expense),
  };
}
export function settleFinanceDay(s) {
  const f = ensureFinance(s);
  const paid = [];
  for (const installment of f.broadcast.installments) {
    if (installment.status !== "scheduled" || installment.day > s.day) continue;
    const tx = postTransaction(s, {
      key: `tv:${s.season}:${installment.round}`,
      category: "broadcast",
      label: `TV 중계권 ${installment.round}/${s.schedule.length}회차`,
      amount: installment.amount,
    });
    installment.status = "paid";
    if (tx) paid.push(tx.amount);
  }
  if (paid.length)
    notice(
      s,
      `tv-day:${s.season}:${s.day}`,
      "TV 중계권 분배금 입금",
      `${paid.length}회차 분배금 ${sum(paid)}백만원이 입금되었습니다. 재정센터에서 남은 지급 일정을 확인하세요.`,
    );
  if (s.day > 0 && s.day % 7 === 0) {
    const week = `${s.season}:${s.day}`,
      costs = weeklyCosts(s);
    let total = 0;
    for (const [category, amount] of Object.entries(costs)) {
      const tx = postTransaction(s, {
        key: `weekly:${week}:${category}`,
        category,
        label: `주간 ${financeCategories[category]}`,
        amount: -amount,
      });
      if (tx) total -= tx.amount;
    }
    const sponsor = f.sponsor;
    if (sponsor?.season === s.season && s.day > sponsor.signedDay)
      postTransaction(s, {
        key: `sponsor-week:${week}`,
        category: "sponsor",
        label: `${sponsor.name} 주간 후원금`,
        amount: sponsor.weekly,
      });
    notice(
      s,
      `weekly:${week}`,
      "주간 재정 보고",
      `1군 급료·유스 운영·스태프 급료·시설 유지비 ${money(total)}백만원을 정산했습니다. 현재 잔액 ${s.budget}백만원.`,
    );
  }
  const today = financeMonth(s.season, s.day),
    previous = financeMonth(s.season, s.day - 1);
  if (today !== previous && s.day > 0) {
    const summary = monthlySummary(s, previous);
    notice(
      s,
      `month:${previous}`,
      "월간 재정 결산",
      `${previous} 수입 ${summary.income}백만원 · 지출 ${summary.expense}백만원 · 순현금흐름 ${summary.net}백만원. 재정센터의 월별 내역에서 확인할 수 있습니다.`,
    );
  }
  if (s.budget < 0)
    notice(
      s,
      `negative:${s.season}:${Math.floor(s.day / 7)}`,
      "운영 자금 부족",
      `잔액이 ${s.budget}백만원입니다. 선택 지출을 줄이고 예정된 중계료·후원금과 선수 매각을 검토하세요. 급료와 유지비는 계속 정산됩니다.`,
    );
}
export function estimateGate(
  s,
  day,
  wins = s.table[0].wins,
  played = s.table[0].played,
) {
  const f = ensureFinance(s),
    form = played ? wins / played : 0.5;
  const demand = 0.66 + f.reputation / 250 + form * 0.14;
  const variation = 0.94 + (hash(`${s.club}:${s.season}:${day}`) % 121) / 1000;
  const fill = limited(
    demand * Math.pow(20000 / f.ticketPrice, 0.75) * variation,
    0.12,
    0.98,
  );
  const attendance = Math.round(f.capacity * fill);
  return {
    attendance,
    capacity: f.capacity,
    ticketPrice: f.ticketPrice,
    revenue: money((attendance * f.ticketPrice) / 1000000),
    cost: money(8 + (attendance * 2000) / 1000000),
  };
}
export function settleMatchFinance(
  s,
  fixture,
  result,
  { forfeit = false } = {},
) {
  const f = ensureFinance(s),
    round = s.round + 1,
    prefix = `match:${s.season}:${round}`;
  if (f.posted[`${prefix}:settled`]) return 0;
  const before = s.budget,
    win = result[0] > result[1];
  if (forfeit)
    postTransaction(s, {
      key: `${prefix}:fine`,
      category: "fine",
      label: `${fixture.opponent.name}전 기권 벌금`,
      amount: -20,
    });
  else {
    postTransaction(s, {
      key: `${prefix}:allowance`,
      category: "match",
      label: `${fixture.opponent.name}전 ${win ? "승리" : "참가"} 수당`,
      amount: win ? 30 : 15,
    });
    if (f.broadcast.featuredRounds.includes(round))
      postTransaction(s, {
        key: `${prefix}:tv`,
        category: "appearance",
        label: `${fixture.opponent.name}전 편성 중계료`,
        amount: f.broadcast.appearanceFee,
      });
    if (fixture.home) {
      const gate = estimateGate(
        s,
        s.day,
        s.table[0].wins - (win ? 1 : 0),
        Math.max(0, s.table[0].played - 1),
      );
      postTransaction(s, {
        key: `${prefix}:tickets`,
        category: "tickets",
        label: `${fixture.opponent.name}전 입장 수입`,
        amount: gate.revenue,
        meta: gate,
      });
      postTransaction(s, {
        key: `${prefix}:costs`,
        category: "eventCosts",
        label: `${fixture.opponent.name}전 경기장 운영`,
        amount: -gate.cost,
      });
      f.lastGate = {
        ...gate,
        season: s.season,
        day: s.day,
        opponent: fixture.opponent.name,
      };
    }
    if (win && f.sponsor?.season === s.season && f.sponsor.winBonus)
      postTransaction(s, {
        key: `${prefix}:sponsor`,
        category: "sponsor",
        label: `${f.sponsor.name} 승리 보너스`,
        amount: f.sponsor.winBonus,
      });
  }
  f.posted[`${prefix}:settled`] = true;
  const change = money(s.budget - before);
  notice(
    s,
    prefix,
    "경기일 재정 정산",
    `${fixture.opponent.name}전 순현금흐름 ${change}백만원. 입장 수입·운영비·경기 수당·편성 중계료는 거래 장부에서 각각 확인할 수 있습니다.`,
  );
  return change;
}
export function settleSeasonPrize(s) {
  if (s.round < s.schedule.length) return null;
  const order = [...s.table].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.for - b.against - (a.for - a.against) ||
      b.for - a.for ||
      a.id - b.id,
  );
  const rank = order.findIndex((t) => t.id === 0) + 1,
    amount = [240, 180, 140, 110, 90, 70, 50, 30][rank - 1];
  const tx = postTransaction(s, {
    key: `prize:${s.season}`,
    category: "prize",
    label: `리그 ${rank}위 시즌 상금`,
    amount,
  });
  if (tx)
    notice(
      s,
      `prize:${s.season}`,
      "시즌 순위 상금 입금",
      `${s.season}시즌 ${rank}위 상금 ${amount}백만원이 입금되었습니다.`,
    );
  return tx;
}
export function rollFinanceSeason(s, rank) {
  const f = ensureFinance(s),
    previous = s.season - 1;
  const rows = f.ledger.filter((t) => t.season === previous);
  f.seasonSummaries.push({
    season: previous,
    rank,
    income: sum(rows.filter((t) => t.amount > 0).map((t) => t.amount)),
    expense: -sum(rows.filter((t) => t.amount < 0).map((t) => t.amount)),
    closing: s.budget,
  });
  f.previousRank = rank;
  f.sponsor = null;
  f.reputation = Math.round(
    s.players.reduce((n, p) => n + p.fame, 0) / s.players.length,
  );
  f.broadcast = makeBroadcast(s, false);
  notice(
    s,
    `new-season:${s.season}`,
    "새 시즌 중계권·후원 안내",
    `리그 중계권 분배금은 회차당 ${f.broadcast.perRound}백만원입니다. 지난 시즌 후원 계약이 종료되어 새 후원사를 선택할 수 있습니다.`,
  );
}
export function financeForecast(s, horizon = 28) {
  const f = ensureFinance(s),
    end = Math.min(s.day + horizon, s.fixtureDays.at(-1)),
    costs = weeklyCosts(s);
  let contractIncome = 0,
    matchIncome = 0,
    operatingCosts = 0;
  if (s.round >= s.schedule.length)
    return {
      days: 0,
      contractIncome,
      matchIncome,
      operatingCosts,
      closing: s.budget,
    };
  for (let day = s.day + 1; day <= end; day++) {
    contractIncome += f.broadcast.installments
      .filter((i) => i.status === "scheduled" && i.day === day)
      .reduce((n, i) => n + i.amount, 0);
    if (day % 7 === 0) {
      operatingCosts += sum(Object.values(costs));
      if (f.sponsor?.season === s.season && day > f.sponsor.signedDay)
        contractIncome += f.sponsor.weekly;
    }
  }
  for (let r = s.round; r < s.schedule.length; r++) {
    const day = s.fixtureDays[r];
    if (day < s.day || day > end) continue;
    const pair = s.schedule[r].find((p) => p.includes(0));
    matchIncome += 15;
    if (f.broadcast.featuredRounds.includes(r + 1))
      matchIncome += f.broadcast.appearanceFee;
    if (pair[0] === 0) {
      const gate = estimateGate(s, day);
      matchIncome += gate.revenue;
      operatingCosts += gate.cost;
    }
  }
  return {
    days: Math.max(0, end - s.day),
    contractIncome: money(contractIncome),
    matchIncome: money(matchIncome),
    operatingCosts: money(operatingCosts),
    closing: money(s.budget + contractIncome + matchIncome - operatingCosts),
  };
}

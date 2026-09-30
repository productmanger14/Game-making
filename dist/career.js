import {
  ensurePlayerAttributes,
  matchReadiness,
  trainingMotivation,
  injuryRisk,
  bound,
} from "./attributes.js";
import {
  createWorld,
  player,
  rand,
  clamp,
  overall,
  stats,
  value,
  modes,
  Battle,
  nextFixture,
  advance,
} from "./engine.js";

import { countries } from "./countries.js";
export { countries } from "./countries.js";
import {
  ensureWorld,
  advanceWorld,
  finishDomesticRound,
  resetWorldSeason,
  rankTable,
} from "./world.js";

export const sessions = {
  균형: {
    keys: ["tech", "teamwork", "endurance"],
    load: 5,
    desc: "기술·협동·지구력을 고르게 육성",
  },
  무기: {
    keys: ["tech", "accuracy", "disarm"],
    load: 7,
    desc: "기술·정확도·무장 해제 육성",
  },
  체력: {
    keys: ["endurance", "strength", "speed"],
    load: 10,
    desc: "지구력·힘·속도 육성, 높은 피로",
  },
  전술: {
    keys: ["tactics", "judgment", "position"],
    load: 4,
    desc: "전술 이해·판단·위치 선정 육성",
  },
  협동: {
    keys: ["teamwork", "awareness", "leadership"],
    load: 4,
    desc: "팀워크·상황 인식·리더십 육성",
  },
  회복: { keys: [], load: -6, desc: "피로 회복과 컨디션 관리" },
  휴식: { keys: [], load: -9, desc: "성장 훈련 없이 충분히 휴식" },
};
export const intensities = { 가볍게: 0.65, 보통: 1, 강하게: 1.4 };
export const categoryLabels = [
  "전체",
  "경기",
  "훈련",
  "이적",
  "구단",
  "이벤트",
];
const defaultPlan = () =>
  ["무기", "체력", "전술", "협동", "전술", "균형", "회복"].map((am) => ({
    am,
    pm: am === "체력" ? "회복" : "협동",
    intensity: "보통",
  }));
export function calendarDate(s, day = s.day) {
  return new Date(Date.UTC(s.season, 0, 5 + day));
}
export function formatDate(s, day = s.day) {
  return calendarDate(s, day).toISOString().slice(0, 10).replaceAll("-", ".");
}
export function weekday(s, day = s.day) {
  return (calendarDate(s, day).getUTCDay() + 6) % 7;
}
export function addNews(
  s,
  {
    category = "구단",
    title,
    text,
    sender = "구단 사무국",
    action = null,
    mustRespond = false,
    playerId = null,
  },
) {
  const n = {
    id: s.nextNewsId++,
    day: s.day,
    season: s.season,
    category,
    title,
    text,
    sender,
    read: false,
    action,
    mustRespond,
    playerId,
  };
  s.news.unshift(n);
  return n;
}
function classify(n) {
  return /경기|승리|상대|세트/.test(n.title)
    ? "경기"
    : /훈련|회복|성장/.test(n.title)
      ? "훈련"
      : /계약|이적|스카우트|인재/.test(n.title)
        ? "이적"
        : "구단";
}
export function normalizeNews(s) {
  for (const n of s.news) {
    if (n.title === "유니크 선수 발견") {
      n.title = "자유계약 시장 소식";
      n.text = `${n.text.split(" — ")[0]} 선수가 시장에 등록되었습니다.`;
    }
    n.id ??= s.nextNewsId++;
    n.category ??= classify(n);
    n.season ??= s.season;
    n.sender ??= "구단 사무국";
    n.read ??= false;
  }
}
export function migrateCareer(s) {
  if (
    !s ||
    ![1, 2].includes(s.version) ||
    !Array.isArray(s.players) ||
    !Array.isArray(s.market) ||
    !Array.isArray(s.youth) ||
    !Array.isArray(s.table) ||
    s.table.length !== 8 ||
    !Array.isArray(s.schedule) ||
    s.schedule.length !== 14 ||
    !Number.isInteger(s.seed) ||
    !Number.isInteger(s.day) ||
    !s.facilities ||
    !s.staff
  )
    throw Error("호환되는 저장 파일이 아닙니다.");
  if (s.players.length > 30 || s.players.length < 1)
    throw Error("선수단 데이터가 올바르지 않습니다.");
  for (const p of [...s.players, ...s.market, ...s.youth])
    if (
      !p.stats ||
      !p.record ||
      !Object.keys(stats).every((k) => Number.isFinite(p.stats[k])) ||
      !Number.isInteger(p.weapon) ||
      p.weapon < 0 ||
      p.weapon > 11 ||
      !Number.isFinite(p.age)
    )
      throw Error("선수 데이터가 올바르지 않습니다.");
  const legacy = !s.careerVersion;
  s.version = 2;
  s.careerVersion = 2;
  s.country ??= "한국";
  s.city ??= "서울";
  s.manager ??= { name: "감독", age: 30 };
  s.clubColor ??= "#c1ee69";
  s.homeTerrain ??= "city";
  s.nextNewsId ??= 1;
  s.news ??= [];
  s.elapsed ??= s.day;
  s.talkDay ??= {};
  s.history ??= [];
  s.weekPlan ??= defaultPlan();
  s.autoRecovery ??= true;
  s.trainingHistory ??= [];
  s.growthLog ??= [];
  s.transferHistory ??= [];
  s.financeHistory ??= [];
  s.setPlans ??= modes.map(() => ({
    tactic: s.tactic || "균형",
    formation: "균형",
    target: "가까운 적",
    ids: [],
  }));
  if (!s.fixtureDays) {
    s.fixtureDays = s.schedule.map((_, r) =>
      r < s.round
        ? Math.max(0, s.day - (s.round - r) * 7)
        : Math.max(s.day + 1, 5 + s.round * 7) + (r - s.round) * 7,
    );
  }
  s.opponentSquads ??= {};
  for (const t of s.table.filter((t) => t.id !== 0))
    if (!s.opponentSquads[t.id])
      s.opponentSquads[t.id] = Array.from({ length: 30 }, () =>
        player(s, { country: s.country, team: t.id }),
      );
  for (const p of [
    ...s.players,
    ...s.youth,
    ...s.market,
    ...Object.values(s.opponentSquads).flat(),
  ]) {
    ensurePlayerAttributes(p);
    p.trainingFocus ??= "균형";
    p.trainingXP ??= {};
  }
  normalizeNews(s);
  if (legacy)
    addNews(s, {
      title: "운영 센터 개편",
      text: "일정과 훈련센터가 열렸습니다. 기존 선수·기록·예산을 유지하며, 다음 경기는 일정 화면에서 확인할 수 있습니다.",
    });
  if (s.matchSeries?.phase === "playing") s.matchSeries.phase = "preparation";
  ensureWorld(s);
  advanceWorld(s);
  return s;
}
export function createCareer(config, seed = Date.now()) {
  const country = countries.find((c) => c.name === config.country);
  if (!country || !country.cities.includes(config.city))
    throw Error("나라와 연고 도시를 선택하세요.");
  const club = String(config.club || "").trim(),
    name = String(config.manager || "").trim(),
    age = Number(config.age);
  if (
    club.length < 2 ||
    club.length > 30 ||
    name.length < 1 ||
    name.length > 24 ||
    !Number.isInteger(age) ||
    age < 18 ||
    age > 80
  )
    throw Error(
      "구단명 2~30자, 감독명 1~24자, 감독 나이 18~80세를 입력하세요.",
    );
  const s = createWorld(seed, { country: country.name });
  s.careerVersion = 2;
  s.country = country.name;
  s.city = config.city;
  s.club = club;
  s.manager = { name, age };
  s.clubColor = ["#c1ee69", "#77c9f5", "#f3b777", "#d6a6ec"].includes(
    config.color,
  )
    ? config.color
    : "#c1ee69";
  s.homeTerrain = country.terrains[country.cities.indexOf(config.city)];
  const cities = [
    config.city,
    ...country.cities.filter((c) => c !== config.city),
  ];
  const names = [
    "",
    "타이탄",
    "발키리",
    "센티널",
    "블레이즈",
    "아르테미스",
    "레이븐",
    "노바",
  ];
  s.table.forEach((t, i) => {
    t.name = i === 0 ? club : `${cities[i]} ${names[i]}`;
    t.terrain = country.terrains[country.cities.indexOf(cities[i])];
  });
  s.fixtureDays = s.schedule.map((_, i) => 5 + i * 7);
  s.news = [];
  migrateCareer(s);
  addNews(s, {
    title: "구단 창단 승인",
    text: `${s.country} ${s.city}의 ${s.club}이 리그에 참가합니다. ${name} 감독님, 첫 경기는 ${formatDate(s, s.fixtureDays[0])}입니다.`,
    sender: "리그 사무국",
  });
  addNews(s, {
    category: "훈련",
    title: "첫 주 훈련 계획",
    text: "훈련센터에서 오전·오후 세션과 강도를 정하세요. 경기 전날은 전술, 다음 날은 회복 훈련이 자동 편성됩니다.",
    sender: "수석 코치",
  });
  return s;
}
export function fixtures(s) {
  return s.schedule.map((pairs, round) => {
    const pair = pairs.find((x) => x.includes(0)),
      op = s.table[pair.find((x) => x !== 0)],
      home = pair[0] === 0;
    return {
      round,
      day: s.fixtureDays[round],
      opponent: op,
      home,
      terrain: home ? s.homeTerrain : op.terrain,
      result: s.history.find(
        (h) => h.round === round + 1 && (h.season ?? s.season) === s.season,
      ),
    };
  });
}
export function trainingDay(s, day = s.day) {
  const wd = weekday(s, day),
    plan = { ...s.weekPlan[wd] };
  const fs = fixtures(s);
  if (fs.some((f) => f.day === day))
    return {
      ...plan,
      am: "경기",
      pm: "경기",
      intensity: "보통",
      reason: "리그 경기일",
    };
  if (s.autoRecovery && fs.some((f) => f.day === day - 1))
    return {
      am: "회복",
      pm: "휴식",
      intensity: "가볍게",
      reason: "경기 다음 날 회복",
    };
  if (s.autoRecovery && fs.some((f) => f.day === day + 1))
    return {
      am: "전술",
      pm: "회복",
      intensity: "가볍게",
      reason: "경기 전날 준비",
    };
  return { ...plan, reason: "주간 계획" };
}
export function setTrainingSlot(s, index, field, v) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > 6 ||
    !["am", "pm", "intensity"].includes(field) ||
    !(field === "intensity" ? v in intensities : v in sessions)
  )
    throw Error("훈련 계획 값이 올바르지 않습니다.");
  s.weekPlan[index][field] = v;
}
function train(s, plan) {
  let gains = 0;
  for (const p of [...s.players, ...s.youth]) {
    ensurePlayerAttributes(p);
    p.adaptationDays = Math.max(0, p.adaptationDays - 1);
    if (p.injury > 0) continue;
    p.trainingXP ??= {};
    p.trainingFocus ??= "균형";
    const intensity = intensities[plan.intensity],
      wasTired = p.fatigue > 65;
    for (const type of [plan.am, plan.pm]) {
      const session = sessions[type];
      if (!session) continue;
      p.fatigue = clamp(p.fatigue + session.load * intensity, 0, 95);
      const keys = session.keys;
      if (!keys.length) continue;
      const key = keys[Math.floor(rand(s) * keys.length)];
      const focus = sessions[p.trainingFocus] || sessions["균형"];
      const k =
        focus.keys.length && rand(s) < 0.35
          ? focus.keys[Math.floor(rand(s) * focus.keys.length)]
          : key;
      p.trainingXP[k] =
        (p.trainingXP[k] || 0) +
        (1.4 + s.facilities.training * 0.45 + s.staff.coach * 0.25) *
          intensity *
          trainingMotivation(p) *
          (wasTired ? 0.5 : 1) *
          (p.age > 30 ? 0.65 : 1);
      if (p.trainingXP[k] >= 38 && p.ca < p.pa && p.stats[k] < 20) {
        p.trainingXP[k] -= 38;
        p.stats[k]++;
        p.ca = Math.round(
          (Object.values(p.stats).reduce((a, b) => a + b, 0) / 22) * 10,
        );
        gains++;
        s.growthLog.unshift({
          name: p.name,
          id: p.id,
          stat: k,
          value: p.stats[k],
          day: s.day,
          season: s.season,
        });
      }
    }
    if (p.roleTraining !== p.role) {
      const r = p.roleTraining;
      p.roleXP[r] =
        (p.roleXP[r] || 0) + (0.12 + p.hidden.versatility * 0.025) * intensity;
      if (p.roleXP[r] >= 4) {
        p.roleXP[r] -= 4;
        p.roleFamiliarity[r] = bound((p.roleFamiliarity[r] || 1) + 1);
      }
    }
    const load =
      [plan.am, plan.pm].reduce(
        (n, k) => n + Math.max(0, sessions[k]?.load || 0),
        0,
      ) * intensity;
    if (rand(s) < injuryRisk(p, load, s.facilities.medical)) {
      p.injury = 1 + Math.floor(rand(s) * 3);
      addNews(s, {
        category: "훈련",
        title: "의료팀 회복 권고",
        text: `${p.name}에게 근육 부담이 확인되어 ${p.injury}일간 출전을 제한합니다.`,
        sender: "의료팀",
        playerId: p.id,
      });
    }
    p.condition = Math.round(100 - p.fatigue);
  }
  s.trainingHistory.unshift({ day: s.day, season: s.season, ...plan, gains });
  s.trainingHistory = s.trainingHistory.slice(0, 35);
  s.growthLog = s.growthLog.slice(0, 100);
}
export function pendingNews(s) {
  return s.news.find((n) => n.mustRespond && n.action && !n.resolution);
}
export function resolveNews(s, id, choice) {
  const n = s.news.find((n) => n.id === Number(id));
  if (!n || !n.action || n.resolution)
    throw Error("이미 처리되었거나 유효하지 않은 소식입니다.");
  if (!["accept", "decline"].includes(choice))
    throw Error("선택이 올바르지 않습니다.");
  const a = n.action;
  if (choice === "accept") {
    if (a.kind === "sponsor") {
      s.budget += a.amount;
      s.financeHistory.unshift({
        day: s.day,
        season: s.season,
        label: "지역 후원 행사",
        amount: a.amount,
      });
    } else if (a.kind === "transfer") {
      const p = s.players.find((p) => p.id === a.playerId);
      if (!p) throw Error("이 선수가 현재 선수단에 없습니다.");
      if (s.players.filter((x) => x.id !== p.id && !x.injury).length < 20)
        throw Error(
          "점령전을 위해 출전 가능한 선수를 20명 이상 유지해야 합니다.",
        );
      s.players = s.players.filter((x) => x.id !== p.id);
      p.team = a.clubId;
      p.trust = clamp(p.trust - Math.ceil(p.hidden.loyalty / 4), 0, 100);
      const squad = s.opponentSquads[a.clubId];
      if (squad.length >= 30) {
        const released = squad.pop();
        released.team = -1;
        s.market.push(released);
      }
      squad.push(p);
      s.budget += a.amount;
      s.transferHistory.unshift({
        season: s.season,
        day: s.day,
        name: p.name,
        from: s.club,
        to: s.table[a.clubId].name,
        fee: a.amount,
      });
      addNews(s, {
        category: "이적",
        title: "이적 완료",
        text: `${p.name} → ${s.table[a.clubId].name} · 이적료 ${a.amount}백만원`,
        playerId: p.id,
      });
    } else if (a.kind === "relationship") {
      const p = s.players.find((p) => p.id === a.playerId);
      if (p) {
        p.trust = clamp(p.trust + 4, 0, 100);
        p.affinity = clamp(p.affinity + 2, 0, 100);
      }
    } else if (a.kind === "trial") {
      if (s.budget < 12) throw Error("테스트 비용 12백만원이 부족합니다.");
      s.budget -= 12;
      const p = player(s, { country: s.country, team: -1, level: 1 });
      p.scout = 70;
      s.market.unshift(p);
      n.playerId = p.id;
      addNews(s, {
        category: "이적",
        title: "공개 테스트 보고서",
        text: `${p.name}의 공개 테스트가 끝났습니다. 스카우트 보고서에서 능력을 확인하고 계약할 수 있습니다.`,
        sender: "스카우트",
        playerId: p.id,
      });
    }
  }
  if (choice === "decline" && a.kind === "relationship") {
    const p = s.players.find((p) => p.id === a.playerId);
    if (p)
      p.trust = clamp(p.trust + (p.hidden.boundaries >= 10 ? 3 : 1), 0, 100);
  }
  n.resolution =
    a.kind === "relationship"
      ? choice === "accept"
        ? "대화로 안심시킴"
        : "개인적 경계를 설명함"
      : choice === "accept"
        ? "수락"
        : "거절";
  n.read = true;
  n.mustRespond = false;
  return n;
}
function dailyEvents(s) {
  const f = nextFixture(s);
  if (f && f.day - s.day === 1)
    addNews(s, {
      category: "경기",
      title: "내일 경기: 상대 분석",
      sender: "분석 팀",
      text: `${f.opponent.name} · ${f.home ? "홈" : "원정"} 경기. 상대 주전 평균 OVR ${Math.round(s.opponentSquads[f.opponent.id].slice(0, 20).reduce((a, p) => a + overall(p), 0) / 20)}. 내일 경기 준비에서 종목별 선수를 제출하세요.`,
    });
  if (s.day === 2)
    addNews(s, {
      category: "이벤트",
      title: "지역 후원 행사 제안",
      text: "지역 후원사가 창단 행사를 지원하고 싶어 합니다. 수락하면 후원금 25백만원을 받습니다.",
      sender: "상업 담당",
      mustRespond: true,
      action: { kind: "sponsor", amount: 25 },
    });
  if (s.day % 14 === 9) {
    const candidates = s.players.filter((p) => !p.injury);
    const p = candidates[Math.floor(rand(s) * candidates.length)];
    const clubId = 1 + Math.floor(rand(s) * 7);
    if (p)
      addNews(s, {
        category: "이적",
        title: `${p.name} 영입 제안`,
        text: `${s.table[clubId].name}에서 ${value(p)}백만원을 제안했습니다. 선수단 규모와 다음 경기를 고려해 결정하세요.`,
        sender: "선수 에이전트",
        mustRespond: true,
        playerId: p.id,
        action: { kind: "transfer", playerId: p.id, clubId, amount: value(p) },
      });
  }
  if (s.day % 14 === 4)
    addNews(s, {
      category: "이벤트",
      title: "지역 인재 공개 테스트",
      text: "거리 대회와 지하 격투장 출신 선수가 공개 테스트 참가를 요청했습니다. 테스트 비용은 12백만원입니다.",
      sender: "스카우트",
      action: { kind: "trial" },
    });
  if (s.day % 7 === 0) {
    const gains = s.growthLog.filter(
      (g) => g.season === s.season && g.day > s.day - 7,
    ).length;
    addNews(s, {
      category: "훈련",
      title: "주간 훈련 보고",
      text: `지난 7일 능력치 성장 ${gains}건. 평균 피로 ${Math.round(s.players.reduce((a, p) => a + p.fatigue, 0) / s.players.length)}%. 코칭 팀과 시설이 훈련 효율에 반영됩니다.`,
      sender: "수석 코치",
    });
  }
  if (s.day % 7 === 3 && s.market.length) {
    const clubId = 1 + Math.floor(rand(s) * 7),
      p = s.market.splice(Math.floor(rand(s) * s.market.length), 1)[0],
      squad = s.opponentSquads[clubId];
    if (squad.length >= 30) {
      const released = squad.pop();
      released.team = -1;
      s.market.push(released);
    }
    p.team = clubId;
    squad.push(p);
    s.transferHistory.unshift({
      season: s.season,
      day: s.day,
      name: p.name,
      from: "자유계약",
      to: s.table[clubId].name,
      fee: 0,
    });
    addNews(s, {
      category: "이적",
      title: "리그 영입 소식",
      text: `${s.table[clubId].name}이 ${p.name}과 자유계약을 체결했습니다.`,
      sender: "리그 뉴스",
    });
  }
}
export function advanceCareer(s, untilMatch = false) {
  if (s.matchSeries && !s.matchSeries.finished)
    return { reason: "match", days: 0 };
  let days = 0;
  for (let i = 0; i < (untilMatch ? 120 : 1); i++) {
    if (pendingNews(s)) return { reason: "news", days };
    const f = nextFixture(s);
    if (f && s.day >= f.day) return { reason: "match", days };
    if (!f) return { reason: "season", days };
    for (const p of Object.values(s.opponentSquads).flat()) {
      p.injury = Math.max(0, p.injury - 1);
      p.fatigue = Math.max(0, p.fatigue - 12);
    }
    const budget = s.budget;
    advance(s, 1);
    train(s, trainingDay(s));
    advanceWorld(s);
    if (s.budget < budget) {
      const amount = s.budget - budget;
      s.financeHistory.unshift({
        day: s.day,
        season: s.season,
        label: "급료·시설 유지비",
        amount,
      });
      addNews(s, {
        title: "주간 지출 보고",
        text: `선수 급료와 시설 유지비 ${-amount}백만원이 지급되었습니다. 잔액 ${s.budget}백만원.`,
        sender: "재무 담당",
      });
    }
    dailyEvents(s);
    normalizeNews(s);
    days++;
  }
  return {
    reason: pendingNews(s)
      ? "news"
      : nextFixture(s)?.day <= s.day
        ? "match"
        : "day",
    days,
  };
}
export function suggestLineup(s, mode, roster = s.players) {
  return [...roster]
    .filter((p) => !p.injury)
    .sort(
      (a, b) => overall(b) - b.fatigue * 0.28 - (overall(a) - a.fatigue * 0.28),
    )
    .slice(0, modes[mode].n)
    .map((p) => p.id);
}
export function beginSeries(s) {
  if (s.matchSeries && !s.matchSeries.finished) return s.matchSeries;
  const f = nextFixture(s);
  if (!f || s.day < f.day)
    throw Error("경기일에 경기 준비를 시작할 수 있습니다.");
  if (pendingNews(s)) throw Error("응답이 필요한 소식을 먼저 처리하세요.");
  if (s.players.filter((p) => !p.injury).length < 20)
    throw Error("출전 가능한 선수가 20명 필요합니다.");
  s.matchSeries = {
    opponent: f.opponent.name,
    opponentId: f.opponent.id,
    terrain: f.terrain,
    round: s.round,
    rosters: [
      structuredClone(s.players),
      structuredClone(s.opponentSquads[f.opponent.id]),
    ],
    wins: [0, 0],
    mode: 0,
    results: [],
    records: [],
    seed: s.seed,
    phase: "preparation",
    finished: false,
  };
  for (const squad of s.matchSeries.rosters)
    for (const p of squad)
      p.matchForm = matchReadiness(p, () => rand(s), s.round >= 11);
  return s.matchSeries;
}
export function prepareSet(s, series, ids, plan) {
  if (series.finished || series.phase !== "preparation")
    throw Error("세트 준비 단계가 아닙니다.");
  const n = modes[series.mode].n;
  if (ids.length !== n || new Set(ids).size !== n)
    throw Error(
      `${modes[series.mode].name}은 정확히 ${n}명을 선발해야 합니다.`,
    );
  const chosen = ids.map((id) => series.rosters[0].find((p) => p.id === id));
  if (chosen.some((p) => !p || p.injury))
    throw Error("출전할 수 없는 선수가 포함되어 있습니다.");
  if (
    !["균형", "공격", "수비"].includes(plan.tactic) ||
    !["균형", "집중", "분산"].includes(plan.formation) ||
    !["가까운 적", "약한 적", "원거리"].includes(plan.target)
  )
    throw Error("전술이 올바르지 않습니다.");
  s.setPlans[series.mode] = { ...plan, ids: [...ids] };
  series.currentPlan = { ...plan };
  const rivals = suggestLineup(s, series.mode, series.rosters[1]).map((id) =>
    series.rosters[1].find((p) => p.id === id),
  );
  const battle = new Battle(
    [structuredClone(chosen), structuredClone(rivals)],
    series.mode,
    series.seed,
    plan.tactic,
    series.terrain,
    plan,
  );
  series.phase = "playing";
  return battle;
}
export function completeSet(s, series, battle) {
  if (!battle.done || series.phase !== "playing")
    throw Error("진행 중인 세트를 먼저 마쳐야 합니다.");
  const w = battle.winner;
  series.wins[w]++;
  series.results.push(w);
  series.seed = battle.rng.seed;
  for (const u of battle.units) {
    series.records.push({
      id: u.id,
      team: u.team,
      mode: series.mode,
      kills: u.kills,
      deaths: u.deaths,
      assists: u.assists,
      objectives: Math.round(u.objectives),
      aceWin: series.mode === 4 && u.team === w,
    });
    const p = series.rosters[u.team].find((p) => p.id === u.id);
    p.fatigue = clamp(100 - u.energy + 7, 0, 95);
  }
  if (series.wins[w] >= 3) {
    series.finished = true;
    series.phase = "finished";
    for (const r of series.records) {
      const p = (
        r.team === 0 ? s.players : s.opponentSquads[series.opponentId]
      ).find((p) => p.id === r.id);
      if (!p) continue;
      p.record.games++;
      for (const k of ["kills", "deaths", "assists", "objectives"])
        p.record[k] += r[k];
      p.record.aceWins += r.aceWin ? 1 : 0;
      p.fame = Math.min(100, p.fame + (r.kills ? 1 : 0));
      p.fatigue = series.rosters[r.team].find((x) => x.id === p.id).fatigue;
      p.condition = 100 - p.fatigue;
    }
    const appeared = new Set(
      series.records.filter((r) => r.team === 0).map((r) => r.id),
    );
    for (const p of s.players.filter((p) => appeared.has(p.id))) {
      ensurePlayerAttributes(p);
      p.hiddenProgress.appearances++;
      if (p.hiddenProgress.appearances % 14 === 0)
        p.hidden.consistency = bound(p.hidden.consistency + 1);
      if (s.round >= 11) {
        p.hiddenProgress.important++;
        if (p.hiddenProgress.important % 15 === 0)
          p.hidden.importantMatches = bound(p.hidden.importantMatches + 1);
      }
      p.morale = clamp(
        p.morale +
          (series.wins[0] > series.wins[1]
            ? 3
            : -Math.max(1, 5 - p.hidden.sportsmanship / 5)),
        0,
        100,
      );
    }
    if (series.wins[0] < series.wins[1]) {
      const outspoken = s.players.find((p) => p.hidden.controversy >= 16);
      if (outspoken)
        addNews(s, {
          category: "이벤트",
          title: "선수 인터뷰",
          text: `${outspoken.name}이 패배 후 다음 경기에서 더 나은 운영이 필요하다고 의견을 밝혔습니다.`,
          sender: "리그 뉴스",
        });
    }
    finishDomesticRound(s, series.wins);
    normalizeNews(s);
    s.lastMatch = {
      opponent: series.opponent,
      wins: [...series.wins],
      results: [...series.results],
      day: s.day,
    };
    s.matchSeries = null;
  } else {
    series.mode++;
    series.phase = "preparation";
    s.matchSeries = series;
  }
  return series.finished;
}
export function nextSeason(s) {
  if (nextFixture(s)) throw Error("남은 경기를 먼저 마쳐야 합니다.");
  const rank = rankTable(s.table).findIndex((t) => t.id === 0) + 1;
  resetWorldSeason(s);
  s.season++;
  s.day = 0;
  s.round = 0;
  s.fixtureDays = s.schedule.map((_, r) => 5 + r * 7);
  s.matchSeries = null;
  s.lastMatch = null;
  s.talkDay = {};
  for (const t of s.table)
    Object.assign(t, { played: 0, wins: 0, losses: 0, for: 0, against: 0 });
  for (const p of [
    ...s.players,
    ...s.market,
    ...s.youth,
    ...Object.values(s.opponentSquads).flat(),
  ]) {
    p.age++;
    if (p.age >= 30)
      for (const k of ["speed", "accel", "agility"])
        if (rand(s) < 0.25) p.stats[k] = Math.max(1, p.stats[k] - 1);
  }
  addNews(s, {
    category: "경기",
    title: "새 시즌 일정 확정",
    text: `지난 시즌 ${rank}위. 14경기 일정이 공개되었습니다. 현재는 같은 8팀으로 다음 시즌을 진행합니다.`,
    sender: "리그 사무국",
  });
}

export function forfeitMatch(s) {
  const f = nextFixture(s);
  if (!f || s.day < f.day || s.matchSeries)
    throw Error("기권할 수 있는 경기일이 아닙니다.");
  if (s.players.filter((p) => !p.injury).length >= 20)
    throw Error("정상 출전 가능한 선수단입니다.");
  finishDomesticRound(s, [0, 3]);
  normalizeNews(s);
  s.lastMatch = {
    opponent: f.opponent.name,
    wins: [0, 3],
    results: [1, 1, 1],
    day: s.day,
  };
  addNews(s, {
    category: "경기",
    title: "기권 처리",
    text: "출전 가능 인원 부족으로 0:3 기권패가 기록되었습니다. 다음 경기까지 선수단을 보강하세요.",
    sender: "리그 사무국",
  });
}

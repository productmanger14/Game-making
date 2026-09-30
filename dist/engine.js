import { ensurePlayerAttributes, roleEffect, foulRisk } from "./attributes.js";
export const VERSION = 1;
export const roles = [
  "선봉",
  "수비",
  "돌격",
  "기동",
  "견제",
  "사격",
  "호위",
  "교란",
];
export const weapons = [
  { name: "검·방패", range: 2.5, damage: 14, guard: 4 },
  { name: "양손검", range: 3.3, damage: 20, guard: 0 },
  { name: "쌍검", range: 2.2, damage: 15, guard: 0 },
  { name: "창", range: 4.8, damage: 16, guard: 1 },
  { name: "장궁", range: 18, damage: 12, guard: -2 },
  { name: "전투망치", range: 2.5, damage: 23, guard: 0 },
  { name: "곡도", range: 2.8, damage: 16, guard: 1 },
  { name: "채찍", range: 6.5, damage: 10, guard: -1 },
  { name: "연검", range: 5, damage: 14, guard: 0 },
  { name: "장봉", range: 4, damage: 12, guard: 2 },
  { name: "석궁", range: 20, damage: 21, guard: -2 },
  { name: "사슬낫", range: 5.5, damage: 15, guard: -1 },
];
export const stats = {
  tech: "기술",
  accuracy: "정확도",
  defense: "방어",
  dodge: "회피",
  grapple: "격투",
  disarm: "무장 해제",
  strength: "힘",
  endurance: "지구력",
  speed: "이동 속도",
  accel: "가속력",
  agility: "민첩성",
  balance: "균형감각",
  judgment: "판단력",
  prediction: "예측력",
  focus: "집중력",
  calm: "침착성",
  spirit: "투지",
  tactics: "전술 이해",
  teamwork: "팀워크",
  position: "위치 선정",
  awareness: "상황 인식",
  leadership: "리더십",
};
export const SET_TIME_LIMIT = 3600;
export const DEATHMATCH_RESPAWN = 30;
export const modes = [
  {
    name: "섬멸전",
    n: 11,
    time: SET_TIME_LIMIT,
    rule: "11 대 11 · 최대 60분 · 리스폰 없음 · 상대 전원 아웃",
  },
  {
    name: "기지 점령전",
    n: 20,
    time: SET_TIME_LIMIT,
    rule: "20 대 20 · 최대 60분 · 양 진영 깃발 3개씩 · 아군 기지로 운반 · 3개 선취 · 리스폰 없음",
  },
  {
    name: "데스매치",
    n: 9,
    time: SET_TIME_LIMIT,
    rule: "9 대 9 · 60분 · 아웃 후 30초 리스폰 · 킬 수 우선 판정",
  },
  {
    name: "왕잡기",
    n: 5,
    time: SET_TIME_LIMIT,
    rule: "5 대 5 · 최대 60분 · 왕 공개 · 상대 왕 아웃 시 승리",
  },
  {
    name: "에이스 대결",
    n: 1,
    time: SET_TIME_LIMIT,
    rule: "1 대 1 · 최대 60분 · 상대 아웃 시 승리",
  },
];
export const terrainInfo = {
  city: { name: "도심", desc: "골목과 엄폐물 · 근접 교전", color: 0x47575b },
  forest: { name: "정글", desc: "수풀과 바위 · 제한된 시야", color: 0x345b45 },
  snow: { name: "설원", desc: "미끄러운 눈밭 · 이동 부담", color: 0xaec3cd },
  mountain: {
    name: "산악",
    desc: "경사와 고저차 · 균형과 지구력",
    color: 0x657565,
  },
};
const motifNames =
  "알렉산드로스|한니발|카이사르|스키피오|피로스|레오니다스|에파미논다스|필리포스|키루스|투트모세|람세스|벨리사리우스|나르세스|헤라클리우스|칭기즈 칸|수부타이|제베|티무르|칼리드|살라딘|바이바르스|메흐메트|쉴레이만|리처드|윌리엄|로버트 브루스|에드워드 3세|흑태자|헨리 5세|얀 지슈카|스칸데르베그|소비에스키|구스타브|나폴레옹|웰링턴|수보로프|프리드리히|한신|항우|백기|이정|악비|조조|관우|장비|여포|조운|척계광|이순신|쩐흥다오|다케다 신겐|우에스기 겐신|오다 노부나가|도쿠가와|무사시|윌리엄 마셜|스파르타쿠스|샤카|시바지|잔 다르크|아킬레우스|헥토르|헤라클레스|아이아스|디오메데스|오디세우스|페르세우스|테세우스|아탈란테|펜테실레이아|히폴리테|쿠 훌린|페르디아드|핀 막 쿨|스카하크|베오울프|시구르드|브륀힐드|아서|랜슬롯|가웨인|롤랑|올리비에|로스탐|소흐랍|에스판디야르|아르주나|비마|카르나|라마|하누만|손오공|나타|이랑신|후예|토르|티르|아테나|세크메트|스사노오".split(
    "|",
  );
const special = {
  60: { name: "전장의 선봉", text: "첫 60초의 접근 속도 +15%", kind: "rush" },
  62: {
    name: "압도적 완력",
    text: "근접 타격 피해 +15%, 공격 피로 +20%",
    kind: "power",
  },
  54: {
    name: "간격의 지배자",
    text: "개인전의 유효타 확률 +10%p",
    kind: "duel",
  },
  43: { name: "접근 불허", text: "근접 공격 방어 확률 +8%p", kind: "guard" },
  46: {
    name: "구출의 달인",
    text: "호위 역할일 때 이동 속도 +15%",
    kind: "escort",
  },
  1: {
    name: "포위 설계자",
    text: "아군과 같은 적을 공격할 때 유효타 확률 +8%p",
    kind: "team",
  },
  48: {
    name: "전장의 설계자",
    text: "거점 주변에서 방어 확률 +8%p",
    kind: "zone",
  },
  71: {
    name: "멈추지 않는 추격",
    text: "이동 속도 +10%, 이동 피로 +15%",
    kind: "chase",
  },
  86: {
    name: "흔들림 없는 조준",
    text: "원거리 유효타 확률 +8%p",
    kind: "aim",
  },
  56: {
    name: "끝까지 함께",
    text: "아군 인원 열세에서 유효타 확률 +8%p",
    kind: "last",
  },
};
const genericTraits = [
  {
    name: "전술의 계승자",
    text: "아군과 같은 적 공격 시 유효타 확률 +8%p",
    kind: "team",
  },
  { name: "불굴의 전사", text: "인원 열세에서 유효타 확률 +8%p", kind: "last" },
  { name: "숙련된 수호자", text: "근접 공격 방어 확률 +8%p", kind: "guard" },
  { name: "결투의 명인", text: "개인전 유효타 확률 +10%p", kind: "duel" },
  { name: "신속한 압박", text: "첫 60초 접근 속도 +15%", kind: "rush" },
];
export const uniques = motifNames.map((motif, i) => ({
  id: i,
  motif,
  trait: special[i] || genericTraits[i % 5],
  type: i < 60 ? "역사" : "신화·서사",
}));
export function rand(s) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
const pick = (s, a) => a[Math.floor(rand(s) * a.length)];
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const namePools = {
  한국: [
    [
      "서윤",
      "지아",
      "하린",
      "유나",
      "채원",
      "수아",
      "예린",
      "소연",
      "민서",
      "다은",
    ],
    ["강", "서", "윤", "한", "백", "이", "김", "정", "최", "신"],
  ],
  일본: [
    ["아오이", "렌", "미오", "아카리", "리나", "하루카"],
    ["아사노", "키리사키", "미즈노", "타치바나"],
  ],
  브라질: [
    ["루나", "클라라", "헬레나", "마리아", "비앙카"],
    ["실바", "산투스", "코스타", "리마"],
  ],
  스위스: [
    ["레아", "노라", "엘레나", "미라", "안나"],
    ["켈러", "마이어", "베버", "슈타이너"],
  ],
  미국: [
    ["에이버리", "조던", "엠마", "릴리", "클로이"],
    ["모건", "리드", "파커", "브룩스"],
  ],
  러시아: [
    ["아나스타샤", "다리야", "나탈리야", "소피야", "예카테리나"],
    ["볼코바", "페트로바", "모로조바", "이바노바"],
  ],
  영국: [
    ["엘리너", "샬럿", "플로렌스", "아이비", "로즈"],
    ["베넷", "클라크", "해리스", "우드"],
  ],
  프랑스: [
    ["카미유", "엘로디", "클로에", "마농", "줄리"],
    ["뒤부아", "로랑", "모로", "르루"],
  ],
  독일: [
    ["한나", "레나", "프리다", "클라라", "그레타"],
    ["슈미트", "피셔", "바우어", "볼프"],
  ],
  중국: [
    ["린", "메이", "샤오위", "이란", "원징"],
    ["리", "왕", "장", "천"],
  ],
  남아프리카: [
    ["날레디", "레라토", "탄디", "아마라", "아얀다"],
    ["은들로부", "들라미니", "모코에나", "코사"],
  ],
  호주: [
    ["올리비아", "루비", "그레이스", "아일라"],
    ["테일러", "윌슨", "캠벨", "워커"],
  ],
};
const countryPortraits = {
  한국: [0, 9, 15],
  일본: [0, 9, 15],
  브라질: [1, 6, 8, 10, 14],
  스위스: [2, 3, 5, 11, 12],
  미국: [1, 2, 4, 5, 7, 13],
  호주: [3, 5, 8, 11, 13],
};
export function overall(p, role = p.role) {
  const s = p.stats;
  const keys = [
    ["tech", "defense", "strength", "judgment"],
    ["defense", "balance", "strength", "focus"],
    ["strength", "tech", "accuracy", "spirit"],
    ["speed", "accel", "agility", "position"],
    ["prediction", "tech", "position", "accuracy"],
    ["accuracy", "prediction", "calm", "focus"],
    ["awareness", "judgment", "defense", "teamwork"],
    ["grapple", "disarm", "agility", "judgment"],
  ][roles.indexOf(role)] || ["tech", "judgment"];
  return Math.round(
    ((keys.reduce((n, k) => n + s[k], 0) / keys.length) * 0.7 +
      p.mastery * 0.3) *
      5,
  );
}
export function value(p) {
  const g = Math.max(1, p.record.games);
  const performance =
    (p.record.kills * 3 +
      p.record.assists * 1.5 +
      p.record.objectives * 0.5 +
      p.record.aceWins * 8 -
      p.record.deaths) /
    g;
  return Math.round(
    Math.max(6, 12 + performance * 5 + (p.age < 25 ? 8 : 0) + p.fame * 0.4) *
      (p.unique != null ? 1.2 : 1),
  );
}
export function player(
  s,
  { country = "한국", youth = false, unique = null, team = 0, level = 0 } = {},
) {
  const role = pick(s, roles),
    age = youth ? 18 + Math.floor(rand(s) * 3) : 21 + Math.floor(rand(s) * 14);
  const sex = unique != null ? "여성" : rand(s) < 1 / 101 ? "남성" : "여성";
  const pool = namePools[country] || namePools["미국"];
  let name =
    country === "한국"
      ? pick(s, pool[1]) + pick(s, pool[0])
      : pick(s, pool[1]) + " " + pick(s, pool[0]);
  const archetype = roles.indexOf(role);
  const attributes = {};
  for (const k of Object.keys(stats))
    attributes[k] = clamp(
      Math.round(6 + rand(s) * 7 + level - (youth ? 2 : 0)),
      3,
      19,
    );
  for (const k of [
    ["strength", "defense"],
    ["defense", "balance"],
    ["strength", "spirit"],
    ["speed", "accel", "agility"],
    ["position", "prediction"],
    ["accuracy", "focus"],
    ["teamwork", "awareness"],
    ["grapple", "disarm"],
  ][archetype])
    attributes[k] = clamp(attributes[k] + 3, 1, 20);
  let wi = [0, 0, 1, 2, 3, 4, 0, 7][archetype];
  if (rand(s) < 0.25) wi = Math.floor(rand(s) * weapons.length);
  let portrait =
    sex === "남성"
      ? null
      : pick(s, countryPortraits[country] || countryPortraits["미국"]);
  if (unique != null) {
    name =
      ["알렉시아", "한나", "카시아", "스키아", "피리아", "레오나"][unique % 6] +
      " " +
      ["베일", "아르덴", "로웬", "세라"][Math.floor(unique / 6) % 4];
    portrait = unique % 16;
    for (const k of ["tech", "judgment", "tactics"])
      attributes[k] = clamp(attributes[k] + 2, 1, 20);
  }
  const p = {
    id: s.nextId++,
    name,
    country,
    sex,
    age,
    role,
    weapon: wi,
    portrait,
    stats: attributes,
    mastery: clamp(
      Math.round(8 + rand(s) * 8 + level - (youth ? 3 : 0)),
      1,
      20,
    ),
    condition: 100,
    fatigue: 0,
    morale: 75,
    affinity: 10,
    trust: 50,
    relationship: "업무 관계",
    unique,
    team,
    youth,
    injury: 0,
    wage: Math.round(1 + rand(s) * 3),
    contract: 2028,
    scout: unique != null ? 75 : Math.round(15 + rand(s) * 45),
    fame: unique != null ? 35 : Math.round(rand(s) * 20),
    record: {
      games: 0,
      kills: 0,
      assists: 0,
      deaths: 0,
      objectives: 0,
      aceWins: 0,
    },
    appearance: {
      hair:
        portrait == null
          ? "짧은 머리"
          : ["검정", "갈색", "은색", "붉은색"][portrait % 4],
      height: 160 + Math.floor(rand(s) * 24),
    },
    personality: pick(s, ["성실함", "야심가", "침착함", "사교적", "경쟁적"]),
  };
  p.ca = Math.round(
    (Object.values(attributes).reduce((a, b) => a + b, 0) / 22) * 10,
  );
  p.pa = clamp(p.ca + Math.round(8 + rand(s) * 60), p.ca, 200);
  return ensurePlayerAttributes(p);
}
export function createWorld(seed = Date.now(), options = {}) {
  const s = {
    version: VERSION,
    seed: seed >>> 0,
    nextId: 1,
    day: 0,
    season: 2026,
    round: 0,
    budget: 650,
    training: "균형",
    tactic: "균형",
    club: "서울 이클립스",
    players: [],
    market: [],
    youth: [],
    usedUniques: [],
    uniqueSchedule: [],
    facilities: { training: 1, medical: 1, scouting: 1, youth: 1 },
    staff: { coach: 1, analyst: 1, scout: 1 },
    news: [],
    history: [],
    table: [],
    talkDay: {},
  };
  const clubs = [
    "서울 이클립스",
    "부산 타이탄",
    "인천 발키리",
    "대전 센티널",
    "대구 블레이즈",
    "광주 아르테미스",
    "수원 레이븐",
    "춘천 노바",
  ];
  for (let i = 0; i < 8; i++)
    s.table.push({
      id: i,
      name: clubs[i],
      played: 0,
      wins: 0,
      losses: 0,
      for: 0,
      against: 0,
      terrain: [
        "city",
        "forest",
        "city",
        "city",
        "mountain",
        "forest",
        "city",
        "snow",
      ][i],
    });
  for (let i = 0; i < 30; i++)
    s.players.push(player(s, { level: 0, country: options.country || "한국" }));
  for (const u of [Math.floor(rand(s) * 100), Math.floor(rand(s) * 100)])
    if (!s.usedUniques.includes(u)) {
      const p = player(s, {
        unique: u,
        level: 1,
        country: options.country || "한국",
      });
      s.players[s.usedUniques.length] = p;
      s.usedUniques.push(u);
    }
  for (let i = 0; i < 12; i++)
    s.market.push(
      player(s, {
        country: pick(s, Object.keys(namePools)),
        team: -1,
        level: rand(s) < 0.2 ? 2 : 0,
      }),
    );
  for (let i = 0; i < 5; i++)
    s.youth.push(
      player(s, { youth: true, team: -2, country: options.country || "한국" }),
    );
  s.uniqueSchedule = uniques
    .filter((u) => !s.usedUniques.includes(u.id))
    .map((u) => ({ id: u.id, day: 14 + Math.floor(rand(s) * 1200) }));
  const order = [0, 1, 2, 3, 4, 5, 6, 7],
    schedule = [];
  for (let r = 0; r < 7; r++) {
    const pairs = [];
    for (let i = 0; i < 4; i++)
      pairs.push(r % 2 ? [order[7 - i], order[i]] : [order[i], order[7 - i]]);
    schedule.push(pairs);
    order.splice(1, 0, order.pop());
  }
  s.schedule = [
    ...schedule,
    ...schedule.map((ps) => ps.map(([a, b]) => [b, a])),
  ];
  s.news = [
    {
      day: 0,
      title: "새 시즌 개막",
      text: "도시 리그 8개 구단 · 홈·원정 14경기. 상위 2팀 승격, 하위 2팀 강등 기준으로 운영되는 첫 시즌입니다.",
    },
    {
      day: 0,
      title: "감독 취임",
      text: "30명의 선수단을 맡았습니다. 전술을 설정하고 첫 경기를 준비하세요.",
    },
  ];
  return s;
}
export function nextFixture(s) {
  if (s.round >= s.schedule.length) return null;
  const pair = s.schedule[s.round].find((x) => x.includes(0));
  const opponent = s.table[pair.find((x) => x !== 0)];
  return {
    opponent,
    home: pair[0] === 0,
    terrain: pair[0] === 0 ? s.homeTerrain || "city" : opponent.terrain,
    day: s.fixtureDays?.[s.round] ?? 5 + s.round * 7,
  };
}
export function advance(s, days = 1) {
  for (let d = 0; d < days; d++) {
    s.day++;
    s.elapsed = (s.elapsed || 0) + 1;
    for (const p of [...s.players, ...s.youth]) {
      p.fatigue = Math.max(0, p.fatigue - 8 - s.facilities.medical * 2);
      p.condition = Math.min(100, p.condition + 8);
      p.injury = Math.max(0, p.injury - 1);
      if (s.day % 7 === 0 && !s.careerVersion) {
        const k =
          s.training === "체력"
            ? "endurance"
            : s.training === "전술"
              ? "tactics"
              : s.training === "무기"
                ? "tech"
                : pick(s, Object.keys(stats));
        if (rand(s) < 0.15 + s.facilities.training * 0.05 && p.ca < p.pa) {
          p.stats[k] = Math.min(20, p.stats[k] + 1);
          p.ca = Math.round(
            (Object.values(p.stats).reduce((a, b) => a + b, 0) / 22) * 10,
          );
        }
      }
    }
    if (s.day % 7 === 0)
      s.budget -=
        s.players.reduce((n, p) => n + p.wage, 0) +
        Object.values(s.facilities).reduce((a, b) => a + b, 0) * 3;
    for (const item of s.uniqueSchedule.filter(
      (x) => x.day === s.elapsed && !s.usedUniques.includes(x.id),
    )) {
      const p = player(s, {
        unique: item.id,
        country: pick(s, Object.keys(namePools)),
        team: -1,
      });
      s.market.push(p);
      s.usedUniques.push(item.id);
      s.news.unshift({
        day: s.day,
        title: "자유계약 시장 소식",
        text: `${p.name} 선수가 자유계약 시장에 등록되었습니다.`,
      });
    }
  }
}
export function enemyRoster(s) {
  return Array.from({ length: 30 }, () =>
    player(s, { team: 1, level: clamp(Math.floor(s.round / 4), 0, 2) }),
  );
}
export function finishFixture(s, result) {
  const fixture = nextFixture(s);
  if (!fixture) throw Error("시즌이 종료되었습니다.");
  function apply(a, b, sa, sb) {
    const x = s.table[a],
      y = s.table[b];
    x.played++;
    y.played++;
    x.for += sa;
    x.against += sb;
    y.for += sb;
    y.against += sa;
    (sa > sb ? x : y).wins++;
    (sa > sb ? y : x).losses++;
  }
  for (const [a, b] of s.schedule[s.round]) {
    if (a === 0 || b === 0) apply(0, fixture.opponent.id, result[0], result[1]);
    else {
      const winner = rand(s) < 0.5;
      const loss = Math.floor(rand(s) * 3);
      apply(a, b, winner ? 3 : loss, winner ? loss : 3);
    }
  }
  s.budget += result[0] > result[1] ? 110 : 55;
  s.history.unshift({
    season: s.season,
    day: s.day,
    round: s.round + 1,
    opponent: fixture.opponent.name,
    score: result.join(" : "),
    win: result[0] > result[1],
  });
  s.news.unshift({
    day: s.day,
    title: result[0] > result[1] ? "승리 보고" : "경기 종료",
    text: `${fixture.opponent.name}전 ${result.join(":")} · 수입 ${result[0] > result[1] ? 110 : 55}백만원`,
  });
  s.round++;
  if (!s.careerVersion) advance(s, 2);
}
const weights = ["tech", "accuracy", "defense", "judgment"];
export class Battle {
  constructor(
    rosters,
    modeIndex,
    seed,
    tactic = "균형",
    terrain = "city",
    instructions = {},
  ) {
    this.instructions = instructions;
    this.rng = { seed };
    this.modeIndex = modeIndex;
    this.mode = modes[modeIndex];
    this.tactic = tactic;
    this.terrain = terrain;
    this.time = 0;
    this.done = false;
    this.winner = null;
    this.scores = [0, 0];
    this.logs = [];
    this.events = [];
    this.drops = [];
    this.bases = [
      { x: -31, z: 0 },
      { x: 31, z: 0 },
    ];
    this.flags = [0, 1].flatMap((team) =>
      [-15, 0, 15].map((z, i) => ({
        id: team * 3 + i,
        team,
        home: { x: team === 0 ? -26 : 26, z },
        x: team === 0 ? -26 : 26,
        z,
        carrierId: null,
        capturedBy: null,
        dropped: false,
      })),
    );
    this.zones = this.bases;
    this.units = [];
    for (let team = 0; team < 2; team++) {
      let chosen = rosters[team].filter((p) => !p.injury);
      if (chosen.length < this.mode.n)
        throw Error("출전 가능한 선수가 부족합니다.");
      if (modeIndex === 4)
        chosen = [...chosen].sort((a, b) => overall(b) - overall(a));
      chosen = chosen.slice(0, this.mode.n);
      chosen.forEach((base, i) => {
        ensurePlayerAttributes(base);
        const assigned =
          team === 0 && roles.includes(instructions.roleAssignments?.[base.id])
            ? instructions.roleAssignments[base.id]
            : base.role;
        const form = (base.matchForm ?? 1) * roleEffect(base, assigned);
        const p = {
          ...base,
          role: assigned,
          stats: Object.fromEntries(
            Object.entries(base.stats).map(([k, v]) => [
              k,
              Math.max(1, Math.min(20, v * form)),
            ]),
          ),
        };
        const spacing =
          team === 0 && instructions.formation === "집중"
            ? 4
            : team === 0 && instructions.formation === "분산"
              ? 10
              : 7;
        const x = (team === 0 ? -1 : 1) * (22 + Math.floor(i / 5) * 4),
          z = ((i % 5) - 2) * spacing;
        this.units.push({
          id: p.id,
          p,
          team,
          x,
          z,
          spawn: { x, z },
          hp: 100,
          energy: Math.max(30, 100 - p.fatigue),
          alive: true,
          respawn: 0,
          cooldown: rand(this.rng) * 3,
          angle: team ? Math.PI / 2 : -Math.PI / 2,
          king: modeIndex === 3 && i === 0,
          armed: true,
          recover: 0,
          kills: 0,
          assists: 0,
          deaths: 0,
          objectives: 0,
          contributors: {},
          animation: 0,
          targetId: null,
          cautions: 0,
          disqualified: false,
          flagId: null,
          captureRole: i % 5 < 3 ? "runner" : "defender",
          lane: i % 3,
        });
      });
    }
    this.log(`${this.mode.name} 시작 — ${this.mode.n} 대 ${this.mode.n}`);
  }
  log(text) {
    this.logs.unshift({ time: this.time, text });
    this.logs = this.logs.slice(0, 60);
  }
  alive(team) {
    return this.units.filter((u) => u.team === team && u.alive);
  }
  flagDestination(u, target, hasEnemy) {
    if (u.flagId !== null) return this.bases[u.team];
    const ownDropped = this.flags
      .filter(
        (f) =>
          f.team === u.team &&
          f.dropped &&
          f.carrierId === null &&
          f.capturedBy === null,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z),
      )[0];
    if (
      ownDropped &&
      (u.captureRole === "defender" ||
        Math.hypot(ownDropped.x - u.x, ownDropped.z - u.z) < 5)
    )
      return ownDropped;
    if (u.captureRole === "runner") {
      const available = this.flags.filter(
        (f) =>
          f.team !== u.team && f.capturedBy === null && f.carrierId === null,
      );
      if (available.length) return available[u.lane % available.length];
      const carrier = this.units.find(
        (a) => a.team === u.team && a.alive && a.flagId !== null,
      );
      if (carrier)
        return {
          x: carrier.x + (u.team === 0 ? 2 : -2),
          z: carrier.z + (u.lane - 1) * 2,
        };
    }
    if (hasEnemy && Math.hypot(target.x - u.x, target.z - u.z) < 10)
      return null;
    const homeFlag = this.flags.filter(
      (f) => f.team === u.team && f.capturedBy === null,
    )[
      u.lane %
        Math.max(
          1,
          this.flags.filter((f) => f.team === u.team && f.capturedBy === null)
            .length,
        )
    ];
    return homeFlag
      ? { x: homeFlag.home.x + (u.team === 0 ? 4 : -4), z: homeFlag.home.z }
      : this.bases[u.team];
  }
  dropFlag(u) {
    if (u.flagId === null) return;
    const flag = this.flags.find((f) => f.id === u.flagId);
    if (flag) {
      flag.carrierId = null;
      flag.x = u.x;
      flag.z = u.z;
      flag.dropped = true;
      this.log(`${u.p.name} 아웃 — 깃발이 지면에 떨어졌습니다.`);
    }
    u.flagId = null;
  }
  updateFlags() {
    for (const flag of this.flags) {
      if (flag.capturedBy !== null) continue;
      if (flag.carrierId !== null) {
        const carrier = this.units.find((u) => u.id === flag.carrierId);
        if (!carrier?.alive) {
          if (carrier) this.dropFlag(carrier);
          continue;
        }
        flag.x = carrier.x;
        flag.z = carrier.z;
        const base = this.bases[carrier.team];
        if (Math.hypot(carrier.x - base.x, carrier.z - base.z) <= 4) {
          this.scores[carrier.team]++;
          carrier.objectives++;
          flag.capturedBy = carrier.team;
          flag.carrierId = null;
          carrier.flagId = null;
          this.log(
            `${carrier.p.name} 깃발 운반 성공 — ${this.scores.join(" : ")}`,
          );
          if (this.scores[carrier.team] >= 3) {
            this.done = true;
            this.winner = carrier.team;
            return;
          }
        }
        continue;
      }
      if (flag.dropped) {
        const defender = this.alive(flag.team).find(
          (u) => Math.hypot(u.x - flag.x, u.z - flag.z) <= 2,
        );
        if (defender) {
          flag.x = flag.home.x;
          flag.z = flag.home.z;
          flag.dropped = false;
          this.log(`${defender.p.name} 아군 깃발 회수`);
          continue;
        }
      }
      const thief = this.alive(1 - flag.team)
        .filter(
          (u) =>
            u.flagId === null && Math.hypot(u.x - flag.x, u.z - flag.z) <= 2,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - flag.x, a.z - flag.z) -
            Math.hypot(b.x - flag.x, b.z - flag.z),
        )[0];
      if (thief) {
        thief.flagId = flag.id;
        flag.carrierId = thief.id;
        flag.dropped = false;
        this.log(`${thief.p.name} 상대 깃발 획득 — 아군 기지로 복귀`);
      }
    }
    if (Math.max(...this.scores) >= 3) {
      this.done = true;
      this.winner = this.scores[0] > this.scores[1] ? 0 : 1;
    }
  }
  step(dt = 0.5) {
    if (this.done) return;
    dt = Math.min(dt, this.mode.time - this.time);
    this.time += dt;
    this.events = this.events.filter((e) => this.time - e.time < 1);
    for (const u of this.units) {
      u.animation = Math.max(0, u.animation - dt);
      if (!u.alive) {
        if (
          !u.disqualified &&
          this.modeIndex === 2 &&
          this.time >= u.respawn &&
          this.time < this.mode.time
        ) {
          u.alive = true;
          u.hp = 100;
          u.energy = Math.max(30, u.energy);
          u.x = u.spawn.x;
          u.z = u.spawn.z;
          u.armed = true;
          u.contributors = {};
          this.log(`${u.p.name} 리스폰`);
        }
        continue;
      }
      const enemies = this.alive(1 - u.team);
      if (!enemies.length && this.modeIndex !== 1) continue;
      u.cooldown -= dt;
      let target = enemies.length
        ? enemies.reduce((a, b) =>
            Math.hypot(a.x - u.x, a.z - u.z) < Math.hypot(b.x - u.x, b.z - u.z)
              ? a
              : b,
          )
        : { id: null, x: u.x, z: u.z, p: u.p };
      if (this.modeIndex === 3 && u.p.role === "기동")
        target = enemies.find((e) => e.king) || target;
      if (u.team === 0 && enemies.length) {
        const near = enemies.filter(
          (e) => Math.hypot(e.x - u.x, e.z - u.z) < 12,
        );
        if (this.instructions.target === "약한 적" && near.length)
          target = near.reduce((a, b) => (a.hp < b.hp ? a : b));
        if (this.instructions.target === "원거리" && near.length)
          target = near.find((e) => weapons[e.p.weapon].range > 10) || target;
      }
      u.targetId = target.id;
      let tx = target.x,
        tz = target.z;
      const wp = weapons[u.p.weapon];
      let range = u.armed ? wp.range : 1.5;
      let dist = Math.hypot(tx - u.x, tz - u.z);
      const trait = u.p.unique != null ? uniques[u.p.unique].trait.kind : null;
      if (!u.armed) {
        u.recover -= dt;
        if (u.recover <= 0) {
          const drop = this.drops.find((d) => d.owner === u.id);
          if (drop && Math.hypot(drop.x - u.x, drop.z - u.z) < 2.5) {
            u.armed = true;
            this.drops = this.drops.filter((d) => d.owner !== u.id);
            this.log(`${u.p.name} 무기 회수`);
          } else if (drop) {
            tx = drop.x;
            tz = drop.z;
            dist = Math.hypot(tx - u.x, tz - u.z);
          }
        }
      }
      let objectiveMove = false;
      if (this.modeIndex === 1) {
        const destination = this.flagDestination(u, target, enemies.length > 0);
        if (destination) {
          tx = destination.x;
          tz = destination.z;
          objectiveMove = true;
        }
      }
      if (this.modeIndex === 3 && u.king && dist < 10) {
        tx = u.spawn.x;
        tz = u.spawn.z;
      }
      let move = Math.hypot(tx - u.x, tz - u.z);
      const attackDist = Math.hypot(target.x - u.x, target.z - u.z);
      const ranged = range > 10;
      const desired = objectiveMove ? 0.6 : ranged ? range * 0.65 : range * 0.8;
      if (move > desired || tx !== target.x || tz !== target.z) {
        let speed = (1.05 + u.p.stats.speed * 0.095) * (u.energy / 180 + 0.45);
        if (u.team === 0 && this.tactic === "공격") speed *= 1.1;
        if (this.terrain === "snow") speed *= 0.8;
        if (this.terrain === "mountain")
          speed *= 0.78 + u.p.stats.balance * 0.01;
        if (trait === "rush" && this.time < 60) speed *= 1.15;
        if (trait === "chase") speed *= 1.1;
        if (u.flagId !== null) speed *= 0.85;
        if (trait === "escort" && u.p.role === "호위") speed *= 1.15;
        const dx = (tx - u.x) / Math.max(0.01, move),
          dz = (tz - u.z) / Math.max(0.01, move);
        u.x = clamp(u.x + dx * speed * dt, -34, 34);
        u.z = clamp(u.z + dz * speed * dt, -24, 24);
        u.energy = Math.max(
          5,
          u.energy -
            dt *
              Math.max(0.025, 0.09 - u.p.stats.endurance * 0.003) *
              (trait === "chase" ? 1.15 : 1),
        );
      }
      u.angle =
        objectiveMove && attackDist > range
          ? Math.atan2(tx - u.x, tz - u.z)
          : Math.atan2(target.x - u.x, target.z - u.z);
      if (enemies.length && attackDist <= range && u.cooldown <= 0) {
        if (rand(this.rng) < foulRisk(u.p)) {
          u.cautions++;
          u.cooldown = 6;
          this.log(`${u.p.name} 거친 플레이 주의 ${u.cautions}/3`);
          if (u.cautions >= 3) {
            u.disqualified = true;
            u.alive = false;
            u.hp = 0;
            this.dropFlag(u);
            if (u.king) {
              this.done = true;
              this.winner = 1 - u.team;
              break;
            }
            this.log(`${u.p.name} 누적 주의로 세트 실격`);
          }
          continue;
        }
        u.cooldown =
          (ranged ? (u.p.weapon === 10 ? 7 : 4) : 3.8) +
          (20 - u.p.stats.tech) * 0.08;
        u.animation = 0.7;
        u.energy = Math.max(
          5,
          u.energy -
            (trait === "power" ? 1.44 : 1.2) *
              (1.2 - u.p.stats.endurance * 0.025),
        );
        let hit =
          0.43 +
          (u.p.stats.accuracy - target.p.stats.dodge) * 0.017 +
          (u.p.mastery - 10) * 0.012 +
          (u.p.stats.judgment - target.p.stats.prediction) * 0.009 +
          (u.energy - 50) * 0.002;
        hit += (u.p.morale - 50) * 0.0005;
        if (!u.armed)
          hit = 0.4 + (u.p.stats.grapple - target.p.stats.defense) * 0.02;
        if (u.team === 0 && this.tactic === "공격") hit += 0.03;
        if (this.terrain === "forest" && ranged && attackDist > 12) hit -= 0.15;
        if (trait === "duel" && this.modeIndex === 4) hit += 0.1;
        if (trait === "aim" && ranged) hit += 0.08;
        if (
          trait === "team" &&
          this.units.some(
            (a) =>
              a !== u &&
              a.team === u.team &&
              a.alive &&
              a.targetId === target.id &&
              Math.hypot(a.x - target.x, a.z - target.z) <
                weapons[a.p.weapon].range,
          )
        )
          hit += 0.08;
        if (
          trait === "last" &&
          this.alive(u.team).length < this.alive(1 - u.team).length
        )
          hit += 0.08;
        const targetTrait =
          target.p.unique != null ? uniques[target.p.unique].trait.kind : null;
        let guard =
          0.1 +
          (target.p.stats.defense + weapons[target.p.weapon].guard) * 0.007;
        if (target.team === 0 && this.tactic === "수비") guard += 0.06;
        if (targetTrait === "guard" && !ranged) guard += 0.08;
        if (
          targetTrait === "zone" &&
          this.zones.some((z) => Math.hypot(z.x - target.x, z.z - target.z) < 6)
        )
          guard += 0.08;
        const landed =
          rand(this.rng) < clamp(hit, 0.12, 0.9) && rand(this.rng) > guard;
        this.events.push({
          from: { x: u.x, z: u.z },
          to: { x: target.x, z: target.z },
          team: u.team,
          hit: landed,
          ranged,
          time: this.time,
        });
        if (landed) {
          let damage =
            (u.armed ? wp.damage : 8) + (u.p.stats.strength - 10) * 0.4;
          if (trait === "power" && !ranged) damage *= 1.15;
          target.hp = Math.max(0, target.hp - damage);
          target.contributors[u.id] = this.time;
          if (
            target.armed &&
            rand(this.rng) <
              clamp(
                0.025 + (u.p.stats.disarm - target.p.stats.tech) * 0.002,
                0.005,
                0.08,
              )
          ) {
            target.armed = false;
            target.recover = 5;
            this.drops.push({ owner: target.id, x: target.x + 1, z: target.z });
            this.log(`${target.p.name} 무기 손실`);
          }
          if (target.hp <= 0) {
            target.alive = false;
            target.deaths++;
            u.kills++;
            this.scores[u.team] += this.modeIndex === 2 ? 1 : 0;
            target.respawn = this.time + DEATHMATCH_RESPAWN;
            this.dropFlag(target);
            for (const [id, t] of Object.entries(target.contributors))
              if (+id !== u.id && this.time - t < 15) {
                const a = this.units.find((v) => v.id === +id);
                if (a) a.assists++;
              }
            this.log(
              `${u.p.name} → ${target.p.name} 아웃${target.king ? " · 왕 탈락" : ""}`,
            );
            if (target.king) {
              this.done = true;
              this.winner = u.team;
            }
          }
        }
      }
    }
    // Keep fighters separate so formations and individual encounters remain readable.
    const live = this.units.filter((u) => u.alive);
    for (let i = 0; i < live.length; i++)
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i],
          b = live[j],
          dx = a.x - b.x,
          dz = a.z - b.z,
          d = Math.hypot(dx, dz);
        if (d < 1.25) {
          const nx = d > 0.001 ? dx / d : Math.cos(a.id),
            nz = d > 0.001 ? dz / d : Math.sin(a.id),
            push = (1.25 - d) * 0.35;
          a.x = clamp(a.x + nx * push, -34, 34);
          a.z = clamp(a.z + nz * push, -24, 24);
          b.x = clamp(b.x - nx * push, -34, 34);
          b.z = clamp(b.z - nz * push, -24, 24);
        }
      }
    if (this.modeIndex === 1) this.updateFlags();
    if (
      this.modeIndex !== 2 &&
      this.modeIndex !== 1 &&
      !this.done &&
      (!this.alive(0).length || !this.alive(1).length)
    ) {
      this.done = true;
      this.winner = this.alive(0).length ? 0 : 1;
    }
    if (!this.done && this.time >= this.mode.time) {
      const score = this.scores[0] - this.scores[1];
      const health = this.units.reduce(
        (n, u) => n + (u.team === 0 ? 1 : -1) * Math.max(0, u.hp),
        0,
      );
      this.winner =
        score !== 0
          ? score > 0
            ? 0
            : 1
          : health !== 0
            ? health > 0
              ? 0
              : 1
            : rand(this.rng) < 0.5
              ? 0
              : 1;
      this.done = true;
      this.log(
        this.modeIndex === 2
          ? "60분 종료 — 킬 수 우선 판정. 동점은 잔여 피해 여유, 완전 동률은 추첨."
          : this.modeIndex === 1
            ? "60분 종료 — 깃발 운반 수 우선 판정. 동점은 잔여 피해 여유, 완전 동률은 추첨."
            : "60분 종료 — 잔여 피해 여유로 판정. 완전 동률은 추첨.",
      );
    }
    if (this.done)
      this.log(`${this.winner === 0 ? "우리 팀" : "상대 팀"} 세트 승리`);
  }
}

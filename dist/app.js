import { explorerHTML, newExplorer } from "./explorer.js";
import { getLeague, leagueId, clubRoster, rankTable } from "./world.js";
import { ensurePlayerAttributes, coachObservations } from "./attributes.js";
import {
  createWorld,
  player,
  rand,
  roles,
  weapons,
  stats,
  overall,
  value,
  uniques,
  modes,
  terrainInfo,
  nextFixture,
  clamp,
} from "./engine.js";
import {
  countries,
  sessions,
  intensities,
  categoryLabels,
  createCareer,
  migrateCareer,
  normalizeNews,
  addNews,
  fixtures,
  formatDate,
  calendarDate,
  weekday,
  trainingDay,
  setTrainingSlot,
  pendingNews,
  resolveNews,
  advanceCareer,
  suggestLineup,
  beginSeries,
  prepareSet,
  completeSet,
  nextSeason,
  forfeitMatch,
} from "./career.js";
import { ArenaView } from "./arena.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const key = "arena-manager-save-v1";
let state = null,
  loadError = "";
try {
  const raw = localStorage.getItem(key);
  if (raw) {
    const old = JSON.parse(raw);
    if (
      !old.careerVersion &&
      !localStorage.getItem("arena-manager-save-backup-v1")
    )
      localStorage.setItem("arena-manager-save-backup-v1", raw);
    state = migrateCareer(old);
  }
} catch {
  loadError =
    "저장을 읽지 못했습니다. 기존 저장을 내보내 두었다면 불러오기를 사용하세요.";
}
let setupActive = !state,
  setupDraft = {
    country: "한국",
    city: "서울",
    club: "",
    manager: "",
    age: 30,
    color: "#c1ee69",
  };
let tab = state?.matchSeries ? "tactics" : "command",
  arena = null,
  battle = null,
  series = state?.matchSeries || null,
  running = false,
  speed = 12,
  rosterFilter = "",
  roleFilter = "",
  marketFilter = "",
  selected = new Set(state?.lineup || []),
  lastTick = 0,
  uiTick = 0,
  tacticsMode = 0,
  newsFilter = "전체",
  newsId = null,
  calendarMonth = null,
  explorer = newExplorer();
const date = () => formatDate(state),
  clock = (t) =>
    `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const portrait = (p, cls = "portrait") => {
  if (p.unique != null) {
    const index = p.unique % 25,
      atlas = ["a", "b", "c", "d"][Math.floor(p.unique / 25)];
    return `<div class="${cls} atlas-portrait" role="img" aria-label="${esc(p.name)} 초상화" style="--portrait-atlas:url('assets/portraits-${atlas}.png');--portrait-x:${(index % 5) * 25}%;--portrait-y:${Math.floor(index / 5) * 25}%"></div>`;
  }
  return p.portrait == null
    ? `<div class="${cls} portrait-fallback">${esc(p.name[0])}</div>`
    : `<img class="${cls}" src="assets/portrait-${p.portrait}.webp" alt="${esc(p.name)} 초상화" loading="lazy">`;
};
const nav = [
  ["command", "감독실"],
  ["news", "새 소식"],
  ["schedule", "일정"],
  ["roster", "선수단"],
  ["tactics", "전술 · 명단"],
  ["training", "훈련센터"],
  ["market", "이적 시장"],
  ["facilities", "시설 · 유스"],
  ["league", "리그 현황"],
  ["explore", "세계 탐색"],
  ["relations", "인물 관계"],
];
const icon = () =>
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 15h5"/></svg>';
const options = (values, current) =>
  values
    .map(
      (v) =>
        `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(v)}</option>`,
    )
    .join("");
const dayNames = ["월", "화", "수", "목", "금", "토", "일"];
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
}
function save(silent = true) {
  if (!state) return;
  normalizeNews(state);
  state.lineup = [...selected];
  const checkpoint =
    series && !series.finished ? { ...series, phase: "preparation" } : null;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ ...state, matchSeries: checkpoint }),
    );
    if (!silent)
      toast("자동 저장 완료. 진행 중인 세트는 시작 전 상태로 저장됩니다.");
  } catch {
    toast("저장 공간이 부족합니다. 저장 파일을 내보내세요.");
  }
}
function ranked() {
  return rankTable(state.table);
}
function title(kicker, text, sub = "", actions = "") {
  return `<div class="page-title"><div><div class="eyebrow">${kicker}</div><h1>${text}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${actions}</div>`;
}
function continueLabel() {
  return pendingNews(state)
    ? "응답 필요"
    : nextFixture(state)?.day <= state.day
      ? "경기 준비"
      : "하루 진행";
}
function shell() {
  if (arena) {
    arena.dispose();
    arena = null;
  }
  if (setupActive) {
    renderSetup();
    return;
  }
  document.documentElement.style.setProperty("--accent", state.clubColor);
  const locked = series && !series.finished;
  $("#app").innerHTML =
    `<div class="shell"><aside class="sidebar"><div class="brand">AR<em>E</em>NA</div><div class="brand-sub">GLADIATOR MANAGER</div><div class="club-side"><div class="club-mark">${esc(state.club[0])}</div><div><strong>${esc(state.club)}</strong><small>${esc(state.country)} · ${esc(state.city)}</small></div></div><nav class="nav" aria-label="게임 메뉴">${nav.map(([id, label]) => `<button data-nav="${id}" class="${id === tab ? "active" : ""}" ${locked ? "disabled" : ""}>${icon()}${label}${id === "news" && state.news.some((n) => !n.read) ? `<span class="nav-badge">${state.news.filter((n) => !n.read).length}</span>` : ""}</button>`).join("")}</nav><div class="sidebar-foot"><div>CAREER · v0.4.0</div><div>컴퓨터 내 자동 저장</div><button data-action="export" class="ghost">저장 파일 내보내기</button><button data-action="import" class="ghost" ${locked ? "disabled" : ""}>저장 파일 불러오기</button><button data-action="reset" class="ghost" ${locked ? "disabled" : ""}>새 구단 생성</button><input id="save-file" type="file" accept="application/json" hidden></div></aside><main class="main"><header class="topbar"><div><div class="eyebrow">${state.season} SEASON / ROUND ${Math.min(state.round + 1, 14)}</div><strong>${date()} <span class="muted">· ${esc(state.manager.name)} 감독</span></strong></div><div class="top-actions"><div class="balance">${state.budget.toLocaleString()} <small>백만원</small></div><button data-action="save" class="ghost">저장</button><button data-action="day" class="primary" ${locked ? "disabled" : ""}>${continueLabel()}</button></div></header><div class="content" id="content"></div></main></div>`;
  renderContent();
}
function renderContent() {
  if (arena) {
    arena.dispose();
    arena = null;
  }
  const c = $("#content");
  if (!c) return;
  (
    ({
      command: renderCommand,
      news: renderNews,
      schedule: renderSchedule,
      roster: renderRoster,
      tactics: renderTactics,
      training: renderTraining,
      market: renderMarket,
      facilities: renderFacilities,
      league: renderLeague,
      explore: renderExplorer,
      relations: renderRelations,
    })[tab] || renderCommand
  )(c);
}
function renderSetup() {
  const country = countries.find((c) => c.name === setupDraft.country),
    terrain = country.terrains[country.cities.indexOf(setupDraft.city)];
  $("#app").innerHTML =
    `<main class="onboarding"><div class="onboard-intro"><div class="brand">AR<em>E</em>NA</div><div class="eyebrow">YOUR CLUB. YOUR LEGACY.</div><h1>새 구단의<br>첫 페이지를 열다.</h1><p>연고지를 정하고 선수단을 이끌 감독으로 부임하세요.<br>훈련과 영입을 설계하고, 다섯 종목의 승부를 지휘합니다.</p><div class="onboard-facts"><span>30명 선수단</span><span>8팀 리그</span><span>5판 3선승</span></div><p class="footer-note">기존 저장이 있다면 파일을 불러와 이어갈 수 있습니다.</p><button data-action="import">저장 불러오기</button>${state ? '<button data-action="cancel-setup" class="ghost">현재 구단으로 돌아가기</button>' : ""}<input id="save-file" type="file" accept="application/json" hidden></div><form id="career-form" class="panel setup-form"><div class="eyebrow">CLUB REGISTRATION</div><h2>구단 생성</h2>${loadError ? `<p class="error-text">${esc(loadError)}</p>` : ""}<div class="grid two"><label>참가 국가<select name="country" id="setup-country">${options(
      countries.map((c) => c.name),
      setupDraft.country,
    )}</select></label><label>연고 도시<select name="city" id="setup-city">${options(country.cities, setupDraft.city)}</select></label></div><label>구단 이름<input name="club" required minlength="2" maxlength="30" placeholder="예: ${esc(setupDraft.city)} 이클립스" value="${esc(setupDraft.club)}"></label><div class="grid two"><label>감독 이름<input name="manager" required maxlength="24" placeholder="감독 이름" value="${esc(setupDraft.manager)}"></label><label>감독 나이<input name="age" type="number" min="18" max="80" required value="${setupDraft.age}"></label></div><label>구단 색상<select name="color">${[
      ["#c1ee69", "라임"],
      ["#77c9f5", "블루"],
      ["#f3b777", "앰버"],
      ["#d6a6ec", "라일락"],
    ]
      .map(
        ([v, n]) =>
          `<option value="${v}" ${setupDraft.color === v ? "selected" : ""}>${n}</option>`,
      )
      .join(
        "",
      )}</select></label><div class="info"><strong>${esc(setupDraft.city)} · ${terrainInfo[terrain].name} 아레나</strong><p>${terrainInfo[terrain].desc}</p><span>초기 예산 650백만원 · 선수 30명 · 유스 5명<br>국내 8팀 홈·원정 리그 · 첫 경기까지 준비 기간 5일</span></div><button type="submit" class="primary full">구단을 창단하고 감독으로 부임</button></form></main>`;
}
function weekStrip() {
  return `<div class="week-strip">${Array.from({ length: 7 }, (_, i) => {
    const d = state.day + i,
      f = fixtures(state).find((f) => f.day === d),
      p = trainingDay(state, d);
    return `<div class="week-day ${i === 0 ? "today" : ""} ${f ? "match-day" : ""}"><span>${formatDate(state, d).slice(5)} ${dayNames[weekday(state, d)]}</span><strong>${f ? "리그 경기" : p.am}</strong><small>${f ? esc(f.opponent.name) : p.pm}</small></div>`;
  }).join("")}</div>`;
}
function renderCommand(c) {
  if (series?.phase === "playing") {
    renderLive(c);
    return;
  }
  const f = nextFixture(state),
    rank = ranked().findIndex((t) => t.id === 0) + 1,
    pending = pendingNews(state),
    last = state.lastMatch;
  c.innerHTML =
    title(
      "MANAGER HOME",
      "감독실",
      `${esc(state.manager.name)} 감독님, ${esc(state.club)}의 오늘을 준비하세요.`,
      `<span class="pill lime">${rank}위 / 8팀</span>`,
    ) +
    `${last && last.day === state.day ? `<div class="result"><div class="eyebrow">FULL TIME</div><h2>${esc(last.opponent)} <span class="number">${last.wins.join(" : ")}</span></h2><p>${last.wins[0] > last.wins[1] ? "경기 승리" : "경기 패배"} · 다음 날은 회복 훈련이 편성됩니다.</p></div>` : ""}${pending ? `<button class="attention full" data-open-news="${pending.id}">응답 필요 · ${esc(pending.title)} →</button>` : ""}<div class="dashboard-grid section-gap"><section class="panel fixture"><div class="eyebrow">NEXT MATCH · ROUND ${state.round + 1}</div><div class="big">${f ? (f.day <= state.day ? "MATCHDAY" : "D−" + (f.day - state.day)) : "SEASON END"}</div><h2>${f ? esc(f.opponent.name) : "시즌 종료"}</h2><p>${f ? `${formatDate(state, f.day)} · ${f.home ? "홈" : "원정"} · ${terrainInfo[f.terrain].name} 아레나` : "이번 시즌 모든 경기를 마쳤습니다."}</p><div class="fixture-details"><span>대회 방식</span><strong>5판 3선승제</strong></div><button class="primary full" data-action="${f ? "day" : "new-season"}">${f ? continueLabel() : "다음 시즌 시작"}</button>${f && f.day > state.day ? '<button class="full section-gap" data-action="advance-match">다음 경기까지 진행</button><p class="footer-note">응답이 필요한 소식이 오면 중간에 멈춥니다.</p>' : ""}</section><section class="panel"><div class="panel-head"><h2>이번 주 일정</h2><button class="ghost" data-nav="schedule">일정 보기</button></div><div class="panel-body">${weekStrip()}<div class="grid three section-gap">${[
      ["등록 선수", state.players.length + " / 30"],
      [
        "평균 피로",
        Math.round(
          state.players.reduce((a, p) => a + p.fatigue, 0) /
            state.players.length,
        ) + "%",
      ],
      ["미확인 소식", state.news.filter((n) => !n.read).length + "건"],
    ]
      .map(
        ([k, v]) =>
          `<div class="stat-card"><p>${k}</p><strong class="value">${v}</strong></div>`,
      )
      .join(
        "",
      )}</div><button class="full section-gap" data-nav="training">주간 훈련 계획 관리</button></div></section></div><div class="grid two section-gap"><section class="panel"><div class="panel-head"><h2>새 소식</h2><button class="ghost" data-nav="news">전체 소식</button></div>${state.news
      .slice(0, 5)
      .map(
        (n) =>
          `<button class="news-preview ${n.read ? "" : "unread"}" data-open-news="${n.id}"><span class="pill">${n.category}</span><strong>${esc(n.title)}</strong><small>${formatDate({ season: n.season }, n.day)}</small></button>`,
      )
      .join(
        "",
      )}</section><section class="panel"><div class="panel-head"><h2>선수단 현황</h2><button class="ghost" data-nav="roster">선수단</button></div>${[
      ...state.players,
    ]
      .sort((a, b) => overall(b) - overall(a))
      .slice(0, 5)
      .map(
        (p) =>
          `<button class="news-preview" data-player="${p.id}">${portrait(p)}<strong>${esc(p.name)}<small>${p.role} · ${weapons[p.weapon].name}</small></strong><span class="rating">${overall(p)}</span></button>`,
      )
      .join("")}</section></div>`;
}
function openNews(id) {
  newsFilter = "전체";
  newsId = Number(id);
  const n = state.news.find((n) => n.id === newsId);
  if (n) n.read = true;
  tab = "news";
  save();
  shell();
}
function renderNews(c) {
  const list = state.news.filter(
      (n) =>
        newsFilter === "전체" ||
        (newsFilter === "미확인" ? !n.read : n.category === newsFilter),
    ),
    n = state.news.find((n) => n.id === newsId) || list[0];
  c.innerHTML =
    title(
      "COMMUNICATION",
      "새 소식",
      "구단 보고, 이적 소식과 이벤트를 확인하고 결정을 내리세요.",
      `<button data-action="read-all">모두 읽음</button>`,
    ) +
    `<div class="filters">${[...categoryLabels, "미확인"].map((cat) => `<button data-news-filter="${cat}" class="${cat === newsFilter ? "primary" : ""}">${cat}</button>`).join("")}</div><div class="inbox-layout"><section class="panel inbox-list">${list.map((item) => `<button class="news-item ${item.id === n?.id ? "active" : ""} ${item.read ? "" : "unread"}" data-open-news="${item.id}"><span class="flex spread"><small>${item.category} · ${esc(item.sender)}</small>${item.mustRespond && !item.resolution ? '<b class="error-text">응답 필요</b>' : ""}</span><strong>${esc(item.title)}</strong><small>${formatDate({ season: item.season }, item.day)}</small></button>`).join("") || '<p class="empty">표시할 소식이 없습니다.</p>'}</section><article class="panel news-detail">${n ? `<span class="pill">${n.category}</span><h2>${esc(n.title)}</h2><p class="muted">${esc(n.sender)} · ${formatDate({ season: n.season }, n.day)}</p><p class="event-scene">${esc(n.text)}</p>${n.resolution ? `<div class="info">처리 완료 · ${n.resolution}</div>` : n.action ? `<div class="dialog-actions"><button class="primary" data-news-choice="accept" data-news-id="${n.id}">${n.action.kind === "relationship" ? "대화로 안심시키기" : n.action.kind === "trial" ? "테스트 진행 · 12백만" : "제안 수락"}</button><button data-news-choice="decline" data-news-id="${n.id}">${n.action.kind === "relationship" ? "개인적 경계를 설명하기" : "거절"}</button></div>` : ""}${n.playerId && findPlayer(n.playerId) ? `<button class="section-gap" data-player="${n.playerId}">선수 보고서 보기</button>` : ""}${!n.read ? `<button class="section-gap ghost" data-open-news="${n.id}">읽음으로 표시</button>` : ""}` : '<div class="empty">새 소식이 도착하면 이곳에서 확인할 수 있습니다.</div>'}</article></div>`;
}
function renderSchedule(c) {
  const current = calendarDate(state);
  if (calendarMonth === null) calendarMonth = current.getUTCMonth();
  const first = new Date(Date.UTC(state.season, calendarMonth, 1)),
    offset = (first.getUTCDay() + 6) % 7,
    total = new Date(Date.UTC(state.season, calendarMonth + 1, 0)).getUTCDate(),
    base = Date.UTC(state.season, 0, 5),
    fs = fixtures(state);
  c.innerHTML =
    title(
      "CLUB CALENDAR",
      "일정",
      "경기와 훈련을 한눈에 확인하고 다음 일정을 준비하세요.",
      `<div class="flex"><button data-calendar="-1">이전</button><strong>${first.getUTCFullYear()}년 ${first.getUTCMonth() + 1}월</strong><button data-calendar="1">다음</button><button data-calendar="today">오늘</button></div>`,
    ) +
    `<section class="panel calendar"><div class="calendar-grid">${dayNames.map((d) => `<div class="calendar-heading">${d}</div>`).join("")}${'<div class="calendar-blank"></div>'.repeat(offset)}${Array.from(
      { length: total },
      (_, i) => {
        const d = Math.round(
            (Date.UTC(state.season, calendarMonth, i + 1) - base) / 86400000,
          ),
          f = fs.find((f) => f.day === d),
          p = d >= 0 ? trainingDay(state, d) : null;
        return `<div class="calendar-cell ${d === state.day ? "today" : ""} ${f ? "match-day" : ""}"><strong>${i + 1}${d === state.day ? " · 오늘" : ""}</strong>${f ? `<span class="pill">R${f.round + 1} · ${f.home ? "홈" : "원정"}</span><b>${esc(f.opponent.name)}</b><small>${f.result ? f.result.score : terrainInfo[f.terrain].name}</small>${f.round === state.round && d <= state.day ? '<button data-action="kickoff">경기 준비</button>' : ""}` : p ? `<span>${p.am} / ${p.pm}</span><small>${p.intensity}</small>` : ""}</div>`;
      },
    ).join(
      "",
    )}</div></section><section class="panel section-gap"><div class="panel-head"><h2>시즌 경기 일정</h2><button data-action="advance-match" ${!nextFixture(state) ? "disabled" : ""}>다음 경기까지 진행</button></div><div class="table-scroll"><table><thead><tr><th>라운드</th><th>일자</th><th>상대</th><th>경기장</th><th>결과</th></tr></thead><tbody>${fs.map((f) => `<tr class="${f.round === state.round ? "ours" : ""}"><td>R${f.round + 1}</td><td>${formatDate(state, f.day)}</td><td>${esc(f.opponent.name)}</td><td>${f.home ? "홈" : "원정"} · ${terrainInfo[f.terrain].name}</td><td>${f.result ? f.result.score : f.day === state.day ? "오늘 경기" : "예정"}</td></tr>`).join("")}</tbody></table></div></section>`;
}
function renderTraining(c) {
  c.innerHTML =
    title(
      "TRAINING CENTRE",
      "훈련센터",
      "오전·오후 훈련과 개인 육성을 설계하세요. 하루 진행 시 계획이 적용됩니다.",
      `<span class="pill lime">시설 LV.${state.facilities.training} · 코치 LV.${state.staff.coach}</span>`,
    ) +
    `<section class="panel"><div class="panel-head"><h2>반복 주간 계획</h2><label class="inline-check"><input id="auto-recovery" type="checkbox" ${state.autoRecovery ? "checked" : ""}>경기 전후 자동 관리</label></div><div class="table-scroll"><table><thead><tr><th>요일</th><th>오전</th><th>오후</th><th>강도</th></tr></thead><tbody>${state.weekPlan.map((p, i) => `<tr><th>${dayNames[i]}요일</th><td><select data-training-day="${i}" data-slot="am" aria-label="${dayNames[i]}요일 오전">${options(Object.keys(sessions), p.am)}</select></td><td><select data-training-day="${i}" data-slot="pm" aria-label="${dayNames[i]}요일 오후">${options(Object.keys(sessions), p.pm)}</select></td><td><select data-training-day="${i}" data-slot="intensity" aria-label="${dayNames[i]}요일 강도">${options(Object.keys(intensities), p.intensity)}</select></td></tr>`).join("")}</tbody></table></div><div class="info">경기일에는 훈련을 하지 않습니다. 자동 관리를 켜면 경기 전날 전술·회복, 경기 다음 날 회복·휴식이 편성됩니다. 강한 훈련은 성장량과 피로를 함께 높입니다.</div></section><section class="section-gap">${weekStrip()}</section><div class="grid three section-gap">${Object.entries(
      sessions,
    )
      .filter(([k]) => k !== "휴식")
      .map(
        ([k, v]) =>
          `<div class="panel panel-body"><h3>${k}</h3><p class="muted">${v.desc}</p></div>`,
      )
      .join(
        "",
      )}</div><section class="panel section-gap"><div class="panel-head"><h2>개인 훈련 · 1군과 유스</h2><span class="muted">개인 중점이 세션 성장 방향에 반영됩니다.</span></div><div class="table-scroll"><table><thead><tr><th>선수</th><th>역할</th><th>피로</th><th>개인 중점</th><th>역할 적응 훈련</th><th>최근 성장</th></tr></thead><tbody>${[
      ...state.players,
      ...state.youth,
    ]
      .map((p) => {
        const growth = state.growthLog.find((g) => g.id === p.id);
        return `<tr><td><button class="ghost" data-player="${p.id}">${esc(p.name)}</button>${p.youth ? '<span class="pill">유스</span>' : ""}</td><td>${p.role}</td><td>${Math.round(p.fatigue)}%${p.fatigue > 65 ? " · 회복 권장" : ""}</td><td><select data-focus="${p.id}" aria-label="${esc(p.name)} 개인 훈련">${options(["균형", "무기", "체력", "전술", "협동"], p.trainingFocus || "균형")}</select></td><td><select data-role-focus="${p.id}" aria-label="${esc(p.name)} 역할 훈련">${options(roles, p.roleTraining || p.role)}</select><small>익숙함 ${p.roleFamiliarity?.[p.roleTraining] || 1}/20</small></td><td>${growth ? `${stats[growth.stat]} → ${growth.value}` : "훈련 진행 중"}</td></tr>`;
      })
      .join(
        "",
      )}</tbody></table></div></section><section class="panel section-gap"><div class="panel-head"><h2>최근 훈련 기록</h2></div>${
      state.trainingHistory
        .slice(0, 7)
        .map(
          (h) =>
            `<div class="news-row flex spread"><span>${formatDate({ season: h.season }, h.day)} · ${h.am} / ${h.pm} · ${h.intensity}</span><strong>성장 ${h.gains}건</strong></div>`,
        )
        .join("") ||
      '<p class="empty">하루를 진행하면 훈련 기록이 쌓입니다.</p>'
    }</section>`;
}
function renderRoster(c) {
  const list = state.players.filter(
    (p) =>
      (!rosterFilter || p.name.includes(rosterFilter)) &&
      (!roleFilter || p.role === roleFilter),
  );
  c.innerHTML =
    title(
      "SQUAD MANAGEMENT",
      "선수단",
      `${state.players.length} / 30명 등록 · 경기 준비에서 종목별 출전 명단을 제출합니다.`,
      `<button data-nav="tactics">전술 · 명단 설정</button>`,
    ) +
    `<div class="filters"><input id="roster-search" placeholder="선수 이름 검색" value="${esc(rosterFilter)}"><select id="role-filter"><option value="">모든 포지션</option>${options(roles, roleFilter)}</select></div><section class="panel table-scroll"><table><thead><tr><th>선수</th><th>역할</th><th>무기</th><th>OVR</th><th>컨디션</th><th>K / D / A</th><th>추정가</th><th></th></tr></thead><tbody>${list.map((p) => playerRow(p)).join("")}</tbody></table></section>`;
}
function planMode() {
  return series && !series.finished ? series.mode : tacticsMode;
}
function currentRoster() {
  return series && !series.finished ? series.rosters[0] : state.players;
}
function getPlan() {
  const mode = planMode(),
    plan = state.setPlans[mode];
  plan.ids = plan.ids.filter((id) =>
    currentRoster().some((p) => p.id === id && !p.injury),
  );
  return plan;
}
function renderTactics(c) {
  const mode = planMode(),
    m = modes[mode],
    preparing = series && !series.finished,
    plan = getPlan(),
    roster = currentRoster(),
    chosen = plan.ids.map((id) => roster.find((p) => p.id === id));
  c.innerHTML =
    title(
      preparing ? "MATCH PREPARATION" : "TACTICAL PLANS",
      preparing ? `${mode + 1}세트 준비 · ${m.name}` : "전술 · 출전 명단",
      preparing
        ? `${esc(series.opponent)}전 · 현재 세트 스코어 ${series.wins.join(" : ")} · ${terrainInfo[series.terrain].name} 아레나`
        : "종목별 계획을 저장하고, 경기일에는 컨디션을 확인해 확정하세요.",
      preparing
        ? `<span class="pill lime">${plan.ids.length} / ${m.n}명</span>`
        : "",
    ) +
    `${preparing && mode > 0 ? `<div class="result"><h2>${mode}세트 ${series.results[mode - 1] === 0 ? "승리" : "패배"}</h2><p>직전 세트의 피로가 이어집니다. 선수를 교체하고 다음 종목의 전술을 정하세요.</p></div>` : ""}<div class="set-tabs">${modes.map((x, i) => `<button data-plan-mode="${i}" class="${mode === i ? "primary" : ""}" ${preparing ? "disabled" : ""}>${i + 1}. ${x.name} · ${x.n}명</button>`).join("")}</div><div class="info section-gap">${m.rule}</div><section class="panel panel-body section-gap"><div class="grid three"><label>팀 운영<select data-plan="tactic">${options(["균형", "공격", "수비"], plan.tactic)}</select><small>공격: 이동 +10%, 유효타 +3%p · 수비: 방어 +6%p</small></label><label>시작 대형<select data-plan="formation">${options(["균형", "집중", "분산"], plan.formation)}</select><small>집중은 좁게, 분산은 넓게 배치합니다.</small></label><label>공격 우선 대상<select data-plan="target">${options(["가까운 적", "약한 적", "원거리"], plan.target)}</select><small>12m 안의 적 중 조건에 맞는 대상을 우선합니다.</small></label></div>${mode === 3 ? `<label class="section-gap">왕 지정<select id="king-choice">${chosen.map((p) => `<option value="${p.id}" ${p.id === plan.kingId ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>` : ""}</section><div class="preparation-toolbar section-gap"><strong id="lineup-count">선발 ${plan.ids.length} / ${m.n}명</strong><div class="flex"><button data-action="suggest-set">컨디션 고려 자동 선발</button><button data-action="clear-set">선발 비우기</button>${preparing ? `<button class="primary" data-action="start-set" ${plan.ids.length !== m.n ? "disabled" : ""}>명단 제출 · ${mode + 1}세트 시작</button>` : '<span class="muted">경기일에 최종 명단을 제출합니다.</span>'}</div></div><section class="panel table-scroll section-gap"><table><thead><tr><th>선발</th><th>선수</th><th>역할</th><th>무기</th><th>OVR</th><th>현재 피로</th><th>상태</th></tr></thead><tbody>${roster.map((p) => `<tr class="${plan.ids.includes(p.id) ? "ours" : ""}"><td><button data-set-player="${p.id}" class="lineup-btn ${plan.ids.includes(p.id) ? "selected" : ""}" ${p.injury ? "disabled" : ""}>${plan.ids.includes(p.id) ? "선발" : "대기"}</button></td><td><button class="ghost player-name" data-prep-profile="${p.id}">${portrait(p)}<strong>${esc(p.name)}</strong></button></td><td><select data-set-role="${p.id}" aria-label="${esc(p.name)} 세트 역할">${options(roles, plan.roleAssignments?.[p.id] || p.role)}</select></td><td>${weapons[p.weapon].name}</td><td>${overall(p)}</td><td>${Math.round(p.fatigue)}%<div class="bar"><i style="width:${100 - p.fatigue}%"></i></div></td><td>${p.injury ? "회복 중" : p.fatigue > 65 ? "피로 누적" : "출전 가능"}</td></tr>`).join("")}</tbody></table></section>`;
}
function mountArena() {
  try {
    arena = new ArenaView($("#viewport"), battle);
  } catch {
    $("#viewport").insertAdjacentHTML(
      "afterbegin",
      '<div class="empty">3D 가속을 사용할 수 없습니다. 문자 중계와 경기 진행은 사용할 수 있습니다.</div>',
    );
  }
}
function renderLive(c) {
  c.innerHTML =
    title(
      "MATCHDAY LIVE",
      `${series.mode + 1}세트 · ${modes[series.mode].name}`,
      `${terrainInfo[series.terrain].name} 아레나 · ${modes[series.mode].rule}`,
    ) +
    `<div class="arena-layout"><section class="panel battle-panel"><div class="match-strip"><strong>${esc(state.club)}</strong><div class="match-score" id="match-score">${series.wins.join(" : ")}</div><strong>${esc(series.opponent)}</strong></div><div class="panel-head"><div class="set-chips">${modes.map((m, i) => `<span class="set-chip ${i === series.mode ? "current" : ""} ${series.results[i] === 0 ? "win" : series.results[i] === 1 ? "loss" : ""}">${i + 1} ${m.name}</span>`).join("")}</div><span id="timer">00:00 / 60:00</span></div><div class="viewport" id="viewport"><div class="arena-overlay"><span class="pill teal">${modes[series.mode].n} : ${modes[series.mode].n}</span></div><div class="arena-bottom" id="arena-count"></div><div class="camera-controls"><button data-camera="rotate">회전</button><button data-camera="in">＋</button><button data-camera="out">－</button></div></div><div class="arena-controls"><div class="controls-left"><button data-action="pause" id="pause">일시정지</button><select id="speed" aria-label="재생 속도">${[1, 4, 12, 32, 64].map((x) => `<option value="${x}" ${speed === x ? "selected" : ""}>${x}배속</option>`).join("")}</select><button data-action="quick">이 세트 결과까지</button></div><strong id="live-score"></strong></div><div class="panel-head"><h2>실시간 중계</h2></div><div class="log" id="log"></div></section><aside class="side-stack"><section class="panel panel-body"><h2>경기 중 전술</h2><select id="live-tactic" class="full">${options(["균형", "공격", "수비"], battle.tactic)}</select><p class="muted">명단 교체는 세트가 끝난 뒤 가능합니다.</p></section><section class="panel"><div class="panel-head"><h2>출전 선수</h2></div><div id="status-list" class="status-list"></div></section></aside></div>`;
  mountArena();
  updateMatchUI();
}
function updateMatchUI() {
  if (tab !== "command" || !battle || series?.phase !== "playing") return;
  if ($("#timer")) $("#timer").textContent = clock(battle.time) + " / 60:00";
  if ($("#pause")) $("#pause").textContent = running ? "일시정지" : "재생";
  if ($("#log"))
    $("#log").innerHTML = battle.logs
      .slice(0, 15)
      .map(
        (l) =>
          `<div class="log-row"><time>${clock(l.time)}</time><span>${esc(l.text)}</span></div>`,
      )
      .join("");
  if ($("#live-score"))
    $("#live-score").textContent = [1, 2].includes(series.mode)
      ? `${series.mode === 1 ? "깃발" : "킬"} ${battle.scores.join(" : ")}`
      : "";
  if ($("#arena-count"))
    $("#arena-count").textContent =
      `생존 ${battle.alive(0).length} : ${battle.alive(1).length} · ${running ? "진행 중" : "일시정지"}`;
  if ($("#status-list"))
    $("#status-list").innerHTML = battle.units
      .filter((u) => u.team === 0)
      .map(
        (u) =>
          `<div class="status-row ${u.alive ? "" : "out"}"><strong>${esc(u.p.name)}${u.king ? " ♛" : ""}</strong><div class="bars"><div class="bar"><i style="width:${u.hp}%;background:var(--accent)"></i></div><div class="bar"><i style="width:${u.energy}%"></i></div></div><span>${!u.alive ? (series.mode === 2 ? clock(Math.max(0, u.respawn - battle.time)) : "OUT") : u.flagId !== null ? "깃발" : !u.armed ? "맨손" : u.kills + "K"}</span></div>`,
      )
      .join("");
}
function startMatch() {
  if (state.players.filter((p) => !p.injury).length < 20) {
    openDialog(
      '<h2>출전 가능 인원 부족</h2><p>점령전을 포함한 경기에 출전하려면 20명이 필요합니다. 선수를 영입하거나 유스를 승격할 수 있습니다.</p><div class="dialog-actions"><button data-nav="market">이적 시장</button><button data-nav="facilities">유스 선수단</button><button class="danger" data-action="forfeit">이번 경기 기권 · 0:3 패배</button></div>',
    );
    return;
  }
  series = beginSeries(state);
  const plan = state.setPlans[series.mode];
  if (!plan.ids.length)
    plan.ids = suggestLineup(state, series.mode, series.rosters[0]);
  running = false;
  tab = "tactics";
  save();
  shell();
}
function startSet() {
  const plan = getPlan();
  let ids = [...plan.ids];
  if (series.mode === 3 && ids.includes(plan.kingId))
    ids = [plan.kingId, ...ids.filter((id) => id !== plan.kingId)];
  battle = prepareSet(state, series, ids, plan);
  save();
  running = true;
  loop.acc = 0;
  tab = "command";
  shell();
}
function finishSet() {
  running = false;
  const finished = completeSet(state, series, battle);
  if (!finished) {
    const plan = state.setPlans[series.mode];
    if (!plan.ids.length)
      plan.ids = suggestLineup(state, series.mode, series.rosters[0]);
    tab = "tactics";
  } else tab = "command";
  save();
  shell();
}
function progress(untilMatch = false) {
  if (series && !series.finished) return;
  if (pendingNews(state)) {
    openNews(pendingNews(state).id);
    return;
  }
  if (nextFixture(state)?.day <= state.day) {
    startMatch();
    return;
  }
  const result = advanceCareer(state, untilMatch);
  save();
  if (result.reason === "news") openNews(pendingNews(state).id);
  else if (result.reason === "match") startMatch();
  else {
    shell();
    toast(
      result.reason === "season"
        ? "시즌 일정이 끝났습니다."
        : `${result.days}일 진행했습니다.`,
    );
  }
}
function loop(ts) {
  requestAnimationFrame(loop);
  if (!lastTick) lastTick = ts;
  const dt = Math.min(0.1, (ts - lastTick) / 1000);
  lastTick = ts;
  if (running && battle && !battle.done) {
    loop.acc = (loop.acc || 0) + dt * speed;
    while (loop.acc >= 0.5 && !battle.done) {
      battle.step(0.5);
      loop.acc -= 0.5;
    }
    if (battle.done) {
      loop.acc = 0;
      finishSet();
    }
  }
  uiTick += dt;
  if (uiTick > 0.35) {
    uiTick = 0;
    updateMatchUI();
  }
}
function spend(n) {
  if (state.budget < n) {
    toast("구단 예산이 부족합니다.");
    return false;
  }
  state.budget -= n;
  return true;
}

function playerRow(p, opts = {}) {
  return `<tr><td><button class="ghost player-name" data-player="${p.id}">${portrait(p)}<span><strong>${esc(p.name)}</strong><small>${p.country} · ${p.age}세</small></span></button></td><td>${p.role}</td><td>${weapons[p.weapon].name}</td><td><span class="rating">${overall(p)}</span></td><td><span>${Math.round(100 - p.fatigue)}%</span><div class="bar"><i style="width:${100 - p.fatigue}%"></i></div></td><td>${p.record.kills} / ${p.record.deaths} / ${p.record.assists}</td><td>${value(p)}백만</td><td>${opts.lineup ? `<button class="lineup-btn ${selected.has(p.id) ? "selected" : ""}" data-select="${p.id}">${selected.has(p.id) ? "출전 우선" : "대기"}</button>` : opts.youth ? `<button class="lineup-btn" data-promote="${p.id}" ${state.players.length >= 30 ? "disabled" : ""}>1군 승격</button>` : ""}</td></tr>`;
}
function estimate(p) {
  const confidence = Math.min(
    100,
    p.scout + state.facilities.scouting * 10 + state.staff.scout * 8,
  );
  const v = value(p),
    error = ((100 - confidence) / 100) * 0.55;
  return {
    low: Math.round(v * (1 - error)),
    high: Math.round(v * (1 + error)),
    confidence,
  };
}
function renderMarket(c) {
  const list = state.market.filter(
    (p) =>
      !marketFilter ||
      p.name.includes(marketFilter) ||
      p.country.includes(marketFilter),
  );
  c.innerHTML =
    title(
      "RECRUITMENT",
      "이적 · 자유계약 시장",
      "경기 실적과 스카우트 보고서를 비교해 영입하세요.",
      `<span class="pill">남은 등록 자리 ${30 - state.players.length}</span>`,
    ) +
    `<div class="filters"><input id="market-search" placeholder="이름 또는 국적 검색" aria-label="시장 선수 검색" value="${esc(marketFilter)}"><button data-action="scout-event">지역 인재 탐색 · 12백만</button></div><div class="grid four">${
      list
        .map((p) => {
          const e = estimate(p);
          return `<article class="player-card">${portrait(p, "card-portrait")}<div class="body"><div class="card-top"><span class="pill">자유계약</span><span class="rating">${Math.max(1, overall(p) - Math.round((100 - e.confidence) / 15))}–${Math.min(100, overall(p) + Math.round((100 - e.confidence) / 15))}</span></div><h3>${esc(p.name)}</h3><p>${p.country} · ${p.age}세 · ${p.role}</p><p>${weapons[p.weapon].name} · 평가 신뢰도 ${e.confidence}%</p><div class="flex spread"><span class="muted">구단 평가액</span><strong>${e.low}–${e.high}백만</strong></div><button data-player="${p.id}">스카우트 보고서</button></div></article>`;
        })
        .join("") || '<div class="empty">검색 결과가 없습니다.</div>'
    }</div><p class="footer-note">현재 버전의 시장은 자유계약 선수 중심입니다. 계약금은 시장 추정가의 35%, 계약 기간은 2시즌입니다. 구단 간 이적료 협상은 다음 단계에서 확장합니다.</p>`;
}
const facilities = [
  ["training", "통합 훈련센터", "무기·신체·전술 훈련의 성장 확률을 높입니다."],
  [
    "medical",
    "의료 · 회복센터",
    "하루 피로 회복량을 높이고 선수단 회복을 지원합니다.",
  ],
  [
    "scouting",
    "스카우트 센터",
    "선수 가치와 잠재력 보고서의 평가 정확도를 높입니다.",
  ],
  [
    "youth",
    "유스 아카데미",
    "새 유망주 모집 인원과 기초 육성 수준을 높입니다.",
  ],
];
function renderFacilities(c) {
  c.innerHTML =
    title(
      "CLUB DEVELOPMENT",
      "육성 · 시설",
      "훈련 방향을 정하고 구단의 기반에 투자하세요.",
    ) +
    `<section class="panel panel-body"><div class="flex spread"><div><h2>훈련센터</h2><p class="muted">주간 세션·훈련 강도·개인 육성은 훈련센터에서 관리합니다.</p></div><button data-nav="training">훈련 계획 열기</button></div></section><div class="grid four section-gap">${facilities.map(([id, name, desc]) => `<section class="panel facility-card"><h3>${name}</h3><p>${desc}</p><div class="facility-level">LV. ${state.facilities[id]} <span class="muted">/ 5</span></div><div class="bar"><i style="width:${state.facilities[id] * 20}%"></i></div><button data-upgrade="${id}" ${state.facilities[id] >= 5 ? "disabled" : ""}>${state.facilities[id] >= 5 ? "최대 수준" : "확장 · " + state.facilities[id] * 65 + "백만"}</button></section>`).join("")}</div><section class="panel section-gap"><div class="panel-head"><h2>스태프</h2><span class="muted">첫 버전에서는 담당 팀 수준으로 관리</span></div><div class="grid three panel-body">${[
      ["coach", "코칭 팀", "훈련 방향과 선수 육성"],
      ["analyst", "분석 팀", "상대 전력 보고서의 신뢰도"],
      ["scout", "스카우트 팀", "선수 능력·시장 가치 평가"],
    ]
      .map(
        ([id, n, d]) =>
          `<div><strong>${n} · LV.${state.staff[id]}</strong><p class="muted">${d}</p><button data-staff="${id}" ${state.staff[id] >= 5 ? "disabled" : ""}>보강 · ${state.staff[id] * 40}백만</button></div>`,
      )
      .join(
        "",
      )}</div></section><section class="panel section-gap"><div class="panel-head"><h2>유스 선수단 · ${state.youth.length}명</h2><button data-action="youth-recruit">유망주 모집 · 25백만</button></div><div class="table-scroll"><table><thead><tr><th>선수</th><th>역할</th><th>무기</th><th>OVR</th><th>컨디션</th><th>K / D / A</th><th>평가액</th><th>승격</th></tr></thead><tbody>${state.youth.map((p) => playerRow(p, { youth: true })).join("")}</tbody></table></div></section><p class="footer-note">생활관·환경 훈련장·장비 공방 등 전체 시설 구성과 스태프 개인 경력은 이후 확장 대상입니다. 매주 급료와 시설 유지비가 지출됩니다.</p>`;
}
function renderExplorer(c) {
  c.innerHTML = explorerHTML(state, explorer, {
    esc,
    portrait,
    estimate,
    formatDate,
  });
}
function renderLeague(c) {
  const rank = ranked();
  c.innerHTML =
    title(
      "COMPETITION",
      "리그 현황",
      "국내 승강 리그에서 출발해 대륙과 월드 무대를 향합니다.",
      `<div class="flex"><span class="pill lime">${state.division || "도시 리그"} · ${state.season}</span><button data-nav="explore">세계 탐색</button></div>`,
    ) +
    `<div class="grid four">${[
      ["도시 리그", "현재 플레이 가능"],
      ["도 리그", "국내 승격 단계"],
      ["대륙 리그", "국내 성적으로 출전"],
      ["월드리그", "대륙 정상급 팀 참가"],
    ]
      .map(
        ([n, d], i) =>
          `<div class="panel stat-card"><div class="value">0${i + 1}</div><strong>${n}</strong><p>${d}</p></div>`,
      )
      .join(
        "",
      )}</div><section class="panel section-gap"><div class="panel-head"><h2>시즌 순위</h2><span class="muted">상위 2팀 승격 · 하위 2팀 강등</span></div><div class="table-scroll"><table><thead><tr><th>순위</th><th>구단</th><th>경기</th><th>승</th><th>패</th><th>세트 득</th><th>세트 실</th><th>득실차</th></tr></thead><tbody>${rank.map((t, i) => `<tr class="${t.id === 0 ? "ours" : ""}"><td><span class="rating" style="color:${i < 2 ? "var(--accent)" : i > 5 ? "var(--red)" : "var(--text)"}">${i + 1}</span></td><td><button class="ghost browse-link" data-browse-club="${t.id}" data-browse-country="${esc(state.country)}">${esc(t.name)}</button> ${t.id === 0 ? '<span class="pill lime">내 구단</span>' : ""}</td><td>${t.played}</td><td>${t.wins}</td><td>${t.losses}</td><td>${t.for}</td><td>${t.against}</td><td>${t.for - t.against}</td></tr>`).join("")}</tbody></table></div></section><div class="grid two section-gap"><section class="panel"><div class="panel-head"><h2>경기 결과</h2></div>${
      state.history.length
        ? state.history
            .slice(0, 8)
            .map(
              (h) =>
                `<div class="news-row flex spread"><span><span class="muted">R${h.round}</span> ${esc(h.opponent)}</span><strong class="${h.win ? "accent" : ""}">${h.score}</strong></div>`,
            )
            .join("")
        : '<div class="empty">첫 경기의 결과를 기다리고 있습니다.</div>'
    }</section><section class="panel"><div class="panel-head"><h2>남은 일정</h2></div>${
      state.schedule
        .slice(state.round, state.round + 8)
        .map((ps, i) => {
          const pair = ps.find((p) => p.includes(0));
          const op = state.table[pair.find((id) => id !== 0)];
          return `<div class="news-row flex spread"><span><span class="muted">R${state.round + i + 1}</span> ${esc(op.name)}</span><span class="pill">${pair[0] === 0 ? "홈" : "원정"} · ${terrainInfo[pair[0] === 0 ? state.homeTerrain : op.terrain].name}</span></div>`;
        })
        .join("") || '<div class="empty">모든 경기가 종료되었습니다.</div>'
    }</section></div><div class="info section-gap">현재 버전은 국내 8팀 리그를 플레이합니다. 시즌 종료 시 승강 상태를 기록하지만, 상위 리그의 별도 구단 구성과 국제대회 일정은 아직 구현 전입니다.</div>`;
}
function renderRelations(c) {
  const adults = state.players.filter((p) => p.age >= 18 && !p.youth);
  c.innerHTML =
    title(
      "PEOPLE & RELATIONSHIPS",
      "인물 관계",
      "업무 신뢰와 개인 호감은 별도로 관리됩니다.",
    ) +
    `<div class="grid four">${adults.map((p) => `<article class="player-card">${portrait(p, "card-portrait")}<div class="body"><div class="card-top"><span class="pill ${p.relationship === "연애" ? "lime" : ""}">${p.relationship}</span><span class="muted">${p.personality}</span></div><h3>${esc(p.name)}</h3><p>${p.role} · ${p.age}세</p><div class="flex spread"><span class="muted">호감</span><strong>${p.affinity}</strong></div><div class="bar"><i style="width:${p.affinity}%;background:var(--accent)"></i></div><p>신뢰 ${p.trust} · 사기 ${p.morale}</p><button data-talk="${p.id}" ${state.talkDay[p.id] === state.day ? "disabled" : ""}>${state.talkDay[p.id] === state.day ? "오늘 대화 완료" : "대화하기"}</button></div></article>`).join("")}</div><p class="footer-note">성인 1군 인물에게만 개인 관계 이벤트가 적용됩니다. 연애 감정은 전투 능력이나 출전 우선순위에 직접 보너스를 주지 않습니다.</p>`;
}
function openDialog(html) {
  const d = $("#detail");
  d.innerHTML = `<button class="dialog-close ghost" data-action="close-dialog" aria-label="창 닫기">닫기</button>${html}`;
  if (!d.open) d.showModal();
}
function findPlayer(id) {
  return [...state.players, ...state.market, ...state.youth].find(
    (p) => p.id === +id,
  );
}
function detail(p, context = {}) {
  const market = state.market.includes(p),
    youth = state.youth.includes(p),
    e = estimate(p),
    external = !!context.external,
    estimated = market || external;
  const potentialMin = Math.max(
      overall(p),
      Math.round(p.pa / 2 - (100 - e.confidence) * 0.2),
    ),
    potentialMax = Math.min(
      100,
      Math.round(p.pa / 2 + (100 - e.confidence) * 0.2),
    );
  openDialog(
    `<div class="detail-grid"><div>${portrait(p, "portrait large")}<div class="trait"><strong>${p.unique != null ? uniques[p.unique].trait.name : p.personality}</strong><p>${p.unique != null ? uniques[p.unique].trait.text : "훈련과 경기 경험을 통해 자신만의 경력을 쌓습니다."}</p></div><div class="detail-meta">${p.country} · ${p.sex} · ${p.age}세<br>${p.appearance.height}cm</div></div><div><div class="eyebrow">PLAYER PROFILE</div><h2>${esc(p.name)}</h2>${context.club ? `<p class="profile-club">${esc(context.club)} · ${external ? "다른 구단 소속" : "내 구단"}</p>` : ""}<p class="muted">${p.role} · ${weapons[p.weapon].name} · 무기 숙련 ${p.mastery}/20</p><div class="grid three"><div class="panel stat-card"><p>역할 OVR</p><div class="value">${estimated ? `${Math.max(1, overall(p) - Math.round((100 - e.confidence) / 15))}–${Math.min(100, overall(p) + Math.round((100 - e.confidence) / 15))}` : overall(p)}</div></div><div class="panel stat-card"><p>잠재력 평가</p><div class="value">${potentialMin}–${potentialMax}</div></div><div class="panel stat-card"><p>시장 추정가</p><div class="value">${value(p)}</div><p>백만원</p></div></div><div class="stats-grid section-gap">${Object.entries(
      stats,
    )
      .map(
        ([k, n]) =>
          `<div class="stat-line"><span>${n}</span><b>${estimated ? `${Math.max(1, p.stats[k] - Math.ceil((100 - e.confidence) / 25))}–${Math.min(20, p.stats[k] + Math.ceil((100 - e.confidence) / 25))}` : p.stats[k]}</b></div>`,
      )
      .join(
        "",
      )}</div><p class="muted">${p.record.games}세트 출전 · ${p.record.kills}킬 / ${p.record.deaths}데스 / ${p.record.assists}어시스트 · 명성 ${p.fame}</p><section class="info section-gap"><strong>코치 · 스카우트 관찰</strong><ul>${coachObservations(
      p,
      e.confidence,
    )
      .map((text) => `<li>${esc(text)}</li>`)
      .join(
        "",
      )}</ul><small>관찰을 통해 파악한 성향입니다. 개인 능력치는 1~20으로 표시합니다.</small></section><div class="dialog-actions">${external ? `<p class="muted">타 구단 선수 보고서 · 관찰 신뢰도 ${e.confidence}%<br>소속 선수와의 계약 협상은 아직 지원하지 않습니다.</p>` : market ? `<button data-scout="${p.id}">추가 관찰 · 8백만</button><button class="primary" data-sign="${p.id}" ${state.players.length >= 30 ? "disabled" : ""}>계약 · ${Math.ceil(value(p) * 0.35)}백만</button>` : youth ? `<button class="primary" data-promote="${p.id}" ${state.players.length >= 30 ? "disabled" : ""}>1군 승격</button>` : `<button data-talk="${p.id}" ${state.talkDay[p.id] === state.day ? "disabled" : ""}>개인 대화</button><button class="danger" data-release="${p.id}">계약 해지</button>`}</div>${state.players.length >= 30 && (market || youth) ? '<p class="muted">로스터가 가득 찼습니다. 기존 선수의 자리를 먼저 확보하세요.</p>' : ""}</div></div>`,
  );
}
function talk(p) {
  if (state.talkDay[p.id] === state.day)
    return toast("오늘은 이미 대화했습니다.");
  if (p.age < 18 || p.youth) return;
  const romantic = p.affinity >= 60 && p.trust >= 60;
  const scene =
    p.relationship === "연애"
      ? `${p.name}이 훈련을 마치고 감독실에 들렀습니다. “오늘은 경기 얘기 말고, 같이 저녁 먹을래요?”`
      : romantic
        ? `${p.name}이 잠시 머뭇거리다 말을 꺼냅니다. “감독님과 함께하는 시간이 좋아요. 경기장 밖에서도 만나고 싶어요.”`
        : p.affinity >= 25
          ? `${p.name}과 훈련 후 이야기를 나눕니다. “요즘은 경기장 밖에서 뭘 하며 지내세요?”`
          : `${p.name}이 다음 경기 준비에 대해 의견을 묻습니다. “제 역할에 대해 감독님의 생각을 듣고 싶어요.”`;
  openDialog(
    `<div class="detail-grid"><div>${portrait(p, "portrait large")}<p class="muted">${p.relationship} · 호감 ${p.affinity} · 신뢰 ${p.trust}</p></div><div><div class="eyebrow">PERSONAL MOMENT</div><h2>${esc(p.name)}</h2><p class="event-scene">${esc(scene)}</p><div class="event-options"><button data-choice="listen" data-id="${p.id}">이야기를 듣고 함께 시간을 보낸다</button><button data-choice="work" data-id="${p.id}">선수의 목표와 훈련 계획을 함께 이야기한다</button>${romantic && p.relationship !== "연애" ? `<button class="primary" data-choice="date" data-id="${p.id}">나도 같은 마음이라고 답하고 데이트를 약속한다</button>` : ""}${p.relationship === "연애" ? `<button data-choice="break" data-id="${p.id}">관계를 정리하고 싶다고 솔직하게 이야기한다</button>` : ""}<button data-choice="respect" data-id="${p.id}">오늘은 쉬고 다음에 이야기하자고 배려한다</button></div></div></div>`,
  );
}
document.addEventListener("submit", (e) => {
  if (e.target.id !== "career-form") return;
  e.preventDefault();
  try {
    const config = Object.fromEntries(new FormData(e.target));
    state = createCareer(config);
    setupActive = false;
    series = null;
    battle = null;
    running = false;
    selected = new Set();
    tab = "command";
    calendarMonth = null;
    newsId = null;
    newsFilter = "전체";
    explorer = newExplorer();
    save();
    shell();
    toast("구단이 창단되었습니다. 일정과 새 소식을 확인하세요.");
  } catch (error) {
    toast(error.message);
  }
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  try {
    const d = b.dataset,
      action = d.action,
      locked = series && !series.finished;
    if (
      locked &&
      ![
        "close-dialog",
        "save",
        "export",
        "pause",
        "quick",
        "start-set",
        "suggest-set",
        "clear-set",
      ].includes(action) &&
      !("camera" in d) &&
      !("setPlayer" in d) &&
      !("prepProfile" in d)
    )
      return;
    if (d.browsePlayer) {
      const league = getLeague(state, leagueId(explorer.country));
      const club = league?.table.find((t) => t.id === Number(d.browseClubId));
      const p =
        club &&
        clubRoster(state, league.id, club.id).find(
          (p) => p.id === Number(d.browsePlayer),
        );
      if (p)
        detail(p, {
          club: club.name,
          external: !(league.local && club.id === 0),
        });
      return;
    }
    if (d.browseHome || d.browseCountry) {
      const country = d.browseCountry || null;
      if (country && !countries.some((c) => c.name === country)) return;
      explorer = {
        ...newExplorer(),
        country,
        club: d.browseClub !== undefined ? Number(d.browseClub) : null,
      };
      tab = "explore";
      if ($("#detail").open) $("#detail").close();
      shell();
      return;
    }
    if (d.exploreSection) {
      explorer.section = d.exploreSection;
      renderContent();
      return;
    }
    if (d.exploreRound) {
      explorer.round = clamp(Number(d.exploreRound), 1, 14);
      renderContent();
      return;
    }
    if (d.nav) {
      if ($("#detail").open) $("#detail").close();
      tab = d.nav;
      if (tab === "news") newsFilter = "전체";
      shell();
      return;
    }
    if (d.openNews) {
      openNews(d.openNews);
      return;
    }
    if (d.newsFilter) {
      newsFilter = d.newsFilter;
      newsId = null;
      renderContent();
      return;
    }
    if (d.newsChoice) {
      const n = resolveNews(state, d.newsId, d.newsChoice);
      newsId = n.id;
      save();
      shell();
      toast(`제안을 ${n.resolution}했습니다.`);
      return;
    }
    if (d.calendar) {
      calendarMonth =
        d.calendar === "today"
          ? calendarDate(state).getUTCMonth()
          : (calendarMonth ?? calendarDate(state).getUTCMonth()) +
            Number(d.calendar);
      renderContent();
      return;
    }
    if (d.planMode !== undefined) {
      tacticsMode = Number(d.planMode);
      renderContent();
      return;
    }
    if (d.setPlayer) {
      const plan = getPlan(),
        id = Number(d.setPlayer),
        n = modes[planMode()].n;
      if (plan.ids.includes(id)) plan.ids = plan.ids.filter((x) => x !== id);
      else if (n === 1) plan.ids = [id];
      else if (plan.ids.length < n) plan.ids.push(id);
      else return toast(`이 종목은 ${n}명만 선발할 수 있습니다.`);
      if (!plan.ids.includes(plan.kingId)) plan.kingId = plan.ids[0];
      save();
      renderContent();
      return;
    }
    if (d.prepProfile) {
      const p = currentRoster().find((p) => p.id === Number(d.prepProfile));
      if (p) {
        detail(p);
        for (const btn of $("#detail").querySelectorAll(
          "[data-talk],[data-release]",
        ))
          btn.disabled = true;
      }
      return;
    }
    if (d.player) {
      const p = findPlayer(d.player);
      if (p) detail(p);
      return;
    }
    if (d.camera && arena) {
      if (d.camera === "rotate") arena.orbit += 0.45;
      if (d.camera === "in") arena.zoom = Math.max(0.6, arena.zoom - 0.12);
      if (d.camera === "out") arena.zoom = Math.min(1.6, arena.zoom + 0.12);
      return;
    }
    if (d.upgrade) {
      const id = d.upgrade;
      if (!["training", "medical", "scouting", "youth"].includes(id)) return;
      const lv = state.facilities[id];
      if (lv < 5 && spend(lv * 65)) {
        state.facilities[id]++;
        addNews(state, {
          title: "시설 확장 완료",
          text: `${facilities.find((f) => f[0] === id)[1]}이 LV.${lv + 1}로 확장되었습니다. 비용 ${lv * 65}백만원.`,
        });
        save();
        shell();
        toast("시설 확장이 완료되었습니다.");
      }
      return;
    }
    if (d.staff) {
      const id = d.staff;
      if (!["coach", "analyst", "scout"].includes(id)) return;
      const lv = state.staff[id];
      if (lv < 5 && spend(lv * 40)) {
        state.staff[id]++;
        addNews(state, {
          title: "스태프 보강",
          text: `${{ coach: "코칭", analyst: "분석", scout: "스카우트" }[id]} 팀이 LV.${lv + 1}로 보강되었습니다.`,
        });
        save();
        shell();
      }
      return;
    }
    if (d.scout) {
      const p = findPlayer(d.scout);
      if (p && spend(8)) {
        p.scout = Math.min(100, p.scout + 20 + state.staff.scout * 4);
        addNews(state, {
          category: "이적",
          title: "추가 관찰 보고",
          text: `${p.name}의 평가 신뢰도가 높아졌습니다. 선수 보고서에서 새 평가를 확인하세요.`,
          sender: "스카우트",
          playerId: p.id,
        });
        save();
        detail(p);
      }
      return;
    }
    if (d.sign) {
      const p = findPlayer(d.sign);
      if (p && state.market.includes(p) && state.players.length < 30) {
        const fee = Math.ceil(value(p) * 0.35);
        if (spend(fee)) {
          state.market = state.market.filter((x) => x.id !== p.id);
          p.team = 0;
          p.contract = state.season + 2;
          p.trainingFocus = "균형";
          p.trainingXP = {};
          ensurePlayerAttributes(p);
          p.adaptationDays =
            p.country === state.country
              ? 0
              : Math.max(1, 9 - Math.floor(p.hidden.adaptability / 3));
          state.players.push(p);
          state.transferHistory.unshift({
            season: state.season,
            day: state.day,
            name: p.name,
            from: "자유계약",
            to: state.club,
            fee,
          });
          addNews(state, {
            category: "이적",
            title: "선수 영입 완료",
            text: `${p.name}과 ${p.contract}시즌까지 계약했습니다. 계약금 ${fee}백만원.`,
            playerId: p.id,
          });
          $("#detail").close();
          save();
          shell();
          toast("계약을 완료했습니다.");
        }
      }
      return;
    }
    if (d.release) {
      const p = findPlayer(d.release);
      if (!p || !state.players.includes(p)) return;
      openDialog(
        `<h2>계약 해지</h2><p class="event-scene">${esc(p.name)} 선수를 자유계약 시장으로 보냅니다.</p><p>위약금 ${p.wage * 3}백만원 · 출전 가능한 20명은 유지해야 합니다.</p><button class="danger" data-confirm-release="${p.id}">계약 해지 확정</button>`,
      );
      return;
    }
    if (d.confirmRelease) {
      const p = state.players.find((p) => p.id === Number(d.confirmRelease));
      if (!p) return;
      if (state.players.filter((x) => x.id !== p.id && !x.injury).length < 20)
        return toast("출전 가능한 선수를 20명 이상 유지해야 합니다.");
      if (spend(p.wage * 3)) {
        state.players = state.players.filter((x) => x.id !== p.id);
        selected.delete(p.id);
        p.team = -1;
        p.trust = Math.max(0, p.trust - 15);
        state.market.push(p);
        addNews(state, {
          category: "이적",
          title: "계약 해지 완료",
          text: `${p.name}이 자유계약 시장에 등록되었습니다.`,
          playerId: p.id,
        });
        $("#detail").close();
        save();
        shell();
      }
      return;
    }
    if (d.promote) {
      const p = state.youth.find((p) => p.id === Number(d.promote));
      if (p && state.players.length < 30) {
        state.youth = state.youth.filter((x) => x.id !== p.id);
        p.youth = false;
        p.team = 0;
        state.players.push(p);
        addNews(state, {
          category: "훈련",
          title: "유스 선수 1군 승격",
          text: `${p.name}이 1군에 합류했습니다.`,
          sender: "유스 코치",
          playerId: p.id,
        });
        $("#detail").close();
        save();
        shell();
      }
      return;
    }
    if (d.talk) {
      const p = findPlayer(d.talk);
      if (p) talk(p);
      return;
    }
    if (d.choice) {
      const p = findPlayer(d.id);
      if (!p || state.talkDay[p.id] === state.day) return;
      const ch = d.choice;
      if (ch === "listen") {
        p.affinity = clamp(p.affinity + 7, 0, 100);
        p.trust = clamp(p.trust + 3, 0, 100);
      }
      if (ch === "work") {
        p.trust = clamp(p.trust + 8, 0, 100);
        p.affinity = clamp(p.affinity + 3, 0, 100);
      }
      if (ch === "respect") p.trust = clamp(p.trust + 2, 0, 100);
      if (ch === "date" && p.affinity >= 60 && p.trust >= 60) {
        p.relationship = "연애";
        p.affinity = clamp(p.affinity + 5, 0, 100);
      }
      if (ch === "break") {
        p.relationship = "친밀";
        p.affinity = Math.max(20, p.affinity - 20);
      }
      if (p.relationship !== "연애")
        p.relationship =
          p.affinity >= 40 ? "친밀" : p.affinity >= 20 ? "친분" : "업무 관계";
      for (const other of state.players) {
        ensurePlayerAttributes(other);
        if (
          other.id !== p.id &&
          other.age >= 18 &&
          !other.youth &&
          other.affinity >= 40 &&
          (other.relationship === "연애" || other.hidden.obsession >= 16) &&
          state.elapsed - (other.lastRelationshipEvent ?? -10) >= 7 &&
          rand(state) < (other.hidden.jealousy + other.hidden.obsession) / 100
        ) {
          other.lastRelationshipEvent = state.elapsed;
          addNews(state, {
            category: "이벤트",
            title: "개인 면담 요청",
            text: `${other.name}이 감독과의 관계에 대해 차분히 이야기하고 싶다고 합니다. 원하는 관계와 개인적인 경계를 서로 확인할 수 있습니다.`,
            sender: "선수 연락",
            playerId: other.id,
            action: { kind: "relationship", playerId: other.id },
          });
          break;
        }
      }
      state.talkDay[p.id] = state.day;
      addNews(state, {
        category: "이벤트",
        title: "선수와의 대화",
        text: `${p.name}과 ${ch === "work" ? "훈련 목표에 대해" : "개인적인 이야기를"} 나눴습니다. 현재 관계: ${p.relationship}.`,
        sender: "감독 기록",
        playerId: p.id,
      });
      $("#detail").close();
      save();
      shell();
      toast("대화를 마쳤습니다.");
      return;
    }
    if (action === "close-dialog") $("#detail").close();
    if (action === "save") save(false);
    if (action === "day") progress();
    if (action === "advance-match") progress(true);
    if (action === "kickoff") startMatch();
    if (action === "start-set") startSet();
    if (action === "suggest-set") {
      const plan = getPlan();
      plan.ids = suggestLineup(state, planMode(), currentRoster());
      plan.kingId = plan.ids[0];
      save();
      renderContent();
    }
    if (action === "clear-set") {
      getPlan().ids = [];
      save();
      renderContent();
    }
    if (action === "pause" && series?.phase === "playing") {
      running = !running;
      updateMatchUI();
    }
    if (action === "quick" && series?.phase === "playing" && !battle.done) {
      running = false;
      for (
        let i = 0;
        i <= Math.ceil(battle.mode.time / 0.5) && !battle.done;
        i++
      )
        battle.step(0.5);
      finishSet();
    }
    if (action === "read-all") {
      for (const n of state.news) if (!n.mustRespond) n.read = true;
      save();
      shell();
    }
    if (action === "scout-event" && spend(12)) {
      const p = player(state, {
        country: state.country,
        team: -1,
        level: rand(state) < 0.2 ? 2 : 0,
      });
      p.scout = 50;
      state.market.unshift(p);
      addNews(state, {
        category: "이적",
        title: "지역 인재 발견",
        text: `지역 공개 테스트에서 ${p.name}을 발견했습니다.`,
        sender: "스카우트",
        playerId: p.id,
      });
      save();
      shell();
      detail(p);
    }
    if (action === "youth-recruit") {
      if (state.youth.length >= 20)
        return toast("유스 수용 인원은 최대 20명입니다.");
      if (spend(25)) {
        const count = Math.min(
          state.facilities.youth + 1,
          20 - state.youth.length,
        );
        for (let i = 0; i < count; i++)
          state.youth.push(
            player(state, { country: state.country, youth: true, team: -2 }),
          );
        addNews(state, {
          category: "훈련",
          title: "유망주 모집 완료",
          text: `새 유망주 ${count}명이 아카데미에 입단했습니다.`,
          sender: "유스 코치",
        });
        save();
        shell();
      }
    }
    if (action === "forfeit") {
      forfeitMatch(state);
      $("#detail").close();
      tab = "command";
      save();
      shell();
    }
    if (action === "new-season") {
      nextSeason(state);
      series = null;
      battle = null;
      calendarMonth = null;
      save();
      shell();
    }
    if (action === "reset")
      openDialog(
        '<h2>새 구단 생성</h2><p class="event-scene">새 구단의 창단을 완료하면 현재 저장이 교체됩니다. 보관할 경력은 먼저 저장 파일로 내보내세요.</p><button class="primary" data-action="confirm-reset">구단 생성 화면으로</button>',
      );
    if (action === "confirm-reset") {
      setupActive = true;
      $("#detail").close();
      renderSetup();
    }
    if (action === "cancel-setup") {
      setupActive = false;
      shell();
    }
    if (action === "export") {
      save();
      const blob = new Blob([localStorage.getItem(key)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `arena-${state.season}-day${state.day}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("저장 파일을 내보냈습니다.");
    }
    if (action === "import") $("#save-file").click();
  } catch (error) {
    toast(error.message || "처리 중 오류가 발생했습니다.");
    console.error(error);
  }
});
document.addEventListener("change", async (e) => {
  try {
    const el = e.target,
      d = el.dataset;
    if (el.id === "setup-country" || el.id === "setup-city") {
      setupDraft = { ...Object.fromEntries(new FormData($("#career-form"))) };
      if (el.id === "setup-country")
        setupDraft.city = countries.find(
          (c) => c.name === setupDraft.country,
        ).cities[0];
      renderSetup();
      return;
    }
    if (el.id.startsWith("explore-")) {
      const kind = el.id.slice(8);
      if (kind === "country")
        explorer = { ...newExplorer(), country: el.value };
      else if (kind === "round") explorer.round = Number(el.value);
      else if (["role", "sort", "record"].includes(kind))
        explorer[kind] = el.value;
      renderContent();
      return;
    }
    if (el.id === "speed") speed = Number(el.value);
    if (el.id === "live-tactic" && battle) {
      battle.tactic = el.value;
      series.currentPlan.tactic = el.value;
      toast("전술 지시를 전달했습니다.");
    }
    if (d.trainingDay !== undefined) {
      setTrainingSlot(state, Number(d.trainingDay), d.slot, el.value);
      save();
      toast("주간 훈련 계획을 저장했습니다.");
      renderContent();
    }
    if (el.id === "auto-recovery") {
      state.autoRecovery = el.checked;
      save();
      renderContent();
    }
    if (d.roleFocus) {
      const p = findPlayer(d.roleFocus);
      if (p && roles.includes(el.value)) {
        p.roleTraining = el.value;
        save();
        renderContent();
      }
    }
    if (d.setRole) {
      const plan = getPlan();
      plan.roleAssignments ??= {};
      if (roles.includes(el.value)) {
        plan.roleAssignments[d.setRole] = el.value;
        save();
      }
    }
    if (d.focus) {
      const p = findPlayer(d.focus);
      if (p && ["균형", "무기", "체력", "전술", "협동"].includes(el.value)) {
        p.trainingFocus = el.value;
        save();
      }
    }
    if (d.plan) {
      getPlan()[d.plan] = el.value;
      save();
    }
    if (el.id === "king-choice") {
      getPlan().kingId = Number(el.value);
      save();
    }
    if (el.id === "role-filter") {
      roleFilter = el.value;
      renderContent();
    }
    if (el.id === "save-file" && el.files[0]) {
      const loaded = migrateCareer(JSON.parse(await el.files[0].text()));
      state = loaded;
      setupActive = false;
      series = state.matchSeries || null;
      battle = null;
      running = false;
      selected = new Set(state.lineup || []);
      tab = series ? "tactics" : "command";
      newsId = null;
      explorer = newExplorer();
      calendarMonth = null;
      save();
      shell();
      toast("저장 파일을 불러왔습니다.");
    }
  } catch (error) {
    toast(error.message || "파일을 읽지 못했습니다.");
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "explore-search") {
    const start = e.target.selectionStart;
    explorer.search = e.target.value;
    renderContent();
    $("#explore-search").focus();
    $("#explore-search").setSelectionRange(start, start);
  }

  if (e.target.id === "roster-search") {
    const start = e.target.selectionStart;
    rosterFilter = e.target.value;
    renderContent();
    $("#roster-search").focus();
    $("#roster-search").setSelectionRange(start, start);
  }
  if (e.target.id === "market-search") {
    const start = e.target.selectionStart;
    marketFilter = e.target.value;
    renderContent();
    $("#market-search").focus();
    $("#market-search").setSelectionRange(start, start);
  }
});
shell();
if (state) save();
requestAnimationFrame(loop);

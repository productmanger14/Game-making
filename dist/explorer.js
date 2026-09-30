import { countries } from "./countries.js";
import { roles, weapons, overall, terrainInfo } from "./engine.js";
import {
  allLeagues,
  leagueId,
  getLeague,
  rankTable,
  clubRoster,
  leagueFixtures,
  leaguePlayers,
} from "./world.js";

export const newExplorer = () => ({
  country: null,
  club: null,
  section: "standings",
  round: null,
  search: "",
  role: "",
  sort: "overall",
  record: "kills",
});
export function explorerHTML(s, ui, { esc, portrait, estimate, formatDate }) {
  const clubLink = (t, country) =>
    `<button class="ghost browse-link" data-browse-club="${t.id}" data-browse-country="${esc(country)}">${esc(t.name)}${country === s.country && t.id === 0 ? ' <span class="pill lime">내 구단</span>' : ""}</button>`;
  const playerLink = (p, club) =>
    `<button class="ghost player-name" data-browse-player="${p.id}" data-browse-club-id="${club.id}">${portrait(p)}<span><strong>${esc(p.name)}</strong><small>${esc(p.country)} · ${p.age}세</small></span></button>`;
  const rating = (p, own) => {
    const error = own ? 0 : Math.round((100 - estimate(p).confidence) / 15),
      n = overall(p);
    return error ? `${Math.max(1, n - error)}–${Math.min(100, n + error)}` : n;
  };
  const head = `<div class="page-title"><div><div class="eyebrow">WORLD EXPLORER</div><h1>세계 탐색</h1><p>리그의 흐름을 읽고, 다음 상대의 선수단을 살펴보세요.</p></div><button data-browse-country="${esc(s.country)}">내 리그로</button></div>`;
  if (!ui.country)
    return (
      head +
      `<div class="explore-summary"><span><strong>12</strong>개국</span><span><strong>96</strong>개 구단</span><span><strong>${s.season}</strong>시즌</span><span>${formatDate(s)} 기준</span></div><div class="explore-countries section-gap">${allLeagues(
        s,
      )
        .map((l, i) => {
          const leader = rankTable(l.table)[0];
          return `<button class="panel country-card" data-browse-country="${esc(l.country)}"><span class="country-index">${String(i + 1).padStart(2, "0")}</span><div><h2>${esc(l.country)}</h2><p>도시 리그 · 8개 구단</p></div><div class="country-status"><span>${l.round}/14 라운드</span><span>${l.round ? `선두 · ${esc(leader.name)}` : "개막 대기"}</span></div><span class="browse-arrow" aria-hidden="true">↗</span></button>`;
        })
        .join(
          "",
        )}</div><p class="footer-note">국가별 8팀 리그의 순위·결과·선수단을 조회합니다. 다른 국가 경기는 날짜 진행에 따라 자동 집계됩니다. 상위 디비전과 국제대회는 아직 개설되지 않았습니다.</p>`
    );
  const league = getLeague(s, leagueId(ui.country));
  if (!league) {
    ui.country = null;
    return explorerHTML(s, ui, { esc, portrait, estimate, formatDate });
  }
  const club =
    ui.club !== null ? league.table.find((t) => t.id === ui.club) : null;
  const crumbs = `<div class="explore-toolbar"><nav class="breadcrumbs" aria-label="탐색 경로"><button class="ghost" data-browse-home="true">세계</button><span>/</span><button class="ghost" data-browse-country="${esc(ui.country)}">${esc(ui.country)} · 도시 리그</button>${club ? `<span>/</span><strong>${esc(club.name)}</strong>` : ""}</nav><label class="country-switch">국가<select id="explore-country" aria-label="탐색 국가">${countries.map((c) => `<option ${c.name === ui.country ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label></div>`;
  const rosterRow = (p, t, own) =>
    `<tr><td>${playerLink(p, t)}</td><td>${p.role}</td><td>${weapons[p.weapon].name}</td><td><span class="rating small-rating">${rating(p, own)}</span></td><td>${p.record.games}</td><td>${p.record.kills} / ${p.record.deaths} / ${p.record.assists}</td><td>${p.record.objectives}</td></tr>`;
  if (club) {
    const roster = clubRoster(s, league.id, club.id),
      rank = rankTable(league.table).findIndex((t) => t.id === club.id) + 1;
    const city = league.local
      ? club.id === 0
        ? s.city
        : club.name.split(" ")[0]
      : club.city;
    const list = roster
      .filter(
        (p) =>
          (!ui.search ||
            p.name
              .toLocaleLowerCase()
              .includes(ui.search.toLocaleLowerCase())) &&
          (!ui.role || p.role === ui.role),
      )
      .sort((a, b) =>
        ui.sort === "age"
          ? a.age - b.age
          : ui.sort === "kills"
            ? b.record.kills - a.record.kills
            : overall(b) - overall(a),
      );
    const upcoming = leagueFixtures(s, league.id)
      .filter((f) => (f.home === club.id || f.away === club.id) && !f.played)
      .slice(0, 3);
    const recent = leagueFixtures(s, league.id)
      .filter((f) => (f.home === club.id || f.away === club.id) && f.played)
      .slice(-3)
      .reverse();
    const fixtureLine = (f) =>
      `<div class="explore-fixture"><span class="muted">R${f.round} · ${formatDate(s, f.day).slice(5)} · ${f.home === club.id ? "홈" : "원정"}</span>${clubLink(league.table[f.home === club.id ? f.away : f.home], ui.country)}<strong>${f.score ? (f.home === club.id ? f.score : [f.score[1], f.score[0]]).join(" : ") : f.played ? "기록 없음" : "예정"}</strong></div>`;
    return (
      head +
      crumbs +
      `<section class="panel club-overview"><div class="club-emblem">${esc(club.name[0])}</div><div class="club-identity"><div class="eyebrow">${esc(league.name)}</div><h2>${esc(club.name)}</h2><p>${esc(city)} · ${terrainInfo[club.terrain].name} 아레나 · 1군 ${roster.length}명</p></div><div class="club-numbers"><div><strong>${league.round ? rank : "—"}</strong><span>리그 순위</span></div><div><strong>${club.wins}–${club.losses}</strong><span>승–패</span></div><div><strong>${club.for - club.against > 0 ? "+" : ""}${club.for - club.against}</strong><span>세트 득실차</span></div></div></section><div class="grid two section-gap"><section class="panel"><div class="panel-head"><h2>최근 경기</h2></div>${recent.map(fixtureLine).join("") || '<div class="empty">아직 치른 경기가 없습니다.</div>'}</section><section class="panel"><div class="panel-head"><h2>다가오는 경기</h2></div>${upcoming.map(fixtureLine).join("") || '<div class="empty">시즌 일정을 마쳤습니다.</div>'}</section></div><div class="panel-head section-gap"><h2>1군 선수단</h2><span class="muted">${list.length}명 · 기록은 누적 기준</span></div><div class="filters"><input id="explore-search" aria-label="선수 이름 검색" placeholder="선수 이름 검색" value="${esc(ui.search)}"><select id="explore-role" aria-label="포지션 필터"><option value="">모든 포지션</option>${roles.map((r) => `<option ${r === ui.role ? "selected" : ""}>${r}</option>`).join("")}</select><select id="explore-sort" aria-label="선수 정렬">${[
        ["overall", "평가 능력순"],
        ["kills", "킬 기록순"],
        ["age", "나이 낮은 순"],
      ]
        .map(
          ([v, n]) =>
            `<option value="${v}" ${v === ui.sort ? "selected" : ""}>${n}</option>`,
        )
        .join(
          "",
        )}</select></div><section class="panel table-scroll"><table><thead><tr><th>선수</th><th>역할</th><th>무기</th><th>OVR 평가</th><th>출전 세트</th><th>K / D / A</th><th>깃발 운반</th></tr></thead><tbody>${list.map((p) => rosterRow(p, club, league.local && club.id === 0)).join("") || '<tr><td colspan="7" class="empty">조건에 맞는 선수가 없습니다.</td></tr>'}</tbody></table></section><p class="footer-note">다른 구단 선수의 능력은 스카우트 신뢰도에 따른 범위로 표시됩니다. 선수 이름을 누르면 초상·능력·관찰 보고서를 확인할 수 있습니다.</p>`
    );
  }
  const tabs = `<div class="explore-tabs" role="group" aria-label="리그 정보">${[
    ["standings", "순위"],
    ["fixtures", "일정 · 결과"],
    ["records", "선수 기록"],
  ]
    .map(
      ([id, name]) =>
        `<button data-explore-section="${id}" class="${ui.section === id ? "primary" : ""}">${name}</button>`,
    )
    .join("")}</div>`;
  const intro = `<section class="panel league-overview"><div><div class="eyebrow">${s.season} SEASON</div><h2>${esc(league.name)}</h2><p>8개 구단 · 홈·원정 14라운드 · 5판 3선승제</p></div><div class="round-progress"><strong>${league.round}<small> / 14</small></strong><span>완료 라운드</span></div></section>${tabs}`;
  let body = "";
  if (ui.section === "standings")
    body = `<section class="panel table-scroll"><table><thead><tr><th>순위</th><th>구단</th><th>경기</th><th>승</th><th>패</th><th>세트 득</th><th>세트 실</th><th>득실차</th></tr></thead><tbody>${rankTable(
      league.table,
    )
      .map(
        (t, i) =>
          `<tr class="${league.local && t.id === 0 ? "ours" : ""}"><td><span class="rating">${i + 1}</span></td><td>${clubLink(t, ui.country)}</td><td>${t.played}</td><td>${t.wins}</td><td>${t.losses}</td><td>${t.for}</td><td>${t.against}</td><td>${t.for - t.against}</td></tr>`,
      )
      .join("")}</tbody></table></section>`;
  if (ui.section === "fixtures") {
    const round = ui.round ?? Math.min(14, Math.max(1, league.round)),
      fixtures = leagueFixtures(s, league.id).filter((f) => f.round === round);
    body = `<div class="round-picker"><button data-explore-round="${round - 1}" ${round === 1 ? "disabled" : ""} aria-label="이전 라운드">←</button><label>라운드<select id="explore-round">${Array.from({ length: 14 }, (_, i) => `<option value="${i + 1}" ${i + 1 === round ? "selected" : ""}>${i + 1}라운드</option>`).join("")}</select></label><button data-explore-round="${round + 1}" ${round === 14 ? "disabled" : ""} aria-label="다음 라운드">→</button><span class="muted">${formatDate(s, fixtures[0].day)}</span></div><section class="panel match-list">${fixtures.map((f) => `<div class="world-match"><div class="match-club home-club">${clubLink(league.table[f.home], ui.country)}<small>홈 · ${terrainInfo[league.table[f.home].terrain].name}</small></div><div class="world-score">${f.score ? `<strong>${f.score.join(" : ")}</strong><small>경기 종료</small>` : `<span>${f.played ? "기록 없음" : "VS"}</span><small>${f.played ? "업데이트 이전 경기" : league.local && f.day <= s.day ? "경기 진행 대기" : "예정"}</small>`}</div><div class="match-club">${clubLink(league.table[f.away], ui.country)}<small>원정</small></div></div>`).join("")}</section>`;
  }
  if (ui.section === "records") {
    const records = leaguePlayers(s, league.id)
      .filter(({ player: p }) => p.record.games > 0)
      .sort(
        (a, b) =>
          b.player.record[ui.record] - a.player.record[ui.record] ||
          a.player.id - b.player.id,
      )
      .slice(0, 50);
    body = `<div class="filters"><label>기록 정렬<select id="explore-record">${[
      ["kills", "킬"],
      ["assists", "어시스트"],
      ["objectives", "깃발 운반"],
      ["aceWins", "에이스 승리"],
    ]
      .map(
        ([v, n]) =>
          `<option value="${v}" ${ui.record === v ? "selected" : ""}>${n}</option>`,
      )
      .join(
        "",
      )}</select></label><p class="muted">누적 경기 기록 · 상위 50명</p></div><section class="panel table-scroll"><table><thead><tr><th>순위</th><th>선수</th><th>소속 구단</th><th>출전 세트</th><th>킬</th><th>데스</th><th>어시스트</th><th>깃발 운반</th><th>에이스 승리</th></tr></thead><tbody>${records.map(({ player: p, club: t }, i) => `<tr><td>${i + 1}</td><td>${playerLink(p, t)}</td><td>${clubLink(t, ui.country)}</td><td>${p.record.games}</td><td>${p.record.kills}</td><td>${p.record.deaths}</td><td>${p.record.assists}</td><td>${p.record.objectives}</td><td>${p.record.aceWins}</td></tr>`).join("") || '<tr><td colspan="9" class="empty">첫 경기 후 선수 기록이 집계됩니다.</td></tr>'}</tbody></table></section>`;
  }
  return (
    head +
    crumbs +
    intro +
    body +
    `<p class="footer-note">${formatDate(s)} 기준 · ${league.local ? "소속 리그의 해당 라운드는 감독의 경기가 끝나면 함께 집계됩니다." : "날짜 진행 시 전력과 선수 성향을 반영한 간이 경기로 순위와 기록이 갱신됩니다."} 승수가 같으면 세트 득실차와 세트 득점으로 순위를 정합니다.</p>`
  );
}

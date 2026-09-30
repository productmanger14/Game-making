import {
  ensureFinance,
  financeCategories,
  money,
  financeDate,
  financeMonth,
  monthlySummary,
  weeklyCosts,
  sponsorOffers,
  estimateGate,
  financeForecast,
} from "./finance.js";

export const newFinanceView = () => ({
  tab: "overview",
  month: null,
  category: "all",
  direction: "all",
  page: 0,
});
export function financeHTML(s, ui, { esc }) {
  const f = ensureFinance(s),
    current = financeMonth(s.season, s.day),
    month = ui.month || current;
  const summary = monthlySummary(s, month),
    forecast = financeForecast(s),
    costs = weeklyCosts(s);
  const fmt = (n) =>
    money(n).toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  const amount = (n, signed = false) =>
    `${signed && n > 0 ? "+" : ""}${fmt(n)}`;
  const date = (season, day) => financeDate(season, day).replaceAll("-", ".");
  const months = [
    ...new Set([
      current,
      financeMonth(f.started.season, f.started.day),
      ...f.ledger.map((t) => t.month),
    ]),
  ]
    .sort()
    .reverse();
  const monthSelect = `<label class="finance-month-label">조회 월<select id="finance-month">${months.map((m) => `<option ${m === month ? "selected" : ""}>${m}</option>`).join("")}</select></label>`;
  const tabs = `<div class="finance-tabs" role="group" aria-label="재정 정보">${[
    ["overview", "재정 현황"],
    ["contracts", "중계권 · 후원"],
    ["ledger", "거래 장부"],
  ]
    .map(
      ([id, n]) =>
        `<button data-finance-tab="${id}" class="${ui.tab === id ? "primary" : ""}">${n}</button>`,
    )
    .join("")}</div>`;
  const title = `<div class="page-title"><div><div class="eyebrow">CLUB FINANCES</div><h1>재정센터</h1><p>들어올 자금과 지출을 확인하고, 구단의 다음 선택을 준비하세요.</p></div><span class="pill">금액 단위 · 백만원</span></div>${tabs}`;
  const cards = `<div class="finance-cards">${[
    ["현재 잔액", s.budget, "지금 사용할 수 있는 운영 자금"],
    [`${month} 수입`, summary.income, "선택 월 실제 입금"],
    [`${month} 지출`, summary.expense, "선택 월 실제 출금"],
    [`${month} 순현금흐름`, summary.net, "수입 − 지출"],
  ]
    .map(
      ([name, n, sub], i) =>
        `<section class="panel finance-card"><span>${name}</span><strong class="${n < 0 ? "negative" : i === 0 ? "accent" : ""}">${amount(n, i === 3)}</strong><small>${sub}</small></section>`,
    )
    .join("")}</div>`;
  const intro = `<p class="footer-note">장부 시작 ${date(f.started.season, f.started.day)} · 시작 잔액 ${fmt(f.openingBalance)}백만원. 이전 버전의 미보관 거래는 재구성하지 않습니다.</p>`;
  if (ui.tab === "overview") {
    const next = f.broadcast.installments.find((i) => i.status === "scheduled");
    const grouped = Object.entries(financeCategories)
      .map(([key, name]) => ({
        name,
        value: money(
          summary.rows
            .filter((t) => t.category === key)
            .reduce((n, t) => n + t.amount, 0),
        ),
      }))
      .filter((x) => x.value)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const max = Math.max(1, ...grouped.map((g) => Math.abs(g.value)));
    const chart = grouped
      .map(
        (g) =>
          `<div class="cashflow-row"><span>${g.name}</span><div class="cashflow-track"><i class="${g.value < 0 ? "expense" : "income"}" style="width:${(Math.abs(g.value) / max) * 100}%"></i></div><strong class="${g.value < 0 ? "negative" : "accent"}">${amount(g.value, true)}</strong></div>`,
      )
      .join("");
    return (
      title +
      `<div class="finance-toolbar">${monthSelect}<button data-finance-tab="ledger">거래 내역 보기</button></div>` +
      cards +
      `${s.budget < 0 || forecast.closing < 0 ? `<div class="finance-warning section-gap"><strong>${s.budget < 0 ? "운영 자금이 부족합니다." : "예상 잔액이 마이너스입니다."}</strong><p>예정 수입과 지출을 확인하고 영입·투자 규모를 조정하세요. 급료·유지비는 잔액과 관계없이 정산됩니다.</p></div>` : ""}<div class="grid two section-gap"><section class="panel panel-body"><div class="eyebrow">CASH OUTLOOK</div><h2>향후 ${forecast.days}일 자금 전망</h2><div class="finance-lines"><div><span>계약 수입 예정</span><strong class="accent">+${fmt(forecast.contractIncome)}</strong></div><div><span>경기 수입 예상</span><strong class="accent">+${fmt(forecast.matchIncome)}</strong></div><div><span>운영 지출 예상</span><strong class="negative">−${fmt(forecast.operatingCosts)}</strong></div><div class="finance-total"><span>예상 잔액</span><strong class="${forecast.closing < 0 ? "negative" : "accent"}">${fmt(forecast.closing)}</strong></div></div><p class="footer-note">현재 선수단·가격·일정을 유지하고 예정 경기를 정상 진행한다고 가정합니다. 경기 수당은 패배 기준이며, 승리 보너스·순위 상금·신규 영입·시설 투자는 제외합니다. 전망은 남은 시즌까지만 계산합니다.</p></section><section class="panel panel-body"><div class="eyebrow">NEXT PAYMENT</div><h2>다음 TV 중계료</h2>${next ? `<div class="next-payment"><strong>${fmt(next.amount)}<small>백만원</small></strong><span>${date(s.season, next.day)} · ${next.round}/${s.schedule.length}회차</span></div><p class="muted">날짜를 진행하면 리그 공동 중계권 분배금이 자동 입금됩니다.</p>` : '<div class="empty">이번 시즌 예정된 분배금 지급을 마쳤습니다.</div>'}<button data-finance-tab="contracts">중계권 계약 · 지급 일정</button><div class="finance-divider"></div><strong>${f.sponsor ? `${esc(f.sponsor.name)} · 계약 중` : "시즌 후원사 미계약"}</strong><p class="muted">${f.sponsor ? `매주 ${f.sponsor.weekly}백만원 · 승리 보너스 ${f.sponsor.winBonus}백만원` : "중계권 · 후원 탭에서 제안을 비교하고 계약할 수 있습니다."}</p></section></div><div class="grid two section-gap"><section class="panel panel-body"><h2>${month} 항목별 현금흐름</h2><p class="muted finance-legend"><span>수입</span><span>지출</span></p>${chart || '<div class="empty">아직 거래 내역이 없습니다.</div>'}<div class="finance-lines"><div><span>월초 잔액</span><strong>${fmt(summary.opening)}</strong></div><div><span>월말/현재까지 잔액</span><strong>${fmt(summary.closing)}</strong></div></div></section><section class="panel panel-body"><h2>주간 고정 운영비</h2><div class="finance-lines">${Object.entries(
        costs,
      )
        .map(
          ([key, n]) =>
            `<div><span>${financeCategories[key]}</span><strong>${fmt(n)}</strong></div>`,
        )
        .join(
          "",
        )}<div class="finance-total"><span>매주 합계</span><strong>${fmt(Object.values(costs).reduce((a, b) => a + b, 0))}</strong></div></div><p class="footer-note">1군: 주급 합계 · 유스: 주급의 25% · 스태프: 담당 팀 레벨 합계 × 2 · 시설: 레벨 합계 × 3. 매 7일마다 지급합니다.</p></section></div>${ticketPanel()}${
        f.seasonSummaries.length
          ? `<section class="panel section-gap table-scroll"><div class="panel-head"><h2>지난 시즌 결산</h2></div><table><thead><tr><th>시즌</th><th>최종 순위</th><th>수입</th><th>지출</th><th>마감 잔액</th></tr></thead><tbody>${[
              ...f.seasonSummaries,
            ]
              .reverse()
              .map(
                (r) =>
                  `<tr><td>${r.season}</td><td>${r.rank}위</td><td>${fmt(r.income)}</td><td>${fmt(r.expense)}</td><td>${fmt(r.closing)}</td></tr>`,
              )
              .join("")}</tbody></table></section>`
          : ""
      }${intro}`
    );
  }
  function ticketPanel() {
    let nextHome = null;
    for (let r = s.round; r < s.schedule.length; r++) {
      const pair = s.schedule[r].find((p) => p.includes(0));
      if (pair[0] === 0) {
        nextHome = { day: s.fixtureDays[r], opponent: s.table[pair[1]].name };
        break;
      }
    }
    const gate = nextHome ? estimateGate(s, nextHome.day) : null,
      last = f.lastGate;
    return `<section class="panel panel-body section-gap"><div class="panel-head finance-inline-head"><div><div class="eyebrow">HOME ARENA</div><h2>홈 경기 입장권</h2></div><span class="pill">수용 인원 ${f.capacity.toLocaleString()}명</span></div><div class="grid two"><div><label>일반 입장권 가격 · 원<input id="ticket-price" type="number" min="10000" max="40000" step="1000" value="${f.ticketPrice}"></label><button class="section-gap" data-action="ticket-price">가격 적용</button><p class="footer-note">10,000~40,000원, 1,000원 단위. 높은 가격은 관중 수를 줄일 수 있습니다. 구단 명성과 최근 승률도 수요에 반영됩니다.</p></div><div>${gate ? `<strong>${esc(nextHome.opponent)}전 예상 · ${date(s.season, nextHome.day)}</strong><div class="finance-lines"><div><span>예상 관중</span><strong>${gate.attendance.toLocaleString()}명</strong></div><div><span>입장 수입 / 운영비</span><strong>${fmt(gate.revenue)} / ${fmt(gate.cost)}</strong></div><div><span>입장·운영 순현금흐름</span><strong>${fmt(gate.revenue - gate.cost)}</strong></div></div>` : '<p class="muted">이번 시즌 남은 홈 경기가 없습니다.</p>'}${last ? `<p class="footer-note">최근 홈 경기: ${esc(last.opponent)} · ${last.attendance.toLocaleString()}명 입장 · 수입 ${fmt(last.revenue)}백만원</p>` : ""}</div></div></section>`;
  }
  if (ui.tab === "contracts") {
    const tv = f.broadcast,
      total = tv.installments.reduce((n, i) => n + i.amount, 0),
      received = tv.installments
        .filter((i) => i.status === "paid")
        .reduce((n, i) => n + i.amount, 0),
      remaining = tv.installments
        .filter((i) => i.status === "scheduled")
        .reduce((n, i) => n + i.amount, 0);
    return (
      title +
      `<div class="grid two"><section class="panel panel-body"><div class="eyebrow">BROADCAST RIGHTS</div><h2>${esc(tv.name)}</h2><p class="muted">${s.season}시즌 · ${s.schedule.length}회 분할 · 경기일 자동 지급</p><div class="finance-lines"><div><span>시즌 기본 계약 총액</span><strong>${fmt(total)}</strong></div><div><span>장부 시작 이후 지급액</span><strong class="accent">${fmt(received)}</strong></div><div><span>앞으로 받을 분배금</span><strong>${fmt(remaining)}</strong></div></div><div class="info section-gap">중계 편성: ${tv.featuredRounds.map((r) => `${r}R`).join(" · ")}<br>편성 경기 정상 종료 시 ${tv.appearanceFee}백만원 추가 지급. 전 시즌 1~2위는 기본 분배금 32, 3~4위는 30, 그 외와 첫 시즌은 28백만원/회입니다.</div><div class="table-scroll section-gap"><table><thead><tr><th>회차</th><th>지급일</th><th>분배금</th><th>상태</th></tr></thead><tbody>${tv.installments.map((i) => `<tr><td>${i.round}</td><td>${date(s.season, i.day)}</td><td>${fmt(i.amount)}</td><td><span class="pill ${i.status === "paid" ? "lime" : ""}">${{ paid: "입금 완료", scheduled: "예정", previous: "이관 이전" }[i.status]}</span></td></tr>`).join("")}</tbody></table></div><p class="footer-note">이관 이전 회차는 현재 잔액을 보존하기 위해 소급 지급하지 않습니다.</p></section><div><section class="panel panel-body"><div class="eyebrow">COMMERCIAL PARTNER</div><h2>시즌 후원 계약</h2><p class="muted">시즌당 한 곳과 계약 · 다음 시즌 재선택</p>${
        f.sponsor
          ? `<div class="sponsor-active"><span class="pill lime">계약 중 · ${f.sponsor.type}</span><h3>${esc(f.sponsor.name)}</h3><div class="finance-lines"><div><span>주간 후원금</span><strong>${f.sponsor.weekly}</strong></div><div><span>경기 승리 보너스</span><strong>${f.sponsor.winBonus}</strong></div><div><span>수령한 계약금</span><strong>${fmt(f.sponsor.signing)}</strong></div></div><p class="footer-note">${date(s.season, f.sponsor.signedDay)} 계약 · ${s.season}시즌 종료일까지. 주간 후원금은 계약 다음 정산일부터 지급합니다.</p></div>`
          : sponsorOffers(s)
              .map(
                (o) =>
                  `<article class="sponsor-offer"><span class="pill">${o.type}</span><h3>${esc(o.name)}</h3><div class="finance-lines"><div><span>지금 받을 계약금</span><strong>${fmt(o.signing)}</strong></div><div><span>매주 후원금</span><strong>${o.weekly}</strong></div><div><span>승리 보너스</span><strong>${o.winBonus}</strong></div></div><button class="primary full section-gap" data-sign-sponsor="${o.id}" ${s.round >= s.schedule.length ? "disabled" : ""}>${esc(o.name)}과 계약</button></article>`,
              )
              .join("")
      }<p class="footer-note">계약금은 남은 경기 비율에 따라 조정됩니다. 계약 후 이번 시즌 안에는 후원사를 바꿀 수 없습니다.</p></section><section class="panel panel-body section-gap"><h2>리그 순위 상금</h2><div class="finance-lines">${[240, 180, 140, 110, 90, 70, 50, 30].map((n, i) => `<div><span>${i + 1}위</span><strong>${n}</strong></div>`).join("")}</div><p class="footer-note">시즌 마지막 경기가 끝나면 최종 순위에 따라 한 번 지급됩니다.</p></section></div></div>`
    );
  }
  let filtered = summary.rows
    .filter(
      (t) =>
        (ui.category === "all" || t.category === ui.category) &&
        (ui.direction === "all" ||
          (ui.direction === "income" ? t.amount > 0 : t.amount < 0)),
    )
    .slice()
    .reverse();
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  ui.page = Math.min(ui.page, pages - 1);
  const page = filtered.slice(ui.page * 25, (ui.page + 1) * 25);
  return (
    title +
    `<div class="finance-toolbar">${monthSelect}<label>항목<select id="finance-category"><option value="all">전체 항목</option>${Object.entries(
      financeCategories,
    )
      .map(
        ([id, n]) =>
          `<option value="${id}" ${ui.category === id ? "selected" : ""}>${n}</option>`,
      )
      .join("")}</select></label><label>입출금<select id="finance-direction">${[
      ["all", "전체"],
      ["income", "수입"],
      ["expense", "지출"],
    ]
      .map(
        ([id, n]) =>
          `<option value="${id}" ${ui.direction === id ? "selected" : ""}>${n}</option>`,
      )
      .join(
        "",
      )}</select></label></div>${cards}<section class="panel table-scroll section-gap"><table><thead><tr><th>일자</th><th>항목</th><th>거래 내용</th><th>입출금</th><th>거래 후 잔액</th></tr></thead><tbody>${page.map((t) => `<tr><td>${date(t.season, t.day)}</td><td>${financeCategories[t.category]}</td><td class="ledger-label">${esc(t.label)}</td><td class="${t.amount < 0 ? "negative" : "accent"}">${amount(t.amount, true)}</td><td>${fmt(t.balance)}</td></tr>`).join("") || '<tr><td colspan="5" class="empty">선택한 조건의 거래가 없습니다.</td></tr>'}</tbody></table></section><div class="finance-pagination"><span class="muted">${filtered.length}건 · ${ui.page + 1}/${pages}페이지 · 최신순</span><div><button data-finance-page="${ui.page - 1}" ${ui.page === 0 ? "disabled" : ""}>이전</button><button data-finance-page="${ui.page + 1}" ${ui.page >= pages - 1 ? "disabled" : ""}>다음</button></div></div>${intro}`
  );
}

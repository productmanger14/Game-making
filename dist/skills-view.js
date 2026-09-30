import {
  commonSkills,
  skillDefinitions,
  xpNeeded,
  skillEffectText,
  skillCondition,
  skillBehavior,
  behaviorNames,
} from "./skills.js";
import { weapons } from "./engine.js";
export function trainingOptions(p, esc) {
  const known = p.skills
    .filter((s) => s.level < 10)
    .map(
      (s) =>
        `<option value="${s.id}" ${p.skillTraining?.id === s.id ? "selected" : ""}>${esc(skillDefinitions[s.id].name)} · Lv.${s.level} 숙련</option>`,
    )
    .join("");
  const available =
    p.skills.length < 7
      ? commonSkills
          .filter((d) => !p.skills.some((s) => s.id === d.id))
          .map(
            (d) =>
              `<option value="${d.id}" ${p.skillTraining?.id === d.id ? "selected" : ""}>${esc(d.name)} · 새로 습득</option>`,
          )
          .join("")
      : "";
  return `<option value="">기술 전담 훈련 없음</option><optgroup label="보유 기술 숙련">${known}</optgroup>${available ? `<optgroup label="새 기술 입문">${available}</optgroup>` : ""}`;
}
export function trainingStatus(p) {
  if (!p.skillTraining) return `${p.skills.length}/7개 습득`;
  const sk = p.skills.find((s) => s.id === p.skillTraining.id);
  return sk
    ? `Lv.${sk.level} · 경험 ${Math.floor(sk.xp)}/${xpNeeded(sk.level)}`
    : `입문 ${Math.floor(p.skillTraining.xp)}/100 · 완료 시 1칸 사용`;
}
export function skillsHTML(p, { esc, editable = false }) {
  return `<section class="skills-section section-gap"><div class="panel-head"><div><h3>기술 · 플레이스타일</h3><p class="muted">${behaviorNames[skillBehavior(p)]} · 상황에 따라 자동 적용</p></div><span class="pill">${p.skills.length} / 7</span></div><div class="skill-grid">${p.skills
    .map((sk) => {
      const d = skillDefinitions[sk.id],
        percent = sk.level === 10 ? 100 : (100 * sk.xp) / xpNeeded(sk.level);
      const equipment = d.weapons
        ? d.weapons.map((i) => weapons[i].name).join(" · ")
        : d.when === "ranged"
          ? "장궁 · 석궁"
          : "무기 제한 없음";
      const inactive =
        (d.weapons && !d.weapons.includes(p.weapon)) ||
        (d.when === "ranged" && ![4, 10].includes(p.weapon));
      return `<article class="skill-card" data-skill-card="${sk.id}"><div class="flex spread"><strong>${esc(d.name)}</strong><b>Lv.${sk.level}<small> / 10</small></b></div><p>${esc(d.description)}</p><small class="skill-condition">${skillCondition(d)} · ${equipment}${inactive ? " · 현재 장비로는 발동하지 않음" : ""}</small><p class="skill-effects">${skillEffectText(d, sk.level)}</p><div class="bar"><i style="width:${percent}%"></i></div><div class="skill-card-foot"><small>${sk.level === 10 ? "최고 숙련도" : `경험 ${Math.floor(sk.xp)} / ${xpNeeded(sk.level)}`}</small>${editable && d.signature == null ? `<button class="ghost" data-forget-skill="${sk.id}" data-skill-owner="${p.id}">정리</button>` : ""}</div></article>`;
    })
    .join(
      "",
    )}${Array.from({ length: 7 - p.skills.length }, () => '<div class="skill-slot">빈 기술 슬롯</div>').join("")}</div>${editable ? `<div class="skill-training"><label>전담 기술 훈련<select data-skill-training="${p.id}" aria-label="${esc(p.name)} 기술 훈련">${trainingOptions(p, esc)}</select></label><p class="muted">${trainingStatus(p)}</p><small>새 기술은 훈련 경험 100에 Lv.1로 습득합니다. 기술을 바꾸면 진행 중인 입문 경험은 사라집니다. 기술 정리는 해당 기술의 레벨과 경험을 지웁니다.</small></div>` : ""}<p class="footer-note">무기·상황 조건을 만족할 때 레벨에 비례한 효과가 적용됩니다. 전담 훈련과 출전 경험으로 Lv.10까지 성장합니다. 같은 효과의 합산에는 상한이 적용됩니다.</p></section>`;
}

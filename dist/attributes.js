import { ensureSkills } from "./skills.js";
export const hiddenAttributes = {
  consistency: "꾸준함",
  dirtiness: "거친 플레이",
  importantMatches: "중요 경기 활약",
  versatility: "다재다능",
  injuryProneness: "부상 빈도",
  professionalism: "프로 의식",
  ambition: "야망",
  loyalty: "충성심",
  pressure: "압박 대처",
  temperament: "침착한 성품",
  sportsmanship: "스포츠맨십",
  adaptability: "적응력",
  controversy: "논쟁성",
  obsession: "집착도",
  jealousy: "질투 성향",
  boundaries: "경계 존중",
};
export const bound = (n, min = 1, max = 20) =>
  Math.max(min, Math.min(max, Math.round(Number.isFinite(n) ? n : 10)));
function hash(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function ensurePlayerAttributes(p) {
  p.hidden ??= {};
  for (const k of Object.keys(hiddenAttributes))
    p.hidden[k] = bound(
      p.hidden[k] ?? 1 + (hash(`${p.unique ?? p.id}:${p.name}:${k}`) % 20),
    );
  for (const k of Object.keys(p.stats)) p.stats[k] = bound(p.stats[k]);
  p.mastery = bound(p.mastery);
  p.roleFamiliarity ??= { [p.role]: 20 };
  p.roleFamiliarity[p.role] = 20;
  p.roleTraining ??= p.role;
  p.roleXP ??= {};
  p.hiddenProgress ??= { appearances: 0, important: 0 };
  p.adaptationDays ??= 0;
  if (p.unique != null) p.portraitKey = `special-${p.unique}`;
  else
    p.portraitKey ??= p.portrait == null ? "initial" : `regular-${p.portrait}`;
  return ensureSkills(p);
}
export function matchReadiness(p, random, important = false) {
  ensurePlayerAttributes(p);
  const h = p.hidden;
  const consistent = random() < h.consistency / 25;
  const form = consistent ? 1 : 0.82 + 0.12 * random();
  const pressure = important
    ? 0.82 + (0.18 * (h.importantMatches + h.pressure)) / 40
    : 1;
  return form * pressure * (p.adaptationDays > 0 ? 0.94 : 1);
}
export function roleEffect(p, role) {
  const familiarity = p.roleFamiliarity?.[role] ?? 1;
  return role === p.role
    ? 1
    : 1 - (20 - familiarity) * 0.012 * (1 - (p.hidden?.versatility ?? 10) / 25);
}
export function trainingMotivation(p) {
  return 0.65 + p.hidden.professionalism * 0.022 + p.hidden.ambition * 0.012;
}
export function injuryRisk(p, load, medical) {
  return Math.min(
    0.035,
    ((Math.max(0, load) / 20) *
      (0.0004 + p.hidden.injuryProneness * 0.00012) *
      (1 + p.fatigue / 70)) /
      (1 + medical * 0.3) /
      (1 + Math.max(0, (p.stats?.endurance ?? 10) - 1) / 30),
  );
}
export function foulRisk(p) {
  return (
    Math.max(0, p.hidden.dirtiness - 7) *
    0.00015 *
    (1.3 - (p.hidden.temperament + p.hidden.sportsmanship) / 80)
  );
}
export function coachObservations(p, confidence = 70) {
  ensurePlayerAttributes(p);
  const h = p.hidden,
    out = [];
  if (confidence < 45)
    return ["관찰 자료가 부족해 경기 기복과 성향을 판단하기 어렵습니다."];
  if (h.consistency <= 9)
    out.push("경기마다 발휘하는 기량에 기복이 있는 편입니다.");
  else if (h.consistency >= 15) out.push("경기력을 꾸준히 유지하는 편입니다.");
  if (h.dirtiness >= 12)
    out.push("교전이 거칠어 심판의 주의를 받을 수 있습니다.");
  if (h.importantMatches <= 9)
    out.push("중요한 승부에서 평소 기량을 발휘하지 못할 수 있습니다.");
  else if (h.importantMatches >= 15)
    out.push("큰 승부에서도 자신감을 유지합니다.");
  if (h.injuryProneness >= 12)
    out.push("부상 예방과 훈련 부하 관리에 주의가 필요합니다.");
  if (confidence >= 65) {
    if (h.versatility >= 15) out.push("낯선 역할에도 빠르게 적응합니다.");
    if (h.professionalism >= 15) out.push("일상 훈련에 성실하게 임합니다.");
    else if (h.professionalism <= 6)
      out.push("훈련 집중을 유지하려면 코치의 관리가 필요합니다.");
    if (h.loyalty >= 15) out.push("현재 구단에 강한 소속감을 보입니다.");
    if (h.pressure <= 7) out.push("외부 기대와 압박에 흔들리는 편입니다.");
  }
  return out.length
    ? out.slice(0, 5)
    : ["현재까지 뚜렷한 성향은 관찰되지 않았습니다."];
}

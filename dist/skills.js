import { motifs } from "./motifs.js";
export const MAX_SKILLS = 7;
export const MAX_SKILL_LEVEL = 10;
const common = (id, name, group, description, effects, options = {}) => ({
  id,
  name,
  group,
  description,
  effects,
  ...options,
});
export const commonSkills = [
  common(
    "sword",
    "검술",
    "무기",
    "검을 사용할 때 유효타와 타격 피해가 증가합니다.",
    { hit: 0.08, damage: 0.08 },
    { weapons: [0, 1, 2] },
  ),
  common(
    "shield",
    "방패술",
    "무기",
    "검·방패를 들고 있을 때 방어 확률이 증가합니다.",
    { guard: 0.12 },
    { weapons: [0] },
  ),
  common(
    "curved",
    "곡도술",
    "무기",
    "곡도의 유효타와 방어 관통이 증가합니다.",
    { hit: 0.06, penetration: 0.05 },
    { weapons: [6] },
  ),
  common(
    "spear",
    "창술",
    "무기",
    "창의 유효타와 타격 피해가 증가합니다.",
    { hit: 0.08, damage: 0.08 },
    { weapons: [3] },
  ),
  common(
    "bow",
    "궁술",
    "무기",
    "장궁의 조준과 사격 간격이 개선됩니다.",
    { hit: 0.1, haste: 0.06 },
    { weapons: [4] },
  ),
  common(
    "crossbow",
    "석궁술",
    "무기",
    "석궁의 조준과 장전 간격이 개선됩니다.",
    { hit: 0.06, haste: 0.12 },
    { weapons: [10] },
  ),
  common(
    "heavy",
    "중병기술",
    "무기",
    "양손검·전투망치의 타격 피해가 증가합니다.",
    { damage: 0.16 },
    { weapons: [1, 5] },
  ),
  common(
    "whip",
    "채찍술",
    "무기",
    "채찍의 유효타와 무장 해제 확률이 증가합니다.",
    { hit: 0.06, disarm: 0.025 },
    { weapons: [7] },
  ),
  common(
    "flexible",
    "연검술",
    "무기",
    "연검의 방어 관통과 유효타가 증가합니다.",
    { penetration: 0.06, hit: 0.05 },
    { weapons: [8] },
  ),
  common(
    "staff",
    "봉술",
    "무기",
    "장봉으로 공격할 때 유효타와 방어가 증가합니다.",
    { hit: 0.06, guard: 0.06 },
    { weapons: [9] },
  ),
  common(
    "chain",
    "사슬낫술",
    "무기",
    "사슬낫의 무장 해제와 방어 관통이 증가합니다.",
    { disarm: 0.025, penetration: 0.04 },
    { weapons: [11] },
  ),
  common("footwork", "보법", "신체", "이동 속도와 공격 회피가 증가합니다.", {
    speed: 0.1,
    evasion: 0.06,
  }),
  common(
    "grapple",
    "격투술",
    "신체",
    "무기를 잃었을 때 맨손 유효타와 피해가 증가합니다.",
    { hit: 0.1, damage: 0.2 },
    { when: "unarmed" },
  ),
  common("breathing", "호흡법", "신체", "이동과 공격의 체력 소모를 줄입니다.", {
    stamina: 0.22,
  }),
  common(
    "retention",
    "무기 유지술",
    "기술",
    "무장 해제에 저항하고 떨어진 무기를 빨리 회수합니다.",
    { retention: 0.025, recovery: 0.35 },
  ),
  common(
    "disarm",
    "무장 해제술",
    "기술",
    "근접 공격 적중 시 상대 무기를 떨어뜨릴 확률이 증가합니다.",
    { disarm: 0.025 },
    { when: "melee" },
  ),
  common(
    "formation",
    "진형 유지",
    "전술",
    "가까운 아군이 있을 때 방어와 유효타가 증가합니다.",
    { guard: 0.07, hit: 0.04 },
    { when: "nearAlly", behavior: "hold" },
  ),
  common(
    "flanking",
    "측면 공략",
    "전술",
    "아군과 교전 중인 적을 우선 노리고 협공 유효타가 증가합니다.",
    { hit: 0.09 },
    { when: "focus", behavior: "flank" },
  ),
  common(
    "escort",
    "호위술",
    "전술",
    "왕·깃발 운반자 곁에서 위협하는 적을 노리고 방어가 증가합니다.",
    { guard: 0.1, speed: 0.06 },
    { when: "protect", behavior: "escort" },
  ),
  common(
    "skirmish",
    "간격 조절",
    "전술",
    "유효 사거리 안에서 거리를 유지하며 근접 압박을 피합니다.",
    { evasion: 0.07 },
    { behavior: "kite" },
  ),
  common(
    "pressure",
    "압박술",
    "전술",
    "근접 공격 간격이 짧아집니다. 상대에게 더 가까이 접근합니다.",
    { haste: 0.12 },
    { when: "melee", behavior: "assault" },
  ),
  common(
    "runner",
    "깃발 운반술",
    "전술",
    "운반 임무를 선호하며 깃발을 들었을 때 이동이 빨라집니다.",
    { speed: 0.16, stamina: 0.08 },
    { when: "carrying", behavior: "runner" },
  ),
  common(
    "terrain",
    "험지 적응",
    "신체",
    "정글·설원·산악에서 이동과 체력 관리가 개선됩니다.",
    { speed: 0.12, stamina: 0.12 },
    { when: "rough" },
  ),
];
// Values below are bonuses at Lv.10, scaled continuously by level / 10.
const profiles = {
  charge: {
    when: "opening",
    effects: { speed: 0.2, damage: 0.12 },
    behavior: "assault",
  },
  encircle: {
    when: "focus",
    effects: { hit: 0.13, penetration: 0.04 },
    behavior: "flank",
  },
  formation: {
    when: "nearAlly",
    effects: { hit: 0.06, guard: 0.1 },
    behavior: "hold",
  },
  counter: { when: "counter", effects: { hit: 0.13, damage: 0.12 } },
  pressure: {
    when: "melee",
    effects: { haste: 0.14, damage: 0.1 },
    behavior: "assault",
  },
  lastguard: {
    when: "outnumbered",
    effects: { guard: 0.14, stamina: 0.15 },
    behavior: "hold",
  },
  focus: {
    when: "focus",
    effects: { hit: 0.1, damage: 0.12 },
    behavior: "flank",
  },
  spearline: {
    weapons: [3],
    when: "nearAlly",
    effects: { hit: 0.1, guard: 0.09 },
    weapon: 3,
    behavior: "hold",
  },
  opening: { when: "opening", effects: { speed: 0.16, hit: 0.09 } },
  rally: { when: "lowHealth", effects: { guard: 0.13, hit: 0.08 } },
  pursuit: { effects: { speed: 0.14, stamina: 0.1 } },
  stamina: { effects: { stamina: 0.25, guard: 0.04 } },
  skirmish: { effects: { evasion: 0.09, hit: 0.05 }, behavior: "kite" },
  zoneattack: {
    when: "zone",
    effects: { damage: 0.16, hit: 0.06 },
    behavior: "assault",
  },
  archer: {
    when: "ranged",
    effects: { hit: 0.12, haste: 0.08 },
    weapon: 4,
    behavior: "kite",
  },
  zoneguard: {
    when: "zone",
    effects: { guard: 0.14, retention: 0.015 },
    behavior: "hold",
  },
  rough: { when: "rough", effects: { speed: 0.18, evasion: 0.07 } },
  terrainGuard: {
    when: "mountain",
    effects: { guard: 0.14, stamina: 0.15 },
    behavior: "hold",
  },
  power: {
    when: "melee",
    effects: { damage: 0.24, stamina: -0.08 },
    behavior: "assault",
  },
  escort: {
    when: "protect",
    effects: { speed: 0.12, guard: 0.12 },
    behavior: "escort",
  },
  twinsword: {
    weapons: [0, 1, 2, 6, 8],
    when: "duel",
    effects: { hit: 0.12, haste: 0.12 },
    weapon: 2,
  },
  duelist: { when: "duel", effects: { hit: 0.1, guard: 0.1 }, weapon: 0 },
  lastattack: {
    when: "outnumbered",
    effects: { hit: 0.1, damage: 0.14 },
    behavior: "assault",
  },
  shieldwall: {
    weapons: [0],
    effects: { guard: 0.13, retention: 0.015 },
    weapon: 0,
    behavior: "hold",
  },
  evasion: { effects: { evasion: 0.1, hit: 0.03 }, behavior: "kite" },
  runner: { effects: { speed: 0.17, stamina: 0.08 }, behavior: "runner" },
  spearduel: {
    weapons: [3],
    when: "duel",
    effects: { hit: 0.13, penetration: 0.06 },
    weapon: 3,
  },
  duelguard: { when: "duel", effects: { guard: 0.13, evasion: 0.05 } },
  grappler: { when: "unarmed", effects: { hit: 0.14, damage: 0.25 } },
  penetration: { when: "melee", effects: { penetration: 0.09, damage: 0.09 } },
  heavy: {
    weapons: [1, 5],
    effects: { damage: 0.22, penetration: 0.04 },
    weapon: 5,
  },
  staff: {
    weapons: [9],
    effects: { hit: 0.09, guard: 0.08 },
    weapon: 9,
    behavior: "kite",
  },
  retention: { effects: { retention: 0.03, guard: 0.07, recovery: 0.3 } },
};
const conditionText = {
  opening: "첫 90초",
  focus: "아군과 같은 적을 공격할 때",
  nearAlly: "6m 안에 아군이 있을 때",
  counter: "방어 성공 후 4초",
  melee: "근접 교전",
  outnumbered: "아군 생존 인원 열세",
  lowHealth: "잔여 피해 한도 40% 이하",
  zone: "기지 8m 안",
  ranged: "원거리 무기 사용",
  rough: "정글·설원·산악",
  mountain: "산악 경기장",
  protect: "왕·아군 깃발 운반자 8m 안",
  duel: "에이스 대결",
  unarmed: "무기 손실 상태",
  carrying: "깃발 운반 중",
};
const effectNames = {
  hit: "유효타",
  guard: "방어",
  evasion: "회피",
  damage: "피해",
  speed: "이동",
  stamina: "체력 소모 절약",
  haste: "공격 간격 단축",
  penetration: "방어 관통",
  disarm: "무장 해제",
  retention: "무기 유지",
  recovery: "회수 대기 단축",
};
const points = new Set([
  "hit",
  "guard",
  "evasion",
  "penetration",
  "disarm",
  "retention",
]);
export const signatureSkills = motifs.map((m) => ({
  id: `signature-${m.id}`,
  name: m.name,
  group: "전술",
  signature: m.id,
  basis: m.basis,
  ...profiles[m.style],
  description: `${conditionText[profiles[m.style].when] || "교전 전반"}에 자신의 숙련을 발휘합니다.`,
}));
export const skillDefinitions = Object.fromEntries(
  [...commonSkills, ...signatureSkills].map((d) => [d.id, d]),
);
export const signatureFor = (p) =>
  Number.isInteger(p.unique) ? signatureSkills[p.unique] : null;
export const preferredWeapon = (unique) => signatureSkills[unique]?.weapon;
export const xpNeeded = (level) => 80 + level * 40;
function hash(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
const weaponSkill = [
  "sword",
  "heavy",
  "sword",
  "spear",
  "bow",
  "heavy",
  "curved",
  "whip",
  "flexible",
  "staff",
  "crossbow",
  "chain",
];
export function ensureSkills(p) {
  const signature = signatureFor(p);
  if (!Array.isArray(p.skills)) {
    const style =
      [
        "pressure",
        "formation",
        "pressure",
        "runner",
        "flanking",
        "skirmish",
        "escort",
        "disarm",
      ][
        [
          "선봉",
          "수비",
          "돌격",
          "기동",
          "견제",
          "사격",
          "호위",
          "교란",
        ].indexOf(p.role)
      ] || "footwork";
    const variation = [
      "footwork",
      "breathing",
      "retention",
      "terrain",
      "grapple",
    ][hash(`${p.id}:${p.name}:skill`) % 5];
    const ids = [weaponSkill[p.weapon] || "sword", style, variation];
    if (p.weapon === 0 && style === "formation") ids.push("shield");
    p.skills = [...new Set(ids)].map((id) => ({
      id,
      level: p.youth ? 1 : 2 + (hash(`${p.id}:${id}`) % 3),
      xp: 0,
    }));
  }
  const seen = new Set();
  p.skills = p.skills
    .filter(
      (x) =>
        x &&
        skillDefinitions[x.id] &&
        (skillDefinitions[x.id].signature == null || x.id === signature?.id) &&
        !seen.has(x.id) &&
        seen.add(x.id),
    )
    .map((x) => {
      const level = Math.max(1, Math.min(10, Math.floor(Number(x.level) || 1)));
      return {
        id: x.id,
        level,
        xp:
          level === 10
            ? 0
            : Math.max(0, Math.min(xpNeeded(level) - 0.01, Number(x.xp) || 0)),
      };
    });
  if (signature && !p.skills.some((x) => x.id === signature.id))
    p.skills.unshift({ id: signature.id, level: 3, xp: 0 });
  if (signature)
    p.skills.sort(
      (a, b) => Number(b.id === signature.id) - Number(a.id === signature.id),
    );
  p.skills = p.skills.slice(0, 7);
  if (p.skillTraining) {
    const d = skillDefinitions[p.skillTraining.id],
      learned = p.skills.find((x) => x.id === p.skillTraining.id);
    if (
      !d ||
      (d.signature != null && d.id !== signature?.id) ||
      (!learned && p.skills.length >= 7) ||
      learned?.level === 10
    )
      p.skillTraining = null;
    else
      p.skillTraining = {
        id: d.id,
        xp: Math.max(0, Math.min(99.99, Number(p.skillTraining.xp) || 0)),
      };
  }
  p.skillsVersion = 1;
  return p;
}
export function setSkillTraining(p, id) {
  ensureSkills(p);
  if (!id) {
    p.skillTraining = null;
    return;
  }
  const d = skillDefinitions[id],
    known = p.skills.find((x) => x.id === id);
  if (!d || (d.signature != null && d.signature !== p.unique))
    throw Error("이 선수가 배울 수 없는 기술입니다.");
  if (!known && p.skills.length >= MAX_SKILLS)
    throw Error("습득 기술은 최대 7개입니다. 기존 기술을 정리해야 합니다.");
  if (known?.level === 10) throw Error("이미 최고 숙련도에 도달했습니다.");
  if (p.skillTraining?.id !== id) p.skillTraining = { id, xp: 0 };
}
export function forgetSkill(p, id) {
  ensureSkills(p);
  if (skillDefinitions[id]?.signature != null)
    throw Error("처음부터 익힌 이 기술은 정리할 수 없습니다.");
  if (!p.skills.some((x) => x.id === id))
    throw Error("습득하지 않은 기술입니다.");
  p.skills = p.skills.filter((x) => x.id !== id);
  if (p.skillTraining?.id === id) p.skillTraining = null;
}
export function addSkillXP(p, id, amount) {
  const skill = p.skills.find((x) => x.id === id);
  if (!skill || skill.level >= 10 || !(amount > 0)) return null;
  const before = skill.level;
  skill.xp += amount;
  while (skill.level < 10 && skill.xp >= xpNeeded(skill.level)) {
    skill.xp -= xpNeeded(skill.level);
    skill.level++;
  }
  if (skill.level === 10) skill.xp = 0;
  return skill.level > before
    ? { id, level: skill.level, learned: false }
    : null;
}
export function trainSkill(p, amount) {
  if (!p.skillTraining || !(amount > 0) || p.injury > 0) return null;
  const { id } = p.skillTraining;
  if (p.skills.some((x) => x.id === id)) {
    const event = addSkillXP(p, id, amount);
    if (p.skills.find((x) => x.id === id).level === 10) p.skillTraining = null;
    return event;
  }
  if (p.skills.length >= 7) {
    p.skillTraining = null;
    return null;
  }
  p.skillTraining.xp += amount;
  if (p.skillTraining.xp < 100) return null;
  const excess = p.skillTraining.xp - 100;
  p.skills.push({ id, level: 1, xp: 0 });
  p.skillTraining = { id, xp: 0 };
  addSkillXP(p, id, excess);
  if (p.skills.at(-1).level === 10) p.skillTraining = null;
  return { id, level: p.skills.at(-1).level, learned: true };
}
export function gainMatchSkills(p) {
  const events = [];
  for (const sk of p.skills || []) {
    const d = skillDefinitions[sk.id];
    if (d.weapons && !d.weapons.includes(p.weapon)) continue;
    const event = addSkillXP(p, sk.id, 3);
    if (event) events.push(event);
  }
  if (p.skills.find((x) => x.id === p.skillTraining?.id)?.level === 10)
    p.skillTraining = null;
  return events;
}
export function skillBehavior(p) {
  return (
    [...(p.skills || [])]
      .filter((sk) => {
        const d = skillDefinitions[sk.id];
        return (
          (!d?.weapons || d.weapons.includes(p.weapon)) &&
          (d?.when !== "ranged" || [4, 10].includes(p.weapon))
        );
      })
      .sort((a, b) => b.level - a.level)
      .map((s) => skillDefinitions[s.id]?.behavior)
      .find(Boolean) || "balanced"
  );
}
export const behaviorNames = {
  balanced: "균형 교전",
  assault: "근접 압박",
  hold: "대열 유지",
  flank: "협공 우선",
  escort: "호위 우선",
  kite: "간격 유지",
  runner: "운반 우선",
};
function active(d, p, c) {
  if (d.weapons && (!c.armed || !d.weapons.includes(p.weapon))) return false;
  switch (d.when) {
    case "opening":
      return c.time < 90;
    case "focus":
      return c.focus;
    case "nearAlly":
      return c.nearAlly;
    case "counter":
      return c.counter;
    case "melee":
      return !c.ranged;
    case "outnumbered":
      return c.outnumbered;
    case "lowHealth":
      return c.hp <= 40;
    case "zone":
      return c.zone;
    case "ranged":
      return c.armed && c.ranged;
    case "rough":
      return ["forest", "snow", "mountain"].includes(c.terrain);
    case "mountain":
      return c.terrain === "mountain";
    case "protect":
      return c.protect;
    case "duel":
      return c.mode === 4;
    case "unarmed":
      return !c.armed;
    case "carrying":
      return c.carrying;
    default:
      return true;
  }
}
export function skillEffects(p, c) {
  const effects = {
    hit: 0,
    guard: 0,
    evasion: 0,
    damage: 0,
    speed: 0,
    stamina: 0,
    haste: 0,
    penetration: 0,
    disarm: 0,
    retention: 0,
    recovery: 0,
  };
  for (const sk of p.skills || []) {
    const d = skillDefinitions[sk.id];
    if (d && active(d, p, c))
      for (const [key, v] of Object.entries(d.effects))
        effects[key] += (v * sk.level) / 10;
  }
  const caps = {
    hit: 0.2,
    guard: 0.22,
    evasion: 0.16,
    damage: 0.35,
    speed: 0.3,
    stamina: 0.4,
    haste: 0.28,
    penetration: 0.14,
    disarm: 0.04,
    retention: 0.04,
    recovery: 0.55,
  };
  for (const key of Object.keys(effects))
    effects[key] = Math.max(-0.15, Math.min(caps[key], effects[key]));
  return effects;
}
export function skillEffectText(d, level = 10) {
  return Object.entries(d.effects)
    .map(
      ([k, v]) =>
        `${effectNames[k]} ${v >= 0 ? "+" : ""}${Math.round(v * level * 10 * 10) / 10}${points.has(k) ? "%p" : "%"}`,
    )
    .join(" · ");
}
export const skillCondition = (d) => conditionText[d.when] || "상시";
// Foreign matches are aggregate simulations; use a bounded context-aware proxy.
export function skillMatchRating(p, mode, terrain) {
  const e = skillEffects(p, {
    armed: true,
    ranged: [4, 10].includes(p.weapon),
    time: 45,
    mode,
    terrain,
    hp: 100,
    nearAlly: mode !== 4,
    focus: mode !== 4,
    protect: mode === 1 || mode === 3,
    zone: mode === 1,
    carrying: false,
    counter: false,
    outnumbered: false,
  });
  return (
    1 +
    Math.min(
      0.22,
      e.hit * 0.5 +
        e.guard * 0.4 +
        e.damage * 0.25 +
        e.evasion * 0.4 +
        e.speed * 0.2 +
        e.stamina * 0.12 +
        e.haste * 0.25 +
        e.penetration * 0.3,
    )
  );
}

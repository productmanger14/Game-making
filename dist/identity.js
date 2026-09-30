// Only a valid unique identity selects original artwork. Old portrait indices
// and portraitKey labels must never grant a generated player unique artwork.
export function uniquePortrait(p) {
  if (!Number.isInteger(p.unique) || p.unique < 0 || p.unique >= 100) return null;
  return { atlas: ["a", "b", "c", "d"][Math.floor(p.unique / 25)], index: p.unique % 25 };
}
// Identity has its own deterministic generator: browsing never consumes gameplay RNG.
export const appearanceParts = ["face", "eyes", "eyebrows", "nose", "mouth", "hairStyle", "hairColor", "eyeColor", "skinTone", "build"];
function hash(text) {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function ensureIdentity(p) {
  p.appearance ??= {};
  if (!p.appearance.design) {
    let seed = hash(`${p.id}:${p.name}:${p.country}:portrait-v1`);
    const design = { version: 1 };
    for (const key of appearanceParts) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      design[key] = (seed >>> 16) % 32;
    }
    p.appearance.design = design;
  }
  return p.appearance.design;
}
const hairColors = ["#263047", "#785548", "#e9e1d5", "#bd6683", "#a0b7de", "#deb67c", "#695e98", "#90b6ad"];
const eyes = ["#53acdf", "#9273d5", "#cf797b", "#56aaa3", "#bd965b", "#6d91cf", "#d391bb", "#879b64"];
const skinColors = ["#f8ddd0", "#efd0b9", "#dfb99c", "#c99879", "#b88262", "#a36b50", "#8b5943", "#704733"];
function tint(hex, variant) {
  const amount = (variant - 1.5) * 5;
  return "#" + [1,3,5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i,i+2),16) + amount))).toString(16).padStart(2,"0")).join("");
}
export function portraitSVG(p) {
  const a = ensureIdentity(p), f = a.face / 31, e = a.eyes / 31;
  const skin = tint(skinColors[Math.floor(a.skinTone / 4)], a.skinTone % 4);
  const hair = tint(hairColors[Math.floor(a.hairColor / 4)], a.hairColor % 4);
  const eye = tint(eyes[Math.floor(a.eyeColor / 4)], a.eyeColor % 4);
  const h = a.hairStyle, length = 134 + (h % 8) * 5, width = 37 + f * 8;
  const eyeY = 90 + (a.eyes % 4), eyeW = 12 + e * 4, eyeH = 7 + (a.eyes % 8) * .7;
  const browSlope = (a.eyebrows - 15) * .13, mouthW = 4 + a.mouth * .15;
  const build = 29 + a.build * .42;
  const back = Math.floor(h / 8);
  const fringe = h % 8;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[c]);
  const artId = hash(`${p.id}:${p.name}:art`);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" role="img" aria-label="${esc(p.name)} 초상화"><defs><linearGradient id="bg-${artId}" x2="1" y2="1"><stop stop-color="#293a57"/><stop offset="1" stop-color="#172337"/></linearGradient><linearGradient id="hair-${artId}" x2=".8" y2="1"><stop stop-color="${hair}"/><stop offset="1" stop-color="#182335" stop-opacity=".8"/></linearGradient></defs><rect width="200" height="240" rx="12" fill="url(#bg-${artId})"/><circle cx="145" cy="45" r="58" fill="${eye}" opacity=".1"/><path d="M10 198L190 20M12 223L190 45" stroke="#fff" opacity=".06" stroke-width="2"/>`;
  svg += `<path d="M${100-width-12} 91Q40 29 100 27Q163 29 ${100+width+12} 91L${160-back*5} ${length}Q100 ${length+24} ${40+back*5} ${length}Z" fill="url(#hair-${artId})" stroke="#1a2437" stroke-width="2"/>`;
  if (back === 2) svg += `<path d="M53 57Q18 82 30 ${length+30}L57 ${length}M147 57Q182 82 170 ${length+30}L143 ${length}" fill="${hair}" stroke="#243044" stroke-width="3"/>`;
  if (back === 3) svg += `<ellipse cx="49" cy="60" rx="19" ry="21" fill="${hair}"/><ellipse cx="151" cy="60" rx="19" ry="21" fill="${hair}"/>`;
  svg += `<path d="M88 123L87 151L${100-build} 169L55 240H145L${100+build} 169L113 151L112 123" fill="${skin}"/><path d="M100 51Q${100+width} 49 ${100+width} 91Q${100+width-1} 125 100 ${136+f*7}Q${100-width+1} 125 ${100-width} 91Q${100-width} 49 100 51Z" fill="${skin}" stroke="#634c50" stroke-width="1"/>`;
  svg += `<path d="M88 129Q100 140 112 129L112 139Q100 145 88 139Z" fill="#a36f64" opacity=".22"/>`;
  for (const cx of [79, 121]) {
    svg += `<ellipse cx="${cx}" cy="${eyeY}" rx="${eyeW}" ry="${eyeH}" fill="#fff4ed"/><ellipse cx="${cx}" cy="${eyeY+1}" rx="${5.4+e*1.2}" ry="${eyeH-.5}" fill="${eye}"/><ellipse cx="${cx}" cy="${eyeY+1}" rx="2.7" ry="${eyeH-1}" fill="#25334e"/><circle cx="${cx-2}" cy="${eyeY-3}" r="2.4" fill="white"/><path d="M${cx-eyeW} ${eyeY}Q${cx} ${eyeY-eyeH*1.7} ${cx+eyeW} ${eyeY-1}" fill="none" stroke="#313044" stroke-width="${1.8+(a.eyes%4)*.3}"/><path d="M${cx-11} ${eyeY-14+browSlope}Q${cx} ${eyeY-17-(a.eyebrows%4)} ${cx+10} ${eyeY-14-browSlope}" stroke="${hair}" stroke-width="${1.3+(a.eyebrows%8)*.22}" fill="none" stroke-linecap="round"/>`;
  }
  svg += `<path d="M100 100l${-1-a.nose*.1} ${7+a.nose*.15}l4 1" fill="none" stroke="#986e63" stroke-width=".9" opacity=".65"/><path d="M${100-mouthW} 119Q100 ${119+(a.mouth-15)*.18} ${100+mouthW} 119" fill="none" stroke="#a66870" stroke-width="${1+a.mouth*.025}" stroke-linecap="round"/><ellipse cx="69" cy="109" rx="9" ry="3" fill="#d88f94" opacity=".2"/><ellipse cx="131" cy="109" rx="9" ry="3" fill="#d88f94" opacity=".2"/>`;
  // Eight fringe cuts × four back silhouettes yield 32 distinct hairstyles.
  for (let i=0;i<5;i++) {
    const x = 52+i*19, tip = 63+((i*7+fringe*9)%33);
    svg += `<path d="M${x} 49Q${x+8} 33 ${x+28} 48Q${x+22} ${tip-3} ${x+7} ${tip}L${x+10} 57Z" fill="${hair}" stroke="#283146" stroke-width=".7"/>`;
  }
  svg += `<path d="M56 80Q53 52 78 43M111 43Q139 43 144 75" fill="none" stroke="#fff" stroke-width="3" opacity=".16"/><path d="M87 150L100 166L113 150L${100+build} 160Q155 176 159 240H41Q45 176 ${100-build} 160Z" fill="#344762" stroke="#1d2b43" stroke-width="2"/><path d="M87 150L100 166L113 150L123 159L108 184H92L77 159Z" fill="#e7e8ed"/><path d="M96 166H104L108 184L100 211L92 184Z" fill="${eye}"/><path d="M${100-build} 162L59 194L79 218M${100+build} 162L141 194L121 218" fill="none" stroke="#aabacb" stroke-width="2"/><path d="M47 213H74M126 213H153" stroke="${eye}" stroke-width="4"/><circle cx="132" cy="190" r="5" fill="${eye}"/></svg>`;
  return svg;
}
export function journal(s, p) {
  s.playerJournals ??= {};
  const id = String(p.id);
  if (!Object.hasOwn(s.playerJournals, id)) s.playerJournals[id] = { name: p.name, story: "", memo: "", events: [] };
  const j = s.playerJournals[id];
  j.events ??= [];
  return j;
}
export function writeJournal(s, p, field, text) {
  if (!["story", "memo"].includes(field)) throw Error("기록 항목이 올바르지 않습니다.");
  if (typeof text !== "string" || text.length > 4000) throw Error("기록은 4,000자까지 작성할 수 있습니다.");
  const j = journal(s, p);
  j[field] = text;
  j.updated = { season: s.season, day: s.day };
  return j;
}
export function recordMoment(s, p, kind, text) {
  const j = journal(s, p);
  const key = `${s.season}:${s.day}:${kind}:${text}`;
  if (!j.events.some(e => e.key === key)) j.events.unshift({ key, season: s.season, day: s.day, kind, text });
  j.events = j.events.slice(0, 100);
}
export function background(p) {
  const origins = ["지역 체육관에서 기본기를 다지며", "도시 아마추어 리그에서 경험을 쌓으며", "구단 공개 테스트를 준비하며", "여러 종목을 거쳐 아레나에 도전하며", "동료들과 작은 팀을 꾸려 경쟁하며", "개인 코치와 꾸준히 훈련하며", "지역 대회에 참가하며", "훈련 파트너와 실전을 연구하며"];
  const goals = ["오랫동안 기억되는 선수가 되는 것", "팀이 믿고 맡길 수 있는 선수가 되는 것", "자신만의 전투 스타일을 완성하는 것", "가장 큰 무대에서 실력을 증명하는 것", "어려운 경기에서도 동료를 지키는 것", "꾸준한 출전으로 한계를 넘어서는 것", "차세대 선수들에게 좋은 본보기가 되는 것", "중요한 순간 팀의 승리를 이끄는 것"];
  const seed = hash(`${p.id}:${p.name}:background`);
  return `${p.country} 출신. ${origins[seed % 8]} 자신의 길을 찾아왔다. 현재 목표는 ${goals[(seed >>> 8) % 8]}이다.`;
}

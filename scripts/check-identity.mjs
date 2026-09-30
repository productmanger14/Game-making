import assert from 'node:assert/strict';
import { createWorld, player } from '../dist/engine.js';
import { createCareer, migrateCareer, nextSeason } from '../dist/career.js';
import { appearanceParts, ensureIdentity, portraitSVG, journal, writeJournal, recordMoment, background } from '../dist/identity.js';
import { clubRoster, leagueId } from '../dist/world.js';
const s = createCareer({ country:'한국', city:'서울', club:'기록 구단', manager:'감독', age:30 }, 2468);
const p = s.players[0], seed = s.seed;
const original = structuredClone(ensureIdentity(p));
assert.equal(s.seed, seed);
assert.equal(portraitSVG(p), portraitSVG(p));
assert.ok(!/#[0-9a-f]*\./i.test(portraitSVG(p)), "valid hex colors");
assert.ok(!/NaN|undefined/.test(portraitSVG(p)), "valid SVG values");
const legacy = structuredClone(p); delete legacy.appearance.design;
assert.deepEqual(ensureIdentity(legacy), original);
const sample = { seed: 23456, nextId: 1, season: 2026 };
const distribution = Object.fromEntries(appearanceParts.map(k=>[k,new Set()]));
for(let i=0;i<4000;i++) {
 const candidate=player(sample);
 for(const k of appearanceParts) distribution[k].add(candidate.appearance.design[k]);
}
for(const k of appearanceParts) assert.equal(distribution[k].size, 32, k);
for(const k of appearanceParts) {
 const svgs = new Set(Array.from({length:32}, (_, i) => portraitSVG({...p, appearance:{ ...p.appearance, design:{...original, [k]:i}}})));
 assert.equal(svgs.size, 32, `${k} must affect rendering`);
}
writeJournal(s,p,'story','어릴 때부터 라이벌과 경쟁했다.');
writeJournal(s,p,'memo','다음 시즌 주장 후보\n<script>alert(1)</script>');
recordMoment(s,p,'영입','구단에 합류했다.');
recordMoment(s,p,'영입','구단에 합류했다.');
assert.equal(journal(s,p).events.length,1);
assert.throws(()=>writeJournal(s,p,'bad','x'));
assert.throws(()=>writeJournal(s,p,'memo','x'.repeat(4001)));
const migrated=migrateCareer(JSON.parse(JSON.stringify(s)));
assert.deepEqual(journal(migrated,migrated.players[0]), journal(s,p));
assert.deepEqual(migrated.players[0].appearance.design,original);
const other=s.players[1]; assert.equal(journal(s,other).memo,'');
// State-owned notes survive object regeneration for foreign rosters.
const foreign=clubRoster(s,leagueId('일본'),0)[0];
writeJournal(s,foreign,'memo','해외 관찰 대상');
const resumed=migrateCareer(JSON.parse(JSON.stringify(s)));
const foreignAgain=clubRoster(resumed,leagueId('일본'),0)[0];
assert.equal(journal(resumed,foreignAgain).memo,'해외 관찰 대상');
assert.deepEqual(foreignAgain.appearance.design,foreign.appearance.design);
// Moving the same player preserves the journal and design.
s.players=s.players.filter(x=>x.id!==p.id); s.market.push(p); p.team=-1;
assert.equal(journal(s,p).story,'어릴 때부터 라이벌과 경쟁했다.');
s.market=s.market.filter(x=>x.id!==p.id); s.opponentSquads[1].push(p); p.team=1;
assert.equal(journal(s,p).events[0].kind,'영입');
assert.deepEqual(p.appearance.design,original);
for(let i=0;i<120;i++) { s.day=i; recordMoment(s,p,'대화',`대화 ${i}`); }
assert.equal(journal(s,p).events.length,100);
assert.equal(journal(s,p).events[0].text,'대화 119');
assert.equal(background(p),background({...p,age:p.age+1}));
console.log(JSON.stringify({passed:true,checks:['32-options-per-part','32-rendered-variants-per-part','deterministic-no-rng-consumption','legacy-migration','save-reload','foreign-object-regeneration','transfer-continuity','deduplicated-bounded-timeline','memo-limit']}));

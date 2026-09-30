import assert from 'node:assert/strict';
import {createCareer,beginSeries,prepareSet,completeSet,suggestLineup,migrateCareer} from '../dist/career.js';
import {journal} from '../dist/identity.js';
const s=createCareer({country:'한국',city:'서울',club:'검증',manager:'감독',age:30},22);
s.day=s.fixtureDays[0];const series=beginSeries(s);
const b=prepareSet(s,series,suggestLineup(s,0,series.rosters[0]),{tactic:'균형',formation:'균형',target:'가까운 적'});
const u=b.alive(0)[0]; u.kills=3;u.flagReturns=2;u.carrierStops=1;
b.done=true;b.winner=0;completeSet(s,series,b);
const p=s.players.find(p=>p.id===u.id);
assert.ok(journal(s,p).events.some(e=>e.kind==='경기' && e.text.includes('운반자 저지 1회')));
assert.equal(series.lastSetReport.find(r=>r.name===p.name).returns,2);
const restored=migrateCareer(JSON.parse(JSON.stringify(s)));
assert.deepEqual(restored.matchSeries.reports,series.reports);
assert.deepEqual(restored.playerJournals,s.playerJournals);
for(const w of [0,0]) {
 const next=prepareSet(s,series,suggestLineup(s,series.mode,series.rosters[0]),{tactic:'균형',formation:'균형',target:'가까운 적'});
 next.done=true;next.winner=w;completeSet(s,series,next);
}
assert.equal(s.lastMatch.reports.length,3);
assert.ok(s.lastMatch.reports[0].players.some(r=>r.stops===1));
console.log(JSON.stringify({passed:true,checks:['match-journal','contribution-report','save-resume-reports','final-match-report']}));

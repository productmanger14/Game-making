import assert from 'node:assert/strict';
import {createWorld,enemyRoster,Battle,finishFixture,nextFixture,uniques,advance} from '../dist/engine.js';
assert.equal(uniques.length,100);
assert.deepEqual(createWorld(1234),createWorld(1234));
const summaries=[];
for(let seed=1;seed<=12;seed++){
 const state=createWorld(seed),opponents=enemyRoster(state);
 for(let mode=0;mode<5;mode++){
  const match=new Battle([state.players,opponents],mode,seed,'균형',['city','forest','snow','mountain'][seed%4]);
  for(let i=0;i<=Math.ceil(match.mode.time/.5)&&!match.done;i++)match.step(.5);
  assert.ok(match.done);assert.ok([0,1].includes(match.winner));
  assert.ok(match.time<=3600);
  assert.ok(match.units.every(u=>Number.isFinite(u.x)&&Number.isFinite(u.z)&&u.hp>=0&&u.hp<=100));
  if(mode===2){assert.equal(match.time,3600);assert.deepEqual(match.scores,[0,1].map(t=>match.units.filter(u=>u.team===t).reduce((n,u)=>n+u.kills,0)));}
  summaries.push({seed,mode,winner:match.winner,time:match.time});
 }
 for(let r=0;r<14;r++)finishFixture(state,[3,r%3]);
 assert.equal(nextFixture(state),null);
 assert.ok(state.table.every(t=>t.played===14));
 advance(state,1300);
 assert.equal(new Set(state.usedUniques).size,state.usedUniques.length);
 assert.equal(state.usedUniques.length,100);
}
console.log(JSON.stringify({passed:true,simulations:summaries.length,completeSeasons:12,uniqueSchedulesValidated:12}));

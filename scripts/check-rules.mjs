import assert from 'node:assert/strict';
import {createWorld,enemyRoster,Battle,modes,DEATHMATCH_RESPAWN,FLAG_PICKUP_TIME} from '../dist/engine.js';
const state=createWorld(77),rosters=[state.players,enemyRoster(state)];
assert.deepEqual(modes.map(m=>m.time),[3600,3600,600,3600,3600]);
assert.equal(DEATHMATCH_RESPAWN,30);
assert.equal(FLAG_PICKUP_TIME,10);
const capture=()=>{const b=new Battle(rosters,1,77);for(const u of b.units){u.x=0;u.z=24;}return b;};
const pickup=(b,u,flag)=>{u.x=flag.x;u.z=flag.z;b.updateFlags();assert.equal(u.flagId,null);b.time+=10;b.updateFlags();assert.equal(u.flagId,flag.id);};
const b=capture(),runner=b.alive(0)[0],defender=b.alive(1)[0];
assert.equal(b.flags.length,6);assert.equal(b.flags.filter(f=>f.team===0).length,3);assert.equal(b.flags.filter(f=>f.team===1).length,3);
const enemyFlags=b.flags.filter(f=>f.team===1),first=enemyFlags[0];
runner.x=first.home.x;runner.z=first.home.z;b.updateFlags();
assert.equal(runner.flagId,null);assert.equal(first.claimantId,runner.id);
b.time=9.99;b.updateFlags();assert.equal(runner.flagId,null,'10 seconds must elapse before pickup');
b.time=10;b.updateFlags();assert.equal(runner.flagId,first.id);assert.equal(first.carrierId,runner.id);assert.equal(b.scores[0],0,'Pickup must not award a capture');
runner.x=enemyFlags[1].home.x;runner.z=enemyFlags[1].home.z;b.updateFlags();
assert.equal(enemyFlags[1].carrierId,null,'One flag per carrier');
b.dropFlag(runner);assert.equal(runner.flagId,null);assert.ok(first.dropped);assert.equal(first.carrierId,null);
runner.x=0;runner.z=24;defender.x=first.x;defender.z=first.z;b.updateFlags();
assert.equal(first.dropped,false);assert.deepEqual({x:first.x,z:first.z},first.home,'Own flag returns to original point');
defender.x=0;defender.z=24;
for(const flag of enemyFlags){pickup(b,runner,flag);runner.x=b.bases[0].x;runner.z=b.bases[0].z;b.updateFlags();assert.equal(flag.capturedBy,0);assert.equal(runner.flagId,null);}
assert.deepEqual(b.scores,[3,0]);assert.equal(b.winner,0);assert.ok(b.done);assert.equal(runner.objectives,3);
const interrupted=capture(),thief=interrupted.alive(0)[0],f=interrupted.flags[3];
thief.x=f.x;thief.z=f.z;interrupted.updateFlags();interrupted.time=8;
thief.x-=1;interrupted.updateFlags();assert.equal(thief.flagId,null);assert.equal(f.claimStartedAt,8,'Movement restarts the stationary timer even inside the pickup radius');
interrupted.time=10;interrupted.updateFlags();assert.equal(thief.flagId,null);
thief.x=0;interrupted.updateFlags();assert.equal(f.claimantId,null);
thief.x=f.x;interrupted.time=11;interrupted.updateFlags();thief.alive=false;interrupted.time=21;interrupted.updateFlags();assert.equal(f.carrierId,null);assert.equal(f.claimantId,null);
const waiting=capture(),stationary=waiting.alive(0)[0],wf=waiting.flags[3];
for(const u of waiting.units) u.alive=u===stationary;
stationary.captureRole='runner';stationary.lane=0;stationary.x=wf.x;stationary.z=wf.z;waiting.updateFlags();
for(let i=0;i<19;i++) waiting.step(.5);
assert.equal(stationary.flagId,null);assert.equal(stationary.x,wf.home.x);assert.equal(stationary.z,wf.home.z);
waiting.step(.5);assert.equal(stationary.flagId,wf.id,'AI remains still for the whole ten seconds');
const recovery=capture(),carrier=recovery.alive(0)[0];pickup(recovery,carrier,recovery.flags[3]);carrier.alive=false;recovery.updateFlags();assert.ok(recovery.flags[3].dropped);assert.equal(carrier.flagId,null);
// A teammate cannot skip a fallen carrier's pickup timer.
const dropped=capture(),c=dropped.alive(0)[0];pickup(dropped,c,dropped.flags[3]);dropped.dropFlag(c);dropped.updateFlags();assert.equal(c.flagId,null);dropped.time+=9.9;dropped.updateFlags();assert.equal(c.flagId,null);dropped.time+=.1;dropped.updateFlags();assert.equal(c.flagId,dropped.flags[3].id);
for(const team of [0,1]) {
 const intercept=capture(),guard=intercept.alive(team)[0],enemyCarrier=intercept.alive(1-team)[0],decoy=intercept.alive(1-team)[1];
 for(const u of intercept.units){u.alive=[guard,enemyCarrier,decoy].includes(u);u.cooldown=999;}
 guard.p.weapon=0;guard.x=team===0?-15:15;guard.z=0;guard.captureRole='runner';guard.behavior='hold';
 enemyCarrier.x=0;enemyCarrier.z=0;enemyCarrier.captureRole='runner';
 decoy.x=guard.x;decoy.z=2;
 const stolen=intercept.flags.find(f=>f.team===team);stolen.carrierId=enemyCarrier.id;enemyCarrier.flagId=stolen.id;
 const dest=intercept.interceptDestination(guard,enemyCarrier);const oldDistance=Math.hypot(dest.x-guard.x,dest.z-guard.z);
 intercept.instructions.target='약한 적';decoy.hp=1;
 intercept.step(.5);
 assert.equal(guard.targetId,enemyCarrier.id,'Carrier priority overrides a nearer weak enemy and hold/runner styles');
 assert.ok(Math.hypot(dest.x-guard.x,dest.z-guard.z)<oldDistance,'Defender actively intercepts');
 assert.ok(dest.x*(team===0?1:-1)>0,'Intercept leads the carrier toward its destination');
}
const empty=capture();for(const u of empty.units.filter(u=>u.team===1)){u.alive=false;u.hp=0;}empty.step(.5);assert.equal(empty.done,false,'Capture requires flags, not elimination');
const timeout=capture();timeout.time=3599.75;timeout.scores=[1,2];timeout.step(.5);assert.equal(timeout.time,3600);assert.equal(timeout.winner,1);
const dm=new Battle(rosters,2,12),dead=dm.units[0];dead.alive=false;dead.hp=0;dead.respawn=30;
dm.time=29;dm.step(.5);assert.equal(dead.alive,false);dm.step(.5);assert.equal(dm.time,30);assert.equal(dead.alive,true);assert.equal(dead.hp,100);
const kills=new Battle(rosters,2,12);kills.time=599.75;kills.scores=[5,6];for(const u of kills.units){u.cooldown=999;u.x=u.team===0?-30:30;}kills.step(.5);assert.equal(kills.time,600);assert.equal(kills.winner,1,'Higher kill count wins, regardless of health');
// Both kings evade, even with assault styles and an aggressive team tactic.
for(const team of [0,1]) {
 const k=new Battle(rosters,3,90,'공격');const king=k.alive(team).find(u=>u.king),enemy=k.alive(1-team).find(u=>u.king);
 for(const u of k.units){u.alive=[king,enemy].includes(u);u.cooldown=999;}
 king.x=team===0?-15:15;king.z=0;king.behavior='assault';enemy.x=king.x+(team===0?6:-6);enemy.z=0;
 const before=Math.hypot(king.x-enemy.x,king.z-enemy.z);
 k.step(.5);assert.ok(Math.hypot(king.x-enemy.x,king.z-enemy.z)>before,'King retreats rather than charging');
 const point=k.kingDestination({...king,x:-33,z:23},[{...enemy,x:-30,z:20}]);
 assert.ok(point.x>-33||point.z<23,'Cornered king has an escape route');
 const safe=k.kingDestination({...king,x:-30,z:0},[{...enemy,x:30,z:0,p:{...enemy.p,weapon:0}}]);
 assert.deepEqual(safe,{x:-30,z:0},'Safe king stays away instead of starting a charge');
}
console.log(JSON.stringify({passed:true,checks:['ten-second-stationary-pickup','movement-and-death-interruption','AI-holds-position','dropped-flag-timer','carrier-priority-both-teams','route-interception','king-evasion-both-teams','corner-escape','safe-king-holds','six-flags','base-delivery','three-capture-win','carrier-out','60-minute-capture-cap','10-minute-deathmatch','30-second-respawn','kill-priority']}));

// The objective must still finish when every original runner is gone.
const fallback = capture();
for (const u of fallback.units) u.alive = u.team === 0 && u.captureRole === 'defender';
assert.ok(fallback.alive(0).length > 0);
assert.ok(fallback.captureRunners(0).length > 0);
for (let i=0;i<1200 && !fallback.done;i++) fallback.step(.5);
assert.ok(fallback.done, 'Surviving defenders deliver all flags after enemy elimination');
assert.equal(fallback.winner,0); assert.equal(fallback.scores[0],3);
const roles = capture();
roles.tactic='공격'; const attackCount=roles.captureRunners(0).length;
roles.tactic='수비'; assert.ok(roles.captureRunners(0).length < attackCount);
for(const u of roles.alive(0)) if(u.captureRole==='runner') u.alive=false;
assert.ok(roles.captureRunners(0).every(u=>u.captureRole==='defender'));
console.log(JSON.stringify({passed:true,checks:['defender-objective-fallback','runner-reassignment','tactic-role-balance']}));

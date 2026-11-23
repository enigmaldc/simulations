import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compile,atTime,initialState,sampleTrace} from './model.mjs';
const p=(angle,phase=0,axis='xy',duration=40,shape='square')=>({angle,phase,axis,duration,shape});
const run=(pulses,extra={})=>compile({theta:0,phi:0,detuning:0,pulses,...extra});
const near=(a,b,tol=1e-9)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<tol,`${a} != ${b}`));
test('initial states and pi / pi-half rotation conventions',()=>{
  near(initialState(90,90),[0,1,0]);near(run([p(180)]).final,[0,0,-1]);
  near(run([p(90)]).final,[0,-1,0]);near(run([p(90,90)]).final,[1,0,0]);
  near(run([p(90,0,'z')],{theta:90}).final,[0,1,0]);
});
test('pulse shapes and durations preserve resonant pulse area',()=>{
  for(const shape of ['square','gaussian','sine'])for(const duration of [1,40,10000])near(run([p(90,0,'xy',duration,shape)]).final,[0,-1,0]);
});
test('chains compose in order and rotations do not commute',()=>{
  near(run([p(90),p(90),p(90),p(90)]).final,[0,0,1]);
  near(run([p(90),p(-90)]).final,[0,0,1]);
  near(run([p(90),p(90,0,'z')]).final,[1,0,0]);
  near(run([p(90,0,'z'),p(90)]).final,[0,-1,0]);
});
test('detuned waits precess and resonant waits preserve state',()=>{
  near(run([p(0,0,'wait',250)],{theta:90,detuning:1}).final,[0,1,0]);
  near(run([p(0,0,'wait',250)],{theta:73,phi:123}).final,initialState(73,123));
});
test('scrubbing matches endpoints, boundaries, and preserves norm',()=>{
  const a=run([p(90,23,'xy',37,'gaussian'),p(0,0,'wait',60),p(180,90,'xy',40,'sine')],{theta:54,phi:32,detuning:2.5});
  near(atTime(a,0).r,a.initial);near(atTime(a,a.duration).r,a.final);
  near(atTime(a,37).r,run([p(90,23,'xy',37,'gaussian')],{theta:54,phi:32,detuning:2.5}).final);
  for(let t=0;t<a.duration;t+=.37)assert.ok(Math.abs(Math.hypot(...atTime(a,t).r)-1)<1e-10);
});
test('detuned rectangular pulse agrees with analytic tilted-axis rotation',()=>{
  // Equal x and z angular frequency: 180° about (x+z)/sqrt(2) sends north to +x.
  near(run([p(180/Math.sqrt(2),0,'xy',100)],{detuning:5/Math.sqrt(2)}).final,[1,0,0]);
});
test('empty chains and invalid parameters',()=>{
  near(atTime(run([]),100).r,[0,0,1]);
  assert.throws(()=>run([p(90,0,'xy',0)]));assert.throws(()=>run([p(NaN)]));
  assert.throws(()=>run(Array.from({length:33},()=>p(90))));
});
test('trajectory sampling resolves all 6400 zero crossings in the longest detuned wait sequence',()=>{
  const a=run(Array.from({length:32},()=>p(0,0,'wait',10000)),{theta:90,detuning:10});
  const samples=sampleTrace(a);
  const crossings=samples.slice(1).reduce((sum,s,i)=>sum+(s.r[0]*samples[i].r[0]<0?1:0),0);
  assert.equal(crossings,6400);
  for(const segment of a.segments)assert.ok(samples.some(s=>s.t===segment.start));
  near(samples.at(-1).r,a.final);
});

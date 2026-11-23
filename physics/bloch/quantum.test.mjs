import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compile,atTime} from './model.mjs';
import {prepareMath,ketAtTime,ketToBloch,apply,unitary,initialKet} from './quantum.mjs';
const near=(a,b,tol=1e-9)=>a.flat(Infinity).forEach((v,i)=>assert.ok(Math.abs(v-b.flat(Infinity)[i])<tol,`${a} != ${b}`));
const p=(angle,phase=0,axis='xy',shape='square',duration=40)=>({angle,phase,axis,shape,duration});
test('X pi and pi/2 preserve the correct complex amplitudes and global phase',()=>{
  near(apply(unitary([Math.PI/2,0,0],1),initialKet(0,0)),[[Math.SQRT1_2,0],[0,-Math.SQRT1_2]]);
  const run=compile({theta:0,phi:0,detuning:0,pulses:[p(180)]});
  near(prepareMath(run,0,0).final,[[0,0],[0,-1]]);
});
test('amplitudes agree with Bloch dynamics at intermediate times for all pulse shapes and axes',()=>{
  for(const detuning of [0,2.5,-3])for(const shape of ['square','gaussian','sine']){
    const run=compile({theta:61,phi:123,detuning,pulses:[p(90,45,'xy',shape),p(0,0,'wait',shape,73),p(-123,0,'z',shape),p(180,90,'xy',shape)]});
    const math=prepareMath(run,61,123);
    for(let t=0;t<=run.duration;t+=1.37)near(ketToBloch(ketAtTime(run,math,t)),atTime(run,t).r);
    near(ketToBloch(math.final),run.final);
    for(const s of run.segments)near(apply(s.math.u,s.math.before),s.math.after);
  }
});
test('four pi/2 pulses return minus the initial ket; empty sequence stays unchanged',()=>{
  const run=compile({theta:90,phi:90,detuning:0,pulses:Array.from({length:4},()=>p(90))});
  near(prepareMath(run,90,90).final,initialKet(90,90).map(c=>c.map(v=>-v)));
  const empty=compile({theta:33,phi:70,detuning:0,pulses:[]}), math=prepareMath(empty,33,70);
  near(ketAtTime(empty,math,0),initialKet(33,70));
});

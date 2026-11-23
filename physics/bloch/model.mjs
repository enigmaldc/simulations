// Bloch-vector dynamics in the rotating frame. Time: ns; detuning: MHz.
export const TAU = 2 * Math.PI;
export function initialState(theta, phi) {
  const t = theta * Math.PI / 180, p = phi * Math.PI / 180;
  return [Math.sin(t) * Math.cos(p), Math.sin(t) * Math.sin(p), Math.cos(t)];
}
export function rotate(r, omega, dt) {
  const mag = Math.hypot(...omega);
  if (!mag || !dt) return [...r];
  const n = omega.map(v => v / mag), a = mag * dt, c = Math.cos(a), s = Math.sin(a);
  const dot = n.reduce((sum, v, i) => sum + v * r[i], 0);
  const cross = [n[1]*r[2]-n[2]*r[1], n[2]*r[0]-n[0]*r[2], n[0]*r[1]-n[1]*r[0]];
  return r.map((v, i) => v*c + cross[i]*s + n[i]*dot*(1-c));
}
export function envelope(shape, u) {
  if (shape === 'gaussian') return Math.exp(-0.5 * ((u - 0.5) / 0.16) ** 2);
  if (shape === 'sine') return Math.sin(Math.PI * u) ** 2;
  return 1;
}
export function compile({theta, phi, detuning, pulses}) {
  if (![theta, phi, detuning].every(Number.isFinite) || theta < 0 || theta > 180 || Math.abs(detuning) > 10)
    throw new Error('Ungültiger Anfangszustand oder Verstimmung.');
  if (!Array.isArray(pulses) || pulses.length > 32) throw new Error('Maximal 32 Pulse.');
  const delta = TAU * detuning / 1000;
  let r = initialState(theta, phi), time = 0;
  const steps = [], segments = [];
  for (const [index, pulse] of pulses.entries()) {
    if (!['xy','z','wait'].includes(pulse.axis) || !['square','gaussian','sine'].includes(pulse.shape) ||
        ![pulse.angle, pulse.phase, pulse.duration].every(Number.isFinite) || pulse.duration < 1 || pulse.duration > 10000 || Math.abs(pulse.angle)>1440)
      throw new Error('Pulsdauer: 1–10000 ns; Winkel: −1440° bis 1440°.');
    const start = time, angle = pulse.angle * Math.PI / 180;
    const n = Math.max(256, Math.ceil(Math.abs(delta * pulse.duration) * 24));
    const dt = pulse.duration / n;
    const weights = Array.from({length:n}, (_, i) => envelope(pulse.shape, (i+0.5)/n));
    const area = weights.reduce((a,b) => a+b, 0) * dt;
    const phase = pulse.phase * Math.PI / 180;
    const axis = pulse.axis === 'z' ? [0,0,1] : [Math.cos(phase),Math.sin(phase),0];
    for (let i=0; i<n; i++) {
      const drive = pulse.axis === 'wait' ? 0 : angle * weights[i] / area;
      const omega = axis.map((v,j) => v*drive + (j===2 ? delta : 0));
      const t = start + i*dt;
      steps.push({t, dt, r, omega, index, drive});
      r = rotate(r, omega, dt);
    }
    time = start + pulse.duration;
    segments.push({start, end:time, index, pulse});
  }
  return {steps, segments, duration:time, initial:initialState(theta,phi), final:r};
}
export function atTime(run, time) {
  if (!run.steps.length) return {r:run.initial, index:-1, drive:0, omega:[0,0,0]};
  if (time >= run.duration) return {r:run.final, index:-1, drive:0, omega:[0,0,0]};
  const t = Math.max(0,time);
  let lo=0, hi=run.steps.length-1;
  while (lo<hi) { const mid=Math.ceil((lo+hi)/2); if(run.steps[mid].t<=t)lo=mid;else hi=mid-1; }
  const step=run.steps[lo];
  return {...step, r:rotate(step.r,step.omega,Math.min(step.dt,t-step.t))};
}
// Sample both elapsed time and accumulated rotation to avoid aliasing long,
// rapidly precessing sequences. Keep pulse boundaries in plots and exports.
export function sampleTrace(run) {
  const trace=[];
  let rotation=0,lastTime=-Infinity,lastIndex=-1;
  for(const step of run.steps){
    if(step.index!==lastIndex||step.t-lastTime>=run.duration/1800||rotation>=0.2){
      trace.push({t:step.t,r:step.r});lastTime=step.t;lastIndex=step.index;rotation=0;
    }
    rotation+=Math.hypot(...step.omega)*step.dt;
  }
  trace.push({t:run.duration,r:run.final});
  return trace;
}

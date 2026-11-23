// Complex amplitudes retain global phase, unlike a Bloch vector.
export const add = (a,b) => [a[0]+b[0],a[1]+b[1]];
export const mul = (a,b) => [a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
export const identity = () => [[1,0],[0,0],[0,0],[1,0]];
export const apply = (u,p) => [add(mul(u[0],p[0]),mul(u[1],p[1])),add(mul(u[2],p[0]),mul(u[3],p[1]))];
export function compose(a,b) {
  return [0,1,2,3].map(i=>{const row=Math.floor(i/2)*2,col=i%2;return add(mul(a[row],b[col]),mul(a[row+1],b[col+2]));});
}
export function unitary(omega,dt) {
  const mag=Math.hypot(...omega);
  if(!mag||!dt)return identity();
  const c=Math.cos(mag*dt/2),s=Math.sin(mag*dt/2)/mag,[x,y,z]=omega;
  return [[c,-z*s],[-y*s,-x*s],[y*s,-x*s],[c,z*s]];
}
export function initialKet(theta,phi) {
  const t=theta*Math.PI/360,p=phi*Math.PI/180;
  return [[Math.cos(t),0],[Math.sin(t)*Math.cos(p),Math.sin(t)*Math.sin(p)]];
}
export function prepareMath(run,theta,phi) {
  let psi=initialKet(theta,phi),u=identity(),index=-1,before=psi;
  for(const step of run.steps) {
    if(step.index!==index){index=step.index;u=identity();before=psi;}
    step.psi=psi;
    const v=unitary(step.omega,step.dt);
    psi=apply(v,psi);u=compose(v,u);
    run.segments[index].math={before,after:psi,u};
  }
  return {initial:initialKet(theta,phi),final:psi};
}
export function ketAtTime(run,math,time) {
  if(time>=run.duration)return math.final;
  if(time<=0||!run.steps.length)return math.initial;
  let lo=0,hi=run.steps.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(run.steps[mid].t<=time)lo=mid;else hi=mid-1;}
  const s=run.steps[lo];
  return apply(unitary(s.omega,Math.min(s.dt,time-s.t)),s.psi);
}
export function ketToBloch([a,b]) {
  return [2*(a[0]*b[0]+a[1]*b[1]),2*(a[0]*b[1]-a[1]*b[0]),a[0]**2+a[1]**2-b[0]**2-b[1]**2];
}

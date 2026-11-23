import {compile, atTime, TAU} from './model.mjs';
import {buildMath,updateMath} from './maths-view.mjs';
const $ = id => document.getElementById(id);
const colors = ['#237f70','#467fbc','#ad6b31'];
let config = {theta:0,phi:0,detuning:0,pulses:[]}, run, time=0, playing=false, lastFrame=0;
let yaw=-0.65, pitch=0.30, drag=null, trace=[];
const chartCache=document.createElement('canvas');
let chartDirty=true, math;
const pulse = (angle=180,phase=0,duration=40,axis='xy') => ({angle,phase,duration,axis,shape:'square'});
const examples = {
  inversion: {detuning:0,pulses:[pulse()]},
  superposition: {detuning:0,pulses:[pulse(90,90)]},
  ramsey: {detuning:2.5,pulses:[pulse(90,0,20),pulse(0,0,200,'wait'),pulse(90,0,20)]},
  echo: {detuning:2.5,pulses:[pulse(90,0,10),pulse(0,0,100,'wait'),pulse(180,90,10),pulse(0,0,100,'wait'),pulse(90,0,10)]},
  identity: {detuning:0,pulses:Array.from({length:4},()=>pulse(90))}
};
function title(p) {
  if(p.axis==='wait')return 'Warten';
  const a=p.angle===180?'π':p.angle===90?'π/2':p.angle===-90?'−π/2':p.angle===-180?'−π':`${p.angle}°`;
  const axis=p.axis==='z'?'Z':p.phase===0?'X':p.phase===90?'Y':`XY ${p.phase}°`;
  return `${axis}(${a})`;
}
function stop(){playing=false;$('play').textContent='Abspielen';$('sphere-pause').disabled=true;}
function startPlayback(fromStart=false){
  if(!run.duration)return;
  if(fromStart||time>=run.duration)time=0;
  playing=true;$('play').textContent='Pause';$('sphere-pause').disabled=false;
  lastFrame=performance.now();render();
}
function rebuild() {
  stop(); time=0;
  try {run=compile(config);$('error').hidden=true;}
  catch(e){$('error').textContent=e.message;$('error').hidden=false;return;}
  const n=Math.min(1800,Math.max(500,config.pulses.length*100));
  chartDirty=true;
  // Include every pulse boundary, including those of very short pulses.
  const times=new Set(Array.from({length:n+1},(_,i)=>run.duration*i/n));
  run.segments.forEach(s=>{times.add(s.start);times.add(s.end);for(let i=1;i<48;i++)times.add(s.start+(s.end-s.start)*i/48);});
  trace=[...times].sort((a,b)=>a-b).map(t=>({t,r:atTime(run,t).r}));
  $('scrub').max=run.duration||1;$('scrub').disabled=!run.duration;
  $('pulse-count').textContent=`${config.pulses.length} / 32`;
  for(const id of ['add-pi','add-half','add-wait'])$(id).disabled=config.pulses.length>=32;
  for(const id of ['play','sphere-play','step','export'])$(id).disabled=!run.duration;
  $('theta-value').textContent=`${config.theta}°`;$('phi-value').textContent=`${config.phi}°`;
  for(const b of $('states').children)b.setAttribute('aria-pressed',String(+b.dataset.theta===config.theta&&(+b.dataset.phi===config.phi||config.theta===0||config.theta===180)));
  $('timeline').replaceChildren(...run.segments.map(s=>{const b=document.createElement('button');b.textContent=title(s.pulse);b.dataset.axis=s.pulse.axis;b.style.flex=`${s.end-s.start} 1 0`;b.title=`${s.index+1}. ${title(s.pulse)} · ${s.start}–${s.end} ns`;b.setAttribute('aria-label',b.title);b.onclick=()=>{stop();time=s.start;render();};return b;}));
  math=buildMath(run,config,title,t=>{stop();time=t;render();$('sphere').scrollIntoView({block:'center'});});
  render();
}
function renderPulses() {
  $('pulse-list').replaceChildren(...config.pulses.map((p,i)=>{
    const card=document.createElement('div');card.className='pulse';card.dataset.axis=p.axis;
    card.innerHTML=`<div class="pulse-top"><span class="pulse-title">${i+1}. ${title(p)}</span><div class="pulse-actions"><button data-action="up" aria-label="Puls ${i+1} nach oben" ${i===0?'disabled':''}>Hoch</button><button data-action="down" aria-label="Puls ${i+1} nach unten" ${i===config.pulses.length-1?'disabled':''}>Tief</button><button data-action="delete" aria-label="Puls ${i+1} entfernen">×</button></div></div><div class="pulse-fields"><label>Achse<select data-field="axis"><option value="xy">XY · Phase</option><option value="z">Z</option><option value="wait">Warten</option></select></label><label>Dauer (ns)<input data-field="duration" type="number" min="1" max="10000" step="1"></label><label>Winkel (°)<input data-field="angle" type="number" min="-1440" max="1440" step="1"></label><label>Phase (°)<input data-field="phase" type="number" min="-360" max="360" step="1"></label><label class="full">Pulsform<select data-field="shape"><option value="square">Rechteck</option><option value="gaussian">Gauss</option><option value="sine">sin²</option></select></label></div>`;
    for(const el of card.querySelectorAll('[data-field]')) {
      const field=el.dataset.field;el.value=p[field];
      el.required=true;
      el.setAttribute('aria-label',`Puls ${i+1}: ${el.parentElement.firstChild.textContent}`);
      el.disabled=(p.axis==='wait'&&['angle','phase','shape'].includes(field))||(p.axis==='z'&&field==='phase');
      el.addEventListener('change',()=>{
        if(!el.checkValidity()){el.reportValidity();el.value=p[field];return;}
        p[field]=['axis','shape'].includes(field)?el.value:Number(el.value);
        rebuild();renderPulses();
      });
    }
    for(const b of card.querySelectorAll('[data-action]'))b.onclick=()=>{
      const action=b.dataset.action;
      if(action==='delete')config.pulses.splice(i,1);
      else {const j=i+(action==='up'?-1:1);[config.pulses[i],config.pulses[j]]=[config.pulses[j],config.pulses[i]];}
      rebuild();renderPulses();
    };
    return card;
  }));
  if(!config.pulses.length){const p=document.createElement('p');p.className='hint';p.textContent='Dein Qubit ist bereit. Füge den ersten Puls hinzu.';$('pulse-list').append(p);}
  highlight();
}
function highlight(){const index=atTime(run,time).index;for(const [i,el]of [...$('pulse-list').children].entries())el.classList.toggle('active',i===index&&time<run.duration);}
function canvasContext(id) {
  const canvas=$(id), rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  const w=rect.width,h=rect.height;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  return {ctx,w,h};
}
function drawSphere(r) {
  const {ctx,w,h}=canvasContext('sphere'), scale=Math.min(w*.33,h*.36), cx=w/2,cy=h/2;
  const project=([x,y,z])=>{
    const a=x*Math.cos(yaw)-y*Math.sin(yaw), b=x*Math.sin(yaw)+y*Math.cos(yaw);
    return [cx+scale*a,cy-scale*(z*Math.cos(pitch)-b*Math.sin(pitch)),b*Math.cos(pitch)+z*Math.sin(pitch)];
  };
  const path=(points,color,width=1,dash=[])=>{ctx.beginPath();points.forEach((p,i)=>{const q=project(p);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);};
  const glow=ctx.createRadialGradient(cx-scale*.3,cy-scale*.3,0,cx,cy,scale);
  glow.addColorStop(0,'#ffffffaa');glow.addColorStop(1,'#dbe7d830');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,scale,0,TAU);ctx.fill();ctx.strokeStyle='#b6cbb8';ctx.lineWidth=1;ctx.stroke();
  for(const z of [-.5,0,.5]){
    const rad=Math.sqrt(1-z*z);
    for(let i=0;i<120;i++){
      const p=[rad*Math.cos(TAU*i/120),rad*Math.sin(TAU*i/120),z],q=[rad*Math.cos(TAU*(i+1)/120),rad*Math.sin(TAU*(i+1)/120),z];
      const back=project(p)[2]<0;path([p,q],back?'#c6d5c565':'#b8cbb9',z===0?1.2:.8,back?[2,3]:[]);
    }
  }
  for(let a=0;a<Math.PI;a+=Math.PI/4){const pts=Array.from({length:121},(_,i)=>[Math.sin(TAU*i/120)*Math.cos(a),Math.sin(TAU*i/120)*Math.sin(a),Math.cos(TAU*i/120)]);path(pts,'#c7d6c580',.8);}
  [[1,0,0],[0,1,0],[0,0,1]].forEach((v,i)=>{
    path([v.map(x=>-1.12*x),v.map(x=>1.18*x)],'#8ea494',1,[4,4]);
    const q=project(v.map(x=>x*1.29));ctx.fillStyle='#526d61';ctx.font='14px Segoe UI';ctx.textAlign='center';ctx.fillText(['x · |+⟩','y · |+i⟩','z · |0⟩'][i],q[0],q[1]+5);
  });
  const south=project([0,0,-1.2]);ctx.fillText('|1⟩',south[0],south[1]+8);
  // Future path is faint; elapsed trajectory is green.
  path(trace.map(s=>s.r),'#237f7026',2);
  const elapsed=trace.filter(s=>s.t<=time).map(s=>s.r);elapsed.push(r);path(elapsed,'#237f70',2.5);
  const start=project(run.initial);ctx.beginPath();ctx.arc(start[0],start[1],6,0,TAU);ctx.fillStyle='#bc8531';ctx.fill();ctx.strokeStyle='#fffef9';ctx.lineWidth=2;ctx.stroke();
  path([[0,0,0],r],'#176f61',3);
  const tip=project(r), origin=project([0,0,0]),a=Math.atan2(tip[1]-origin[1],tip[0]-origin[0]);
  ctx.beginPath();ctx.moveTo(tip[0],tip[1]);ctx.lineTo(tip[0]-13*Math.cos(a-.36),tip[1]-13*Math.sin(a-.36));ctx.lineTo(tip[0]-13*Math.cos(a+.36),tip[1]-13*Math.sin(a+.36));ctx.closePath();ctx.fillStyle='#176f61';ctx.fill();
  ctx.beginPath();ctx.arc(tip[0],tip[1],5,0,TAU);ctx.fill();
}
function drawChart(){
  const {ctx,w,h}=canvasContext('chart'), left=45,right=w-45,top=22,bottom=h-30,width=right-left;
  const x=t=>left+width*t/(run.duration||1), y=v=>top+(1-v)*(bottom-top)/2;
  const canvas=$('chart');
  const cached=!chartDirty&&chartCache.width===canvas.width&&chartCache.height===canvas.height;
  if(cached)ctx.drawImage(chartCache,0,0,w,h);
  else {
  ctx.font='12px Segoe UI';ctx.textAlign='right';
  for(const v of [-1,0,1]){ctx.strokeStyle='#e2e7dc';ctx.beginPath();ctx.moveTo(left,y(v));ctx.lineTo(right,y(v));ctx.stroke();ctx.fillStyle='#647773';ctx.fillText(v.toFixed(0),left-9,y(v)+4);}
  ctx.textAlign='center';for(let i=0;i<=4;i++){const t=run.duration*i/4;ctx.fillText(`${+t.toFixed(1)}`,x(t),h-7);}ctx.fillText('ns',w-15,h-7);
  const maxDrive=run.steps.reduce((m,s)=>Math.max(m,Math.abs(s.drive)*1000/TAU),1);
  ctx.fillStyle='#647773';ctx.textAlign='right';ctx.fillText('MHz',w-2,12);ctx.fillText(maxDrive.toFixed(1),w-2,top+4);ctx.fillText((-maxDrive).toFixed(1),w-2,bottom+4);
  // Draw every integration interval so even short pulses remain visible.
  ctx.beginPath();ctx.moveTo(left,y(0));
  for(const s of run.steps){const v=s.drive*1000/TAU/maxDrive;ctx.lineTo(x(s.t),y(v));ctx.lineTo(x(s.t+s.dt),y(v));}
  ctx.lineTo(right,y(0));ctx.closePath();ctx.fillStyle='#b6c7b633';ctx.fill();ctx.strokeStyle='#91a38b80';ctx.lineWidth=1;ctx.stroke();
  const plotSamples=trace;
  for(let k=0;k<3;k++){ctx.beginPath();plotSamples.forEach((s,i)=>{i?ctx.lineTo(x(s.t),y(s.r[k])):ctx.moveTo(x(s.t),y(s.r[k]));});ctx.strokeStyle=colors[k];ctx.lineWidth=1.9;ctx.stroke();}
  chartCache.width=canvas.width;chartCache.height=canvas.height;
  chartCache.getContext('2d').drawImage(canvas,0,0);chartDirty=false;
  }
  ctx.beginPath();ctx.moveTo(x(time),top-5);ctx.lineTo(x(time),bottom+5);ctx.strokeStyle='#233e3c';ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
}
function render(){
  if(!run)return;
  const state=atTime(run,time),r=state.r,p0=Math.max(0,Math.min(1,(1+r[2])/2)),theta=Math.acos(Math.max(-1,Math.min(1,r[2])))*180/Math.PI;
  const phi=(Math.atan2(r[1],r[0])*180/Math.PI+360)%360;
  $('p0').textContent=`${(p0*100).toFixed(1)} %`;$('p1').textContent=`${((1-p0)*100).toFixed(1)} %`;
  $('p0-bar').style.width=`${p0*100}%`;$('p1-bar').style.width=`${(1-p0)*100}%`;
  $('vector').textContent=r.map(v=>(Math.abs(v)<.0005?0:v).toFixed(3)).join(', ');
  $('angles').textContent=`θ = ${theta.toFixed(1)}° · φ ${Math.hypot(r[0],r[1])<1e-7?'am Pol unbestimmt':`= ${phi.toFixed(1)}°`}`;
  $('time').textContent=`${time.toFixed(1)} / ${run.duration} ns`;$('scrub').value=time;
  $('active').textContent=!run.duration?'Keine Pulse':time>=run.duration?'Folge abgeschlossen':`${state.index+1}. ${title(config.pulses[state.index])}`;
  highlight();drawSphere(r);drawChart();
  if(math)updateMath(run,math,time);
}
for(const id of ['theta','phi'])$(id).oninput=()=>{config[id]=+$(id).value;rebuild();};
$('detuning').onchange=()=>{if(!$('detuning').checkValidity()){$('detuning').reportValidity();$('detuning').value=config.detuning;return;}config.detuning=+$('detuning').value;rebuild();};
$('states').onclick=e=>{const b=e.target.closest('button');if(!b)return;config.theta=+b.dataset.theta;config.phi=+b.dataset.phi;$('theta').value=config.theta;$('phi').value=config.phi;rebuild();};
$('load-example').onclick=()=>{
  config={theta:0,phi:0,...structuredClone(examples[$('example').value])};
  $('theta').value=0;$('phi').value=0;$('detuning').value=config.detuning;rebuild();renderPulses();
};
for(const [id,p]of [['add-pi',pulse()],['add-half',pulse(90)],['add-wait',pulse(0,0,100,'wait')]])$(id).onclick=()=>{if(config.pulses.length>=32)return;config.pulses.push({...p});rebuild();renderPulses();$('pulse-list').lastElementChild.scrollIntoView({block:'nearest'});};
$('clear').onclick=()=>{config.pulses=[];rebuild();renderPulses();};
$('play').onclick=()=>{if(playing){stop();return;}startPlayback();};
$('sphere-play').onclick=()=>startPlayback(true);
$('sphere-pause').onclick=()=>stop();
$('reset').onclick=()=>{stop();time=0;render();};
$('step').onclick=()=>{stop();time=run.segments.find(s=>s.end>time+1e-7)?.end??run.duration;render();};
$('scrub').oninput=()=>{stop();time=+$('scrub').value;render();};
function chartSeek(e){const rect=$('chart').getBoundingClientRect();time=Math.max(0,Math.min(run.duration,(e.clientX-rect.left-45)/(rect.width-90)*run.duration));stop();render();}
$('chart').onpointerdown=e=>{$('chart').setPointerCapture(e.pointerId);chartSeek(e);};
$('chart').onpointermove=e=>{if($('chart').hasPointerCapture(e.pointerId))chartSeek(e);};
$('camera-reset').onclick=()=>{yaw=-.65;pitch=.30;render();};
$('sphere').onpointerdown=e=>{drag=[e.clientX,e.clientY];$('sphere').setPointerCapture(e.pointerId);};
$('sphere').onpointermove=e=>{if(!drag)return;yaw+=(e.clientX-drag[0])*.009;pitch=Math.max(-1.3,Math.min(1.3,pitch+(e.clientY-drag[1])*.009));drag=[e.clientX,e.clientY];render();};
$('sphere').onlostpointercapture=()=>{drag=null;};
$('sphere').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();yaw+=(e.key==='ArrowLeft'?-.1:e.key==='ArrowRight'?.1:0);pitch=Math.max(-1.3,Math.min(1.3,pitch+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0)));render();};
$('export').onclick=()=>{
  const rows=['# Bloch-Pulslabor; t in ns; Omega in MHz; rotating frame',`# theta_deg=${config.theta}; phi_deg=${config.phi}; detuning_MHz=${config.detuning}`,...config.pulses.map((p,i)=>`# pulse_${i+1}: axis=${p.axis}; angle_deg=${p.angle}; phase_deg=${p.phase}; duration_ns=${p.duration}; shape=${p.shape}`),'t_ns,x,y,z,P0,P1,pulse,Omega_MHz'];
  for(const s of trace){const a=atTime(run,s.t),[x,y,z]=a.r;rows.push([s.t,x,y,z,(1+z)/2,(1-z)/2,a.index+1,a.drive*1000/TAU].join(','));}
  const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='bloch-pulsfolge.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
new ResizeObserver(()=>render()).observe($('sphere'));
new ResizeObserver(()=>render()).observe($('chart'));
function frame(now){if(playing){const elapsed=Math.min(100,now-lastFrame);time+=elapsed/100*+$('speed').value;if(time>=run.duration){if($('loop').checked)time%=run.duration;else{time=run.duration;stop();}}render();}lastFrame=now;requestAnimationFrame(frame);}
$('load-example').click();requestAnimationFrame(frame);

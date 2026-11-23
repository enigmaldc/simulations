import {prepareMath,ketAtTime} from './quantum.mjs';
const $=id=>document.getElementById(id);
const number=x=>Math.abs(x)<.00005?'0':String(+x.toFixed(4)).replace('-','−');
export function complex([re,im]) {
  const r=number(re),v=number(Math.abs(im));
  if(v==='0')return r;
  const imag=v==='1'?'i':`${v}i`;
  return r==='0'?`${im<0?'−':''}${imag}`:`${r} ${im<0?'−':'+'} ${imag}`;
}
const matrix=(values,cols=2)=>`<span class="math-matrix ${cols===1?'ket-vector':''}" role="math" aria-label="${cols===1?'Zustandsvektor':'Matrix'}: ${values.map(complex).join('; ')}">${values.map(v=>`<span>${complex(v)}</span>`).join('')}</span>`;
const ket=p=>`(${complex(p[0])})|0⟩ + (${complex(p[1])})|1⟩`;
const product=(u,p,row)=>`(${complex(u[row*2])}) · (${complex(p[0])}) + (${complex(u[row*2+1])}) · (${complex(p[1])})`;
function probabilities(p){
  return p.map((v,i)=>`P(${i}) = |${i===0?'α':'β'}|² = (${number(v[0])})² + (${number(v[1])})² ≈ <b>${(100*(v[0]**2+v[1]**2)).toFixed(2)} %</b>`).join('<br>');
}
export function buildMath(run,config,title,seek) {
  const math=prepareMath(run,config.theta,config.phi);
  $('math-initial').innerHTML=`<p>Mit θ = ${config.theta}° und φ = ${config.phi}°:</p><div class="math-equation">|ψ₀⟩ = ${matrix(math.initial,1)} = <span>${ket(math.initial)}</span></div><p class="hint">Oben steht α, unten β. i² = −1; für eine komplexe Zahl a + bi gilt |a + bi|² = a² + b².</p>`;
  $('math-steps').replaceChildren(...run.segments.map((s,i)=>{
    const details=document.createElement('details');details.className='math-step';details.open=run.segments.length===1;
    const {u,before,after}=s.math;
    const analytical=config.detuning===0||s.pulse.axis!=='xy'||s.pulse.shape==='square';
    const angle=s.pulse.axis==='wait'?0:s.pulse.angle*Math.PI/180,phase=s.pulse.phase*Math.PI/180,delta=2*Math.PI*config.detuning*s.pulse.duration/1000;
    const vector=s.pulse.axis==='xy'?[angle*Math.cos(phase),angle*Math.sin(phase),delta]:[0,0,delta+(s.pulse.axis==='z'?angle:0)];
    const a=Math.hypot(...vector);
    const parameters=analytical?`<p class="math-parameters">Eingesetzt: A = ${number(a)} rad; n = (${vector.map(v=>number(a?v/a:0)).join(', ')}); c = ${number(Math.cos(a/2))}; s = ${number(Math.sin(a/2))}.${a<1e-12?' Bei A = 0 ist die Achse beliebig und U = I.':''}</p>`:'';
    const summary=document.createElement('summary');summary.textContent=`${i+1}. ${title(s.pulse)} · ${s.start}–${s.end} ns`;
    const body=document.createElement('div');body.innerHTML=`<p>${analytical?'Für diesen Puls gilt U = cos(A/2)I − i sin(A/2)(n · σ).':'Bei einem geformten, verstimmten XY-Puls ändert sich die effektive Drehachse. Deshalb wird U aus kleinen Zeitschritten zusammengesetzt: U ≈ Uₘ · … · U₂ · U₁.'}</p><div class="math-equation"><span>|ψ${i+1}⟩ = U${i+1}|ψ${i}⟩ ≈</span>${matrix(u)}<span>·</span>${matrix(before,1)}<span>=</span>${matrix(after,1)}</div><div class="math-expansion"><p>α${i+1} ≈ ${product(u,before,0)} = <b>${complex(after[0])}</b></p><p>β${i+1} ≈ ${product(u,before,1)} = <b>${complex(after[1])}</b></p></div><p class="hint">Multipliziere jede Matrixzeile mit dem Eingangsvektor: erster Eintrag mal α plus zweiter Eintrag mal β. Angezeigt sind auf vier Dezimalstellen gerundete Werte; gerechnet wird mit voller Genauigkeit.</p><p class="math-equation">|ψ${i+1}⟩ ≈ ${ket(after)}</p><p>${probabilities(after)}</p>`;
    body.insertAdjacentHTML('afterbegin',parameters);
    if(s.pulse.axis==='wait'){
      const info=document.createElement('p');info.textContent=config.detuning===0?'Ohne Verstimmung: U = I. Die Wartezeit verändert den Zustand nicht.':`Wartezeit: U = diag(e^(−iΔτ/2), e^(+iΔτ/2)), mit Δτ = ${(2*Math.PI*config.detuning*s.pulse.duration/1000).toFixed(4)} rad.`;body.prepend(info);
    }
    const b=document.createElement('button');b.textContent='Diesen Zustand auf der Kugel zeigen';b.onclick=()=>seek(s.end);body.append(b);details.append(summary,body);return details;
  }));
  const count=run.segments.length;
  $('math-final').innerHTML=`<h3>Endzustand nach ${count} ${count===1?'Puls':'Pulsen'}</h3><p class="math-equation">${count>1?`|ψ${count}⟩ = U${count} · … · U₁ |ψ₀⟩`:count===1?'|ψ₁⟩ = U₁ |ψ₀⟩':'|ψEnde⟩ = |ψ₀⟩'}</p><p>Die rechte Matrix wirkt zuerst. Jeder Ausgangszustand wird zum Eingang des nächsten Pulses.</p><div class="math-equation">|ψEnde⟩ ≈ ${matrix(math.final,1)} = <span>${ket(math.final)}</span></div><p>${probabilities(math.final)}</p><p class="hint">Eine gemeinsame globale Phase ändert die Messwahrscheinlichkeiten und den Bloch-Vektor nicht. Darum sind zum Beispiel −i|1⟩ und |1⟩ derselbe Punkt auf der Kugel.</p>`;
  return math;
}
export function updateMath(run,math,time){
  const p=ketAtTime(run,math,time);
  $('math-now-time').textContent=`t = ${time.toFixed(1)} ns`;
  $('math-now-ket').textContent=`|ψ(t)⟩ ≈ ${ket(p)}`;
  $('math-now-probabilities').innerHTML=probabilities(p);
  for(const [i,d] of [...$('math-steps').children].entries()){
    const s=run.segments[i];d.classList.toggle('current-step',time>=s.start&&time<s.end);d.classList.toggle('finished-step',time>=s.end);
  }
}

import {analyzeProfile,METRIC_DEFINITIONS,VERSION} from './analyzer.mjs';
import {examples} from './fixtures.mjs';
const $=id=>document.getElementById(id);
const h=(tag,className='',text='')=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=String(text);return el};
const fmtNumber=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n):'—';
function chart(metric,records,key){
  const values=records.map(x=>x.metrics[key]).filter(v=>typeof v==='number');if(values.length<2)return h('p','','Dados insuficientes para gráfico.');
  const el=document.createElementNS('http://www.w3.org/2000/svg','svg');el.setAttribute('viewBox','0 0 360 126');el.setAttribute('class','chart');el.setAttribute('role','img');el.setAttribute('aria-label',`Evolução demonstrativa de ${metric.title}`);
  const min=Math.min(...values),max=Math.max(...values),spread=Math.max(.5,max-min),coords=values.map((v,i)=>[16+i*328/(values.length-1),110-(v-min)/spread*82]);
  const mk=(name,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([a,v])=>n.setAttribute(a,String(v)));return n};
  el.append(mk('line',{x1:16,y1:110,x2:344,y2:110,class:'gridline'}));el.append(mk('path',{d:coords.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}));for(const [x,y] of coords)el.append(mk('circle',{cx:x,cy:y,r:4}));return el;
}
function show(){const selected=examples.find(p=>p.profileId===$('profile').value);if(!selected)return;const r=analyzeProfile({...selected,goal:$('goal').value});const host=$('results');host.replaceChildren();
  const intro=h('section','card');const heading=h('div','heading');const title=h('div');title.append(h('div','eyebrow','PAINEL DE INTERPRETAÇÃO'),h('h2','',selected.name),h('p','',`${r.eligibility.assessments??selected.assessments.length} avaliações · ${r.eligibility.spanDays??'—'} dias de histórico · ${VERSION}`));heading.append(title,h('span','status',r.eligibility.eligible?'Análise disponível':'Análise limitada'));intro.append(heading,h('div','summary',r.summary));host.append(intro);
  if(!r.eligibility.eligible){const block=h('section','card');block.append(h('h2','','Requisitos pendentes'),h('p','',r.alerts.map(x=>x.text).join(' ')));host.append(block);return}
  const grid=h('section','metricgrid');for(const [key,definition] of Object.entries(METRIC_DEFINITIONS)){
    const m=r.metrics[key],card=h('article','card metric');card.append(h('div','tag',definition.title));
    card.append(h('div','value',m.last!==null?`${fmtNumber(m.last)} ${m.unit}`:'—'));
    card.append(h('div','delta',m.delta!==null?`${m.delta>0?'+':''}${fmtNumber(m.delta)} ${m.unit}`:'Sem comparação'));
    card.append(h('div','mini',m.status==='incomparavel'?'Métodos não comparáveis':m.status==='insuficiente'?'Medidas insuficientes':m.trend==='estavel'?'Variação pequena':m.trend==='aumento'?'Aumento observado':'Redução observada'));
    card.append(h('p','detail',m.explanation));grid.append(card);
  }host.append(grid);
  const trendSection=h('section','charts');for(const key of ['weightKg','waistCm']){const m=r.metrics[key],card=h('article','card');const heading=h('div','charthead');heading.append(h('h2','',m.title),h('small','',m.status==='insuficiente'?'Sem série completa':`${m.n} medições`));card.append(heading,chart(m,selected.assessments,key));trendSection.append(card)}host.append(trendSection);
  const alerts=h('section','card');const line=h('div','heading');line.append(h('h2','','Alertas e verificações'));const copy=h('button','copy','Copiar resultado JSON');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(r,null,2));copy.textContent='Copiado'}catch{copy.textContent='Cópia indisponível'}});line.append(copy);alerts.append(line);
  const list=h('div','alerts');const items=[...r.quality.warnings,...r.alerts];if(!items.length)items.push({severity:'info',code:'NO_ALERTS',text:'Nenhuma inconsistência adicional foi identificada pelas regras deste motor. Isso não garante ausência de erro.'});for(const a of items){const item=h('div',`alert ${a.severity||''}`);item.append(h('b','',a.code.replaceAll('_',' ')),h('p','',a.text));list.append(item)}alerts.append(list);const note=h('ul','footnotes');for(const txt of r.limitations)note.append(h('li','',txt));alerts.append(note);host.append(alerts);
}
$('profile').replaceChildren(...examples.map(p=>{const o=h('option','',`${p.name} · ${p.assessments.length} avaliações`);o.value=p.profileId;return o}));
$('profile').addEventListener('change',()=>{const p=examples.find(x=>x.profileId===$('profile').value);if(p)$('goal').value=p.goal;show()});$('goal').addEventListener('change',show);$('analyze').addEventListener('click',show);
$('theme').addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'});
$('goal').value=examples[0].goal;show();


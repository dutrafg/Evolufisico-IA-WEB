import {analyzeProfile,METRIC_DEFINITIONS,VERSION} from './analyzer.mjs';
import {examples} from './fixtures.mjs';
import {parseImportText,MAX_FILE_BYTES,ImportErrorEFI,exampleImport} from './importer.mjs';
const $ = id => document.getElementById(id);
const element = (tag, className='', content='') => {
  const node=document.createElement(tag);if(className)node.className=className;
  node.textContent=String(content);return node;
};
const fmt = n => Number.isFinite(n)?new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n):'—';
let imported=[];
let profiles=[...examples];
let current=null;
function download(filename,text,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function populate(){
  const select=$('profile'),keep=select.value;
  select.replaceChildren(...profiles.map(p=>{const o=element('option','',`${p.name} · ${p.assessments.length} avaliações`);o.value=p.profileId;return o}));
  select.value=profiles.some(x=>x.profileId===keep)?keep:profiles[0].profileId;
  $('goal').value=profiles.find(x=>x.profileId===select.value)?.goal||'acompanhar';
  $('source-info').textContent=imported.length?'Arquivo local importado; não transmitido ou gravado em disco.':'Exemplos sintéticos; nenhuma pessoa real.';
  $('clear').hidden=imported.length===0;
  show();
}
function chart(metric,records,key){
  if(!['preliminar','observado'].includes(metric.status))return element('p','',`Gráfico indisponível: ${metric.explanation}`);
  const points=records.map(x=>({time:Date.parse(x.date+'T12:00:00Z'),value:x.metrics[key]}))
    .filter(p=>Number.isFinite(p.time)&&typeof p.value==='number'&&Number.isFinite(p.value)).sort((a,b)=>a.time-b.time);
  if(points.length<2)return element('p','','Dados insuficientes.');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 360 140');svg.classList.add('chart');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${metric.title}, valores entre ${fmt(metric.first)} e ${fmt(metric.last)}`);
  const min=Math.min(...points.map(x=>x.value)),max=Math.max(...points.map(x=>x.value)),spread=Math.max(0.5,max-min),dateSpread=Math.max(1,points.at(-1).time-points[0].time);
  const coords=points.map(p=>[18+(p.time-points[0].time)/dateSpread*324,113-(p.value-min)/spread*82]);
  const mk=(name,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));return n};
  svg.append(mk('line',{x1:18,y1:113,x2:342,y2:113,class:'gridline'}));
  svg.append(mk('path',{d:coords.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}));
  for(const [x,y] of coords)svg.append(mk('circle',{cx:x,cy:y,r:4}));
  return svg;
}
function show(){
  const profile=profiles.find(p=>p.profileId===$('profile').value);if(!profile)return;
  const goal=$('goal').value;
  const result=analyzeProfile({...profile,goal});current=result;
  const host=$('results');host.replaceChildren();
  const intro=element('section','card'),heading=element('div','heading'),headingText=element('div');
  headingText.append(element('div','eyebrow','INTERPRETAÇÃO LOCAL'),element('h2','',profile.name),element('p','',`${result.eligibility.assessments??profile.assessments.length} avaliações · ${result.eligibility.spanDays??'—'} dias · núcleo ${VERSION}`));
  heading.append(headingText,element('span','status',result.eligibility.eligible?'Análise disponível':'Análise limitada'));
  intro.append(heading,element('div','summary',result.summary));host.append(intro);
  if(result.eligibility.eligible){
    const grid=element('section','metricgrid');
    for(const [key,definition] of Object.entries(METRIC_DEFINITIONS)){
      const m=result.metrics[key],card=element('article','card metric');card.append(element('div','tag',definition.title));
      card.append(element('div','value',m.last!==null?`${fmt(m.last)} ${m.unit}`:'—'));
      card.append(element('div','delta',m.delta!==null?`${m.delta>0?'+':''}${fmt(m.delta)} ${m.unit}`:'Sem comparação'));
      card.append(element('div','mini',m.status==='incomparavel'?'Métodos incompatíveis':m.status==='insuficiente'?'Dados insuficientes':m.trend==='estavel'?'Variação pequena':m.trend==='aumento'?'Aumento':'Redução'));
      card.append(element('p','detail',m.explanation));grid.append(card);
    }
    host.append(grid);
    const charts=element('section','charts');for(const key of ['weightKg','waistCm']){
      const m=result.metrics[key],box=element('article','card'),head=element('div','charthead');head.append(element('h2','',m.title),element('small','',`${m.n} medições`));box.append(head,chart(m,profile.assessments,key));charts.append(box);
    }host.append(charts);
  }
  const alerts=element('section','card'),head=element('div','heading');head.append(element('h2','','Alertas e verificações'));
  const exportButton=element('button','secondary','Exportar análise JSON');exportButton.type='button';exportButton.id='export-result';
  exportButton.addEventListener('click',()=>download(`EFI-Analise-${profile.profileId.replace(/[^a-zA-Z0-9_-]/g,'_')}.json`,JSON.stringify(current,null,2)));
  head.append(exportButton);alerts.append(head);
  const list=element('div','alerts'),items=[...(result.quality?.warnings||[]),...(result.alerts||[])];
  if(!items.length)items.push({severity:'info',code:'SEM_ALERTAS',text:'Nenhuma inconsistência adicional foi identificada pelas regras disponíveis.'});
  for(const a of items){const card=element('article',`alert ${a.severity||''}`);card.append(element('b','',String(a.code).replaceAll('_',' ')),element('p','',a.text));list.append(card)}
  alerts.append(list);
  const note=element('ul','footnotes');for(const t of result.limitations||[])note.append(element('li','',t));alerts.append(note);host.append(alerts);
}
function setStatus(message,isError=false){$('import-status').textContent=message;$('import-status').dataset.error=String(isError)}
async function receiveFile(file){
  if(!file){return}
  if(file.size>MAX_FILE_BYTES){setStatus('Arquivo excede o limite de 1 MB.',true);return}
  try{
    const content=await file.text(),parsed=parseImportText(content);
    imported=parsed.profiles;profiles=imported;
    setStatus(`${imported.length} perfil(is) importado(s) exclusivamente na memória. Nada foi enviado para a internet.`);
    populate();
  }catch(e){setStatus(e instanceof ImportErrorEFI?`${e.code}: ${e.message}`:'Não foi possível abrir o arquivo.',true)}
  finally{$('file').value=''}
}
function network(){const online=navigator.onLine;$('connection').textContent=online?'Conexão disponível':'Sem conexão · modo local';$('connection').dataset.online=String(online)}
function init(){
  $('profile').addEventListener('change',()=>{$('goal').value=profiles.find(p=>p.profileId===$('profile').value)?.goal||'acompanhar';show()});
  $('goal').addEventListener('change',show);$('analyze').addEventListener('click',show);
  $('file').addEventListener('change',e=>receiveFile(e.target.files?.[0]));
  $('clear').addEventListener('click',()=>{imported=[];profiles=[...examples];setStatus('Importação descartada da memória. Exemplos demonstrativos restaurados.');populate()});
  $('sample').addEventListener('click',()=>download('EFI-Modelo-Importacao.json',JSON.stringify(exampleImport(examples[0]),null,2)));
  $('theme').addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'});
  window.addEventListener('online',network);window.addEventListener('offline',network);
  network();populate();
  // Service Worker only on secure HTTP origins. The single-file build runs without it.
  if('serviceWorker' in navigator && (location.protocol==='https:' || ['localhost','127.0.0.1'].includes(location.hostname)) && !location.pathname.endsWith('EFI_RC2_OFFLINE.html')){
    navigator.serviceWorker.register('../sw.js',{scope:'../'}).then(()=>{$('offline-status').textContent='Aplicativo preparado para uso offline após armazenar os arquivos necessários neste navegador.'}).catch(()=>{});
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
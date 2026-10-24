
/**
 * EFI Intelligence RC1 — motor longitudinal explicável, 100% local.
 * NÃO é modelo de linguagem, dispositivo médico ou diagnóstico.
 * A entrada é um snapshot validado; jamais lê IndexedDB, OPFS ou dados globais.
 */
const SCHEMA_VERSION = 'efi.intelligence.v1';
const VERSION = '0.1.0-rc1';
const DAY = 86400000;
const METRICS = Object.freeze({
  weightKg: {title:'Peso corporal',unit:'kg',min:20,max:350,floor:0.3},
  waistCm: {title:'Circunferência da cintura',unit:'cm',min:40,max:200,floor:0.6},
  bodyFatPct: {title:'Gordura corporal estimada',unit:'p.p.',min:2,max:65,floor:0.5,needsMethod:true},
  leanMassKg: {title:'Massa livre de gordura estimada',unit:'kg',min:10,max:250,floor:0.5,needsMethod:true}
});
const METRIC_DEFINITIONS=METRICS;
const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function number(v){if(typeof v==='number')return Number.isFinite(v)?v:null;if(typeof v==='string'&&v.trim()){const t=v.trim().replace(',','.');return /^[-+]?\d+(?:\.\d+)?$/.test(t)&&Number.isFinite(Number(t))?Number(t):null}return null}
const round=(v,places=2)=> Number.isFinite(v)?Number(v.toFixed(places)):null;
function parseDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const ts=Date.parse(v+'T12:00:00Z');return Number.isFinite(ts)&&new Date(ts).toISOString().slice(0,10)===v?ts:null}
function median(v){if(!v.length)return null;const a=[...v].sort((x,y)=>x-y);return (a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2}
function notice(code,text,severity='attention',extra={}){return {code,severity,text,...extra}}
function normalizeMethod(v){if(!isObject(v)||typeof v.type!=='string'||!v.type.trim())return null;const fields=['type','device','protocol','version'];return fields.map(k=>String(v[k]??'').trim().toLocaleLowerCase('pt-BR')).join('|')}
function safeId(v){return typeof v==='string'||typeof v==='number'?String(v).trim():''}
function blocked(profileId,code,text,warnings=[]){return {schemaVersion:SCHEMA_VERSION,version:VERSION,profileId,eligibility:{eligible:false,reason:code,minimumAssessments:3,minimumSpanDays:21},quality:{level:'insuficiente',warnings},metrics:{},alerts:[notice(code,text,'blocked')],summary:'Interpretação longitudinal indisponível até que os requisitos sejam atendidos.',limitations:['Não é diagnóstico e não substitui a análise profissional.'],provenance:{type:'deterministic-local',model:'none',source:'validated-snapshot'}}}
/** analyzeProfile({profileId,assessments:[{id,studentId,date,metrics,methods,context}],goal?}) */
function analyzeProfile(snapshot){
  const id=safeId(snapshot?.profileId);
  if(!id)return blocked('', 'PROFILE_REQUIRED','Identificador do aluno ausente.');
  if(!Array.isArray(snapshot?.assessments)||snapshot.assessments.length>500)return blocked(id,'INVALID_HISTORY','Histórico ausente ou excede o limite de 500 avaliações.');
  const warnings=[],rows=[],dates=new Set(),ids=new Set();
  for(const source of snapshot.assessments){
    if(!isObject(source)||!isObject(source.metrics))return blocked(id,'INVALID_RECORD','Registro incompleto, sem dados de medidas.');
    const subject=safeId(source.studentId),recordId=safeId(source.id),day=parseDate(source.date);
    if(!subject||subject!==id)return blocked(id,'IDENTITY_MISMATCH','Histórico contém avaliação de outro aluno ou identidade ausente.');
    if(!recordId||ids.has(recordId))return blocked(id,'DUPLICATE_ID','Identificador de avaliação ausente ou repetido.');
    if(day===null||dates.has(source.date))return blocked(id,'INVALID_DATE','Data inválida ou repetida.');
    ids.add(recordId);dates.add(source.date);
    const metrics={},methods={};
    for(const [key,meta] of Object.entries(METRICS)){
      const raw=source.metrics[key];const n=number(raw);
      metrics[key]=n!==null&&n>=meta.min&&n<=meta.max?n:null;
      if(raw!==null&&raw!==undefined&&raw!==''&&metrics[key]===null)warnings.push(notice('VALUE_OUT_OF_RANGE',`${meta.title}: valor não numérico ou fora do intervalo de triagem em ${source.date}.`,'attention',{metric:key,date:source.date}));
      methods[key]=meta.needsMethod?normalizeMethod(source.methods?.[key]):null;
    }
    if(metrics.weightKg!==null&&metrics.leanMassKg!==null&&metrics.leanMassKg>metrics.weightKg){
      warnings.push(notice('LEAN_EXCEEDS_WEIGHT',`Massa livre de gordura superior ao peso em ${source.date}. Confira origem e transcrição.`, 'attention',{date:source.date}));
      // Never infer which measurement is incorrect.
      metrics.leanMassKg=null;
    }
    rows.push({id:recordId,studentId:id,date:source.date,day,metrics,methods});
  }
  rows.sort((a,b)=>a.day-b.day||a.id.localeCompare(b.id));
  const span=rows.length>1?Math.round((rows.at(-1).day-rows[0].day)/DAY):0;
  if(rows.length<3)return blocked(id,'MINIMUM_ASSESSMENTS','São necessárias pelo menos 3 avaliações em datas diferentes.',warnings);
  if(span<21)return blocked(id,'MINIMUM_SPAN','São necessários pelo menos 21 dias entre a primeira e a última avaliação.',warnings);
  if(snapshot?.sourceEligibility===false)return blocked(id,'SOURCE_BLOCKED','O motor EFIA de origem bloqueou a interpretação. Verifique os avisos de auditoria.',warnings);
  const analysis={}, alerts=[],allWarn=[...warnings];
  for(const [key,meta] of Object.entries(METRICS)){
    const valid=rows.filter(r=>r.metrics[key]!==null);
    const sourceMethods=meta.needsMethod?valid.map(r=>r.methods[key]):[];
    const methodComparable=!meta.needsMethod||(valid.length>=3&&sourceMethods.every(Boolean)&&new Set(sourceMethods).size===1);
    // First and last must exist. Never switch baseline just because one measure is missing.
    const edges=rows[0].metrics[key]!==null&&rows.at(-1).metrics[key]!==null;
    const invalidMeasurement=warnings.some(w=>(w.code==='VALUE_OUT_OF_RANGE'&&w.metric===key)||(w.code==='LEAN_EXCEEDS_WEIGHT'&&key==='leanMassKg'));
    const sufficient=valid.length>=3&&edges&&methodComparable&&!invalidMeasurement;
    const candidate= {title:meta.title,unit:meta.unit,status:'insuficiente',n:valid.length,first:edges?rows[0].metrics[key]:null,last:edges?rows.at(-1).metrics[key]:null,firstDate:rows[0].date,lastDate:rows.at(-1).date,delta:null,percentChange:null,ratePer30Days:null,trend:'indeterminada',outlierDates:[],methodComparable,explanation:''};
    if(!sufficient){
      candidate.status=!methodComparable?'incomparavel':'insuficiente';
      candidate.explanation=!methodComparable?'Métodos, protocolos ou aparelhos diferentes ou não identificados; série não comparável.':invalidMeasurement?'Uma ou mais medições inconsistentes precisam ser conferidas antes da comparação.':'São necessárias pelo menos 3 medidas válidas incluindo primeira e última avaliação.';
      allWarn.push(notice(candidate.status==='incomparavel'?'METHOD_INCOMPARABLE':'METRIC_INSUFFICIENT',`${meta.title}: ${candidate.explanation}`,'attention',{metric:key}));
      analysis[key]=candidate;continue;
    }
    const start=rows[0].metrics[key],end=rows.at(-1).metrics[key],delta=end-start;
    const slopes=[];
    for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){
      const days=(valid[j].day-valid[i].day)/DAY;if(days>0)slopes.push((valid[j].metrics[key]-valid[i].metrics[key])/days);
    }
    const sl=median(slopes);const rate=sl*30;
    const thresholds={weightKg:0.3,waistCm:0.6,bodyFatPct:0.5,leanMassKg:0.5};
    const minDirectional=thresholds[key];
    const trend=Math.abs(delta)<minDirectional?'estavel':delta>0?'aumento':'reducao';
    let outlierDates=[];
    if(valid.length>=5&&(valid.at(-1).day-valid[0].day)/DAY>=60){
      const origin=valid[0];const rawResiduals=valid.map(r=>r.metrics[key]-(origin.metrics[key]+sl*(r.day-origin.day)/DAY));
      const mid=median(rawResiduals),deviations=rawResiduals.map(x=>x-mid),mad=median(deviations.map(Math.abs));
      const scale=Math.max((mad||0)*1.4826,meta.floor);
      outlierDates=valid.filter((r,i)=>Math.abs(deviations[i])>3.5*scale).map(r=>r.date);
      if(outlierDates.length)alerts.push(notice('OUTLIER_CANDIDATE',`${meta.title}: ${outlierDates.length} medição(ões) incomum(ns). Conferir condições da coleta; não é confirmação de erro.`,'attention',{metric:key,dates:outlierDates}));
    }
    candidate.status=valid.length<5?'preliminar':'observado';candidate.first=start;candidate.last=end;
    candidate.delta=round(delta);candidate.percentChange= start!==0?round(delta/start*100):null;
    candidate.ratePer30Days=round(rate);candidate.trend=trend;candidate.outlierDates=outlierDates;
    candidate.explanation=`${meta.title}: ${trend==='estavel'?'variação pequena':trend==='aumento'?'aumento observado':'redução observada'} entre ${rows[0].date} e ${rows.at(-1).date}, com ${valid.length} medidas comparáveis. Tendência exploratória; não atribui causa nem benefício clínico.`;
    analysis[key]=candidate;
  }
  // No directional benefit without a goal explicitly set by the professional.
  const goals=['reduzir-cintura','reduzir-gordura','aumentar-massa-livre','acompanhar'].includes(snapshot.goal)?snapshot.goal:null;
  if(goals&&goals!=='acompanhar'){
    const which={'reduzir-cintura':'waistCm','reduzir-gordura':'bodyFatPct','aumentar-massa-livre':'leanMassKg'}[goals],m=analysis[which];
    if(m&&['preliminar','observado'].includes(m.status)&&m.delta!==null){
      const favorable=goals==='aumentar-massa-livre'?m.delta>0:m.delta<0;
      if(Math.abs(m.delta)>=METRICS[which].floor)alerts.push(notice('GOAL_DIRECTION',`A variação observada de ${m.title.toLowerCase()} está ${favorable?'na direção':'na direção contrária à'} meta registrada. Isso não comprova causalidade.`,favorable?'info':'attention',{metric:which,goal:goals}));
    }
  }
  if(allWarn.some(w=>w.code==='VALUE_OUT_OF_RANGE'||w.code==='LEAN_EXCEEDS_WEIGHT'))alerts.push(notice('REVIEW_MEASUREMENTS','Há medidas que precisam ser conferidas antes de gerar conclusões.','attention'));
  // The UI may display quality; it is not a numeric clinical confidence score.
  const validCount=Object.values(analysis).filter(x=>['preliminar','observado'].includes(x.status)).length;
  const quality=validCount===4&&!allWarn.length?'adequada':validCount>0?'parcial':'insuficiente';
  if(!validCount)alerts.unshift(notice('NO_COMPARABLE_METRICS','Há histórico suficiente, mas nenhuma métrica possui série comparável completa.','blocked'));
  const summary=validCount?`${rows.length} avaliações ao longo de ${span} dias. ${validCount} de 4 métricas com série temporal comparável. Interpretação descritiva para revisão profissional.`:'Nenhuma conclusão longitudinal pode ser produzida com as medidas fornecidas.';
  const result={schemaVersion:SCHEMA_VERSION,version:VERSION,profileId:id,eligibility:{eligible:validCount>0,reason:validCount>0?null:'NO_COMPARABLE_METRICS',minimumAssessments:3,minimumSpanDays:21,assessments:rows.length,spanDays:span},quality:{level:quality,warnings:allWarn},metrics:analysis,alerts,summary,limitations:['Resultados exploratórios; não são diagnóstico médico.','Mudança de direção não determina sucesso terapêutico, treinamento ou causa.','Não classificar confiança heurística como acurácia clínica.'],provenance:{type:'deterministic-local',model:'none',source:typeof snapshot.source==='string'?snapshot.source:'validated-snapshot'}};
  return result;
}
/** Adapter: receive ONLY the output of EFIAHost.analyze; never query the app database. */
function analyzeFromEFIA({profileId,efiaResult,goal=null}){
  const id=safeId(profileId);
  if(!id||!isObject(efiaResult)||!Array.isArray(efiaResult.records))return blocked(id,'EFIA_INVALID','Resultado EFIA ausente ou inválido.');
  const rows=efiaResult.records.map(r=>({
    id:r.id,studentId:id,date:r.date,
    metrics:{weightKg:r.metrics?.peso,waistCm:r.metrics?.cintura,bodyFatPct:r.metrics?.gordura,leanMassKg:r.metrics?.massaMagra},
    methods:{
      bodyFatPct:{type:r.method,device:r.protocol?.device,protocol:r.protocol?.equation,version:r.protocol?.version},
      leanMassKg:{type:r.method,device:r.protocol?.device,protocol:r.protocol?.equation,version:r.protocol?.version}
    }
  }));
  const data=analyzeProfile({profileId:id,assessments:rows,goal,sourceEligibility:efiaResult.eligible===true,source:'efia-validated'});
  // EFIA engine audit always has veto power; observations remain advisory.
  const issues=[...(efiaResult.engines?.EF78?.issues||[]),...(efiaResult.engines?.EF80?.issues||[])].filter(s=>typeof s==='string').slice(0,20);
  if(issues.length){
    data.quality.warnings.push(...issues.map(s=>notice('EFIA_AUDIT',s,'attention')));
    data.quality.level=data.quality.level==='adequada'?'parcial':data.quality.level;
  }
  return data;
}
/** Bounded, structured context for a future *local* text model (never posts data). */
function explanatoryContext(analysis){
  if(analysis?.schemaVersion!==SCHEMA_VERSION)throw new TypeError('Análise EFI inválida');
  return {schemaVersion:SCHEMA_VERSION,allowedUse:'local-explanation-only',profileId:analysis.profileId,summary:analysis.summary,eligibility:analysis.eligibility,metrics:analysis.metrics,alerts:analysis.alerts,limitations:analysis.limitations,policy:'Explique apenas observações presentes, sem criar números, diagnósticos, causalidade ou prescrição.'};
}


export {SCHEMA_VERSION,VERSION,METRIC_DEFINITIONS,analyzeProfile,analyzeFromEFIA,explanatoryContext};

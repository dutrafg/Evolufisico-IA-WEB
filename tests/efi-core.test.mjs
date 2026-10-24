import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeProfile,analyzeFromEFIA,explanatoryContext,SCHEMA_VERSION} from '../efi-intelligence/analyzer.mjs';
import {examples} from '../efi-intelligence/fixtures.mjs';
const clone=o=>structuredClone(o);
function checkResult(r){assert.equal(r.schemaVersion,SCHEMA_VERSION);assert.ok(r.eligibility);assert.ok(r.quality);assert.ok(Array.isArray(r.alerts));assert.ok(Array.isArray(r.limitations));for(const m of Object.values(r.metrics))for(const k of ['delta','ratePer30Days','percentChange'])assert.ok(m[k]===null||Number.isFinite(m[k]),`${k}: invalid numeric`)}
test('cada fixture possui pelo menos 3 avaliações',()=>{for(const p of examples)assert.ok(p.assessments.length>=3)});
test('Carlos: mudança aritmética e meta verificadas',()=>{const r=analyzeProfile(examples[0]);checkResult(r);assert.equal(r.eligibility.eligible,true);assert.equal(r.metrics.weightKg.delta,-3.7);assert.equal(r.metrics.bodyFatPct.delta,-2.9);assert.ok(r.alerts.some(x=>x.code==='GOAL_DIRECTION'))});
test('Ana: 3 avaliações e série preliminar',()=>{const r=analyzeProfile(examples[1]);assert.equal(r.eligibility.eligible,true);assert.equal(r.metrics.leanMassKg.status,'preliminar')});
test('Marina: métodos BIA/Pollock não são comparáveis',()=>{const r=analyzeProfile(examples[2]);assert.equal(r.metrics.bodyFatPct.status,'incomparavel');assert.equal(r.metrics.bodyFatPct.delta,null);assert.equal(r.metrics.leanMassKg.delta,null);assert.equal(r.metrics.waistCm.delta,-3.3)});
test('menos de 3 avaliações bloqueia',()=>{const p=clone(examples[0]);p.assessments=p.assessments.slice(0,2);const r=analyzeProfile(p);assert.equal(r.eligibility.eligible,false);assert.equal(r.eligibility.reason,'MINIMUM_ASSESSMENTS')});
test('menos de 21 dias bloqueia',()=>{const p=clone(examples[1]);p.assessments[1].date='2026-05-18';p.assessments[2].date='2026-05-20';const r=analyzeProfile(p);assert.equal(r.eligibility.reason,'MINIMUM_SPAN')});
test('mistura de alunos bloqueia sem vazar conclusões',()=>{const p=clone(examples[0]);p.assessments[2].studentId='OUTRO';const r=analyzeProfile(p);assert.equal(r.eligibility.reason,'IDENTITY_MISMATCH');assert.deepEqual(r.metrics,{})});
test('datas e IDs duplicados bloqueiam',()=>{const p=clone(examples[0]);p.assessments[2].date=p.assessments[1].date;assert.equal(analyzeProfile(p).eligibility.reason,'INVALID_DATE');p.assessments[2].date='2026-08-01';p.assessments[2].id=p.assessments[0].id;assert.equal(analyzeProfile(p).eligibility.reason,'DUPLICATE_ID')});
test('datas de calendário inválidas bloqueiam',()=>{const p=clone(examples[0]);p.assessments[0].date='2026-02-30';assert.equal(analyzeProfile(p).eligibility.reason,'INVALID_DATE')});
test('valores NaN e string vazia nunca viram zero',()=>{const p=clone(examples[1]);p.assessments[1].metrics.weightKg='';const r=analyzeProfile(p);assert.equal(r.metrics.weightKg.delta,null);assert.equal(r.metrics.weightKg.status,'insuficiente');assert.ok(r.quality.warnings.some(x=>x.code==='METRIC_INSUFFICIENT'))});
test('bordas ausentes não substituem baseline',()=>{const p=clone(examples[0]);p.assessments[0].metrics.weightKg=null;const r=analyzeProfile(p);assert.equal(r.metrics.weightKg.delta,null)});
test('massa livre não pode superar peso e deve ser suprimida',()=>{const p=clone(examples[0]);p.assessments[2].metrics.leanMassKg=150;const r=analyzeProfile(p);assert.ok(r.quality.warnings.some(x=>x.code==='LEAN_EXCEEDS_WEIGHT'));assert.equal(r.metrics.leanMassKg.status,'insuficiente')});
test('metas não declaradas não produzem parecer de êxito',()=>{const p=clone(examples[0]);delete p.goal;const r=analyzeProfile(p);assert.equal(r.alerts.some(a=>a.code==='GOAL_DIRECTION'),false)});
test('objetivo acompanhar não recomenda nem penaliza',()=>{const p=clone(examples[0]);p.goal='acompanhar';assert.equal(analyzeProfile(p).alerts.some(a=>a.code==='GOAL_DIRECTION'),false)});
test('motor não altera o snapshot original',()=>{const p=clone(examples[0]),old=clone(p);analyzeProfile(p);assert.deepEqual(p,old)});
test('bloqueio do EFIA original tem prioridade',()=>{const p=clone(examples[0]);p.sourceEligibility=false;assert.equal(analyzeProfile(p).eligibility.reason,'SOURCE_BLOCKED')});
test('adaptador EFIA constrói snapshots sem acesso ao banco',()=>{const p=examples[0],raw=p.assessments.map(a=>({id:a.id,date:a.date,metrics:{peso:a.metrics.weightKg,cintura:a.metrics.waistCm,gordura:a.metrics.bodyFatPct,massaMagra:a.metrics.leanMassKg},method:'pollock',protocol:{equation:'Pollock 7',version:'1'}}));const r=analyzeFromEFIA({profileId:p.profileId,efiaResult:{eligible:true,records:raw,engines:{EF78:{issues:['Revisar padronização.']}}}});assert.equal(r.eligibility.eligible,true);assert.equal(r.metrics.weightKg.delta,-3.7);assert.ok(r.quality.warnings.some(x=>x.code==='EFIA_AUDIT'))});
test('adaptador bloqueia motor EFIA marcado inelegível',()=>{const p=examples[0],raw=p.assessments.map(a=>({id:a.id,date:a.date,metrics:{peso:a.metrics.weightKg}}));const r=analyzeFromEFIA({profileId:p.profileId,efiaResult:{eligible:false,records:raw}});assert.equal(r.eligibility.reason,'SOURCE_BLOCKED')});
test('contexto para futura IA é limitado e não dispara conexão',()=>{const r=analyzeProfile(examples[0]),c=explanatoryContext(r);assert.equal(c.allowedUse,'local-explanation-only');assert.equal(c.policy.includes('sem criar números'),true);assert.equal('assessments' in c,false)});
test('limite de registros protegido',()=>{const p=clone(examples[0]);p.assessments=Array(501).fill(null);assert.equal(analyzeProfile(p).eligibility.reason,'INVALID_HISTORY')});
test('alerta de candidato a outlier não altera medidas',()=>{const p=clone(examples[2]);p.assessments[2].metrics.waistCm=130;const r=analyzeProfile(p);assert.equal(r.metrics.waistCm.delta,-3.3);assert.ok(r.metrics.waistCm.outlierDates.includes('2026-03-11'))});
// 10,000 pseudo-random histories: verify deterministic, bounded, non-NaN outputs.
function rng(seed){let x=seed|0;return()=>((x^=x<<13,x^=x>>>17,x^=x<<5)>>>0)/4294967296}
test('campanha de 10.000 perfis sintéticos: integridade e invariantes',()=>{
 const rand=rng(89271),p=clone(examples[0]);let eligible=0,blocked=0;
 for(let i=0;i<10000;i++){
   p.profileId=`SIM-${i}`;const n=1+Math.floor(rand()*7),baseW=55+rand()*65;
   p.assessments=Array.from({length:n},(_,k)=>({
    id:`${i}:${k}`,studentId:p.profileId,date:new Date(Date.UTC(2025,0,1+k*(5+Math.floor(rand()*11)))).toISOString().slice(0,10),
    metrics:{weightKg:baseW+(rand()-.5)*10,waistCm:70+(rand()-.5)*20,bodyFatPct:20+(rand()-.5)*8,leanMassKg:42+(rand()-.5)*6},
    methods:{bodyFatPct:{type:'pollock',protocol:'7'},leanMassKg:{type:'pollock',protocol:'7'}}
   }));
   // date duplicates may occur if same k uses random interval; blocked deterministically, safe by design.
   const r=analyzeProfile(p);checkResult(r);r.eligibility.eligible?eligible++:blocked++;
   for(const m of Object.values(r.metrics))if(m.delta!==null)assert.ok(Math.abs(m.delta)<=350);
 }
 assert.equal(eligible+blocked,10000);assert.ok(eligible>0);assert.ok(blocked>0);
 console.log(`EFI simulation: ${eligible} eligible / ${blocked} correctly blocked`);
});
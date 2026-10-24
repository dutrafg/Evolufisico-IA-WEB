import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeImport,parseImportText,exampleImport,ImportErrorEFI,MAX_FILE_BYTES} from '../efi-intelligence/importer.mjs';
import {examples} from '../efi-intelligence/fixtures.mjs';
import {analyzeProfile} from '../efi-intelligence/analyzer.mjs';
const cloned = x => structuredClone(x);
const example = ()=>exampleImport(examples[0]);
test('arquivo de exemplo é aceito e analisado',()=>{
 const r=normalizeImport(example()); assert.equal(r.profiles.length,1); assert.equal(r.profiles[0].source,'importacao-local'); assert.equal(analyzeProfile(r.profiles[0]).eligibility.eligible,true);
});
test('três perfis podem ser importados',()=>{
 const e=example();e.profiles=[...examples].map(x=>exampleImport(x).profiles[0]); assert.equal(normalizeImport(e).profiles.length,3);
});
test('schema desconhecido é recusado',()=>{
 const e=example();e.schemaVersion='other';assert.throws(()=>normalizeImport(e),{code:'SCHEMA'});
});
test('JSON inválido é recusado',()=>assert.throws(()=>parseImportText('<html>'),{code:'JSON'}));
test('arquivo acima de 1 MB é recusado',()=>assert.throws(()=>parseImportText('x'.repeat(MAX_FILE_BYTES+1)),{code:'FILE_SIZE'}));
test('identidades misturadas não são aceitas',()=>{
 const e=example();e.profiles[0].assessments[1].studentId='OUTRO';assert.throws(()=>normalizeImport(e),{code:'IDENTITY'});
});
test('datas duplicadas não são aceitas',()=>{
 const e=example();e.profiles[0].assessments[1].date=e.profiles[0].assessments[0].date;assert.throws(()=>normalizeImport(e),{code:'DUPLICATE'});
});
test('identificadores duplicados não são aceitos',()=>{
 const e=example();e.profiles[0].assessments[1].id=e.profiles[0].assessments[0].id;assert.throws(()=>normalizeImport(e),{code:'DUPLICATE'});
});
test('perfis com identificadores repetidos não são aceitos',()=>{
 const e=example();e.profiles.push(cloned(e.profiles[0]));assert.throws(()=>normalizeImport(e),{code:'DUPLICATE_PROFILE'});
});
test('mais de 100 perfis são recusados',()=>{
 const e=example();e.profiles=Array.from({length:101},(_,i)=>({...cloned(e.profiles[0]),profileId:'ID'+i})); assert.throws(()=>normalizeImport(e),{code:'PROFILES'});
});
test('mais de 500 avaliações são recusadas',()=>{
 const e=example();e.profiles[0].assessments=Array.from({length:501},(_,i)=>({...e.profiles[0].assessments[0],id:'R'+i,date:'2025-01-01'}));assert.throws(()=>normalizeImport(e),{code:'ASSESSMENTS'});
});
test('objetos inválidos em medidas são recusados',()=>{
 const e=example();e.profiles[0].assessments[0].metrics.weightKg={foo:'bar'};assert.throws(()=>normalizeImport(e),{code:'METRIC_TYPE'});
});
test('nomes enviados pelo usuário não são usados como HTML',()=>{
 const e=example();e.profiles[0].name='<img src=x onerror=alert(1)>';const p=normalizeImport(e).profiles[0];assert.equal(p.name,e.profiles[0].name);assert.equal(analyzeProfile(p).eligibility.eligible,true);
});
test('campos adicionais são descartados e entrada é imutável',()=>{
 const e=example();e.profiles[0].secret='not imported';e.profiles[0].assessments[0].context={diagnosis:'sensitive'};
 const before=cloned(e),p=normalizeImport(e).profiles[0];assert.deepEqual(e,before);assert.equal('secret' in p,false);assert.equal('context' in p.assessments[0],false);
});
test('limite de arquivo inclui bytes UTF-8',()=>{
 const s='á'.repeat(Math.ceil(MAX_FILE_BYTES/2)+1);assert.throws(()=>parseImportText(s),{code:'FILE_SIZE'});
});
test('10.000 arquivos sintéticos diferentes mantêm invariantes',()=>{
 for(let i=0;i<10000;i++){
  const e=example();e.profiles[0].profileId='aluno-'+i;
  for(const a of e.profiles[0].assessments){a.studentId=e.profiles[0].profileId;a.metrics.weightKg=50+i%70}
  const p=normalizeImport(e).profiles[0];const a=analyzeProfile(p);
  assert.equal(a.profileId,p.profileId);
  assert.ok(a.eligibility.eligible);
  assert.ok(Object.values(a.metrics).every(v=>v.delta===null||Number.isFinite(v.delta)));
 }
});
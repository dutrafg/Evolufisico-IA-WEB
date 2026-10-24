/** EFI Web RC2 — strict, offline-only import contract. No network or persistence. */
export const IMPORT_SCHEMA = 'efi.import.v1';
export const MAX_FILE_BYTES = 1024 * 1024;
export const MAX_PROFILES = 100;
export const MAX_RECORDS = 500;
export const GOALS = Object.freeze(['acompanhar','reduzir-cintura','reduzir-gordura','aumentar-massa-livre']);
const IMPORT_METRICS = Object.freeze(['weightKg','waistCm','bodyFatPct','leanMassKg']);
const validId = value => typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 100 && !/[\u0000-\u001f\u007f]/.test(value);
const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export class ImportErrorEFI extends Error {
  constructor(code, description) { super(description); this.name = 'ImportErrorEFI'; this.code = code; }
}
function reject(code, description) { throw new ImportErrorEFI(code, description); }
function str(value, limit = 150) { return typeof value === 'string' ? value.trim().slice(0, limit) : ''; }
function method(value) {
  if (!isRecord(value)) return null;
  return {type:str(value.type,80), device:str(value.device,80), protocol:str(value.protocol,80), version:str(value.version,40)};
}
export function normalizeImport(payload) {
  if (!isRecord(payload) || payload.schemaVersion !== IMPORT_SCHEMA) reject('SCHEMA', 'Formato incompatível. Utilize efi.import.v1.');
  if (!Array.isArray(payload.profiles) || !payload.profiles.length || payload.profiles.length > MAX_PROFILES)
    reject('PROFILES', 'O arquivo deve conter entre 1 e 100 perfis.');
  const seenProfiles = new Set();
  const profiles = payload.profiles.map((p, pindex) => {
    if (!isRecord(p) || !validId(p.profileId)) reject('PROFILE_ID', `Identificador do perfil ${pindex + 1} inválido.`);
    const id = p.profileId.trim();
    if (seenProfiles.has(id)) reject('DUPLICATE_PROFILE', 'O arquivo contém perfis com identificadores repetidos.');
    seenProfiles.add(id);
    if (!Array.isArray(p.assessments) || !p.assessments.length || p.assessments.length > MAX_RECORDS)
      reject('ASSESSMENTS', `O perfil ${id} deve conter entre 1 e 500 avaliações.`);
    const ids = new Set(), dates = new Set();
    const assessments = p.assessments.map((a, index) => {
      if (!isRecord(a) || !validId(a.id) || !isRecord(a.metrics) || typeof a.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.date))
        reject('RECORD', `A avaliação ${index + 1} de ${id} tem campos obrigatórios inválidos.`);
      if (a.studentId !== id) reject('IDENTITY', `A avaliação ${index + 1} não pertence ao perfil ${id}.`);
      if (ids.has(a.id) || dates.has(a.date)) reject('DUPLICATE', `Datas ou identificadores duplicados em ${id}.`);
      ids.add(a.id); dates.add(a.date);
      const metrics = {}, methods = {};
      for (const key of IMPORT_METRICS) {
        const v = a.metrics[key];
        if (v !== null && v !== undefined && v !== '' && typeof v !== 'number' && typeof v !== 'string')
          reject('METRIC_TYPE', `Tipo de medida inválido: ${key}, perfil ${id}.`);
        metrics[key] = v ?? null;
      }
      for (const key of ['bodyFatPct','leanMassKg']) methods[key] = method(a.methods?.[key]);
      return {id:a.id.trim(),studentId:id,date:a.date,metrics,methods};
    });
    return {profileId:id,name:str(p.name,100) || `Aluno ${pindex + 1}`,goal:GOALS.includes(p.goal)?p.goal:'acompanhar',source:'importacao-local',assessments};
  });
  return {schemaVersion:IMPORT_SCHEMA,profiles};
}
export function parseImportText(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) reject('FILE_SIZE','O arquivo excede 1 MB.');
  let raw;
  try { raw = JSON.parse(text); } catch { reject('JSON','O arquivo não é um JSON válido.'); }
  return normalizeImport(raw);
}
export function exampleImport(profile) {
  // Clearly identified synthetic data; helps the professional prepare manual imports.
  return {schemaVersion:IMPORT_SCHEMA,profiles:[{
    profileId:profile.profileId,name:profile.name,goal:profile.goal,
    assessments:profile.assessments.map(a=>({id:a.id,studentId:a.studentId,date:a.date,metrics:{...a.metrics},methods:{bodyFatPct:{...a.methods?.bodyFatPct},leanMassKg:{...a.methods?.leanMassKg}}}))
  }]};
}
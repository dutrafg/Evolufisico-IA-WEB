// Dados sintéticos, exclusivamente para testes de interface. Todos têm >=3 avaliações.
const pollock={type:'pollock',protocol:'Pollock 7',version:'1'};
const bia={type:'bia',device:'Equipamento demonstrativo',protocol:'BIA',version:'1'};
const entry=(id,studentId,date,weightKg,waistCm,bodyFatPct,leanMassKg,method=pollock)=>({id,studentId,date,metrics:{weightKg,waistCm,bodyFatPct,leanMassKg},methods:{bodyFatPct:{...method},leanMassKg:{...method}}});
const examples=[
  {profileId:'ALUNO-DEMO-01',name:'Carlos Oliveira',goal:'reduzir-gordura',source:'synthetic-demo',assessments:[
    entry('c1','ALUNO-DEMO-01','2026-06-01',89.2,101,27.1,65.0),
    entry('c2','ALUNO-DEMO-01','2026-07-01',87.9,98,26.0,65.1),
    entry('c3','ALUNO-DEMO-01','2026-08-01',86.7,96,25.3,64.8),
    entry('c4','ALUNO-DEMO-01','2026-09-01',85.5,94,24.2,64.8)]},
  {profileId:'ALUNO-DEMO-02',name:'Ana Martins',goal:'aumentar-massa-livre',source:'synthetic-demo',assessments:[
    entry('a1','ALUNO-DEMO-02','2026-05-15',62.0,72.4,22.3,48.2),
    entry('a2','ALUNO-DEMO-02','2026-06-18',62.8,72.1,22.0,48.9),
    entry('a3','ALUNO-DEMO-02','2026-07-21',63.5,72.0,21.6,49.7)]},
  {profileId:'ALUNO-DEMO-03',name:'Marina Costa',goal:'reduzir-cintura',source:'synthetic-demo',assessments:[
    entry('m1','ALUNO-DEMO-03','2026-01-10',78.5,90.2,30.1,54.9,pollock),
    entry('m2','ALUNO-DEMO-03','2026-02-10',77.9,89.0,29.9,54.6,pollock),
    entry('m3','ALUNO-DEMO-03','2026-03-11',77.8,88.8,30.0,54.5,bia),
    entry('m4','ALUNO-DEMO-03','2026-04-10',77.0,87.6,28.7,54.9,bia),
    entry('m5','ALUNO-DEMO-03','2026-05-10',76.6,86.9,28.4,54.8,bia)]}
];




export {examples};

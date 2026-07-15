globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const { syllabiData } = await import('./src/data/syllabiData.js');
const { enrichSyllabi } = await import('./src/data/syllabiDataEnricher.js');
enrichSyllabi(syllabiData);
for (const code of ['BSCS511','BIT201']) {
  const s = syllabiData.find(x=>x.code===code);
  console.log(code, 'assessments:', (s.assessments||[]).slice(0,5).map(a=>a.assessmentMethod).join(' | '));
}

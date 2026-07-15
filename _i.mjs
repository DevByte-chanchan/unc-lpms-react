globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const { syllabiData } = await import('./src/data/syllabiData.js');
const { enrichSyllabi } = await import('./src/data/syllabiDataEnricher.js');
enrichSyllabi(syllabiData);
for (const code of ['BSCS511','BIT201','IT 305']) {
  const s = syllabiData.find(x=>x.code===code);
  const byCo={}; s.ilos.forEach(i=>{const co=i.id.split('-')[0];byCo[co]=(byCo[co]||0)+1;});
  console.log(code, '| total ILOs:', s.ilos.length, '| per CO:', JSON.stringify(byCo), '| ids:', s.ilos.map(i=>i.id).join(','));
}

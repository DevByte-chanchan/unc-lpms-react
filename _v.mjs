globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const { syllabiData } = await import('./src/data/syllabiData.js');
const { enrichSyllabi } = await import('./src/data/syllabiDataEnricher.js');
enrichSyllabi(syllabiData);
for (const code of ['BSCS511','BSCS515','IT 411','BIT201']) {
  const s = syllabiData.find(x=>x.code===code);
  const descs = s.courseOutcomes.map(c=>c.description);
  const dup = new Set(descs.map(d=>d.toLowerCase())).size !== descs.length;
  const empty = s.courseOutcomes.some(c=>!(c.poMappings||[]).some(v=>v&&v.trim()));
  console.log(code, '| COs:'+s.courseOutcomes.length, '| dupDesc:'+dup, '| anyEmptyMapping:'+empty);
}
const s = syllabiData.find(x=>x.code==='BSCS511');
console.log('\nBSCS511 after repair:');
s.courseOutcomes.forEach(c=>console.log(' ',c.id, JSON.stringify(c.poMappings), '|', c.description.slice(0,55)));

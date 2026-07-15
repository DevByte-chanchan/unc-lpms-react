globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const { syllabiData } = await import('./src/data/syllabiData.js');
const { enrichSyllabi } = await import('./src/data/syllabiDataEnricher.js');
enrichSyllabi(syllabiData);
const s = syllabiData.find(x=>x.code==='BSCS511');
console.log('BSCS511 gradingSystem:');
s.gradingSystem.forEach(g=>{
  console.log(' ', g.co, '->', g.ilos.map(i=>`${i.id}(${Object.entries(i.weight).find(([k,v])=>v)?.join(':')||'-'})[${i.assessments.join(',')}]`).join('  '));
});
console.log('has description:', !!s.description, '|', s.description.slice(0,40));

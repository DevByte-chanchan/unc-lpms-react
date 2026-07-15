globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const { syllabiData } = await import('./src/data/syllabiData.js');
const s = syllabiData.find(x=>x.code==='BSCS511');
console.log('BSCS511 courseOutcomes:');
(s.courseOutcomes||[]).forEach(co=>console.log(' ', co.id, '| poMappings len='+(co.poMappings||[]).length, JSON.stringify(co.poMappings), '|', String(co.description).slice(0,50)));

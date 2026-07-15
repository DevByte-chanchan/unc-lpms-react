globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const { syllabiData, getSyllabusByCode } = await import('./src/data/syllabiData.js');
const { enrichSyllabi } = await import('./src/data/syllabiDataEnricher.js');
enrichSyllabi(syllabiData);
const gs = syllabiData.find(x=>x.code==='BSCS515').gradingSystem;
console.log('BSCS515 static gradingSystem ILOs/CO:', gs.map(g=>`${g.co}:${g.ilos.length}`).join(' '));
console.log('CO1 weights:', gs[0].ilos.map(i=>Object.values(i.weight).find(v=>v)||'-').join('/'));

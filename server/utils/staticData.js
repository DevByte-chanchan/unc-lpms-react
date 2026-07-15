const path = require('path');

let syllabiCache = null;

function loadSyllabi() {
  if (syllabiCache) return syllabiCache;
  const { syllabiData } = require(path.join(__dirname, '../../src/data/syllabiData.js'));
  syllabiCache = syllabiData;
  return syllabiCache;
}

function getSyllabusByCode(code) {
  const data = loadSyllabi();
  return data.find(s => s.code === code) || null;
}

function getCourseDetails(code) {
  const s = getSyllabusByCode(code);
  if (!s) return null;
  return {
    code: s.code, name: s.name, description: s.description || '',
    credits: s.credits || '', contact: s.contact || '',
    prerequisites: s.prerequisites || '', class: s.class || '',
    cmo: s.cmo || '', revision: s.revision || 0,
    year: s.year || '', sem: s.sem || ''
  };
}

function getILOs(code) {
  const s = getSyllabusByCode(code);
  if (!s || !s.ilos) return null;
  const ilos = s.ilos.map(ilo => ({
    id: ilo.id, co_id: ilo.id ? ilo.id.split('-')[0].replace('CO', '') : '',
    description: ilo.intendedLearningOutcome || ilo.description || '',
    hours: ilo.allocatedTime || ''
  }));
  const courseOutcomes = [];
  const coMap = {};
  for (const ilo of s.ilos) {
    const coId = ilo.id ? ilo.id.split('-')[0] : 'CO1';
    if (!coMap[coId]) {
      coMap[coId] = { co_id: coId, description: ilo.courseOutcome || '', ilos: [] };
      courseOutcomes.push(coMap[coId]);
    }
    coMap[coId].ilos.push({
      id: ilo.id, co_id: coId,
      description: ilo.intendedLearningOutcome || '',
      hours: ilo.allocatedTime || ''
    });
  }
  return { course: { course_no: s.code }, courseOutcomes };
}

function getCourseOutcomeAlignment(code) {
  const s = getSyllabusByCode(code);
  if (!s || !s.courseOutcomes) return null;
  const poKeys = [];
  if (s.courseOutcomes[0] && s.courseOutcomes[0].poMappings) {
    s.courseOutcomes[0].poMappings.forEach((_, idx) => {
      poKeys.push({ key: `PO${idx + 1}`, po_id: idx + 1, description: '' });
    });
  }
  return {
    course: { code: s.code, title: s.name },
    programOutcomes: poKeys,
    courseOutcomes: (s.courseOutcomes || []).map(co => ({
      id: co.id, description: co.description, poMappings: co.poMappings || []
    }))
  };
}

function getCourseCoverage(code) {
  const s = getSyllabusByCode(code);
  if (!s || !s.ilos) return null;
  const ilos = (s.ilos || []).map(ilo => ({
    id: ilo.id,
    intendedLearningOutcome: ilo.intendedLearningOutcome || '',
    deliveryWeek: ilo.deliveryWeek || '',
    allocatedTime: ilo.allocatedTime || '',
    topics: ilo.topics || [],
    references: ilo.references || []
  }));
  const topicSet = new Set();
  (s.ilos || []).forEach(ilo => (ilo.topics || []).forEach(t => topicSet.add(t)));
  const topics = Array.from(topicSet).map((title, idx) => ({
    id: idx + 1, title, iloId: null, subtopics: [], tlas: []
  }));
  return { ilos, topics, assessments: [] };
}

function getCourseCriteria(code) {
  const s = getSyllabusByCode(code);
  if (!s) return null;
  if (s.gradingSystem) {
    return { gradingSystem: s.gradingSystem };
  }
  const emptyGrading = Array.from({ length: 4 }, (_, i) => ({
    co: `CO${i + 1}`,
    ilos: Array.from({ length: 3 }, (_, j) => ({
      id: `ILO${j + 1}`,
      assessments: '',
      weight: { prelim: '', midterm: '', semi: '', final: '' },
      minPassing: 60
    }))
  }));
  return { gradingSystem: emptyGrading };
}

function getReferences(code) {
  const s = getSyllabusByCode(code);
  if (!s || !s.references) return null;
  const textbooks = [];
  const oer = [];
  const onlineResources = [];
  const allReferences = [];
  for (const ref of s.references) {
    const item = { id: ref.id, title: ref.title, authors: ref.authors || '-', isbn: ref.isbn || '-', link: ref.link || '#', year: ref.year || '-', type: ref.type || 'Textbook' };
    allReferences.push(item);
    if (ref.type === 'Textbook') textbooks.push(item);
    else if (ref.type === 'Open Educational Resources') oer.push(item);
    else if (ref.type === 'Online Resources') onlineResources.push(item);
    else textbooks.push(item);
  }
  return { references: allReferences, Textbook: textbooks, "Open Educational Resources": oer, "Online Resources": onlineResources };
}

module.exports = { getSyllabusByCode, getCourseDetails, getILOs, getCourseOutcomeAlignment, getCourseCoverage, getCourseCriteria, getReferences };

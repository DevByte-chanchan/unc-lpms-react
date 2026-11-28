/**
 * Loading the kept Program of Study PDFs (components/ProgramOfStudy.jsx draws them).
 *
 *   useProgramOfStudy({ programId } | { courseCode, periodId }, refreshKey)
 *     → { data: { active, previous, program_id } | null, loading, error }
 *   shortEffectivity("1st Semester SY 2022-2023") → "1st Sem SY 2022–2023"
 */
import React from 'react';
import { CurriculumDocumentsAPI } from './api.js';

export const shortEffectivity = (s) => String(s || '').replace(/\bSemester\b/i, 'Sem').replace(/(\d{4})-(\d{4})/, '$1–$2');

export function useProgramOfStudy({ programId, courseCode, periodId } = {}, refreshKey = 0) {
  const [state, setState] = React.useState({ data: null, loading: false, error: null });
  React.useEffect(() => {
    let cancelled = false;
    const ask = programId ? CurriculumDocumentsAPI.list(programId)
      : (courseCode && periodId ? CurriculumDocumentsAPI.forCourse(courseCode, periodId) : null);
    if (!ask) { setState({ data: null, loading: false, error: null }); return undefined; }
    setState((s) => ({ ...s, loading: true, error: null }));
    ask
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch((err) => { if (!cancelled) setState({ data: null, loading: false, error: err.message || 'Could not load the Program of Study.' }); });
    return () => { cancelled = true; };
  }, [programId, courseCode, periodId, refreshKey]);
  return state;
}

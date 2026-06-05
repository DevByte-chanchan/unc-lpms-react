/**
 * useHeadProgram — resolve the program(s) the signed-in Program Head is
 * assigned to in a given period (the same resolution the Course Offerings page
 * uses), so any page can show "which program am I in" and scope to it.
 *
 * Resolves via the Dean's assignment: ProgramsAPI.listForHead(period, {
 * headId, headName }), where headId/headName come from CurrentUser (stubbed
 * until real auth). Also resolves the program's department code for a subtitle.
 *
 * Returns:
 *   myPrograms          Program[] the user heads this term
 *   programsLoaded      true once the lookup has settled
 *   selectedProgramId   currently-shown program id (defaults to the first)
 *   setSelectedProgramId(id)
 *   currentProgram      the selected Program | null
 *   hasMultiplePrograms boolean
 *   noProgramAssigned   true when settled with zero programs (blocked state)
 *   programCode/Name    identity strings (null until resolved)
 *   departmentCode      e.g. "SCIS" | null
 *   programSubtitle     "Full Name · DEPT" | ''
 */
import React from 'react';
import { useCurrentUser } from './currentUser.jsx';
import { ProgramsAPI, DepartmentsAPI } from './api.js';

export function useHeadProgram(periodId) {
  const { name: userName, facultyId, facultyLoaded } = useCurrentUser();

  const [myPrograms, setMyPrograms] = React.useState([]);
  const [programsLoaded, setProgramsLoaded] = React.useState(false);
  const [selectedProgramId, setSelectedProgramId] = React.useState(null);

  React.useEffect(() => {
    // Wait for the per-period faculty resolution so head_id is available.
    if (!periodId || !facultyLoaded) { setMyPrograms([]); setProgramsLoaded(false); return undefined; }
    let cancelled = false;
    setProgramsLoaded(false);
    ProgramsAPI.listForHead(periodId, { headId: facultyId, headName: userName })
      .then((rows) => { if (!cancelled) { setMyPrograms(Array.isArray(rows) ? rows : []); setProgramsLoaded(true); } })
      .catch(() => { if (!cancelled) { setMyPrograms([]); setProgramsLoaded(true); } });
    return () => { cancelled = true; };
  }, [periodId, facultyLoaded, facultyId, userName]);

  // Keep a valid selection as the program set changes (default to the first).
  React.useEffect(() => {
    setSelectedProgramId((prev) => (prev && myPrograms.some((p) => p.id === prev) ? prev : (myPrograms[0] ? myPrograms[0].id : null)));
  }, [myPrograms]);

  const currentProgram = React.useMemo(
    () => myPrograms.find((p) => p.id === selectedProgramId) || null,
    [myPrograms, selectedProgramId],
  );

  // Department code for the subtitle.
  const [departments, setDepartments] = React.useState([]);
  React.useEffect(() => {
    if (!periodId) { setDepartments([]); return undefined; }
    let cancelled = false;
    DepartmentsAPI.list(periodId)
      .then((rows) => { if (!cancelled) setDepartments(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (!cancelled) setDepartments([]); });
    return () => { cancelled = true; };
  }, [periodId]);
  const departmentCode = React.useMemo(() => {
    if (!currentProgram || currentProgram.department_id == null) return null;
    const d = departments.find((x) => x.id === currentProgram.department_id);
    return d ? (d.code || d.name || null) : null;
  }, [departments, currentProgram]);

  const programName = currentProgram ? currentProgram.name : null;

  return {
    userName,
    myPrograms,
    programsLoaded,
    selectedProgramId,
    setSelectedProgramId,
    currentProgram,
    hasMultiplePrograms: myPrograms.length > 1,
    noProgramAssigned: !!periodId && facultyLoaded && programsLoaded && myPrograms.length === 0,
    programCode: currentProgram ? currentProgram.code : null,
    programName,
    departmentCode,
    programSubtitle: [programName, departmentCode].filter(Boolean).join(' · '),
  };
}

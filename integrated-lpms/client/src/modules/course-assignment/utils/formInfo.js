// The ISO identity of a printed form: its document control number, the form's own
// revision number and its effectivity date. These describe the FORM, not one
// document, and change only when the institution reissues the form.
// (Ported from feature/learning-plan-submissions-management-v2.)
export const DEFAULT_FORM_INFO = {
  syllabus: { docControlNo: 'UNC-FM-VPAA-01', revisionNo: '0', effectivity: '06/01/2024' },
  coaep: { docControlNo: 'UNC-FM-VPAA-02', revisionNo: '0', effectivity: '06/01/2024' },
  // From the Registrar's TOS form ([TOS] ACT222L FINAL(CASIMERO).docx, header1.xml).
  tos: { docControlNo: 'UNC-FM-VPAA-05', revisionNo: '0', effectivity: '06/01/2024' },
};

// Anything missing or malformed in a server response falls back to the default.
export const mergeFormInfo = (data) => {
  const merged = {};
  for (const key of Object.keys(DEFAULT_FORM_INFO)) {
    const incoming = data && typeof data === 'object' ? data[key] : null;
    merged[key] = { ...DEFAULT_FORM_INFO[key] };
    for (const field of Object.keys(DEFAULT_FORM_INFO[key])) {
      const value = incoming?.[field];
      if (typeof value === 'string' && value.trim() !== '') merged[key][field] = value.trim();
    }
  }
  return merged;
};

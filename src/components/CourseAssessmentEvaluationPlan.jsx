import React from 'react';

const THIN = '0.5pt solid #000';
const BB = { borderBottom: THIN };

/* ─── column widths ~proportional to original xlsx ─── */
/* A=10  B=24  C=90  D=110  E=290  F=210  G=180  H=10
   total content (B..G) = 904 px                             */
const COL = { B: 24, C: 90, D: 110, E: 290, F: 210, G: 180 };
const TOT = COL.B + COL.C + COL.D + COL.E + COL.F + COL.G;

/* ─── default data ─── */
const defaultData = {
  header: { facultyName: '', schoolYear: '2025-2026', course: '', semester: '1st Semester' },
  cos: [
    { number: '1.0', statement: '', ilos: [{ outcome: '', assessmentTool: '' }, { outcome: '', assessmentTool: '' }, { outcome: '', assessmentTool: '' }] },
    { number: '2.0', statement: '', ilos: [{ outcome: '', assessmentTool: '' }, { outcome: '', assessmentTool: '' }, { outcome: '', assessmentTool: '' }] },
    { number: '3.0', statement: '', ilos: [{ outcome: '', assessmentTool: '' }, { outcome: '', assessmentTool: '' }, { outcome: '', assessmentTool: '' }] },
    { number: '4.0', statement: '', ilos: [{ outcome: '', assessmentTool: '' }, { outcome: '', assessmentTool: '' }, { outcome: '', assessmentTool: '' }] },
  ],
  preparedBy: '', approvedBy: 'DENNIS E. IGNACIO (Program Head, BSIT)',
  dateSubmitted: '', approvalDate: 'September 13, 2025',
  reminders: 'This template should be accomplished for each course handled by the faculty.',
  notes: 'Course Outcomes and ILOs must be SMART; Each CO should be granularized into an introductory, enabling and demonstrative ILO; ILOs should NOT be teaching learning activities; Sample Performance target:  At least 70% of students with 60% proficiency or score 12 out of 20.',
  effectivityDate: '06/01/2024', revisionNo: '0', pageNo: '1 of Y',
  performanceTarget: 'At least 90% of enrolled students with a rating of at least 60% of the total score',
};

/* ─── base text style ─── */
const bodyCell = (ext) => ({
  fontFamily: 'Arial, sans-serif', fontSize: 11, lineHeight: 1.2, color: '#000',
  boxSizing: 'border-box', verticalAlign: 'top', padding: '2px 4px',
  ...ext,
});

const headerCell = (ext) => ({
  fontFamily: 'Arial, sans-serif', fontSize: 11, lineHeight: 1.2, color: '#000',
  boxSizing: 'border-box', verticalAlign: 'middle', fontWeight: 700, textAlign: 'center',
  padding: '2px 4px',
  ...ext,
});

/* ─── paper page wrapper ─── */
const PAPER = {
  width: TOT, background: '#fff',
  fontFamily: 'Arial, sans-serif',
  flexShrink: 0,
  padding: '14px 10px 10px',
  border: '1px solid #ccc',
  boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
};

/* ================================================================== */

const CourseAssessmentEvaluationPlan = ({ data: propData }) => {
  const d = { ...defaultData, ...propData, header: { ...defaultData.header, ...(propData?.header || {}) } };
  const cos = d.cos && d.cos.length > 0 ? d.cos : defaultData.cos;

  return (
    <div style={PAPER}>

      {/* ===== HEADER ===== */}
      <table style={{ width: TOT, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <tbody>
          <tr style={{ height: 6 }}><td colSpan={6} style={{ border: 'none', padding: 0 }} /></tr>

          {/* ---- row 2 : University name ---- */}
          <tr style={{ height: 20 }}>
            <td style={{ border: 'none', ...bodyCell({ padding: 0, verticalAlign: 'middle' }) }} rowSpan={4} colSpan={2}>
              <div style={{
                width: COL.B + COL.C, minHeight: 72,
                borderRight: THIN,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '4px 0',
              }}>
                <img src="/coaep-logo.png" alt="UNC" style={{ width: 72, height: 'auto', display: 'block' }} />
              </div>
            </td>
            <td style={{ border: 'none', ...bodyCell({ verticalAlign: 'middle', padding: 0 }) }} colSpan={2}>
              <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', letterSpacing: '0.03em' }}>
                UNIVERSITY OF NUEVA CACERES
              </div>
            </td>
            <td style={{ border: 'none', ...bodyCell({ padding: 0, verticalAlign: 'middle' }) }} rowSpan={4} colSpan={2}>
              <div style={{
                border: THIN, borderTop: 'none',
                padding: '3px 5px', minHeight: 72,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                fontSize: 9, fontWeight: 700, textAlign: 'center', lineHeight: 1.25,
              }}>
                Doc. Control No.:<br />UNC-FM-VPAA-02
              </div>
            </td>
          </tr>

          {/* ---- row 3 : Plan name ---- */}
          <tr style={{ height: 22 }}>
            <td style={{ border: 'none', ...bodyCell({ verticalAlign: 'middle', padding: 0 }) }} colSpan={2}>
              <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center' }}>
                COURSE ASSESSMENT &amp; EVALUATION PLAN
              </div>
            </td>
          </tr>

          {/* ---- row 4 : Form ---- */}
          <tr style={{ height: 15 }}>
            <td style={{ border: 'none', ...bodyCell({ verticalAlign: 'middle', padding: 0 }) }} colSpan={2}>
              <div style={{ fontSize: 11, textAlign: 'center' }}>Form</div>
            </td>
          </tr>

          {/* ---- row 5 : Office ---- */}
          <tr style={{ height: 15 }}>
            <td style={{ border: 'none', ...bodyCell({ verticalAlign: 'middle', padding: 0 }) }} colSpan={2}>
              <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
                Office of the Vice President for Academic Affairs
              </div>
            </td>
          </tr>

          <tr style={{ height: 6 }}><td colSpan={6} style={{ border: 'none', padding: 0 }} /></tr>
        </tbody>
      </table>

      {/* ===== METADATA ===== */}
      <table style={{ width: TOT, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <tbody>
          <tr style={{ height: 20 }}>
            <td style={{ border: 'none', ...bodyCell({ verticalAlign: 'bottom', whiteSpace: 'nowrap', padding: '0 2px 0 0' }) }}>
              Name of Faculty:
            </td>
            <td style={{ border: 'none', ...BB, ...bodyCell({ padding: '0 3px', minHeight: 16 }) }} colSpan={2}>
              {d.header.facultyName}
            </td>
            <td style={{ border: 'none', ...bodyCell({ textAlign: 'right', verticalAlign: 'bottom', whiteSpace: 'nowrap', padding: '0 2px 0 0' }) }}>
              School Year
            </td>
            <td style={{ border: 'none', ...BB, ...bodyCell({ padding: '0 3px', minHeight: 16 }) }} colSpan={2}>
              {d.header.schoolYear}
            </td>
          </tr>
          <tr style={{ height: 20 }}>
            <td style={{ border: 'none', ...bodyCell({ verticalAlign: 'bottom', whiteSpace: 'nowrap', padding: '0 2px 0 0' }) }}>
              Course:
            </td>
            <td style={{ border: 'none', ...BB, ...bodyCell({ padding: '0 3px', minHeight: 16 }) }} colSpan={2}>
              {d.header.course}
            </td>
            <td style={{ border: 'none', ...bodyCell({ textAlign: 'right', verticalAlign: 'bottom', whiteSpace: 'nowrap', padding: '0 2px 0 0' }) }}>
              Semester
            </td>
            <td style={{ border: 'none', ...BB, ...bodyCell({ padding: '0 3px', minHeight: 16 }) }} colSpan={2}>
              {d.header.semester}
            </td>
          </tr>
          <tr style={{ height: 5 }}><td colSpan={6} style={{ border: 'none', padding: 0 }} /></tr>
        </tbody>
      </table>

      {/* ===== MAIN TABLE ===== */}
      <table style={{ width: TOT, borderCollapse: 'collapse', tableLayout: 'fixed', border: THIN }}>
        <colgroup>
          <col style={{ width: COL.B }} />
          <col style={{ width: COL.C }} />
          <col style={{ width: COL.D }} />
          <col style={{ width: COL.E }} />
          <col style={{ width: COL.F }} />
          <col style={{ width: COL.G }} />
        </colgroup>
        <thead>
          <tr style={{ height: 22 }}>
            <th style={{ border: THIN, ...headerCell({ width: COL.B }) }}>
              CO #
            </th>
            <th style={{ border: THIN, ...headerCell({ }) }} colSpan={2}>
              Course Outcome Statement
            </th>
            <th style={{ border: THIN, ...headerCell({ width: COL.E }) }}>
              Intended Learning Outcome
            </th>
            <th style={{ border: THIN, ...headerCell({ width: COL.F }) }}>
              Assessment Tool
            </th>
            <th style={{ border: THIN, ...headerCell({ width: COL.G }) }}>
              Performance Target
            </th>
          </tr>
        </thead>
        <tbody>
          {cos.map((co, coIdx) => {
            const ilos = co.ilos && co.ilos.length > 0 ? co.ilos : [{ outcome: '', assessmentTool: '' }];
            const n = ilos.length;
            return ilos.map((ilo, iloIdx) => (
              <tr key={`${coIdx}-${iloIdx}`} style={{ height: 40 }}>
                {iloIdx === 0 && (
                  <td style={{ border: THIN, ...bodyCell({ textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, padding: '2px 2px' }) }}
                      rowSpan={n}>
                    {co.number}
                  </td>
                )}
                {iloIdx === 0 && (
                  <td style={{ border: THIN, ...bodyCell({ verticalAlign: 'top' }) }}
                      colSpan={2} rowSpan={n}>
                    {co.statement}
                  </td>
                )}
                <td style={{ border: THIN, ...bodyCell({ verticalAlign: 'top' }) }}>
                  {ilo.outcome}
                </td>
                <td style={{ border: THIN, ...bodyCell({ verticalAlign: 'top' }) }}>
                  {ilo.assessmentTool}
                </td>
                <td style={{ border: THIN, ...bodyCell({ verticalAlign: 'top' }) }}>
                  {d.performanceTarget}
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>

      <div style={{ height: 5 }} />

      {/* ===== FOOTER ===== */}
      <table style={{ width: TOT, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <tbody>
          <tr style={{ height: 20 }}>
            <td style={{ border: 'none', ...bodyCell({ verticalAlign: 'bottom', whiteSpace: 'nowrap', padding: '0 2px 0 0' }) }}>
              Prepared by:
            </td>
            <td style={{ border: 'none', ...BB, ...bodyCell({ padding: '0 3px', minHeight: 16 }) }} colSpan={2}>
              {d.preparedBy}
            </td>
            <td style={{ border: 'none', ...BB, ...bodyCell({ padding: '0 3px', minHeight: 16 }) }} colSpan={3}>
              {d.approvedBy}
            </td>
          </tr>
          <tr style={{ height: 20 }}>
            <td style={{ border: 'none', ...bodyCell({ verticalAlign: 'bottom', whiteSpace: 'nowrap', padding: '0 2px 0 0' }) }}>
              Date Submitted:
            </td>
            <td style={{ border: 'none', ...BB, ...bodyCell({ padding: '0 3px', minHeight: 16 }) }} colSpan={2}>
              {d.dateSubmitted}
            </td>
            <td style={{ border: 'none', ...BB, ...bodyCell({ padding: '0 3px', minHeight: 16 }) }} colSpan={3}>
              Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{d.approvalDate}
            </td>
          </tr>
          <tr style={{ height: 8 }}><td colSpan={6} style={{ border: 'none', padding: 0 }} /></tr>
          <tr>
            <td style={{ border: 'none', ...bodyCell({ verticalAlign: 'top', padding: 0 }) }} colSpan={6}>
              <span style={{ fontWeight: 700 }}>Reminders:</span>  {d.reminders}
            </td>
          </tr>
          <tr>
            <td style={{ border: 'none', ...bodyCell({ fontSize: 10, lineHeight: 1.3, padding: '1px 0' }) }} colSpan={6}>
              {d.notes}
            </td>
          </tr>
          <tr style={{ height: 6 }}><td colSpan={6} style={{ border: 'none', padding: 0 }} /></tr>
          <tr style={{ height: 16 }}>
            <td style={{ border: 'none', ...bodyCell({ fontSize: 9, whiteSpace: 'nowrap', padding: '0 2px 0 0' }) }} colSpan={2}>
              Effectivity Date:&nbsp; {d.effectivityDate}
            </td>
            <td style={{ border: 'none', ...bodyCell({ fontSize: 9, textAlign: 'center', padding: '0 2px' }) }} colSpan={2}>
              Revision No.: {d.revisionNo}
            </td>
            <td style={{ border: 'none', ...bodyCell({ fontSize: 9, textAlign: 'right', padding: '0 0 0 2px' }) }} colSpan={2}>
              Page No.: {d.pageNo}
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  );
};

export default CourseAssessmentEvaluationPlan;

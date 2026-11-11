/**
 * The rows of sample-uploads/school_calendar_2026-2027.png (UNC, ACADEMIC YEAR
 * 2026-2027), transcribed BY HAND from the picture — the transcript every reader
 * produces (see utils/schoolCalendarParse.js). The "NO. OF SCHOOL DAYS" boxes on
 * the left are not semester blocks and are left out.
 */
export const CALENDAR_2026_ROWS = {
  schoolYear: 'ACADEMIC YEAR 2026-2027',
  blocks: [
    {
      title: 'FIRST SEMESTER SY 2026-2027',
      rangeText: 'July 20 to Nov 25, 2026',
      rows: [
        { dateText: 'Apr 15', event: 'Start of Enrollment' },
        { dateText: 'Jul 18', event: 'End of Enrollment' },
        { dateText: 'May to Jun', event: 'Faculty Retooling' },
        { dateText: 'Jul 20', event: 'First day of Classes' },
        { dateText: 'Jul 20-25', event: 'Orientation Week' },
        { dateText: 'Aug 20, 22, 24-25', event: 'Prelim Examination' },
        { dateText: 'Sept 11, 16-19, 21', event: 'Peñafrancia Fiesta' },
        { dateText: 'Sept 25-29', event: 'Midterm Examination' },
        { dateText: 'Sept 30', event: 'Wellness Break' },
        { dateText: 'Oct 1-3', event: 'Institutional Student Fair/ College Days: SSNS CJE STEd' },
        { dateText: 'Oct 8', event: 'Deadline of Submission of Midterm Grade' },
        { dateText: 'Oct 23-27', event: 'Semi-Final Examination' },
        { dateText: 'Oct 29-31', event: 'Skills Summit/Project Exhibit/ College Days: SCIS SNAHS' },
        { dateText: 'Nov 21-25', event: 'Final Examination' },
        { dateText: 'Nov 25', event: 'Last day of classes' },
        { dateText: 'Nov 26-Dec 7', event: 'Semestral Break' },
        { dateText: 'Dec 5', event: 'Deadline of Submission FG/ Faculty & Student Clearance' },
      ],
    },
    {
      title: 'SECOND SEMESTER SY 2026-2027',
      rangeText: 'Dec 9, 2026 to Apr 24, 2027',
      rows: [
        { dateText: 'Nov 15', event: 'Start of Enrollment' },
        { dateText: 'Dec 7', event: 'End of Enrollment' },
        { dateText: 'Dec 9', event: 'First day of Classes' },
        { dateText: 'Dec 9-15', event: 'Orientation Week' },
        { dateText: 'Jan 15-19', event: 'Prelim Examination' },
        { dateText: 'Feb 12-16', event: 'Midterm Examination' },
        { dateText: 'Feb 17', event: 'Wellness Break' },
        { dateText: 'Feb 18-20', event: 'Institutional Student Fair/ College Days: CEA' },
        { dateText: 'Feb 25', event: 'Deadline of Submission of Midterm Grade' },
        { dateText: 'Mar 12-16', event: 'Semi-final Examination' },
        { dateText: 'Mar 18-20', event: 'Skills Summit/Project Exhibit/ College Days: SBA' },
        { dateText: 'Apr 12-15', event: 'Final Exam (Graduating)' },
        { dateText: 'Apr 16', event: 'Deadline of Submission of FG & Clearance (Graduating)' },
        { dateText: 'Apr 21-24', event: 'Final Examination (Undergrad)' },
        { dateText: 'Apr 24', event: 'Last day of classes' },
        { dateText: 'Apr 26-May 3', event: 'Summer Break' },
        { dateText: 'May 4', event: 'Deadline of Submission FG (Undergrad)' },
      ],
    },
    {
      title: 'Summer 2027',
      rangeText: 'May 4 to Jun 14, 2027',
      rows: [
        { dateText: 'April 19', event: 'Start of Enrollment' },
        { dateText: 'May 3', event: 'End of Enrollment' },
        { dateText: 'May 4', event: 'First day of Classes' },
        { dateText: 'May 22-25', event: 'Midterm Examination' },
        { dateText: 'Jun 10-11,14', event: 'Final Examination' },
        { dateText: 'Jun 14', event: 'Last day of classes' },
        { dateText: 'Jun 23', event: 'Deadline of Submission Final Grades' },
      ],
    },
  ],
};

/** What the sample must give, per semester (the brief's table). */
export const EXPECTED_2026 = {
  '1': {
    start_date: '2026-07-20', end_date: '2026-11-25', classes_start: '2026-07-20',
    prelim_exam: '2026-08-20', midterm_exam: '2026-09-25', semifinal_exam: '2026-10-23', final_exam: '2026-11-21',
  },
  '2': {
    start_date: '2026-12-09', end_date: '2027-04-24', classes_start: '2026-12-09',
    prelim_exam: '2027-01-15', midterm_exam: '2027-02-12', semifinal_exam: '2027-03-12', final_exam: '2027-04-21',
  },
  Summer: {
    start_date: '2027-05-04', end_date: '2027-06-14', classes_start: '2027-05-04',
    prelim_exam: '', midterm_exam: '2027-05-22', semifinal_exam: '', final_exam: '2027-06-10',
  },
};

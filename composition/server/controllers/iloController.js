// controllers/iloController.js
const { Course, ProgramCourseOffering, CourseOutcome, IntendedLearningOutcome, Week } = require('../models');

async function getILOsByPcOffering(req, res) {
    try {
        const { pcId, revNum } = req.params;
        if (!pcId || !revNum) {
            return res.status(400).json({ message: 'pcId and revNum are required' });
        }

        // 1) Find the program course offering version and include course configuration details
        const pco = await ProgramCourseOffering.findOne({
            where: { pc_offering_id: pcId, revision_number: revNum },
            include: [{ model: Course, attributes: ['course_id', 'course_no', 'credit', 'contact_hrs'] }]
        });

        if (!pco) {
            return res.status(404).json({ message: 'Program course offering version not found' });
        }
        const course = pco.Course;

        // 2) Parse Course Credits & Contact Hours (e.g., credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab')
        let lecCredits = 0;
        let labCredits = 0;
        if (course.credit) {
            const lecMatch = course.credit.match(/(\d+)\s*LEC/i);
            const labMatch = course.credit.match(/(\d+)\s*LAB/i);
            if (lecMatch) lecCredits = parseInt(lecMatch[1], 10);
            if (labMatch) labCredits = parseInt(labMatch[1], 10);
        }
        if (lecCredits === 0 && labCredits === 0) {
            // Default fallback if parse fails
            lecCredits = 3;
            labCredits = 0;
        }

        // 3) Calculate Academic Term Distributions (18 fixed weeks - 2 exam weeks = 16 academic weeks)
        let lecContactHours = lecCredits * 1;
        let labContactHours = labCredits * 3;
        if (course.contact_hrs) {
            const lecHrsMatch = course.contact_hrs.match(/(\d+)\s*Hrs?\s*Lec/i);
            const labHrsMatch = course.contact_hrs.match(/(\d+)\s*Hrs?\s*Lab/i);
            if (lecHrsMatch) lecContactHours = parseInt(lecHrsMatch[1], 10);
            if (labHrsMatch) labContactHours = parseInt(labHrsMatch[1], 10);
        }

        const totalWeeklyContactHours = lecContactHours + labContactHours || 3;
        const totalSemesterWeeks = 18;
        const totalAcademicTermHours = totalWeeklyContactHours * totalSemesterWeeks;
        const bufferWeeks = 2;
        const bufferHours = bufferWeeks * totalWeeklyContactHours;
        const netTeachingHours = totalAcademicTermHours - bufferHours;

        // First session of Week 1 (Lecture contact hours, e.g., 2 hrs for '2 Hrs Lec, 3 Hrs Lab') is dedicated to Course Orientation
        const defaultOrientationHours = lecContactHours > 0 ? lecContactHours : 2;

        // 4) Get course outcomes specifically bound to this pc_offering_id
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcId },
            attributes: ['co_id', 'pc_offering_id', 'co_description'],
            order: [['co_id', 'ASC']]
        });

        const coIds = courseOutcomes.map(co => co.co_id);

        // 5) Get all Weeks and ILOs for those course outcomes
        const [weeks, ilos] = await Promise.all([
            coIds.length > 0
                ? Week.findAll({
                      where: { co_id: coIds },
                      attributes: ['week_id', 'co_id', 'hours'],
                      order: [['co_id', 'ASC'], ['week_id', 'ASC']]
                  })
                : [],
            coIds.length > 0
                ? IntendedLearningOutcome.findAll({
                      where: { co_id: coIds },
                      attributes: ['ilo_id', 'co_id', 'description', 'is_orientation', 'hours', 'weeks'],
                      order: [['co_id', 'ASC'], ['ilo_id', 'ASC']]
                  })
                : []
        ]);

        // Group weeks by Course Outcome
        const weeksByCo = {};
        for (const co of courseOutcomes) {
            weeksByCo[co.co_id] = [];
        }
        for (const week of weeks) {
            if (!weeksByCo[week.co_id]) weeksByCo[week.co_id] = [];
            weeksByCo[week.co_id].push(week);
        }

        // Group ILOs by Course Outcome
        const ilosByCo = {};
        for (const co of courseOutcomes) {
            ilosByCo[co.co_id] = [];
        }
        for (const ilo of ilos) {
            if (!ilosByCo[ilo.co_id]) ilosByCo[ilo.co_id] = [];
            const isOrientation = Boolean(ilo.is_orientation);
            ilosByCo[ilo.co_id].push({
                id: ilo.ilo_id,
                co_id: ilo.co_id,
                description: ilo.description,
                isOrientation: isOrientation,
                hours: isOrientation ? (ilo.hours ? Number(ilo.hours) : defaultOrientationHours) : (ilo.hours ? Number(ilo.hours) : 0),
                formattedWeekStr: isOrientation ? 'Week 1' : (ilo.weeks ? `Week ${ilo.weeks}` : '')
            });
        }

        // 6) Compute week span and total hours per Course Outcome based on Weeks table records
        let currentWeek = 1;
        const resultCourseOutcomes = courseOutcomes.map((co, coIndex) => {
            const coWeeks = weeksByCo[co.co_id] || [];
            const weekCount = coWeeks.length;
            const coIlos = ilosByCo[co.co_id] || [];

            let formattedWeekStr = '';
            if (weekCount > 0) {
                const startWeek = currentWeek;
                const endWeek = currentWeek + weekCount - 1;
                currentWeek = endWeek + 1;

                formattedWeekStr = startWeek === endWeek
                    ? `Week ${startWeek}`
                    : `Week ${startWeek}-${endWeek}`;
            }

            // Special case for Course Outcome 1 (which shares Week 1 with Course Orientation):
            // Week 1 has two sessions (e.g. 2 hrs Lecture for Orientation + 3 hrs Lab for CO1),
            // so CO1's total hours is (weekCount * totalWeeklyContactHours) - orientationHours (e.g. 20 - 2 = 18 hrs).
            const orientationIlo = coIlos.find(i => i.isOrientation);
            const orientationDeduction = (coIndex === 0 || orientationIlo)
                ? (orientationIlo ? Number(orientationIlo.hours) : defaultOrientationHours)
                : 0;

            const rawCoHours = weekCount * totalWeeklyContactHours;
            const coHours = Math.max(0, rawCoHours - orientationDeduction);

            return {
                co_id: co.co_id,
                pc_offering_id: co.pc_offering_id,
                description: co.co_description,
                weekCount: weekCount,
                hours: coHours,
                formattedWeekStr: formattedWeekStr,
                weeks: coWeeks.map((w, wIdx) => ({
                    week_id: w.week_id,
                    co_id: w.co_id,
                    hours: (wIdx === 0 && orientationDeduction > 0)
                        ? Math.max(0, Number(w.hours) - orientationDeduction)
                        : Number(w.hours)
                })),
                ilos: coIlos
            };
        });

        return res.json({
            course: {
                course_id: course.course_id,
                course_no: course.course_no,
                lecCredits: lecCredits,
                labCredits: labCredits,
                lecContactHours: lecContactHours,
                labContactHours: labContactHours,
                weeklyContactHours: totalWeeklyContactHours,
                netTeachingHours: netTeachingHours
            },
            courseOutcomes: resultCourseOutcomes
        });
    } catch (err) {
        console.error('getILOsByPcOffering error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getILOsByPcOffering };

// controllers/iloController.js
const { Course, ProgramCourseOffering, CourseOutcome, IntendedLearningOutcome } = require('../models');

async function getILOsByPcOffering(req, res) {
    try {
        const { pcId, revNum } = req.params;
        if (!pcId || !revNum) {
            return res.status(400).json({ message: 'pcId and revNum are required' });
        }

        // 1) Find the program course offering version and include course configuration details
        const pco = await ProgramCourseOffering.findOne({
            where: { pc_offering_id: pcId, revision_number: revNum },
            include: [{ model: Course, attributes: ['course_id', 'course_no', 'credit'] }]
        });

        if (!pco) {
            return res.status(404).json({ message: 'Program course offering version not found' });
        }
        const course = pco.Course;

        // 2) Parse Course Credits
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

        // 3) Calculate Academic Term Distributions
        const lecContactHours = lecCredits * 1;
        const labContactHours = labCredits * 3;
        const totalWeeklyContactHours = lecContactHours + labContactHours || 3;
        const totalSemesterWeeks = 18;
        const totalAcademicTermHours = totalWeeklyContactHours * totalSemesterWeeks;
        const bufferWeeks = 2;
        const bufferHours = bufferWeeks * totalWeeklyContactHours;
        const netTeachingHours = totalAcademicTermHours - bufferHours;

        // 4) Get course outcomes specifically bound to this pc_offering_id
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcId },
            attributes: ['co_id', 'pc_offering_id', 'co_description'],
            order: [['co_id', 'ASC']]
        });
        
        const hoursPerCO = courseOutcomes.length > 0 ? (netTeachingHours / courseOutcomes.length) : 0;

        // 5) Get all ILOs for those course outcomes
        const coIds = courseOutcomes.map(co => co.co_id);
        const ilos = await IntendedLearningOutcome.findAll({
            where: { co_id: coIds },
            attributes: ['ilo_id', 'co_id', 'description', 'is_orientation'],
            order: [['co_id', 'ASC'], ['ilo_id', 'ASC']]
        });

        // 6) Get ILO Weights from Database via SQL Group By
        let weightMap = {};
        if (coIds.length > 0) {
            const DB = pco.sequelize;
            const iloWeightsRaw = await DB.query(`
                SELECT 
                    ilo.ilo_id, 
                    MAX(CAST(a.weight AS UNSIGNED)) as explicit_weight 
                FROM IntendedLearningOutcomes ilo
                LEFT JOIN ILOTopics it ON ilo.ilo_id = it.ilo_id
                LEFT JOIN TopicTLAs tt ON it.ilo_topic_id = tt.ilo_topic_id
                LEFT JOIN TLAAssessments a ON tt.tla_id = a.tla_id
                WHERE ilo.co_id IN (:coIds)
                GROUP BY ilo.ilo_id
            `, {
                replacements: { coIds: coIds },
                type: DB.QueryTypes.SELECT
            });

            for (let row of iloWeightsRaw) {
                weightMap[row.ilo_id] = row.explicit_weight || 0;
            }
        }

        // 7) Distribute hours sequentially per ILO
        let currentWeekFloat = 0.0;
        const ilosByCo = {};
        
        for (const co of courseOutcomes) {
            ilosByCo[co.co_id] = [];
        }

        for (const ilo of ilos) {
            let baseWeight = weightMap[ilo.ilo_id] || 0;
            let weightPercentage = baseWeight;

            let iloAllocatedHours = hoursPerCO * (weightPercentage / 100);
            let iloDurationWeeks = iloAllocatedHours / totalWeeklyContactHours;
            
            let duration = parseFloat(iloDurationWeeks.toFixed(1));
            
            let startWeekFloat = currentWeekFloat;
            let endWeekFloat = startWeekFloat + duration;
            
            let startWeek = Math.floor(startWeekFloat) + 1;
            let endWeek = Math.ceil(endWeekFloat);
            
            if (duration === 0) endWeek = startWeek;
            
            let formattedWeekStr = '';
            if (startWeek === endWeek) {
                formattedWeekStr = `Week ${startWeek}`;
            } else if (endWeek - startWeek === 1) {
                formattedWeekStr = `Week ${startWeek} and ${endWeek}`;
            } else {
                formattedWeekStr = `Weeks ${startWeek} to ${endWeek}`;
            }
            
            currentWeekFloat = endWeekFloat;

            if (!ilosByCo[ilo.co_id]) ilosByCo[ilo.co_id] = [];
            ilosByCo[ilo.co_id].push({
                id: ilo.ilo_id,
                co_id: ilo.co_id,
                description: ilo.description,
                isOrientation: ilo.is_orientation,
                hours: Math.round(iloAllocatedHours),
                formattedWeekStr: formattedWeekStr
            });
        }

        const resultCourseOutcomes = courseOutcomes.map(co => ({
            co_id: co.co_id,
            pc_offering_id: co.pc_offering_id,
            description: co.co_description,
            ilos: ilosByCo[co.co_id] || []
        }));

        return res.json({
            course: { 
                course_id: course.course_id, 
                course_no: course.course_no,
                lecCredits: lecCredits,
                labCredits: labCredits
            },
            courseOutcomes: resultCourseOutcomes
        });
    } catch (err) {
        console.error('getILOsByPcOffering error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getILOsByPcOffering };

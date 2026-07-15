const { IntendedLearningOutcome } = require('../models');

exports.updateIloSchedule = async (req, res) => {
    try {
        const { ilo_id } = req.params;
        const { weeks, hours } = req.body;


        const ilo = await IntendedLearningOutcome.findByPk(ilo_id);

        if (!ilo) {
            return res.status(404).json({ message: "ILO not found" });
        }

        ilo.weeks = weeks;
        ilo.hours = hours;

        await ilo.save();

        res.status(200).json({
            message: "Schedule successfully updated",
            ilo
        });

    } catch (error) {
        console.error("Error updating ILO schedule:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
const { Topic, Subtopic, ILOTopic, sequelize } = require('../models');
const { Op } = require('sequelize');

// Fetch topics that are EITHER unassigned OR assigned to the current iloId
async function getAvailableTopics(req, res) {
    try {
        const iloId = Number(req.query.iloId);
        if (!iloId) return res.status(400).json({ message: 'iloId is required' });

        // Find all topic IDs that are currently assigned to OTHER ILOs
        const assignedToOthers = await ILOTopic.findAll({
            where: { ilo_id: { [Op.ne]: iloId } },
            attributes: ['topic_id']
        });
        const excludedTopicIds = assignedToOthers.map(t => t.topic_id);

        // Fetch topics not in the excluded list, include their subtopics
        const topics = await Topic.findAll({
            where: {
                topic_id: { [Op.notIn]: excludedTopicIds.length ? excludedTopicIds : [0] }
            },
            include: [{
                model: Subtopic,
                as: 'subtopics',
                attributes: ['subtopic_id', 'title', 'sequence_order']
            }],
            order: [['title', 'ASC']]
        });

        return res.json(topics);
    } catch (err) {
        console.error('getAvailableTopics error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Fetch currently assigned topics for a specific ILO
async function getAssignedTopics(req, res) {
    try {
        const iloId = Number(req.params.iloId);
        if (!iloId) return res.status(400).json({ message: 'iloId is required' });

        const assignments = await ILOTopic.findAll({
            where: { ilo_id: iloId },
            include: [{
                model: Topic,
                as: 'topic',
                include: [{
                    model: Subtopic,
                    as: 'subtopics',
                    attributes: ['subtopic_id', 'title', 'sequence_order']
                }]
            }]
        });

        // Map the array to extract the nested topic objects safely
        const assigned = assignments
            .map(a => a.topic)
            .filter(Boolean);

        // Sort the topics by title alphabetically for a clean UI presentation
        assigned.sort((a, b) => String(a.title).localeCompare(String(b.title)));

        return res.json(assigned);
    } catch (err) {
        console.error('getAssignedTopics error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Master sync function: Creates custom topics, updates edits, and manages assignments
async function assignTopicsToILO(req, res) {
    const t = await sequelize.transaction();
    try {
        const { ilo_id, topics } = req.body;
        if (!ilo_id || !Array.isArray(topics)) {
            await t.rollback();
            return res.status(400).json({ message: 'ilo_id and topics array are required' });
        }

        const finalTopicIds = [];

        // 1. Process each topic (Create or Update)
        for (const topicData of topics) {
            let currentTopicId = topicData.topic_id;

            if (!currentTopicId) {
                // It's a manual/custom topic from the frontend
                const newTopic = await Topic.create({
                    title: topicData.title,
                    ilo_id: ilo_id // Satisfies non-nullable FK on backend model
                }, { transaction: t });
                currentTopicId = newTopic.topic_id;
            } else {
                // It's an existing topic, update its title in case they edited it inline
                await Topic.update(
                    { title: topicData.title },
                    { where: { topic_id: currentTopicId }, transaction: t }
                );
            }

            finalTopicIds.push(currentTopicId);

            // Sync Subtopics: Delete existing ones first to clean the slate
            await Subtopic.destroy({ where: { topic_id: currentTopicId }, transaction: t });

            if (topicData.subtopics && topicData.subtopics.length > 0) {
                const subsToCreate = topicData.subtopics.map((s, idx) => ({
                    topic_id: currentTopicId,
                    title: s.title,
                    sequence_order: s.sequence_order ?? idx
                }));
                await Subtopic.bulkCreate(subsToCreate, { transaction: t });
            }
        }

        // 2. Re-map the relationships inside your ILOTopics junction table
        await ILOTopic.destroy({ where: { ilo_id }, transaction: t });

        if (finalTopicIds.length > 0) {
            const mappings = finalTopicIds.map(tid => ({
                ilo_id,
                topic_id: tid
            }));
            await ILOTopic.bulkCreate(mappings, { transaction: t });
        }

        await t.commit();
        return res.json({ message: 'Topics successfully assigned', assignedCount: finalTopicIds.length });
    } catch (err) {
        await t.rollback();
        console.error('assignTopicsToILO error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getAvailableTopics, getAssignedTopics, assignTopicsToILO };
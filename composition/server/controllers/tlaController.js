const db = require('../models');
const { Topic, ILOTopic, TopicTLA, sequelize } = db;

// Using the exact names confirmed by your debug log
const TLA = db.TeachingAndLearningActivity;
const TLAAssessment = db.TLAAssessment;

// Fetch initialization data for the form
async function getTlasForIlo(req, res) {
    try {
        const iloId = Number(req.params.iloId);
        if (!iloId) return res.status(400).json({ message: 'iloId is required' });

        // 1. Get ILOTopic bridge records
        const iloTopics = await ILOTopic.findAll({ where: { ilo_id: iloId } });
        const iloTopicIds = iloTopics.map(it => it.ilo_topic_id);
        const topicIds = [...new Set(iloTopics.map(it => it.topic_id))];

        // 2. Get the actual Topic titles
        const topics = await Topic.findAll({ where: { topic_id: topicIds } });
        const availableTopics = topics.map(t => t.title);

        // Map Topic Titles directly to ilo_topic_id (required for the TopicTLA join table)
        const titleToIloTopicId = {};
        const iloTopicIdToTitle = {};

        iloTopics.forEach(it => {
            const topic = topics.find(t => t.topic_id === it.topic_id);
            if (topic) {
                titleToIloTopicId[topic.title] = it.ilo_topic_id;
                iloTopicIdToTitle[it.ilo_topic_id] = topic.title;
            }
        });

        let tlas = [];

        if (iloTopicIds.length > 0) {
            // 3. Find mappings in TopicTLA using the correct foreign key
            const topicTlaMappings = await TopicTLA.findAll({
                where: { ilo_topic_id: iloTopicIds }
            });
            const tlaIds = [...new Set(topicTlaMappings.map(m => m.tla_id))];

            if (tlaIds.length > 0) {
                // 4. Fetch TLAs and Assessments in flat queries
                const tlaRecords = await TLA.findAll({ where: { tla_id: tlaIds } });
                const assessmentRecords = await TLAAssessment.findAll({ where: { tla_id: tlaIds } });

                // Group topics by TLA
                const tlaToTitlesMap = {};
                topicTlaMappings.forEach(mapping => {
                    const title = iloTopicIdToTitle[mapping.ilo_topic_id];
                    if (title) {
                        if (!tlaToTitlesMap[mapping.tla_id]) tlaToTitlesMap[mapping.tla_id] = [];
                        tlaToTitlesMap[mapping.tla_id].push(title);
                    }
                });

                // Assemble the frontend payload
                tlas = tlaRecords.map(tlaObj => {
                    const tlaId = tlaObj.tla_id;
                    const matchingAss = assessmentRecords.find(a => a.tla_id === tlaId);

                    let assessmentType = '';
                    let assessmentDetail = '';
                    if (matchingAss && matchingAss.name) {
                        const parts = matchingAss.name.split(':');
                        assessmentType = parts[0] ? parts[0].trim() : '';
                        assessmentDetail = parts.slice(1).join(':').trim();
                    }

                    // Handles both snake_case (DB) and camelCase (Sequelize standard)
                    return {
                        id: tlaId,
                        selectedTopics: tlaToTitlesMap[tlaId] || [],
                        performedBy: tlaObj.performed_by || tlaObj.performedBy || '',
                        tlaName: tlaObj.tla_name || tlaObj.tlaName || '',
                        classPhase: tlaObj.class_phase || tlaObj.classPhase || '',
                        tlaDescription: tlaObj.description || tlaObj.tlaDescription || '',
                        laboratory: Boolean(tlaObj.laboratory),
                        assessmentType,
                        assessmentDetail
                    };
                });
            }
        }

        // 5. Extract Assessment Type suggestions globally
        const allAssessments = await TLAAssessment.findAll({ attributes: ['name'] });
        const assessmentTypesSet = new Set();
        allAssessments.forEach(a => {
            if (a.name && a.name.includes(':')) {
                assessmentTypesSet.add(a.name.split(':')[0].trim());
            }
        });

        return res.json({
            availableTopics,
            topicIdMap: titleToIloTopicId,
            tlas,
            assessmentTypeSuggestions: Array.from(assessmentTypesSet)
        });

    } catch (err) {
        console.error('getTlasForIlo error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Master Sync Function: Updates all TLAs and their relations
async function syncTlasToIlo(req, res) {
    const t = await sequelize.transaction();
    try {
        const iloId = Number(req.params.iloId);
        const { tlas, topicIdMap } = req.body;

        if (!iloId || !Array.isArray(tlas)) {
            await t.rollback();
            return res.status(400).json({ message: 'Invalid payload' });
        }

        // Discover valid ilo_topic_ids for isolated deletion
        const iloTopics = await ILOTopic.findAll({ where: { ilo_id: iloId }, transaction: t });
        const validIloTopicIds = iloTopics.map(it => it.ilo_topic_id);

        for (const tlaData of tlas) {
            let currentTlaId = tlaData.id;
            const isExisting = typeof currentTlaId === 'number';

            // Align payload with your database column naming
            const tlaPayload = {
                tla_name: tlaData.tlaName,
                class_phase: tlaData.classPhase,
                performed_by: tlaData.performedBy,
                description: tlaData.tlaDescription,
                laboratory: tlaData.laboratory ? 1 : 0
            };

            // A. Upsert the core TLA record
            if (isExisting) {
                await TLA.update(tlaPayload, { where: { tla_id: currentTlaId }, transaction: t });
            } else {
                const newTla = await TLA.create(tlaPayload, { transaction: t });
                currentTlaId = newTla.tla_id || newTla.id;
            }

            // B. Upsert TLAAssessment
            const combinedAssessmentName = `${tlaData.assessmentType || 'General'}: ${tlaData.assessmentDetail || ''}`;
            const existingAssessment = await TLAAssessment.findOne({ where: { tla_id: currentTlaId }, transaction: t });

            if (existingAssessment) {
                await TLAAssessment.update(
                    { name: combinedAssessmentName, description: combinedAssessmentName },
                    { where: { tla_id: currentTlaId }, transaction: t }
                );
            } else {
                await TLAAssessment.create({
                    tla_id: currentTlaId,
                    name: combinedAssessmentName,
                    description: combinedAssessmentName,
                    period: 'm',
                    weight: '20',
                    min_passing: 60
                }, { transaction: t });
            }

            // C. Sync TopicTLA Mappings safely using ilo_topic_id
            await TopicTLA.destroy({
                where: { tla_id: currentTlaId, ilo_topic_id: validIloTopicIds },
                transaction: t
            });

            if (tlaData.selectedTopics && tlaData.selectedTopics.length > 0) {
                const newMappings = tlaData.selectedTopics
                    .map(title => topicIdMap[title])
                    .filter(Boolean)
                    .map(ilo_topic_id => ({ tla_id: currentTlaId, ilo_topic_id }));

                if (newMappings.length > 0) {
                    await TopicTLA.bulkCreate(newMappings, { transaction: t });
                }
            }
        }

        await t.commit();
        return res.json({ message: 'Successfully synced TLAs and Assessments.' });
    } catch (err) {
        await t.rollback();
        console.error('syncTlasToIlo error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getTlasForIlo, syncTlasToIlo };
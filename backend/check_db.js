import { sequelize, TosStatus, Comment, AssessmentItem, IloAttachment } from './models/index.js';

async function runQueries() {
    const counts = {};

    const statusCounts = await TosStatus.findAll({
        attributes: ['courseCode', 'examPeriod', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['courseCode', 'examPeriod'],
        raw: true
    });
    counts.TosStatus = statusCounts;

    const commentCounts = await Comment.findAll({
        attributes: ['courseCode', 'examPeriod', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['courseCode', 'examPeriod'],
        raw: true
    });
    counts.Comment = commentCounts;

    const itemCounts = await AssessmentItem.findAll({
        attributes: ['courseCode', 'examPeriod', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['courseCode', 'examPeriod'],
        raw: true
    });
    counts.AssessmentItem = itemCounts;

    const attachmentCounts = await IloAttachment.findAll({
        attributes: ['courseCode', 'examPeriod', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['courseCode', 'examPeriod'],
        raw: true
    });
    counts.IloAttachment = attachmentCounts;

    console.log(JSON.stringify(counts, null, 2));
    process.exit(0);
}

runQueries().catch(err => {
    console.error(err);
    process.exit(1);
});

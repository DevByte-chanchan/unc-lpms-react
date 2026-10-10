import { sequelize, TosStatus, Comment, AssessmentItem, IloAttachment, Course } from './models/index.js';

async function migrate() {
    console.log('Starting migration...');
    
    const courses = await Course.findAll();
    const courseMap = {};
    for (const c of courses) {
        courseMap[c.code] = c.examPeriod || 'Midterm';
    }
    
    // Update TosStatus
    const statuses = await TosStatus.findAll();
    for (const s of statuses) {
        const p = courseMap[s.courseCode] || 'Midterm';
        await s.update({ examPeriod: p });
    }
    console.log('Migrated TosStatus records.');
    
    // Update Comment
    const comments = await Comment.findAll();
    for (const c of comments) {
        const p = courseMap[c.courseCode] || 'Midterm';
        await c.update({ examPeriod: p });
    }
    console.log('Migrated Comment records.');
    
    // Update AssessmentItem
    const items = await AssessmentItem.findAll();
    for (const i of items) {
        const p = courseMap[i.courseCode] || 'Midterm';
        await i.update({ examPeriod: p });
    }
    console.log('Migrated AssessmentItem records.');
    
    // Update IloAttachment
    const attachments = await IloAttachment.findAll();
    for (const a of attachments) {
        const p = courseMap[a.courseCode] || 'Midterm';
        await a.update({ examPeriod: p });
    }
    console.log('Migrated IloAttachment records.');
    
    console.log('Migration complete.');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});

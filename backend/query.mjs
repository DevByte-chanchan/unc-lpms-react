
import sequelize from './models/sequelize.js';

async function run() {
    try {
        await sequelize.authenticate();
        console.log('--- Row counts per table ---');
        const [tables] = await sequelize.query('SHOW TABLES');
        for (const t of tables) {
            const tableName = Object.values(t)[0];
            const [rows] = await sequelize.query('SELECT COUNT(*) as count FROM ' + tableName + '');
            console.log(tableName, rows[0].count);
        }

        console.log('\n--- tos_statuses rows ---');
        const [tosRows] = await sequelize.query('SELECT courseCode, examPeriod, status, submittedAt, returnedAt, approvedAt, returnCount FROM tos_statuses');
        console.log(JSON.stringify(tosRows, null, 2));

        console.log('\n--- BSCS221L course_outcomes ---');
        const [coRows] = await sequelize.query('SELECT description, topics, hours, stored_points FROM course_outcomes WHERE courseCode = \\'BSCS221L\\'');
        console.log(JSON.stringify(coRows, null, 2));

        console.log('\n--- BSCS221L ilo_items ---');
        const [iloRows] = await sequelize.query('SELECT description, topics, hours, stored_points FROM ilo_items WHERE courseCode = \\'BSCS221L\\'');
        console.log(JSON.stringify(iloRows, null, 2));

        console.log('\n--- count of assessment_items per course ---');
        const [aiCounts] = await sequelize.query('SELECT courseCode, COUNT(*) as count FROM assessment_items GROUP BY courseCode');
        console.log(JSON.stringify(aiCounts, null, 2));

        console.log('\n--- count of ilo_attachments per course ---');
        const [attachCounts] = await sequelize.query('SELECT courseCode, COUNT(*) as count FROM ilo_attachments GROUP BY courseCode');
        console.log(JSON.stringify(attachCounts, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
run();


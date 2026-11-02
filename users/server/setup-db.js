const { sequelize } = require('./models');
const seeder = require('./seeders/01-seed-users');

async function syncAndSeed() {
    try {
        console.log("Syncing database...");
        await sequelize.sync({ force: true });
        console.log("Database synced. Seeding data...");
        // Run seeder
        await seeder.up(sequelize.getQueryInterface(), sequelize.constructor);
        console.log("Seeding complete!");
        process.exit(0);
    } catch (error) {
        console.error("Error setting up DB:", error);
        process.exit(1);
    }
}

syncAndSeed();
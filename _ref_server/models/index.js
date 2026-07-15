'use strict';
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

// 1. Read and initialize
fs.readdirSync(__dirname)
    .filter(file => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js')
    .forEach(file => {
        const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
    });

// 2. Execute internal .associate() methods
Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// --- KEEP THESE MANUAL ASSOCIATIONS ---
db.Topic.hasMany(db.Subtopic, { foreignKey: 'topic_id', as: 'subtopics', onDelete: 'CASCADE' });
db.Subtopic.belongsTo(db.Topic, { foreignKey: 'topic_id', as: 'topic' });
db.ILOReference.belongsTo(db.IntendedLearningOutcome, { foreignKey: 'ilo_id' });
db.IntendedLearningOutcome.hasMany(db.ILOReference, { foreignKey: 'ilo_id' });
db.ILOReference.belongsTo(db.Reference, { foreignKey: 'reference_id', as: 'Reference' });
db.Reference.hasMany(db.ILOReference, { foreignKey: 'reference_id', as: 'iloReferences' });

module.exports = db;
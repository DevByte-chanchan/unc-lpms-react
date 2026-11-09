// models/suggestedReference.js
module.exports = (sequelize, DataTypes) => {
    const SuggestedReference = sequelize.define('SuggestedReference', {
        suggested_ref_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        ilo_reference_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                notNull: { msg: "ILO reference association is required." }
            }
        },
        reference_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                notNull: { msg: "Base reference mapping is required." }
            }
        }
    }, { tableName: 'SuggestedReferences' });

    SuggestedReference.associate = (models) => {
        // Belongs to the specific ILO-to-Reference mapping
        SuggestedReference.belongsTo(models.ILOReference, {
            foreignKey: 'ilo_reference_id',
            as: 'iloReference',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });

        // Points back to a single reference record
        SuggestedReference.belongsTo(models.Reference, {
            foreignKey: 'reference_id',
            as: 'reference',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    return SuggestedReference;
};
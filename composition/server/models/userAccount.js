'use strict';

function parseRoles(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return String(raw)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
}

module.exports = (sequelize, DataTypes) => {
    const UserAccount = sequelize.define(
        'UserAccount',
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
            },
            password_hash: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            full_name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            roles: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: '["Instructor"]',
                get() {
                    return parseRoles(this.getDataValue('roles'));
                },
                set(value) {
                    const list = Array.isArray(value) ? value : parseRoles(value);
                    this.setDataValue('roles', JSON.stringify(list));
                },
            },
            active_role: {
                type: DataTypes.STRING(64),
                allowNull: false,
                defaultValue: 'Instructor',
            },
            faculty_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            },
            industry_consultant_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
            },
            status: {
                type: DataTypes.STRING(32),
                allowNull: false,
                defaultValue: 'Active',
            },
            must_change_password: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            last_login_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'user_accounts',
            underscored: true,
        }
    );

    UserAccount.associate = function (models) {
        if (models.Faculty) {
            UserAccount.belongsTo(models.Faculty, { foreignKey: 'faculty_id', as: 'faculty' });
        }
        if (models.IndustryConsultant) {
            UserAccount.belongsTo(models.IndustryConsultant, {
                foreignKey: 'industry_consultant_id',
                as: 'consultant',
            });
        }
    };

    return UserAccount;
};

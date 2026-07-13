export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('role', {
      role_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      role_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      date_created: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('stakeholder', {
      stakeholder_id: {
        type: Sequelize.STRING(20),
        primaryKey: true
      },
      sh_role_id: {
        type: Sequelize.INTEGER,
        references: { model: 'role', key: 'role_id' }
      },
      last_name: { type: Sequelize.STRING(60), allowNull: false },
      first_name: { type: Sequelize.STRING(60), allowNull: false },
      birth_date: { type: Sequelize.DATE, allowNull: false },
      sex: { type: Sequelize.STRING(10), allowNull: false },
      email: { type: Sequelize.STRING(100), allowNull: false },
      contact_number: { type: Sequelize.STRING(20), allowNull: false }
    });

    await queryInterface.createTable('stakeholder_role', {
      sh_role_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      stakeholder_id: {
        type: Sequelize.STRING(20),
        references: { model: 'stakeholder', key: 'stakeholder_id' }
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'role', key: 'role_id' }
      },
      role_status: { type: Sequelize.STRING(20), allowNull: false },
      date_created: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('user_account', {
      account_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      stakeholder_id: {
        type: Sequelize.STRING(20),
        references: { model: 'stakeholder', key: 'stakeholder_id' }
      },
      date_created: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      password: { type: Sequelize.STRING(100), allowNull: false },
      account_status: { type: Sequelize.STRING(20), allowNull: false }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_account');
    await queryInterface.dropTable('stakeholder_role');
    await queryInterface.dropTable('stakeholder');
    await queryInterface.dropTable('role');
  }
};

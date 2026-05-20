'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add template-related columns to learning_plans
    await queryInterface.addColumn('learning_plans', 'is_template_eligible', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this LP can be used as a template for future years'
    });

    await queryInterface.addColumn('learning_plans', 'template_source_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'learning_plans',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'If this LP was created from a template, reference to source'
    });

    // 2. Create learning_plan_templates table
    await queryInterface.createTable('learning_plan_templates', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      source_lp_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'learning_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 3. Create template_usage table
    await queryInterface.createTable('template_usages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      template_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'learning_plan_templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      new_lp_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'learning_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      modifications_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      used_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 4. Create pdf_exports table
    await queryInterface.createTable('pdf_exports', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      learning_plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'learning_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      exported_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      export_type: {
        type: Sequelize.ENUM('single', 'batch'),
        defaultValue: 'single'
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: true
      },
      batch_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'For grouping batch exports'
      },
      exported_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 5. Create approval_trail table (enhanced audit logging)
    await queryInterface.createTable('approval_trails', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      learning_plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'learning_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reviewer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.ENUM('submitted', 'approved', 'returned', 'viewed', 'exported', 'rollback'),
        allowNull: false
      },
      action_timestamp: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 6. Add is_active column to users (for role status tracking)
    await queryInterface.addColumn('users', 'is_active', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });

    // Add indexes for performance
    await queryInterface.addIndex('learning_plan_templates', ['source_lp_id']);
    await queryInterface.addIndex('template_usages', ['template_id']);
    await queryInterface.addIndex('template_usages', ['new_lp_id']);
    await queryInterface.addIndex('pdf_exports', ['learning_plan_id']);
    await queryInterface.addIndex('pdf_exports', ['exported_by']);
    await queryInterface.addIndex('approval_trails', ['learning_plan_id']);
    await queryInterface.addIndex('approval_trails', ['reviewer_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('learning_plans', 'template_source_id');
    await queryInterface.removeColumn('learning_plans', 'is_template_eligible');
    await queryInterface.removeColumn('users', 'is_active');
    await queryInterface.dropTable('approval_trails');
    await queryInterface.dropTable('pdf_exports');
    await queryInterface.dropTable('template_usages');
    await queryInterface.dropTable('learning_plan_templates');
  }
};

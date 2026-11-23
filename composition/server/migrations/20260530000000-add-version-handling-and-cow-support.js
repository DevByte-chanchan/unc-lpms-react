'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. ProgramCourseOfferings: version lineage and deferred revision increment tracking
        const pcoTable = await queryInterface.describeTable('ProgramCourseOfferings');
        if (!pcoTable.base_pc_offering_id) {
            await queryInterface.addColumn('ProgramCourseOfferings', 'base_pc_offering_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'ProgramCourseOfferings',
                    key: 'pc_offering_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }
        if (!pcoTable.has_modifications) {
            await queryInterface.addColumn('ProgramCourseOfferings', 'has_modifications', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            });
        }
        if (!pcoTable.is_revision_incremented) {
            await queryInterface.addColumn('ProgramCourseOfferings', 'is_revision_incremented', {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            });
        }

        // 2. IntendedLearningOutcomes: COAEP assessment weights & minimum passing target
        // so Criteria for Grading remains populated even when weekly TLAs start blank
        const iloTable = await queryInterface.describeTable('IntendedLearningOutcomes');
        if (!iloTable.prelim_weight) {
            await queryInterface.addColumn('IntendedLearningOutcomes', 'prelim_weight', {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: true
            });
        }
        if (!iloTable.midterm_weight) {
            await queryInterface.addColumn('IntendedLearningOutcomes', 'midterm_weight', {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: true
            });
        }
        if (!iloTable.semi_weight) {
            await queryInterface.addColumn('IntendedLearningOutcomes', 'semi_weight', {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: true
            });
        }
        if (!iloTable.final_weight) {
            await queryInterface.addColumn('IntendedLearningOutcomes', 'final_weight', {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: true
            });
        }
        if (!iloTable.target) {
            await queryInterface.addColumn('IntendedLearningOutcomes', 'target', {
                type: Sequelize.STRING(255),
                allowNull: true
            });
        }

        // 3. Topics: course scoping and Copy-on-Write parent lineage
        const topicsTable = await queryInterface.describeTable('Topics');
        if (!topicsTable.course_id) {
            await queryInterface.addColumn('Topics', 'course_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'Courses',
                    key: 'course_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }
        if (!topicsTable.parent_topic_id) {
            await queryInterface.addColumn('Topics', 'parent_topic_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'Topics',
                    key: 'topic_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }

        // 4. Subtopics: Copy-on-Write parent lineage
        const subtopicsTable = await queryInterface.describeTable('Subtopics');
        if (!subtopicsTable.parent_subtopic_id) {
            await queryInterface.addColumn('Subtopics', 'parent_subtopic_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'Subtopics',
                    key: 'subtopic_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }

        // 5. References: Copy-on-Write parent lineage
        const referencesTable = await queryInterface.describeTable('References');
        if (!referencesTable.parent_reference_id) {
            await queryInterface.addColumn('References', 'parent_reference_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'References',
                    key: 'reference_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }
    },

    async down(queryInterface) {
        const referencesTable = await queryInterface.describeTable('References');
        if (referencesTable.parent_reference_id) {
            await queryInterface.removeColumn('References', 'parent_reference_id');
        }

        const subtopicsTable = await queryInterface.describeTable('Subtopics');
        if (subtopicsTable.parent_subtopic_id) {
            await queryInterface.removeColumn('Subtopics', 'parent_subtopic_id');
        }

        const topicsTable = await queryInterface.describeTable('Topics');
        if (topicsTable.parent_topic_id) {
            await queryInterface.removeColumn('Topics', 'parent_topic_id');
        }
        if (topicsTable.course_id) {
            await queryInterface.removeColumn('Topics', 'course_id');
        }

        const iloTable = await queryInterface.describeTable('IntendedLearningOutcomes');
        if (iloTable.target) await queryInterface.removeColumn('IntendedLearningOutcomes', 'target');
        if (iloTable.final_weight) await queryInterface.removeColumn('IntendedLearningOutcomes', 'final_weight');
        if (iloTable.semi_weight) await queryInterface.removeColumn('IntendedLearningOutcomes', 'semi_weight');
        if (iloTable.midterm_weight) await queryInterface.removeColumn('IntendedLearningOutcomes', 'midterm_weight');
        if (iloTable.prelim_weight) await queryInterface.removeColumn('IntendedLearningOutcomes', 'prelim_weight');

        const pcoTable = await queryInterface.describeTable('ProgramCourseOfferings');
        if (pcoTable.is_revision_incremented) {
            await queryInterface.removeColumn('ProgramCourseOfferings', 'is_revision_incremented');
        }
        if (pcoTable.has_modifications) {
            await queryInterface.removeColumn('ProgramCourseOfferings', 'has_modifications');
        }
        if (pcoTable.base_pc_offering_id) {
            await queryInterface.removeColumn('ProgramCourseOfferings', 'base_pc_offering_id');
        }
    }
};

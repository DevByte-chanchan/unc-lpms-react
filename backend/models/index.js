import sequelize from './sequelize.js';
import Course from './Course.js';
import CourseOutcome from './CourseOutcome.js';
import IloItem from './IloItem.js';
import AssessmentItem from './AssessmentItem.js';
import ItemChoice from './ItemChoice.js';
import ItemRubric from './ItemRubric.js';
import TosStatus from './TosStatus.js';

Course.hasMany(CourseOutcome, { foreignKey: 'courseCode', as: 'outcomes' });
CourseOutcome.belongsTo(Course, { foreignKey: 'courseCode', as: 'course' });

CourseOutcome.hasMany(IloItem, { foreignKey: 'coId', as: 'ilos' });
IloItem.belongsTo(CourseOutcome, { foreignKey: 'coId', as: 'outcome' });

Course.hasMany(AssessmentItem, { foreignKey: 'courseCode', as: 'assessmentItems' });
AssessmentItem.belongsTo(Course, { foreignKey: 'courseCode', as: 'course' });

AssessmentItem.hasMany(ItemChoice, { foreignKey: 'itemId', as: 'choices' });
ItemChoice.belongsTo(AssessmentItem, { foreignKey: 'itemId', as: 'item' });

AssessmentItem.hasMany(ItemRubric, { foreignKey: 'itemId', as: 'rubrics' });
ItemRubric.belongsTo(AssessmentItem, { foreignKey: 'itemId', as: 'item' });

Course.hasOne(TosStatus, { foreignKey: 'courseCode', as: 'tosStatus' });
TosStatus.belongsTo(Course, { foreignKey: 'courseCode', as: 'course' });

export { sequelize, Course, CourseOutcome, IloItem, AssessmentItem, ItemChoice, ItemRubric, TosStatus };

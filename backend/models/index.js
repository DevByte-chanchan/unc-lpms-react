import sequelize from './sequelize.js';
import Course from './Course.js';
import CourseOutcome from './CourseOutcome.js';
import IloItem from './IloItem.js';
import AssessmentItem from './AssessmentItem.js';
import ItemChoice from './ItemChoice.js';
import ItemRubric from './ItemRubric.js';
import TosStatus from './TosStatus.js';
import Comment from './Comment.js';

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

IloItem.hasMany(AssessmentItem, { foreignKey: 'iloId', as: 'assessmentItems' });
AssessmentItem.belongsTo(IloItem, { foreignKey: 'iloId', as: 'iloItem' });

Course.hasOne(TosStatus, { foreignKey: 'courseCode', as: 'tosStatus' });
TosStatus.belongsTo(Course, { foreignKey: 'courseCode', as: 'course' });

Course.hasMany(Comment, { foreignKey: 'courseCode', as: 'comments' });
Comment.belongsTo(Course, { foreignKey: 'courseCode', as: 'course' });

Comment.belongsTo(CourseOutcome, { foreignKey: 'courseOutcomeId', as: 'courseOutcome' });
CourseOutcome.hasMany(Comment, { foreignKey: 'courseOutcomeId', as: 'comments' });

Comment.belongsTo(AssessmentItem, { foreignKey: 'assessmentItemId', as: 'assessmentItem' });
AssessmentItem.hasMany(Comment, { foreignKey: 'assessmentItemId', as: 'comments' });

export { sequelize, Course, CourseOutcome, IloItem, AssessmentItem, ItemChoice, ItemRubric, TosStatus, Comment };

import sequelize from './sequelize.js';
import Course from './Course.js';
import CourseOutcome from './CourseOutcome.js';
import IloItem from './IloItem.js';
import AssessmentItem from './AssessmentItem.js';
import TosStatus from './TosStatus.js';
import Comment from './Comment.js';
import IloAttachment from './IloAttachment.js';

Course.hasMany(CourseOutcome, { foreignKey: 'courseCode', as: 'outcomes' });
CourseOutcome.belongsTo(Course, { foreignKey: 'courseCode', as: 'course' });

CourseOutcome.hasMany(IloItem, { foreignKey: 'coId', as: 'ilos' });
IloItem.belongsTo(CourseOutcome, { foreignKey: 'coId', as: 'outcome' });

Course.hasMany(AssessmentItem, { foreignKey: 'courseCode', as: 'assessmentItems' });
AssessmentItem.belongsTo(Course, { foreignKey: 'courseCode', as: 'course' });



IloItem.hasMany(AssessmentItem, { foreignKey: 'iloId', as: 'assessmentItems' });
AssessmentItem.belongsTo(IloItem, { foreignKey: 'iloId', as: 'iloItem' });

Course.hasMany(TosStatus, { foreignKey: 'courseCode', as: 'tosStatuses' });
TosStatus.belongsTo(Course, { foreignKey: 'courseCode', as: 'course' });

Course.hasMany(Comment, { foreignKey: 'courseCode', as: 'comments' });
Comment.belongsTo(Course, { foreignKey: 'courseCode', as: 'course' });

Comment.belongsTo(CourseOutcome, { foreignKey: 'courseOutcomeId', as: 'courseOutcome' });
CourseOutcome.hasMany(Comment, { foreignKey: 'courseOutcomeId', as: 'comments' });

Comment.belongsTo(AssessmentItem, { foreignKey: 'assessmentItemId', as: 'assessmentItem' });
AssessmentItem.hasMany(Comment, { foreignKey: 'assessmentItemId', as: 'comments' });


IloAttachment.belongsTo(IloItem, { foreignKey: 'iloId', as: 'ilo' });
IloItem.hasMany(IloAttachment, { foreignKey: 'iloId', as: 'attachments' });

IloAttachment.belongsTo(Course, { foreignKey: 'courseCode', as: 'course' });
Course.hasMany(IloAttachment, { foreignKey: 'courseCode', as: 'attachments' });

AssessmentItem.belongsTo(IloAttachment, { foreignKey: 'attachmentId', as: 'attachment' });
IloAttachment.hasMany(AssessmentItem, { foreignKey: 'attachmentId', as: 'pointRows' });

export { sequelize, IloAttachment, Course, CourseOutcome, IloItem, AssessmentItem, TosStatus, Comment };

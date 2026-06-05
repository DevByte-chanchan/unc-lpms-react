/**
 * Prerequisite — self-referencing bridge between courses.
 *
 *   course_id              → the course that HAS the requirement
 *   course_prerequisite_id → the course that must be taken first
 *
 * Powers Course.belongsToMany(Course, as 'prerequisites').
 */
export default (sequelize, DataTypes) =>
  sequelize.define(
    'Prerequisite',
    {
      prerequisite_id:        { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      course_id:              { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      course_prerequisite_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    },
    { tableName: 'prerequisites', timestamps: false }
  );

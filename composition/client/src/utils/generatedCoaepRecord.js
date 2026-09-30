export const DEFAULT_PERFORMANCE_TARGET = 'At least 90% of enrolled students with a rating of at least 60% of the total score';

export const buildGeneratedCoaepRecord = ({ courseCode, courseName, payload, generatedAt }) => {
  const cos = payload?.cos || [];
  if (cos.length === 0) return null;

  const title = payload?.course?.title || courseName || '';
  const code = payload?.course?.code || courseCode || '';

  return {
    header: {
      course: `${code} - ${title}`,
    },
    cos,
    performanceTarget: DEFAULT_PERFORMANCE_TARGET,
    sourceLabel: `Generated from course syllabus - ${generatedAt}`,
  };
};

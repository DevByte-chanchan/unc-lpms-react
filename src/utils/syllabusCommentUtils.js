/**
 * Utility functions for managing syllabus comments
 */

export const SyllabusCommentUtils = {
  // Get comments for a specific course
  getComments: (courseCode) => {
    try {
      return JSON.parse(localStorage.getItem(`syllabus_comments_${courseCode}`) || '[]');
    } catch (e) {
      console.error('Failed to get comments', e);
      return [];
    }
  },

  // Add a new comment
  addComment: (courseCode, text, reviewer) => {
    try {
      const comments = SyllabusCommentUtils.getComments(courseCode);
      const newComment = {
        id: Date.now(),
        text,
        reviewer,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      comments.push(newComment);
      localStorage.setItem(`syllabus_comments_${courseCode}`, JSON.stringify(comments));
      return newComment;
    } catch (e) {
      console.error('Failed to add comment', e);
      return null;
    }
  },

  // Delete a specific comment
  deleteComment: (courseCode, commentId) => {
    try {
      let comments = SyllabusCommentUtils.getComments(courseCode);
      comments = comments.filter(c => c.id !== commentId);
      if (comments.length === 0) {
        localStorage.removeItem(`syllabus_comments_${courseCode}`);
      } else {
        localStorage.setItem(`syllabus_comments_${courseCode}`, JSON.stringify(comments));
      }
      return true;
    } catch (e) {
      console.error('Failed to delete comment', e);
      return false;
    }
  },

  // Clear all comments for a course
  clearComments: (courseCode) => {
    try {
      localStorage.removeItem(`syllabus_comments_${courseCode}`);
      return true;
    } catch (e) {
      console.error('Failed to clear comments', e);
      return false;
    }
  },

  // Check if a course has comments
  hasComments: (courseCode) => {
    const comments = SyllabusCommentUtils.getComments(courseCode);
    return comments.length > 0;
  },

  // Get comment count
  getCommentCount: (courseCode) => {
    return SyllabusCommentUtils.getComments(courseCode).length;
  },

  // Resolve comment (mark as resolved)
  resolveComment: (courseCode, commentId) => {
    try {
      const comments = SyllabusCommentUtils.getComments(courseCode);
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        comment.status = 'resolved';
        comment.resolvedAt = new Date().toISOString();
        localStorage.setItem(`syllabus_comments_${courseCode}`, JSON.stringify(comments));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to resolve comment', e);
      return false;
    }
  },

  // Get all pending comments across all courses
  getAllPendingComments: () => {
    try {
      const comments = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('syllabus_comments_')) {
          const courseCode = key.replace('syllabus_comments_', '');
          const courseComments = SyllabusCommentUtils.getComments(courseCode);
          const pending = courseComments.filter(c => c.status === 'pending');
          if (pending.length > 0) {
            comments.push({
              courseCode,
              comments: pending
            });
          }
        }
      }
      return comments;
    } catch (e) {
      console.error('Failed to get all pending comments', e);
      return [];
    }
  }
};

import React, { useState, useEffect } from 'react';
import { X, Send } from 'react-feather';
import styles from '../styles/SyllabusCommentBox.module.sass';

const SyllabusCommentBox = ({ courseCode, onClose, onCommentAdded }) => {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [reviewer, setReviewer] = useState('');
  const [userRole, setUserRole] = useState('instructor');

  useEffect(() => {
    // Load existing comments
    const stored = JSON.parse(localStorage.getItem(`syllabus_comments_${courseCode}`) || '[]');
    setComments(stored);

    // Get reviewer from user and check role
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setReviewer(user.name || 'Anonymous Reviewer');
      setUserRole(user.role || 'instructor');
    } catch (e) {
      setReviewer('Anonymous Reviewer');
      setUserRole('instructor');
    }
  }, [courseCode]);

  const handleSubmitComment = () => {
    if (!comment.trim()) {
      alert('Please enter a comment');
      return;
    }

    const newComment = {
      id: Date.now(),
      text: comment,
      reviewer,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    const updated = [...comments, newComment];
    setComments(updated);
    localStorage.setItem(`syllabus_comments_${courseCode}`, JSON.stringify(updated));
    
    setComment('');
    if (onCommentAdded) {
      onCommentAdded(newComment);
    }
  };

  const handleDeleteComment = (id) => {
    const updated = comments.filter(c => c.id !== id);
    setComments(updated);
    localStorage.setItem(`syllabus_comments_${courseCode}`, JSON.stringify(updated));
  };

  const handleClearAllComments = () => {
    if (confirm('Clear all comments for this course?')) {
      setComments([]);
      localStorage.removeItem(`syllabus_comments_${courseCode}`);
    }
  };

  return (
    <div className={styles.commentBoxOverlay} onClick={onClose}>
      <div className={styles.commentBox} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Learning Plan Comments - {courseCode}</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Comments List */}
          <div className={styles.commentsList}>
            <p className={styles.sectionTitle}>
              {comments.length > 0 ? `${comments.length} Comment(s)` : 'No comments yet'}
            </p>
            
            {comments.length > 0 && (
              <div className={styles.commentItems}>
                {comments.map(c => (
                  <div key={c.id} className={styles.commentItem}>
                    <div className={styles.commentMeta}>
                      <strong>{c.reviewer}</strong>
                      <span className={styles.date}>
                        {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className={styles.commentText}>{c.text}</p>
                    <button 
                      onClick={() => handleDeleteComment(c.id)}
                      className={styles.deleteCommentBtn}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comment Input - Only for Reviewers */}
          {userRole !== 'instructor' ? (
            <div className={styles.inputSection}>
              <label>Add New Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter your comments or suggestions for the instructor..."
                rows={4}
                className={styles.textarea}
              />
              
              <div className={styles.actions}>
                <button 
                  onClick={handleSubmitComment}
                  className={styles.submitBtn}
                  disabled={!comment.trim()}
                >
                  <Send size={16} /> Submit Comment
                </button>
                {comments.length > 0 && (
                  <button 
                    onClick={handleClearAllComments}
                    className={styles.clearBtn}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '6px', color: '#0369a1' }}>
              <p>💬 Only reviewers can add comments to this learning plan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyllabusCommentBox;

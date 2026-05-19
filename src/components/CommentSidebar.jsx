import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, ChevronDown, ChevronUp, Send } from 'react-feather';
import styles from '../styles/CommentSidebar.module.sass';

const CommentSidebar = ({ courseCode, isOpen, onToggle, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentText, setCommentText] = useState('');
  const [reviewer, setReviewer] = useState('Anonymous Reviewer');
  const inputRef = useRef(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(`syllabus_comments_${courseCode}`) || '[]');
    setComments(stored);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setReviewer(user.name || 'Anonymous Reviewer');
    } catch (e) {}
  }, [courseCode]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const toggleExpand = (id) => {
    setExpandedComments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSubmit = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: Date.now(),
      text: commentText,
      reviewer,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    const updated = [...comments, newComment];
    setComments(updated);
    localStorage.setItem(`syllabus_comments_${courseCode}`, JSON.stringify(updated));
    setCommentText('');
    if (onCommentAdded) onCommentAdded(newComment);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.title}>
          <MessageCircle size={20} />
          <span>Comments ({comments.length})</span>
        </div>
        <button onClick={onToggle} className={styles.toggleBtn}>
          <X size={20} />
        </button>
      </div>

      <div className={styles.commentsList}>
        {comments.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No comments yet
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader} onClick={() => toggleExpand(comment.id)}>
                <div className={styles.commentMeta}>
                  <p className={styles.reviewer}>{comment.reviewer}</p>
                  <span className={styles.date}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button className={styles.expandBtn}>
                  {expandedComments[comment.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {expandedComments[comment.id] && (
                <div className={styles.commentBody}>
                  <p className={styles.text}>{comment.text}</p>
                  <span className={styles.time}>
                    {new Date(comment.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className={styles.inputArea}>
        <input
          ref={inputRef}
          type="text"
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Write a comment..."
          className={styles.input}
        />
        <button onClick={handleSubmit} className={styles.sendBtn} disabled={!commentText.trim()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default CommentSidebar;

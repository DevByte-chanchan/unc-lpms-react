import React, { useState, useEffect } from 'react';
import styles from '../../../styles/TemplateSelector.module.scss';
import * as service from '../../../services/learningPlanService';

const TemplateSelector = ({ courseCode, academicYear, onTemplateSelected, role, userId }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    if (!courseCode) return;

    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await service.getAvailableTemplates(role, userId, courseCode);
        setTemplates(res.data.templates || []);
      } catch (err) {
        // No templates found is not an error for user experience
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [courseCode, role, userId]);

  const handleUseTemplate = async (template) => {
    try {
      setError(null);
      const res = await service.createFromTemplate(role, userId, {
        template_lp_id: template.id,
        academic_year: academicYear,
        semester: template.semester
      });

      if (onTemplateSelected) {
        onTemplateSelected(res.data.plan);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create from template');
    }
  };

  if (!courseCode) return null;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading templates...</div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.noTemplates}>
          <p>No previous learning plans found for this course code.</p>
          <small>You'll start with a fresh learning plan.</small>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>
          📋 Previous Learning Plans Available
        </h3>
        <p className={styles.subtitle}>
          Select a previous year's plan to use as template and save time
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.templateList}>
        {templates.map(template => (
          <div key={template.id} className={styles.templateCard}>
            <div className={styles.templateInfo}>
              <div className={styles.templateHeader}>
                <h4>{template.course_name}</h4>
                <span className={styles.code}>{template.course_code}</span>
              </div>
              <div className={styles.templateMeta}>
                <span className={styles.year}>📅 {template.academic_year}</span>
                <span className={styles.semester}>
                  📚 {template.semester} Semester
                </span>
                <span className={styles.updated}>
                  🕐 Updated{' '}
                  {new Date(template.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            <button
              className={styles.useButton}
              onClick={() => handleUseTemplate(template)}
              title="Create new learning plan using this template"
            >
              Use as Template →
            </button>
          </div>
        ))}
      </div>

      <div className={styles.info}>
        <p>
          ℹ️ Using a template will pre-fill your new learning plan. You can modify all fields as
          needed.
        </p>
      </div>
    </div>
  );
};

export default TemplateSelector;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './LearningPlanList.module.scss';
import StatusTracker from '../Shared/StatusTracker';
import * as service from '../../../services/learningPlanService';

const LearningPlanList = () => {
  const navigate = useNavigate();
  const { role } = useParams();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = parseInt(localStorage.getItem('userId') || '1');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await service.getLearningPlans(role, userId, { instructor_id: userId });
        setPlans(res.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [role, userId]);

  const handleCompose = () => {
    navigate(`/role/${role}/compose`);
  };

  if (loading) return <div className={styles.container}>Loading...</div>;
  if (error) return <div className={styles.container}><div className={styles.error}>{error}</div></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Learning Plans</h1>
        <button className={styles.btnPrimary} onClick={handleCompose}>
          + New Learning Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className={styles.empty}>
          No learning plans yet. Create one to get started.
        </div>
      ) : (
        <div className={styles.list}>
          {plans.map((plan) => (
            <div key={plan.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{plan.course_name}</h3>
                <span className={`${styles.badge} ${styles[plan.status]}`}>
                  {plan.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className={styles.cardBody}>
                <p>Created: {new Date(plan.createdAt).toLocaleDateString()}</p>
                <p>Documents: {plan.documents?.length || 0}</p>
              </div>
              <div className={styles.cardFooter}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => navigate(`/role/${role}/plans/${plan.id}`)}
                >
                  View Details
                </button>
                {plan.status === 'draft' && (
                  <button
                    className={styles.btnPrimary}
                    onClick={() => navigate(`/role/${role}/compose/${plan.id}`)}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LearningPlanList;

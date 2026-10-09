import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import ReferenceFields from '../../../components/ReferenceFields.jsx';
import { useReferenceForm } from '../../../components/useReferenceForm.js';
import styles from '../../../styles/Form.module.sass';
import navStyles from '../../../styles/FormNavigation.module.sass';
import { loadReference } from '../../../utils/referenceStore.js';
import { apiErrorMessage } from '../../../utils/api.js';

// Add (no id in the route) or edit (/edit-reference/:id) a reference. The fields shown come from the
// server's type definitions; saving goes to the server, which validates the same rules again.
const AddReference = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // When editing, the record is loaded from the server before the form is shown.
  const [record, setRecord] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(!isEditMode);
  const form = useReferenceForm(record);
  const [toast, setToast] = useState(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isEditMode) return undefined;
    let live = true;
    loadReference(id)
      .then(found => { if (live) { setRecord(found); setLoaded(true); } })
      .catch(err => { if (live) { setLoadError(apiErrorMessage(err, 'Reference not found.')); setLoaded(true); } });
    return () => { live = false; };
  }, [id, isEditMode]);

  const handleSaveClick = async () => {
    setSaveError('');
    const result = await form.save();
    if (!result.ok) { setSaveError(result.message); return; }
    setToast(isEditMode ? 'Reference updated successfully!' : 'Reference added successfully!');
    setTimeout(() => navigate('/role/director-of-libraries/reference-library'), 1200);
  };

  const content = (
    <div className={styles.container}>
      <div className={navStyles.navi}>
        <div onClick={() => navigate(-1)} className={navStyles.return}>
          <ChevronLeft />
        </div>
        <div className={'fill'}></div>
        <div className={navStyles.save} onClick={form.saving ? undefined : handleSaveClick} style={{ cursor: 'pointer' }}>
          {form.saving ? 'Saving…' : 'Save'}
        </div>
      </div>

      <div className={styles['form-container']}>
        <h2>Reference Details</h2>
        {(loadError || form.typesError) && <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{loadError || form.typesError}</div>}
        {saveError && <div role="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{saveError}</div>}
        {loaded && form.typesReady && !loadError && (
          <ReferenceFields value={form.values} errors={form.errors} onChange={form.change} />
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#047857', color: '#fff',
          padding: '14px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500,
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)', fontFamily: "'Poppins', sans-serif",
        }}>
          <CheckCircle size={20} />
          {toast}
        </div>
      )}
    </div>
  );

  return (
    <SkeletonA
      header={<HeaderA role="Director of Libraries" />}
      nav={<SideNavigation mode="director-of-libraries" />}
      content={content}
    />
  );
};

export default AddReference;

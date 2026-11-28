import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import ReferenceFields from '../../../components/ReferenceFields.jsx';
import { useReferenceForm } from '../../../components/useReferenceForm.js';
import styles from '../../../styles/Form.module.sass';
import navStyles from '../../../styles/FormNavigation.module.sass';
import { loadReference } from '../../../utils/referenceStore.js';
import { apiErrorMessage } from '../../../utils/api.js';
import { toast } from '../../../utils/toast.jsx';

// Add (no id in the route) or edit (/edit-reference/:id) a reference. The fields shown come from the
// server's type definitions; saving goes to the server, which validates the same rules again.
const AddReference = () => {
  const navigate = useNavigate();
  const { refId: id } = useParams();
  const isEditMode = !!id;

  // When editing, the record is loaded from the server before the form is shown.
  const [record, setRecord] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(!isEditMode);
  const form = useReferenceForm(record);
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
    // The toast outlives the page, so the library opens at once.
    toast(isEditMode ? 'Reference updated.' : 'Reference added.');
    navigate('/role/director-of-libraries/reference-library');
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
        <h2 className="app-page-title">Reference Details</h2>
        {(loadError || form.typesError) && <div role="alert" style={{ color: 'var(--danger)', marginBottom: 12 }}>{loadError || form.typesError}</div>}
        {saveError && <div role="alert" style={{ color: 'var(--danger)', marginBottom: 12 }}>{saveError}</div>}
        {loaded && form.typesReady && !loadError && (
          <ReferenceFields value={form.values} errors={form.errors} onChange={form.change} onBlur={form.check} />
        )}
      </div>

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

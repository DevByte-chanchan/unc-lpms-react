/**
 * Department VM — Dean sub-page (?page=Vision & Mission).
 *
 * The department's VISION and MISSION only, kept as VERSIONS per department,
 * not per term. Same flow and the same shared components as the OVPAA
 * University VMGO page (components/vmgo/):
 *
 *   View      — the department's Active version.
 *   Step 1    — pick a PDF.
 *   Step 2    — POST /extract (writes nothing) reads the vision and mission;
 *               review and correct them beside the current version. A PDF
 *               that names another department is flagged at the top.
 *   Step 3    — Confirm & Save writes this department's new Active version.
 *
 * Only the dean's ASSIGNED department — there is no picker. `departmentCode`
 * comes from the signed-in dean (stubbed in Dean.jsx until auth exists) and is
 * looked up in the current term's department list for its name.
 */
import React from 'react';
import { Upload, AlertTriangle } from 'react-feather';
import { DepartmentsAPI, DepartmentStatementsAPI } from '../services/api.js';
import { usePeriod } from '../services/period.jsx';
import useVmgoVersions from '../components/vmgo/useVmgoVersions.js';
import { cx, same, versionMeta } from '../components/vmgo/vmgoUtils.js';
import {
  ActionBtn, Warn, Notice, CurrentText, ColumnHeads,
  EmptyState, HistoryPanel, PickerDialog, ReviewDialog, VersionDialog, RestoreConfirm,
} from '../components/vmgo/VmgoShared.jsx';
import styles from '../styles/VmgoStatements.module.sass';

const TEXT_SECTIONS = [
  { key: 'vision',  label: 'Vision' },
  { key: 'mission', label: 'Mission' },
];

const DepartmentDocument = ({ data }) => (
  <div className={styles.doc}>
    <div className={styles.docBar}>{String(data.department_name || data.department_code || '').toUpperCase()}</div>
    {TEXT_SECTIONS.map((s) => (
      <div key={s.key} className={styles.docRow}>
        <div className={styles.docLabel}>{s.label}</div>
        <div className={styles.docContent}>{data[s.key]}</div>
      </div>
    ))}
  </div>
);

const toForm = (f) => ({ vision: f.vision || '', mission: f.mission || '' });
const toPayload = (form, meta) => ({ vision: form.vision, mission: form.mission, ...meta });

const DeanDepartmentStatements = ({ userName, departmentCode }) => {
  const { activeTerm } = usePeriod();
  const termId = activeTerm && activeTerm.id;

  const [departments, setDepartments] = React.useState(null);   // null = loading
  const [deptError, setDeptError] = React.useState(null);

  React.useEffect(() => {
    if (!termId) return undefined;
    let cancelled = false;
    setDeptError(null);
    DepartmentsAPI.list(termId)
      .then((rows) => {
        if (cancelled) return;
        setDepartments((Array.isArray(rows) ? rows : []).filter((d) => d.status !== 'Unlisted'));
      })
      .catch((err) => { if (!cancelled) { setDepartments([]); setDeptError(err.message || 'Could not load the departments.'); } });
    return () => { cancelled = true; };
  }, [termId]);

  const assigned = String(departmentCode || '').toUpperCase();
  const dept = departments && departments.find((d) => String(d.code).toUpperCase() === assigned);
  const code = dept ? assigned : '';
  // No assignment, or the assigned code isn't in this term's list.
  const notAssigned = !assigned || (!!departments && !dept && !deptError);
  const api = React.useMemo(() => ({
    current: () => DepartmentStatementsAPI.current(code),
    history: () => DepartmentStatementsAPI.history(code),
    get: DepartmentStatementsAPI.get,
    extract: (file) => DepartmentStatementsAPI.extract(file, code),
    save: (fields) => DepartmentStatementsAPI.save(code, fields),
    restore: DepartmentStatementsAPI.restore,
  }), [code]);

  const vm = useVmgoVersions({
    api,
    scopeKey: code,
    enabled: !!code,
    listKeys: [],
    toForm,
    toPayload,
    userName,
    loadErrorText: "Could not load the department's vision and mission.",
  });
  const { active, history, form, setForm, extracted, saving } = vm;
  const loading = !departments || (!!code && vm.loading);

  const canSave = !!form && !saving && form.vision.trim() !== '' && form.mission.trim() !== '';

  const showCurrent = !!active && !!form;
  const sectionClass = cx(styles.section, showCurrent ? styles.twoCol : styles.oneCol);
  const deptName = dept ? dept.name : '';

  const mismatch = extracted ? extracted.general.find((w) => w.code === 'DEPARTMENT_MISMATCH') : null;
  const otherGeneral = extracted ? extracted.general.filter((w) => w !== mismatch) : [];

  const title = 'Upload Vision & Mission' + (code ? ' — ' + code : '');

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Department Vision & Mission</h2>
          {dept && <div className={styles.deptName}>{dept.name} ({code})</div>}
          {active && <div className={styles.meta}>{versionMeta(active)}</div>}
        </div>
        {active && (
          <ActionBtn
            variant="white"
            onClick={vm.openPicker}
            icon={<Upload size={18} color="#374151" />}
            label="Upload New Version (PDF)"
          />
        )}
      </div>

      {!termId && <div style={{ color: '#6B7280' }}>No current term — add one before uploading.</div>}
      {deptError && <div className={styles.notice}><AlertTriangle size={16} />{deptError}</div>}
      {termId && notAssigned && (
        <div className={styles.notice}>
          <AlertTriangle size={16} />
          {assigned
            ? 'Your department (' + assigned + ") isn't in the current term's department list."
            : 'No department is assigned to you, so there is no vision and mission to upload.'}
        </div>
      )}
      {termId && loading && !notAssigned && !deptError && <div style={{ color: '#6B7280' }}>Loading…</div>}
      {vm.loadError && <div className={styles.notice}><AlertTriangle size={16} />{vm.loadError}</div>}

      {!loading && code && !vm.loadError && !active && (
        <EmptyState title={'No vision and mission for ' + deptName + ' yet'} onUpload={vm.openPicker}>
          Upload the PDF with the department's vision and mission. You'll review what was read
          from it before it is saved.
        </EmptyState>
      )}

      {!loading && active && (
        <div className={styles.layout}>
          <DepartmentDocument data={active} />
          <HistoryPanel
            history={history}
            restoreError={vm.restoreError}
            toRestore={vm.toRestore}
            onView={vm.openVersion}
            onRestore={vm.askRestore}
          />
        </div>
      )}

      <PickerDialog vm={vm} title={title} />

      <ReviewDialog
        vm={vm}
        title={title}
        ariaLabel="Review Department Vision & Mission"
        canSave={canSave}
        invalidHint="Vision and mission are required."
        doneTitle={'Vision and mission for ' + deptName + ' saved'}
      >
        {mismatch && <Notice info icon={<AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />}><strong>{mismatch.message}</strong></Notice>}
        {extracted && extracted.sameAsActive && <Notice info>This is the same file as the current version.</Notice>}
        {otherGeneral.map((w, i) => <Notice key={i}>{w.message}</Notice>)}
        <div style={{ color: '#6B7280', fontSize: 13 }}>
          Check the vision and mission against the PDF and correct anything that was read wrong.
          {showCurrent ? ' Fields that differ from the current version are highlighted.' : ''}
        </div>

        {showCurrent && <ColumnHeads />}

        {form && TEXT_SECTIONS.map((s) => {
          const value = form[s.key];
          const changed = showCurrent && !same(value, active[s.key]);
          const empty = !value.trim();
          return (
            <div key={s.key} className={sectionClass}>
              <label className={cx(styles.field, changed && styles.fieldChanged)}>
                <span className={styles.fieldLabel}>
                  {s.label}<span className={styles.required}>*</span>
                  {changed && <span className={styles.changedTag}>Changed</span>}
                </span>
                <textarea
                  className={cx(styles.textarea, empty && styles.inputInvalid)}
                  value={value}
                  rows={5}
                  onChange={(e) => setForm((f) => ({ ...f, [s.key]: e.target.value }))}
                />
                {extracted.fieldWarnings[s.key] && <Warn>{extracted.fieldWarnings[s.key]}</Warn>}
                {empty && <span className={styles.fieldError}>{s.label} is required.</span>}
              </label>
              {showCurrent && <CurrentText value={active[s.key]} />}
            </div>
          );
        })}
      </ReviewDialog>

      <VersionDialog vm={vm} renderDocument={(v) => <DepartmentDocument data={v} />} />
      <RestoreConfirm vm={vm} subject={'vision and mission for ' + deptName} />
    </div>
  );
};

export default DeanDepartmentStatements;

/**
 * University VMGO — OVPAA sub-page (?page=University VMGO).
 *
 * The university's vision, mission, educational policy, core values and
 * graduate attributes, kept as VERSIONS (not per term). The flow:
 *
 *   View      — the Active version, laid out like the source document.
 *   Step 1    — pick a PDF.
 *   Step 2    — the server extracts it (POST /extract, writes nothing) and the
 *               user reviews and corrects every field, beside the current
 *               version with changes highlighted.
 *   Step 3    — Confirm & Save writes a new Active version; the old one is
 *               marked Superseded, never edited.
 *
 * "Previous versions" can be viewed and restored. Restore copies the old
 * version forward as a new one, so the history stays as it happened.
 *
 * The upload / review / history machinery is shared with the Dean's
 * Department Vision & Mission page (components/vmgo/).
 */
import React from 'react';
import { Upload, AlertTriangle } from 'react-feather';
import { UniversityStatementsAPI } from '../services/api.js';
import useVmgoVersions from '../components/vmgo/useVmgoVersions.js';
import { cx, same, listChanged, versionMeta, withKeys, stripItems } from '../components/vmgo/vmgoUtils.js';
import {
  ActionBtn, Warn, Notice, ListEditor, CurrentText, CurrentList, ColumnHeads,
  EmptyState, HistoryPanel, PickerDialog, ReviewDialog, VersionDialog, RestoreConfirm,
} from '../components/vmgo/VmgoShared.jsx';
import styles from '../styles/VmgoStatements.module.sass';

const TEXT_SECTIONS = [
  { key: 'vision',             label: 'Vision Statement',   required: true },
  { key: 'mission',            label: 'Mission Statement',  required: true },
  { key: 'educational_policy', label: 'Educational Policy', required: false },
];
const LIST_SECTIONS = [
  { key: 'core_values',         label: 'Core Values',         numbered: true,  noun: 'core value' },
  { key: 'graduate_attributes', label: 'Graduate Attributes', numbered: false, noun: 'graduate attribute' },
];
const LIST_KEYS = LIST_SECTIONS.map((s) => s.key);

// ---------------------------------------------------------------------------
// The document — the saved statements, laid out like the source PDF.
// ---------------------------------------------------------------------------

const StatementsDocument = ({ data }) => (
  <div className={styles.doc}>
    <div className={styles.docBar}>UNIVERSITY</div>
    {TEXT_SECTIONS.map((s) => (
      <div key={s.key} className={styles.docRow}>
        <div className={styles.docLabel}>{s.label}</div>
        <div className={styles.docContent}>
          {data[s.key] || <span className={styles.docEmpty}>Not provided</span>}
        </div>
      </div>
    ))}
    {LIST_SECTIONS.map((s) => {
      const items = Array.isArray(data[s.key]) ? data[s.key] : [];
      const ListTag = s.numbered ? 'ol' : 'ul';
      return (
        <div key={s.key} className={styles.docRow}>
          <div className={styles.docLabel}>{s.label}</div>
          <div className={styles.docContent}>
            {items.length === 0 ? <span className={styles.docEmpty}>None</span> : (
              <ListTag className={cx(styles.docList, !s.numbered && styles.docListPlain)}>
                {items.map((it, i) => (
                  <li key={i}><strong>{it.title}{s.numbered ? '' : '.'}</strong> {it.description}</li>
                ))}
              </ListTag>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

const toForm = (f, itemWarnings) => ({
  vision: f.vision || '',
  mission: f.mission || '',
  educational_policy: f.educational_policy || '',
  core_values: withKeys(f.core_values, itemWarnings.core_values),
  graduate_attributes: withKeys(f.graduate_attributes, itemWarnings.graduate_attributes),
});

const toPayload = (form, meta) => ({
  vision: form.vision,
  mission: form.mission,
  educational_policy: form.educational_policy,
  core_values: stripItems(form.core_values),
  graduate_attributes: stripItems(form.graduate_attributes),
  ...meta,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const OVPAAUniversityStatements = ({ userName }) => {
  const vm = useVmgoVersions({
    api: UniversityStatementsAPI,
    listKeys: LIST_KEYS,
    toForm,
    toPayload,
    userName,
    loadErrorText: 'Could not load the university statements.',
  });
  const { active, history, loading, loadError, form, setForm, extracted, saving } = vm;

  const listsTitled = form
    ? LIST_SECTIONS.every((s) => form[s.key].every((it) => it.title.trim()))
    : false;
  const canSave = !!form && !saving && form.vision.trim() !== '' && form.mission.trim() !== '' && listsTitled;

  const showCurrent = !!active && !!form;
  const sectionClass = cx(styles.section, showCurrent ? styles.twoCol : styles.oneCol);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>University VMGO</h2>
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

      {loading && <div style={{ color: '#6B7280' }}>Loading…</div>}
      {loadError && <div className={styles.notice}><AlertTriangle size={16} />{loadError}</div>}

      {!loading && !loadError && !active && (
        <EmptyState title="No university statements yet" onUpload={vm.openPicker}>
          Upload the PDF with the university's vision, mission, educational policy, core values and
          graduate attributes. You'll review everything that was read from it before it is saved.
        </EmptyState>
      )}

      {!loading && active && (
        <div className={styles.layout}>
          <StatementsDocument data={active} />
          <HistoryPanel
            history={history}
            restoreError={vm.restoreError}
            toRestore={vm.toRestore}
            onView={vm.openVersion}
            onRestore={vm.askRestore}
          />
        </div>
      )}

      <PickerDialog vm={vm} title="Upload University VMGO" />

      <ReviewDialog
        vm={vm}
        title="Upload University VMGO"
        ariaLabel="Review University VMGO"
        canSave={canSave}
        invalidHint="Vision, mission and every item's title are required."
        doneTitle="University VMGO saved"
      >
        {extracted && extracted.sameAsActive && <Notice info>This is the same file as the current version.</Notice>}
        {extracted && extracted.general.map((w, i) => <Notice key={i}>{w.message}</Notice>)}
        <div style={{ color: '#6B7280', fontSize: 13 }}>
          Check each field against the PDF and correct anything that was read wrong.
          {showCurrent ? ' Fields that differ from the current version are highlighted.' : ''}
        </div>

        {showCurrent && <ColumnHeads />}

        {form && TEXT_SECTIONS.map((s) => {
          const value = form[s.key];
          const changed = showCurrent && !same(value, active[s.key]);
          const empty = s.required && !value.trim();
          return (
            <div key={s.key} className={sectionClass}>
              <label className={cx(styles.field, changed && styles.fieldChanged)}>
                <span className={styles.fieldLabel}>
                  {s.label}{s.required && <span className={styles.required}>*</span>}
                  {changed && <span className={styles.changedTag}>Changed</span>}
                </span>
                <textarea
                  className={cx(styles.textarea, empty && styles.inputInvalid)}
                  value={value}
                  rows={s.key === 'educational_policy' ? 6 : 4}
                  onChange={(e) => setForm((f) => ({ ...f, [s.key]: e.target.value }))}
                />
                {extracted.fieldWarnings[s.key] && <Warn>{extracted.fieldWarnings[s.key]}</Warn>}
                {empty && <span className={styles.fieldError}>{s.label} is required.</span>}
              </label>
              {showCurrent && <CurrentText value={active[s.key]} />}
            </div>
          );
        })}

        {form && LIST_SECTIONS.map((s) => {
          const items = form[s.key];
          const cur = active ? active[s.key] : null;
          const changed = showCurrent && listChanged(items, cur);
          return (
            <div key={s.key} className={sectionClass}>
              <div className={cx(styles.field, changed && styles.fieldChanged)}>
                <span className={styles.fieldLabel}>
                  {s.label} <span style={{ color: '#6B7280', fontWeight: 400 }}>({items.length})</span>
                  {changed && <span className={styles.changedTag}>Changed</span>}
                </span>
                {extracted.fieldWarnings[s.key] && <Warn>{extracted.fieldWarnings[s.key]}</Warn>}
                <ListEditor
                  section={s}
                  items={items}
                  current={showCurrent ? cur : null}
                  onChange={(next) => setForm((f) => ({ ...f, [s.key]: next }))}
                />
              </div>
              {showCurrent && <CurrentList section={s} items={cur} />}
            </div>
          );
        })}
      </ReviewDialog>

      <VersionDialog vm={vm} renderDocument={(v) => <StatementsDocument data={v} />} />
      <RestoreConfirm vm={vm} subject="University VMGO" />
    </div>
  );
};

export default OVPAAUniversityStatements;

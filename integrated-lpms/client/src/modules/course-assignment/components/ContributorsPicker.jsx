/**
 * ContributorsPicker — multi-select for a course assignment's co-teachers.
 *
 * Sits beside the single "Lead Faculty" field in the Add/Edit assignment
 * modals. The value is a plain array of faculty NAMES (the backend resolves
 * each to a faculty_id and stores { faculty_id, faculty_name }).
 *
 *   value        string[]            — selected contributor names
 *   onChange     (string[]) => void
 *   options      [{ value, label, sub }]  — same faculty options as the lead
 *   excludeValue string              — the currently-selected lead; excluded
 *                                       from the add list so a faculty can't be
 *                                       both lead and contributor.
 *
 * Selected names render as removable chips; a SearchableSelect below adds one
 * at a time (already-picked names and the lead drop out of its option list).
 */
import React from 'react';
import { X } from 'react-feather';
import SearchableSelect from './SearchableSelect.jsx';

const norm = (s) => String(s || '').trim().toLowerCase();

const ContributorsPicker = ({ value, onChange, options, excludeValue }) => {
  const selected = Array.isArray(value) ? value : [];
  const leadKey = norm(excludeValue);

  // The add dropdown only offers faculty who aren't already a contributor and
  // aren't the lead.
  const addOptions = React.useMemo(() => {
    const taken = new Set(selected.map(norm));
    return (options || []).filter((o) => {
      const k = norm(typeof o === 'string' ? o : o.value);
      return k !== leadKey && !taken.has(k);
    });
  }, [options, selected, leadKey]);

  // Label lookup so a chip can show the faculty's display label (falls back to
  // the stored name when the option list doesn't carry it).
  const labelOf = (name) => {
    const m = (options || []).find((o) => norm(typeof o === 'string' ? o : o.value) === norm(name));
    return m ? (typeof m === 'string' ? m : m.label) : name;
  };

  const add = (name) => {
    if (!name) return;
    if (norm(name) === leadKey) return;
    if (selected.some((s) => norm(s) === norm(name))) return;
    onChange([...selected, name]);
  };
  const remove = (name) => onChange(selected.filter((s) => norm(s) !== norm(name)));

  return (
    <div>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selected.map((name) => (
            <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 10px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 9999, fontSize: 13, color: '#0F172A', maxWidth: '100%' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelOf(name)}</span>
              <button type="button" onClick={() => remove(name)} aria-label={'Remove ' + name} title="Remove" style={{ display: 'inline-flex', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#64748B' }}>
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* value="" so the picker never holds a selection — each pick is appended
          to the chips above and the input resets. */}
      <SearchableSelect
        value=""
        onChange={add}
        options={addOptions}
        placeholder={addOptions.length ? 'Add a contributor…' : 'No more faculty to add'}
      />
    </div>
  );
};

export default ContributorsPicker;

import React, { useState } from 'react';
import Select from './Select.jsx';
import SpellCheckArea from './SpellCheckArea.jsx';
import styles from '../styles/ReferenceFields.module.sass';
import { getReferenceTypes, fieldsFor, referenceTypeLabel, YEAR_MIN, yearMax, completeLink } from '../utils/referenceTypes.js';
import { fetchJson, apiErrorMessage } from '../utils/api.js';

// The reference form, drawn from the server's type definitions: the type dropdown, then exactly the
// fields that type requires or allows, with its own labels. Adding a type or a field on the server
// changes this form with no client change.
//
// props: value { type, title, authors, isbn, year, link, publisher }, errors { field: message },
//        onChange(field, value)
const PLACEHOLDERS = { year: 'YYYY', link: 'https://...', copies: 'Leave empty if not known', received: 'YYYY-MM-DD' };

// Text fields checked as you type, with the same checker as the comment boxes. Not the authors: surnames are not
// dictionary words, and a checker that underlines every name is one people learn to ignore.
const CHECKED_FIELDS = ['title', 'publisher', 'category'];

// What each kind of field lets through as it is typed: letters never reach a year, an ISBN, or a count. The rest of
// the rule (length, range, the link's shape) is checked when the field is left (utils/referenceTypes.js fieldError).
const KEEP = {
  isbn: (v) => v.replace(/[^0-9Xx -]/g, ''),
  count: (v) => v.replace(/[^0-9]/g, ''),
};
const INPUT_PROPS = {
  isbn: { inputMode: 'numeric', maxLength: 17, autoComplete: 'off' },
  count: { inputMode: 'numeric', maxLength: 4 },
  url: { type: 'url', inputMode: 'url', autoComplete: 'off' },
};
// Newest first: most references are recent, so the year wanted is near the top. Typing "19" or "2005" jumps to it.
const yearOptions = () => Array.from({ length: yearMax() - YEAR_MIN + 1 }, (_, i) => String(yearMax() - i));

// One labelled control: a themed dropdown (`options`), a year list, a date picker, a checked one-line text box
// (`checked`), or a text input shaped by its kind.
const Field = ({ label, error, value, onChange, onBlur, options, placeholder, checked = false, kind, max }) => (
  <div className={styles.field}>
    <div className={styles.label}>{label}</div>
    {options ? (
      <Select block value={value} placeholder="Select an option" aria-label={label} onChange={(event) => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </Select>
    ) : kind === 'year' ? (
      <Select block value={value} placeholder="Year" aria-label={label} onChange={(event) => { onChange(event.target.value); onBlur?.(event.target.value) }}>
        {!String(value || '').length ? null : <option value="">No year</option>}
        {yearOptions().map(year => <option key={year} value={year}>{year}</option>)}
      </Select>
    ) : kind === 'date' ? (
      <input className={`app-input ${error ? styles.invalid : ''}`} type="date" value={value} max={new Date().toISOString().slice(0, 10)}
        aria-label={label} onChange={(event) => onChange(event.target.value)} onBlur={() => onBlur?.()} />
    ) : checked ? (
      // One line: a pasted line break becomes a space.
      <SpellCheckArea singleLine checkCapitals showButton={false} value={value} rows={1} minHeight={36} padding="6px 12px" placeholder={placeholder} aria-label={label}
        maxLength={max} className={error ? styles.invalid : ''} onBlur={() => onBlur?.()} onChange={(next) => onChange(next.replace(/\s*[\r\n]+\s*/g, ' '))} />
    ) : (
      <input className={`app-input ${error ? styles.invalid : ''}`} type="text" value={value} placeholder={placeholder}
        maxLength={max} aria-label={label} {...(INPUT_PROPS[kind] || {})}
        onChange={(event) => onChange(KEEP[kind] ? KEEP[kind](event.target.value) : event.target.value)}
        onBlur={(event) => {
          // The completed link is what gets checked: checking the typed one would flag a value already fixed.
          const next = kind === 'url' ? completeLink(event.target.value) : event.target.value
          if (next !== event.target.value) onChange(next)
          onBlur?.(next)
        }} />
    )}
    {error && <div className={styles.error} role="alert">{error}</div>}
  </div>
);

const optionLabel = (option) => option.charAt(0).toUpperCase() + option.slice(1);

// Under the ISBN: Look up fills the empty fields from Open Library (GET /api/references/isbn/:isbn). Fields already
// typed are left alone, so a lookup never overwrites someone's work.
const IsbnLookup = ({ value, fields, onChange }) => {
  const [state, setState] = useState({ busy: false, note: '', error: '' });
  const lookUp = async () => {
    setState({ busy: true, note: '', error: '' });
    try {
      const book = await fetchJson(`/api/references/isbn/${encodeURIComponent(value.isbn.trim())}`);
      const filled = fields.filter(f => f.key !== 'isbn' && book[f.key] && !String(value[f.key] || '').trim());
      filled.forEach(f => onChange(f.key, book[f.key]));
      setState({ busy: false, error: '', note: filled.length
        ? `Filled from Open Library: ${filled.map(f => f.label.toLowerCase()).join(', ')}. Check them before saving.`
        : 'Open Library found the book; every field it knows is already filled.' });
    } catch (err) {
      setState({ busy: false, note: '', error: apiErrorMessage(err, 'The lookup did not work. Fill the fields by hand.') });
    }
  };
  return (
    <div className={styles.lookup}>
      <button type="button" className="btn btn-secondary btn-sm" onClick={lookUp} disabled={state.busy || !String(value.isbn || '').trim()}>
        {state.busy ? 'Looking up…' : 'Look up by ISBN'}
      </button>
      {state.note && <span className={styles.note} role="status">{state.note}</span>}
      {state.error && <span className={styles.error} role="alert">{state.error}</span>}
    </div>
  );
};

// Short values (a year, an ISBN, a status, a count, a date) share a row; titles, names and links get the full width.
const HALF = new Set(['year', 'isbn', 'status', 'copies', 'received', 'category']);

const ReferenceFields = ({ value, errors = {}, onChange, onBlur, gap = 16 }) => {
  const types = getReferenceTypes();
  const fields = fieldsFor(value.type);
  const renderField = (field) => (
    <div key={field.key} className={HALF.has(field.key) ? styles.half : styles.full}>
      {field.kind === 'choice' ? (
        <Field
          options={field.options.map(optionLabel)}
          label={field.label}
          value={optionLabel(value[field.key] || field.default || field.options[0])}
          onChange={(label) => onChange(field.key, label.toLowerCase())}
          error={errors[field.key]}
        />
      ) : (
        <Field
          label={field.label}
          kind={field.kind}
          max={field.max}
          value={value[field.key] || ''}
          onChange={(next) => onChange(field.key, next)}
          // The year list checks on pick; it has no blur of its own worth waiting for.
          onBlur={(next) => onBlur?.(field.key, next)}
          error={errors[field.key]}
          placeholder={PLACEHOLDERS[field.key]}
          checked={CHECKED_FIELDS.includes(field.key)}
        />
      )}
      {field.key === 'isbn' && <IsbnLookup value={value} fields={fields} onChange={onChange} />}
    </div>
  );
  // Wide fields first, then the short ones, so the short ones land side by side.
  const byWidth = (list) => [...list.filter(f => !HALF.has(f.key)), ...list.filter(f => HALF.has(f.key))];
  const required = byWidth(fields.filter(field => field.required));
  const optional = byWidth(fields.filter(field => !field.required));

  // Chunked: what the type needs, then a labelled "Optional details" group, so nobody has to guess which of eight
  // boxes must be filled before Save works.
  return (
    <div className={styles.grid} style={{ rowGap: gap }}>
      <div className={styles.full}>
        <Field
          options={types.map(type => type.label)}
          label="Type"
          value={referenceTypeLabel(value.type)}
          onChange={(label) => onChange('type', types.find(type => type.label === label)?.key || '')}
          error={errors.type}
        />
      </div>
      {required.map(renderField)}
      {optional.length > 0 && <div className={`${styles.full} ${styles.groupTitle}`}>Optional details</div>}
      {optional.map(renderField)}
    </div>
  );
};

export default ReferenceFields;

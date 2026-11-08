import React from 'react';
import Select from './Select.jsx';
import SpellCheckArea from './SpellCheckArea.jsx';
import styles from '../styles/ReferenceFields.module.sass';
import { getReferenceTypes, fieldsFor, referenceTypeLabel } from '../utils/referenceTypes.js';

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

// One labelled control: a themed dropdown (`options`), a checked one-line text box (`checked`), or a text input.
const Field = ({ label, error, value, onChange, options, placeholder, checked = false }) => (
  <div className={styles.field}>
    <div className={styles.label}>{label}</div>
    {options ? (
      <Select block value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select an option</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </Select>
    ) : checked ? (
      // One line: a pasted line break becomes a space.
      <SpellCheckArea singleLine showButton={false} value={value} rows={1} minHeight={36} padding="7px 12px" placeholder={placeholder} aria-label={label}
        className={error ? styles.invalid : ''} onChange={(next) => onChange(next.replace(/\s*[\r\n]+\s*/g, ' '))} />
    ) : (
      <input className={`app-input ${error ? styles.invalid : ''}`} type="text" value={value} placeholder={placeholder}
        aria-label={label} onChange={(event) => onChange(event.target.value)} />
    )}
    {error && <div className={styles.error} role="alert">{error}</div>}
  </div>
);

const optionLabel = (option) => option.charAt(0).toUpperCase() + option.slice(1);

const ReferenceFields = ({ value, errors = {}, onChange, gap = 0 }) => {
  const types = getReferenceTypes();
  const spacer = gap ? <div style={{ height: gap }} /> : null;

  return (
    <>
      <Field
        options={types.map(type => type.label)}
        label="Reference Type"
        value={referenceTypeLabel(value.type)}
        onChange={(label) => onChange('type', types.find(type => type.label === label)?.key || '')}
        error={errors.type}
      />
      {spacer}
      {fieldsFor(value.type).map(field => (
        <React.Fragment key={field.key}>
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
            value={value[field.key] || ''}
            onChange={(next) => onChange(field.key, next)}
            error={errors[field.key]}
            placeholder={PLACEHOLDERS[field.key]}
            checked={CHECKED_FIELDS.includes(field.key)}
          />
          )}
          {spacer}
        </React.Fragment>
      ))}
    </>
  );
};

export default ReferenceFields;

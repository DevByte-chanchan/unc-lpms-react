import React from 'react';
import TextField from './TextField.jsx';
import AutoCorrectButton from './AutoCorrectButton.jsx';
import DropdownA from './DropdownA.jsx';
import { getReferenceTypes, fieldsFor, referenceTypeLabel } from '../utils/referenceTypes.js';

// The reference form, drawn from the server's type definitions: the type dropdown, then exactly the
// fields that type requires or allows, with its own labels. Adding a type or a field on the server
// changes this form with no client change.
//
// props: value { type, title, authors, isbn, year, link, publisher }, errors { field: message },
//        onChange(field, value), fieldStyle (passed to each input)
const PLACEHOLDERS = { year: 'YYYY', link: 'https://...' };

const ReferenceFields = ({ value, errors = {}, onChange, fieldStyle, gap = 0 }) => {
  const types = getReferenceTypes();
  const spacer = gap ? <div style={{ height: gap }} /> : null;

  return (
    <>
      <DropdownA
        options={types.map(type => type.label)}
        label="Reference Type"
        value={referenceTypeLabel(value.type)}
        initialValue={referenceTypeLabel(value.type)}
        onChange={(label) => onChange('type', types.find(type => type.label === label)?.key || '')}
        error={errors.type}
        style={fieldStyle}
      />
      {spacer}
      {fieldsFor(value.type).map(field => (
        <React.Fragment key={field.key}>
          <TextField
            label={field.label}
            value={value[field.key] || ''}
            onChange={(next) => onChange(field.key, next)}
            error={errors[field.key]}
            placeholder={PLACEHOLDERS[field.key]}
            style={fieldStyle}
          />
          {['title', 'authors'].includes(field.key) && (
            <AutoCorrectButton
              value={value[field.key] || ''}
              onChange={(next) => onChange(field.key, next)}
              label={field.key === 'title' ? 'Check title' : 'Check author names'}
              compact
            />
          )}
          {spacer}
        </React.Fragment>
      ))}
    </>
  );
};

export default ReferenceFields;

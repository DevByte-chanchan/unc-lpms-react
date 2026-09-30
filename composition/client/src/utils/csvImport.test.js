import test from 'node:test';
import assert from 'node:assert/strict';

import { parseReferenceCsv } from './csvImport.js';

test('reference CSV parsing preserves quoted commas and escaped quotes', () => {
  const rows = parseReferenceCsv(
    'Title,Author(s),Reference Type,Year,ISBN,Link\r\n' +
    '"Systems, Integration","Doe, Jane",Textbook,2025,123,"https://example.test/book"\r\n' +
    '"A ""Quoted"" Title",Author,Online Resources,2024,,\r\n'
  );

  assert.deepEqual(rows, [
    {
      Title: 'Systems, Integration',
      'Author(s)': 'Doe, Jane',
      'Reference Type': 'Textbook',
      Year: '2025',
      ISBN: '123',
      Link: 'https://example.test/book'
    },
    {
      Title: 'A "Quoted" Title',
      'Author(s)': 'Author',
      'Reference Type': 'Online Resources',
      Year: '2024',
      ISBN: '',
      Link: ''
    }
  ]);
});

test('reference CSV parsing rejects an unterminated quoted field', () => {
  assert.throws(() => parseReferenceCsv('Title,Author(s)\n"Broken,Author'), /unterminated quoted field/i);
});

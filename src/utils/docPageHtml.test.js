import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageHeader, FORM_HEADERS } from './docPageHtml.js';

const LOGO = 'data:image/png;base64,iVBORw0KGgo=';

// The v2 branch's syllabus header (syllabusPdfHtml.js pageHeader), with one intended
// difference: the seal keeps its aspect ratio (height:auto instead of 68px).
const v2SyllabusHeader = (logo, docControlNo) => `<table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:8px;">
  <tr>
    <td style="width:80px; min-width:80px; max-width:80px; padding:4px; border:1px solid #000; text-align:center; vertical-align:middle;">
      ${logo ? `<img src="${logo}" style="width:68px; height:68px;">` : ''}
    </td>
    <td style="text-align:center; vertical-align:middle; padding:6px; border:1px solid #000;">
      <div style="font-size:10.5pt; font-weight:bold; color:#000; line-height:1.35;">UNIVERSITY OF NUEVA CACERES</div>
      <div style="font-size:10.5pt; font-weight:bold; color:#000; line-height:1.35;">COURSE SYLLABUS</div>
      <div style="font-size:10pt; font-weight:normal; color:#000; line-height:1.35;">Form</div>
      <div style="font-size:10pt; font-weight:bold; color:#000; line-height:1.35;">OFFICE OF THE VICE PRESIDENT OF ACADEMIC AFFAIRS</div>
    </td>
    <td style="width:120px; min-width:120px; max-width:120px; padding:5px 8px; vertical-align:middle; border:1px solid #000;">
      <div style="font-size:9pt; font-weight:bold; color:#000;">Doc. Control No.:</div>
      <div style="font-size:9pt; font-weight:normal; color:#000;">${docControlNo}</div>
    </td>
  </tr>
</table>`;

test('syllabus header is the v2 markup (seal height:auto)', () => {
  const ours = pageHeader(LOGO, { ...FORM_HEADERS.syllabus, docControlNo: 'UNC-FM-VPAA-01' });
  assert.equal(ours, v2SyllabusHeader(LOGO, 'UNC-FM-VPAA-01').replace('height:68px', 'height:auto'));
});

test('TOS header follows the Registrar form', () => {
  const h = pageHeader(LOGO, { ...FORM_HEADERS.tos, docControlNo: 'UNC-FM-VPAA-05' });
  assert.match(h, /font-size:11pt; font-weight:normal; color:#000; line-height:1\.35;">TABLE OF SPECIFICATION</);
  assert.match(h, />Office of the Vice President for Academic Affairs</);
  assert.match(h, /font-weight:normal; color:#000; text-align:center;">Doc\. Control No\.:</);
  assert.match(h, /font-weight:bold; color:#000; text-align:center;">UNC-FM-VPAA-05</);
  assert.doesNotMatch(h, /SPECIFICATIONS/);
});

test('only an embedded PNG/JPEG seal is used', () => {
  assert.doesNotMatch(pageHeader('javascript:alert(1)', FORM_HEADERS.tos), /<img/);
  assert.doesNotMatch(pageHeader('https://example.com/x.png', FORM_HEADERS.tos), /<img/);
});

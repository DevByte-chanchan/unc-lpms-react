/**
 * University VMGO extraction — the PDF parser and the /extract endpoint.
 *
 * The oracle assertions run against every source available: always the
 * synthetic PDF from fixtures/makeVmgoPdf.js (same layout and traps as the
 * real document), and also the real one when it is present at
 * sample-uploads/university-vmgo.pdf.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  parseUniversityStatementsPdf,
  extractStatementsFromPages,
  cleanText,
  MESSAGES,
} from '../utils/universityStatementParser.js';
import { makeVmgoPdf, makeScannedPdf, makeUnrelatedPdf } from './fixtures/makeVmgoPdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REAL_PDF = path.resolve(__dirname, '..', '..', 'sample-uploads', 'university-vmgo.pdf');

const SOURCES = [{ name: 'synthetic fixture', load: () => makeVmgoPdf() }];
if (fs.existsSync(REAL_PDF)) SOURCES.push({ name: 'sample-uploads/university-vmgo.pdf', load: () => fs.readFileSync(REAL_PDF) });

const CORE_VALUES = [
  'We Champion Excellence',
  'We Nurture Dreams',
  'We Do The Right Things Right',
  'We Are Dynamic and Creative',
  'We Respect Each Other and Work As A Team',
];
const GRADUATE_ATTRIBUTES = [
  'Excellent Communicator',
  'Creative Leader',
  'Ethically Responsible Citizen',
  'Lifelong Learner',
];

for (const src of SOURCES) {
  test(`[${src.name}] extracts the five sections`, async (t) => {
    const { fields, warnings } = await parseUniversityStatementsPdf(src.load());

    await t.test('vision', () => {
      assert.match(fields.vision, /^Our vision is to be the top university of choice for Bicolanos everywhere/);
      assert.match(fields.vision, /better tomorrows for all\.$/);
    });

    await t.test('no label words leak into the content (column interleaving)', () => {
      const texts = [
        fields.vision, fields.mission, fields.educational_policy,
        ...fields.core_values.flatMap((v) => [v.title, v.description]),
        ...fields.graduate_attributes.flatMap((v) => [v.title, v.description]),
      ];
      for (const text of texts) {
        for (const word of ['STATEMENT', 'POLICY', 'VALUES', 'ATTRIBUTES']) {
          assert.ok(!text.includes(word), `"${word}" leaked into: ${text}`);
        }
      }
    });

    await t.test('educational policy — missing space after the period restored', () => {
      assert.ok(fields.educational_policy.includes('objectives. UNC shall'), fields.educational_policy);
      assert.ok(fields.educational_policy.includes('standards. UNC pledges'), fields.educational_policy);
    });

    await t.test('core values — five, titled from the bold run', () => {
      assert.deepEqual(fields.core_values.map((v) => v.title), CORE_VALUES);
      assert.deepEqual(fields.core_values.map((v) => v.order), [1, 2, 3, 4, 5]);
      // No period after this title — only the font tells where it ends.
      assert.equal(fields.core_values[3].title, 'We Are Dynamic and Creative');
      assert.match(fields.core_values[3].description, /^We anticipate the forces of change/);
      for (const v of fields.core_values) assert.ok(v.description, `empty description for ${v.title}`);
    });

    await t.test('graduate attributes — four, no space before punctuation', () => {
      assert.deepEqual(fields.graduate_attributes.map((v) => v.title), GRADUATE_ATTRIBUTES);
      const lifelong = fields.graduate_attributes.find((v) => v.title === 'Lifelong Learner');
      assert.ok(lifelong.description.includes('learn independently, reflect'), lifelong.description);
    });

    await t.test('no per-field warnings', () => {
      assert.deepEqual(warnings.filter((w) => w.field), []);
    });
  });
}

test('synthetic: hyphenation, multi-page and the SCHOOL block', async () => {
  const { fields, warnings, pages } = await parseUniversityStatementsPdf(makeVmgoPdf());
  assert.equal(pages, 2);
  assert.ok(fields.mission.includes('wider community through'), fields.mission);
  // Graduate attributes start on page 1 and finish on page 2.
  assert.equal(fields.graduate_attributes.length, 4);
  // The SCHOOL block's own VISION must not replace or extend the university's.
  assert.ok(!fields.vision.includes('center of excellence in computing'));
  assert.ok(!fields.graduate_attributes.some((a) => a.description.includes('computing')));
  assert.deepEqual(warnings.map((w) => w.message), ['Also found a SCHOOL block — not imported.']);
});

test('cleanText', () => {
  assert.equal(cleanText('objectives.UNC shall'), 'objectives. UNC shall');
  assert.equal(cleanText('independently , reflect'), 'independently, reflect');
  assert.equal(cleanText('  a   b \n c '), 'a b c');
  assert.equal(cleanText('the U.S. and 3.5 units'), 'the U.S. and 3.5 units');
  assert.equal(cleanText('in the U.S.Army'), 'in the U.S.Army');
});

// ---- layout-level cases, driven with hand-placed items (no PDF) ----------

const item = (str, x, y, bold = false) => ({ str, x, y, width: str.length * 5, height: 10, fontName: bold ? 'Arial-BoldMT' : 'ArialMT', bold });

test('no bold signal: title falls back to the first period, else a warning', () => {
  const page = {
    height: 800,
    items: [
      item('CORE', 50, 700, true), item('VALUES', 50, 686, true),
      item('1.', 200, 700), item('Excellence. We strive for excellence.', 216, 700),
      item('2.', 200, 686), item('We help every member of our community realize their dreams always', 216, 686),
    ],
  };
  const { fields, warnings } = extractStatementsFromPages([page]);
  assert.deepEqual(fields.core_values[0], { order: 1, title: 'Excellence', description: 'We strive for excellence.' });
  assert.equal(fields.core_values[1].title, '');
  assert.match(fields.core_values[1].description, /^We help every member/);
  assert.ok(warnings.some((w) => w.field === 'core_values[1].title'));
  // The four sections that aren't there are reported, not fatal.
  for (const key of ['vision', 'mission', 'educational_policy', 'graduate_attributes']) {
    assert.ok(warnings.some((w) => w.field === key), `no missing-section warning for ${key}`);
  }
});

test('a bold title that wraps onto a second line stays one item', () => {
  const page = {
    height: 800,
    items: [
      item('GRADUATE', 50, 700, true), item('ATTRIBUTES', 50, 686, true),
      item('Ethically Responsible', 200, 700, true),
      item('Citizen.', 200, 686, true), item('Acts with integrity.', 245, 686),
      item('Lifelong Learner.', 200, 672, true), item('Keeps learning.', 290, 672),
    ],
  };
  const { fields } = extractStatementsFromPages([page]);
  assert.deepEqual(fields.graduate_attributes.map((a) => a.title), ['Ethically Responsible Citizen', 'Lifelong Learner']);
  assert.equal(fields.graduate_attributes[0].description, 'Acts with integrity.');
});

// ---- the /extract endpoint ------------------------------------------------

async function withServer(fn) {
  const { default: router } = await import('../routes/universityStatements.js');
  const app = express();
  app.use(express.json());
  // The routes' role guard needs a signed-in user; stand in for requireAuth.
  app.use((req, _res, next) => { req.user = { id: 0, display_name: 'TESTER', roles: ['VPAA'] }; next(); });
  app.use('/university-statements', router);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  try {
    return await fn('http://127.0.0.1:' + server.address().port + '/university-statements');
  } finally {
    server.close();
  }
}

const postFile = (url, buffer, name, type = 'application/pdf') => {
  const fd = new FormData();
  fd.append('file', new Blob([buffer], { type }), name);
  return fetch(url + '/extract', { method: 'POST', body: fd });
};

test('POST /extract — scanned PDF (no text layer) → 422 with the plain message', async () => {
  await withServer(async (base) => {
    const res = await postFile(base, makeScannedPdf(), 'scan.pdf');
    assert.equal(res.status, 422);
    assert.equal((await res.json()).message, MESSAGES.scanned);
  });
});

test('POST /extract — PDF without any VMGO labels → 422', async () => {
  await withServer(async (base) => {
    const res = await postFile(base, makeUnrelatedPdf(), 'report.pdf');
    assert.equal(res.status, 422);
    assert.equal((await res.json()).message, MESSAGES.noLabels);
  });
});

test('POST /extract — a renamed non-PDF is rejected by its magic bytes', async () => {
  await withServer(async (base) => {
    const res = await postFile(base, Buffer.from('PK\u0003\u0004 not a pdf'), 'sheet.pdf');
    assert.equal(res.status, 400);
    assert.match((await res.json()).message, /not a PDF/);
  });
});

test('POST /extract — wrong extension is refused before parsing', async () => {
  await withServer(async (base) => {
    const res = await postFile(base, makeVmgoPdf(), 'vmgo.xlsx', 'application/vnd.ms-excel');
    assert.equal(res.status, 400);
  });
});

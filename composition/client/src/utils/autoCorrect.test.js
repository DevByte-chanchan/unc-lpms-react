// Runnable self-check for the auto-correct rules —
// `node src/utils/autoCorrect.test.js` from client/.
//
// No network is touched: `fetchMatches` is injected with a stub, so these run
// offline and cannot be broken by the service being down or rate-limited.

const {
  isProtectedToken, shouldApply, applyCorrections, summarize,
  localMatches, createRateLimiter, fetchMatches, autoCorrect, LIMITS
} = await import('./autoCorrect.js');

const test = (name, fn) => {
  try { fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}`); throw error; }
};
const eq = (actual, expected, what) => {
  if (actual !== expected) throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

// A misspelling match in the shape the service returns.
const typo = (offset, length, value) => ({
  offset, length,
  replacements: [{ value }],
  rule: { issueType: 'misspelling', category: { id: 'TYPOS' } }
});
const online = {
  onlineService: { enabled: true, endpoint: 'https://grammar.example.test/v2/check' },
  consent: true
};

test('corrections are applied back to front, so later offsets stay valid', () => {
  // Both offsets index the ORIGINAL string. "syllbus"→"syllabus" grows the
  // text by one character, so a left-to-right splice would put the second fix
  // one character off. This is the bug the ordering exists to prevent.
  const text = 'This syllbus has bad refernces here.';
  const matches = [typo(5, 7, 'syllabus'), typo(21, 9, 'references')];

  const { text: out, applied } = applyCorrections(text, matches);
  eq(out, 'This syllabus has bad references here.', 'both fixes land correctly');
  eq(applied.length, 2, 'both applied');
  // Reported in reading order even though they were spliced in reverse.
  eq(applied[0].from, 'syllbus', 'first reported fix');
  eq(applied[1].from, 'refernces', 'second reported fix');

  // Order of the input must not matter.
  const reversed = applyCorrections(text, [matches[1], matches[0]]);
  eq(reversed.text, out, 'input order is irrelevant');
});

test('a syllabus code or outcome id is never rewritten', () => {
  // The whole risk of this feature: a general-purpose checker does not know
  // these are correct, and rewriting one corrupts the thing being reviewed.
  ['BIT321L', 'BSCS 511', 'IT 402', 'CO2-ILO2', 'PO1-PEO3', 'CMO', 'CHED', 'TLA', 'OER', 'VPAA', 'ISBN']
    .forEach(t => { if (!isProtectedToken(t)) throw new Error(`${t} must be protected`); });

  ['syllbus', 'refernces', 'the', 'Topics', 'assesment']
    .forEach(t => { if (isProtectedToken(t)) throw new Error(`${t} must NOT be protected`); });

  const text = 'Revise CO2-ILO2 and check BIT321L for the assesment.';
  const matches = [
    typo(7, 8, 'CO2-ILO'),        // would corrupt the outcome id
    typo(26, 7, 'BIT321'),        // would corrupt the course code
    typo(42, 9, 'assessment')     // a genuine typo
  ];
  const { text: out, applied, skipped } = applyCorrections(text, matches);
  eq(out, 'Revise CO2-ILO2 and check BIT321L for the assessment.', 'only the real typo changed');
  eq(applied.length, 1, 'one applied');
  eq(skipped.length, 2, 'two protected matches skipped');

  // The two guards have to be tested apart. Above, both the original AND the
  // replacement look like codes, so either guard alone would pass the case.
  // Here only the ORIGINAL is protected — "TLA" → "Tea" is a plausible thing
  // for a general checker to suggest, and it must still be refused.
  const acronym = 'Add a TLA for this.';
  const suggestion = typo(6, 3, 'Tea');
  if (shouldApply(suggestion, acronym)) throw new Error('an acronym must not be rewritten into a real word');
  eq(applyCorrections(acronym, [suggestion]).text, acronym, 'the acronym survives');
});

test('grammar and style suggestions are reported but never applied silently', () => {
  // Rewriting a reviewer's instruction could change what they asked for, so
  // only spelling-class rules are auto-applied.
  const text = 'Please revise this section soon.';
  const style = {
    offset: 0, length: 6,
    replacements: [{ value: 'Kindly' }],
    rule: { issueType: 'style', category: { id: 'STYLE' } }
  };
  const { text: out, applied, skipped } = applyCorrections(text, [style]);
  eq(out, text, 'the text is untouched');
  eq(applied.length, 0, 'nothing applied');
  eq(skipped.length, 1, 'the suggestion is still reported');

  if (shouldApply(style, text)) throw new Error('a style rule must not auto-apply');
});

test('malformed and pointless matches are rejected rather than crashing', () => {
  const text = 'Short text.';
  const bad = [
    { offset: 0, length: 5 },                                   // no replacements
    { offset: 0, length: 5, replacements: [] },                 // empty replacements
    { offset: -1, length: 3, replacements: [{ value: 'x' }], rule: { issueType: 'misspelling' } },
    { offset: 0, length: 0, replacements: [{ value: 'x' }], rule: { issueType: 'misspelling' } },
    { offset: 5, length: 999, replacements: [{ value: 'x' }], rule: { issueType: 'misspelling' } }, // past the end
    typo(0, 5, 'Short')                                         // replacement equals the original
  ];
  const { text: out, applied } = applyCorrections(text, bad);
  eq(out, text, 'text survives untouched');
  eq(applied.length, 0, 'nothing applied');

  eq(applyCorrections('', []).text, '', 'empty text is fine');
  eq(applyCorrections(null, null).text, '', 'null input is fine');
});

test('overlapping matches are dropped, not double-applied', () => {
  const text = 'This assesment is wrong.';
  // "assesment" is 9 characters at offset 5 — a length of 10 would swallow the
  // following space and glue the next word on. Getting this wrong is exactly
  // the class of bug the back-to-front test above guards against.
  const a = typo(5, 9, 'assessment');
  const b = typo(5, 4, 'asses');          // overlaps a
  const { text: out, applied, skipped } = applyCorrections(text, [a, b]);
  eq(out, 'This assessment is wrong.', 'only one of the two is applied');
  eq(applied.length, 1, 'one applied');
  if (!skipped.includes(b)) throw new Error('the overlapping match should be reported as skipped');
});

test('the built-in dictionary produces matches with real offsets', () => {
  // The offline path has to go through the same splice as the online one, so
  // it needs offsets — `reviewGate.checkText` alone does not give them.
  const text = 'The refrence and the sylabus need work.';
  const m = localMatches(text);
  eq(m.length, 2, 'two known misspellings found');
  eq(text.slice(m[0].offset, m[0].offset + m[0].length), 'refrence', 'offset points at the word');
  eq(applyCorrections(text, m).text, 'The reference and the syllabus need work.', 'applied correctly');

  // Capitalisation is preserved.
  eq(applyCorrections('Refrence list', localMatches('Refrence list')).text, 'Reference list', 'leading capital kept');
  // Whole words only — no matching inside a longer word.
  eq(localMatches('refrences').length, 1, 'a known plural still matches as its own word');
  eq(localMatches('xrefrencex').length, 0, 'no match inside an unrelated word');
});

test('the rate limiter holds the line at the free tier', () => {
  const lim = createRateLimiter(3, 60000);
  const t0 = 1000;
  eq(lim.tryTake(t0), true, '1st');
  eq(lim.tryTake(t0), true, '2nd');
  eq(lim.tryTake(t0), true, '3rd');
  eq(lim.tryTake(t0), false, '4th is refused');
  eq(lim.remaining(t0), 0, 'none remaining');
  // The window slides rather than resetting on a fixed boundary.
  eq(lim.tryTake(t0 + 60001), true, 'allowed again once the window passes');
  if (LIMITS.requestsPerMinute >= 20) throw new Error('must stay under the documented 20/minute');
});

test('the service being down degrades to the built-in list instead of failing', async () => {
  const text = 'The refrence is wrong.';

  const dead = await autoCorrect(text, {
    ...online,
    limiter: createRateLimiter(5),
    fetchImpl: async () => { throw new Error('network down') }
  });
  eq(dead.ok, true, 'still succeeds');
  eq(dead.source, 'offline', 'fell back');
  eq(dead.text, 'The reference is wrong.', 'the built-in list still fixed it');
  if (!/could not be reached/.test(dead.notice)) throw new Error('the user must be told it was offline');

  const http500 = await autoCorrect(text, {
    ...online,
    limiter: createRateLimiter(5),
    fetchImpl: async () => ({ ok: false, status: 500 })
  });
  eq(http500.source, 'offline', 'an error status also falls back');

  // Rate-limited: no request is attempted at all.
  let called = 0;
  const spent = createRateLimiter(0);
  const limited = await autoCorrect(text, { ...online, limiter: spent, fetchImpl: async () => { called++; return { ok: true, json: async () => ({ matches: [] }) } } });
  eq(called, 0, 'no request made while rate-limited');
  eq(limited.source, 'offline', 'and it still corrects what it can');
});

test('the happy path returns corrected text and an honest summary', async () => {
  const text = 'This syllbus has bad refernces.';
  const res = await autoCorrect(text, {
    ...online,
    limiter: createRateLimiter(5),
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ matches: [typo(5, 7, 'syllabus'), typo(21, 9, 'references')] })
    })
  });
  eq(res.ok, true, 'ok');
  eq(res.source, 'online', 'came from the service');
  eq(res.changed, true, 'text changed');
  eq(res.text, 'This syllabus has bad references.', 'both typos fixed');
  if (!/Fixed 2 words/.test(res.notice)) throw new Error(`summary should count the fixes: ${res.notice}`);

  // Clean text reports honestly rather than claiming a fix.
  const clean = await autoCorrect('This syllabus is fine.', {
    ...online,
    limiter: createRateLimiter(5),
    fetchImpl: async () => ({ ok: true, json: async () => ({ matches: [] }) })
  });
  eq(clean.changed, false, 'nothing changed');
  eq(summarize([]), 'No spelling problems found.', 'and says so');

  // Too short / too long are handled without a request.
  let calls = 0;
  const short = await autoCorrect('hi', { limiter: createRateLimiter(5), fetchImpl: async () => { calls++ } });
  eq(short.source, 'skipped', 'too short is skipped');
  const long = await autoCorrect('x'.repeat(LIMITS.maxChars + 1), { limiter: createRateLimiter(5), fetchImpl: async () => { calls++ } });
  eq(long.ok, false, 'too long is refused');
  eq(calls, 0, 'neither made a request');
});

/* ------------------------------------------------------------- timeout -- */
//
// REGRESSION. Reported from the running app: "the spell checker does not work
// and loads too long". `fetch` has no timeout of its own, so when the service
// was slow or blocked the button sat on "Checking…" with no error and no
// result — forever. The fix is our own deadline, and a fall back to the
// built-in dictionary when it expires.

const atest = async (name, fn) => {
  try { await fn(); console.log(`✓ ${name}`); }
  catch (error) { console.error(`✗ ${name}\n  ${error.message}`); process.exitCode = 1; }
};

await atest('online grammar checking is default-off and never sends text without explicit configuration', async () => {
  let calls = 0;
  const res = await autoCorrect('This refrence needs work.', {
    limiter: createRateLimiter(5),
    fetchImpl: async () => { calls += 1; return { ok: true, json: async () => ({ matches: [] }) }; }
  });
  eq(calls, 0, 'full text was not transmitted');
  eq(res.source, 'offline', 'the built-in checker handled the text');
});

await atest('an explicitly configured and confirmed HTTPS service receives only the requested check', async () => {
  let request = null;
  const res = await autoCorrect('Exact text to check.', {
    ...online,
    limiter: createRateLimiter(5),
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ matches: [] }) };
    }
  });
  eq(res.source, 'online', 'the opted-in service answered');
  eq(request.url, online.onlineService.endpoint, 'the approved endpoint was used');
  eq(new URLSearchParams(request.options.body).get('text'), 'Exact text to check.', 'the requested text was sent');
});

await atest('the low-level network helper also refuses to transmit text without consent', async () => {
  let calls = 0;
  let refused = false;
  try {
    await fetchMatches('Private approval comment', {
      endpoint: online.onlineService.endpoint,
      fetchImpl: async () => { calls += 1; return { ok: true, json: async () => ({ matches: [] }) }; }
    });
  } catch (error) {
    refused = /consent/i.test(error.message);
  }
  eq(refused, true, 'the helper required consent');
  eq(calls, 0, 'the helper did not call fetch');
});

// A request that never answers — exactly the case that hung the button.
const neverAnswers = (signal) => new Promise((_resolve, reject) => {
  if (!signal) return                    // no AbortController: really never
  signal.addEventListener('abort', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    reject(err);
  }, { once: true });
});

await atest('a request that never answers gives up instead of hanging', async () => {
  const started = Date.now();
  const res = await autoCorrect('This syllbus has bad refrences.', {
    ...online,
    limiter: createRateLimiter(5),
    timeoutMs: 60,
    fetchImpl: (_url, opts) => neverAnswers(opts.signal)
  });
  const took = Date.now() - started;
  if (took > 3000) throw new Error(`it waited ${took}ms — the deadline did not fire`);
  eq(res.ok, true, 'the caller still gets a result');
  eq(res.source, 'offline', 'and it came from the built-in dictionary');
  if (!/no answer in/.test(res.notice)) throw new Error(`the notice should say what happened: ${res.notice}`);
});

await atest('giving up still corrects what the built-in dictionary knows', async () => {
  const res = await autoCorrect('This syllbus has bad refrences.', {
    ...online,
    limiter: createRateLimiter(5),
    timeoutMs: 60,
    fetchImpl: (_url, opts) => neverAnswers(opts.signal)
  });
  // "refrences" is in the module's MISSPELLINGS map; "syllbus" is not, and is
  // left for the local spell checker in utils/spellSuggest.js.
  eq(res.text, 'This syllbus has bad references.', 'the known misspelling is still fixed');
  eq(res.changed, true, 'so the result is still worth something');
});

await atest('the deadline aborts the request rather than abandoning it', async () => {
  // A request left running after we stopped waiting still counts against the
  // service's 20-per-minute limit, so it has to be cancelled for real.
  let sawAbort = false;
  await autoCorrect('This syllbus has bad refrences.', {
    ...online,
    limiter: createRateLimiter(5),
    timeoutMs: 60,
    fetchImpl: (_url, opts) => {
      opts.signal?.addEventListener('abort', () => { sawAbort = true }, { once: true });
      return neverAnswers(opts.signal);
    }
  });
  if (!sawAbort) throw new Error('the request was abandoned, not aborted');
});

await atest('a fast answer is not cut off by the deadline', async () => {
  const res = await autoCorrect('This syllbus has bad refrences.', {
    ...online,
    limiter: createRateLimiter(5),
    timeoutMs: 2000,
    fetchImpl: async () => ({ ok: true, json: async () => ({ matches: [] }) })
  });
  eq(res.source, 'online', 'a service that answers in time is still used');
});

console.log('\nAll auto-correct checks passed.');

// Runnable self-check for the review rules — `node src/utils/reviewGate.test.js`
// from client/. Workflow shapes are the ones workflowHelpers actually stores.

const {
  validateReturn, COMMENT_TYPES, isActionableComment, checkText, hasBlockingTextIssues,
  buildSignature, verifySignature, addSignature, consolidatedStatus, canActOnStage,
  encodeCommentType, parseCommentType
} = await import('./reviewGate.js');

const test = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
};

const eq = (actual, expected, what) => {
  if (actual !== expected) throw new Error(`${what}: expected ${expected}, got ${actual}`);
};

const done = (iso) => ({ status: 'done', completedAt: iso });
const pend = () => ({ status: 'pending', completedAt: null });

const SUBMITTED = {
  courseCode: 'BIT313L', currentStage: 'submitted',
  parallelReview: { library_director: pend(), industry_consultant: pend(), program_head: pend() },
  programHead: pend(), dean: pend()
};

const READY_FOR_DEAN = {
  courseCode: 'BIT313L', currentStage: 'dean',
  parallelReview: { library_director: done('2026-07-01T00:00:00Z'), industry_consultant: done('2026-07-02T00:00:00Z'), program_head: done('2026-07-03T00:00:00Z') },
  programHead: done('2026-07-03T00:00:00Z'), dean: pend()
};

test('an item cannot be returned without a comment', () => {
  const noComment = validateReturn({ comments: [], suggestedReferences: [{ title: 'A book' }] });
  if (noComment.ok) throw new Error('suggested references alone are not a reason to return [1:23:40]');
  if (!noComment.error) throw new Error('the approver has to be told what is missing');

  if (validateReturn({ comments: [{ text: '   ' }] }).ok) throw new Error('whitespace is not a comment');
  if (validateReturn({ comments: [{ text: 'fix' }] }).ok) throw new Error('a stub is not actionable');
  if (!validateReturn({ comments: [{ text: 'CO1 has no assessment aligned to it.' }] }).ok) throw new Error('a real comment must pass');
  if (!validateReturn({ comments: [{ comment: 'Hours do not add up to the contact hours.' }] }).ok) throw new Error('the stored shape uses `comment`');
});

test('comment types are the structured set the panel asked for', () => {
  const keys = COMMENT_TYPES.map(t => t.key);
  ['suggest-tla', 'suggest-topic', 'suggest-ai-tool'].forEach(k => {
    if (!keys.includes(k)) throw new Error(`${k} missing [48:30]`);
  });
  if (!isActionableComment({ commentType: 'suggest-tla' })) throw new Error('a suggestion is actionable');
  if (isActionableComment({ commentType: 'note' })) throw new Error('a note is not actionable');
  if (!isActionableComment({})) throw new Error('an untyped comment defaults to a requested revision');
});

test('the comment type survives the round trip to the instructor', () => {
  // The server stores one `message` string, so the type rides along as a tag.
  const wire = encodeCommentType('suggest-tla', 'Use a think-pair-share for this ILO.');
  eq(wire, '[Suggested TLA] Use a think-pair-share for this ILO.', 'tagged on the way out');

  const back = parseCommentType(wire);
  eq(back.commentType, 'suggest-tla', 'the instructor gets the type back');
  eq(back.label, 'Suggested TLA', 'and a label to render');
  eq(back.text, 'Use a think-pair-share for this ILO.', 'the tag is not part of the sentence');
  eq(back.actionable, true, 'a suggestion is actionable');

  // Comments written before this existed, and anything else with a bracket.
  const plain = parseCommentType('CO1 has no assessment aligned to it.');
  eq(plain.commentType, null, 'an untagged comment is left alone');
  eq(plain.text, 'CO1 has no assessment aligned to it.', 'and reads exactly as written');
  eq(parseCommentType('[TODO] check this').text, '[TODO] check this', 'an unknown tag is not stripped');
  eq(encodeCommentType('suggest-topic', '   '), '', 'empty text is not tagged into existence');
  eq(parseCommentType(encodeCommentType('note', 'FYI only.')).actionable, false, 'a note stays non-actionable');
});

test('spelling and grammar are caught at entry, before the program head sees them', () => {
  const issues = checkText('teh assesment is not aligned');
  const spelling = issues.filter(i => i.kind === 'spelling');
  if (spelling.length < 2) throw new Error(`expected two misspellings, got ${spelling.length}`);
  if (spelling[0].suggestion !== 'the') throw new Error('a correction has to be offered');
  if (!issues.some(i => i.kind === 'grammar' && /capital/.test(i.message))) throw new Error('sentence case is a grammar flag');

  if (!checkText('The the topic repeats').some(i => /repeats/.test(i.message))) throw new Error('repeated word');
  eq(checkText('').length, 0, 'empty text has nothing to flag');
  eq(checkText('This comment is clean and correct.').length, 0, 'clean text is not flagged');
  if (!hasBlockingTextIssues('a refrence is missing')) throw new Error('a misspelling blocks');
  if (hasBlockingTextIssues('This one is fine.')) throw new Error('clean text does not block');
});

test('approving records a signature that can be verified and not silently edited', () => {
  const user = { name: 'REYES, AGNES', role: 'dean' };
  const sig = buildSignature(user, 'dean', 'BIT313L', new Date('2026-08-01T10:00:00Z'));
  eq(sig.name, 'REYES, AGNES', 'signer');
  eq(sig.roleLabel, 'Dean', 'role label');
  eq(sig.signedAt, '2026-08-01T10:00:00.000Z', 'timestamp [53:41]');
  if (!verifySignature(sig)) throw new Error('a freshly built signature must verify');
  if (verifySignature({ ...sig, name: 'SOMEONE ELSE' })) throw new Error('a tampered signature must not verify');
  if (buildSignature(null, 'dean', 'BIT313L')) throw new Error('no user, no signature');

  const wf = addSignature(READY_FOR_DEAN, sig);
  eq(wf.signatures.length, 1, 'stored on the workflow');
  eq(addSignature(wf, buildSignature(user, 'dean', 'BIT313L')).signatures.length, 1, 'one signature per role');
});

test('the consolidated view shows every stage and who has not approved', () => {
  const fresh = consolidatedStatus(SUBMITTED);
  eq(fresh.steps.length, 5, 'the whole chain is represented');
  eq(fresh.approvedCount, 0, 'nobody has approved yet');
  eq(fresh.awaiting.length, 4, 'four approvers outstanding (the VPAA only reads)');
  if (fresh.isFullyApproved) throw new Error('a submitted plan is not approved');

  const mid = consolidatedStatus(READY_FOR_DEAN);
  eq(mid.approvedCount, 3, 'three of four have approved');
  eq(mid.awaiting.join(','), 'Dean', 'only the Dean is left');
  eq(mid.dateApproved, null, 'no date until the Dean signs');

  const approved = consolidatedStatus({ ...READY_FOR_DEAN, currentStage: 'approved', dean: done('2026-08-01T00:00:00Z') });
  if (!approved.isFullyApproved) throw new Error('a dean-signed plan is approved');
  eq(approved.dateApproved, '2026-08-01T00:00:00Z', 'the Dean is final and carries the date approved');
});

test('each role can act only on its own stage, and the Dean goes last', () => {
  if (!canActOnStage('program-head', SUBMITTED)) throw new Error('the program head reviews a submitted plan');
  if (canActOnStage('dean', SUBMITTED)) throw new Error('the Dean cannot approve before the others [the chain is ordered]');
  if (!canActOnStage('dean', READY_FOR_DEAN)) throw new Error('the Dean acts once the rest are done');
  if (canActOnStage('program-head', READY_FOR_DEAN)) throw new Error('a role that already approved does not act twice');
  if (canActOnStage('vpaa', READY_FOR_DEAN)) throw new Error('the VPAA has read access only');
  // defaultWorkflow starts a plan nobody has touched at 'submitted', so an
  // untouched plan is still the instructor's to submit — but once an approver
  // has acted it is out of their hands until it comes back.
  if (!canActOnStage('instructor', SUBMITTED)) throw new Error('the instructor can still submit a plan no approver has acted on');
  if (canActOnStage('instructor', READY_FOR_DEAN)) throw new Error('a plan under review is not the instructor’s to change');
  if (!canActOnStage('instructor', { ...READY_FOR_DEAN, currentStage: 'returned' })) throw new Error('a returned plan is the instructor’s to fix');
  if (canActOnStage('instructor', { ...READY_FOR_DEAN, currentStage: 'approved' })) throw new Error('an approved plan is closed to everyone');
  if (canActOnStage('PROGRAM_HEAD', { ...READY_FOR_DEAN, currentStage: 'approved' })) throw new Error('nothing is actionable once approved (server casing too)');
});

console.log('\nAll review gate checks passed.');

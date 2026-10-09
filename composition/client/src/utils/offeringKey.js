// How a course offering is addressed.
//
// Every offering has an id. An APPROVED revision also has a revision number, and may be
// addressed as `<id>/<revision>` (the server checks they match). A working copy the Dean has
// not approved has no revision number yet, so it is addressed by its id alone: `<id>`. The
// database stores "no revision yet" as 0.

// The revision number of an offering row, or null when it has none yet.
export const revisionOf = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

// `${pcId}/${revNum}` for an approved revision, `${pcId}` for a working copy.
export const offeringKey = (pcId, revNum) => (revisionOf(revNum) ? `${pcId}/${revisionOf(revNum)}` : `${pcId}`)

// The learning-plan page of an offering.
export const offeringPath = (pcId, revNum, status) => (revisionOf(revNum)
  ? `/courses/${pcId}/${revisionOf(revNum)}/${status}`
  : `/offerings/${pcId}/${status}`)

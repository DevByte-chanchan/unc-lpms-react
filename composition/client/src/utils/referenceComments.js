// Which reference each unresolved comment is actually about.
//
// `/api/comments/filter/:iloId/:commentFor` filters on `c.ilo_id` — it is an
// ILO endpoint, not a reference one. Calling it with a reference_id returns the
// comments of the ILO that happens to share that number, so the References
// Summary badged rows that were never commented on. The reference a comment
// points at is `target_id` (`ref.reference_id = ct.target_id` in
// commentController.js), and one comment produces one row per target, so the
// count has to be over distinct comment_ids.
//
// Pure, so `referenceComments.test.js` drives it under plain node.

const isUnresolved = (c) => {
    const v = c?.resolved_status
    return v === false || v === 0 || String(v).toLowerCase() === 'false'
}

/**
 * @param {Array} commentRows rows from /api/comments/filter/:iloId/references,
 *                            for every ILO of the course, concatenated.
 * @returns {Object} reference_id -> number of distinct unresolved comments
 */
export const unresolvedCountsByReference = (commentRows = []) => {
    const seen = new Map()   // target_id -> Set of comment_id

    commentRows.forEach(row => {
        if (!row || !isUnresolved(row)) return
        const target = row.target_id
        if (target == null || target === '') return
        const key = String(target)
        if (!seen.has(key)) seen.set(key, new Set())
        seen.get(key).add(String(row.comment_id))
    })

    const counts = {}
    seen.forEach((commentIds, key) => { counts[key] = commentIds.size })
    return counts
}

// The ILO ids of a course, from /api/ilos/:pcId/:revNum. The comment endpoint
// keys on these, so they are what has to be fetched.
export const iloIdsFromCourse = (payload) => {
    const outcomes = payload?.courseOutcomes || payload?.data?.courseOutcomes || []
    return outcomes
        .flatMap(co => co?.ilos || [])
        .map(ilo => ilo?.id)
        .filter(id => id != null)
}

export default { unresolvedCountsByReference, iloIdsFromCourse }

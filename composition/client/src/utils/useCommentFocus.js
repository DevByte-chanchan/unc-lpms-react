import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

// "Show in plan" for a comment, shared by the review page and the instructor's plan page: open the section the
// comment is about, scroll to the exact items it names (a topic, a TLA, a reference; data-target in
// CourseCoverage / ReferenceSummary) and flash them yellow (index.css [data-flash]). A notification about a comment
// links here with ?comment=<id>: the comment panel opens, its card flashes, and the plan jumps to the item.

// The coverage table's open-comment badge on a week (components/CourseCoverage.jsx) asks for that week's comments.
export const WEEK_COMMENTS_EVENT = 'lpms:week-comments'

export const sectionOfComment = (comment) => (comment?.coverageType === 'References' ? 'References Summary'
  : comment?.coverageType ? 'Course Coverage' : null)

const flash = (el) => {
  el.removeAttribute('data-flash')
  void el.offsetWidth // restart the animation if it is the same element again
  el.setAttribute('data-flash', '')
  window.setTimeout(() => el.removeAttribute('data-flash'), 4000)
}

// selectedSection: the section shown now; openSection(name): show that one.
export const useCommentFocus = ({ selectedSection, openSection }) => {
  const [focusTarget, setFocusTarget] = useState(null)

  const showCommentInPlan = useCallback((comment) => {
    const section = sectionOfComment(comment)
    if (!section) return
    openSection(section)
    const details = Array.isArray(comment.coverageDetail) ? comment.coverageDetail : (comment.coverageDetail ? [comment.coverageDetail] : [])
    setFocusTarget({ section, ilo: comment.ilo, details, nonce: Date.now() })
  }, [openSection])

  useEffect(() => {
    if (!focusTarget || selectedSection !== focusTarget.section) return undefined
    let tries = 0
    let timer
    // The exact items the comment names, in the comment's own week row when it is there; the row itself when the
    // items are not found.
    const find = () => {
      const iloRow = document.querySelector(`[data-ilo-id="${CSS.escape(String(focusTarget.ilo || ''))}"]`)
      const wanted = focusTarget.details.map(detail => String(detail).trim()).filter(Boolean)
      const match = (scope) => wanted.flatMap(detail => [...scope.querySelectorAll('[data-target]')]
        .filter(el => el.dataset.target === detail || detail.includes(el.dataset.target)))
      const inRow = iloRow ? match(iloRow) : []
      const exact = inRow.length ? inRow : match(document)
      if (exact.length) return exact
      return iloRow ? [iloRow] : []
    }
    const attempt = () => {
      const found = find()
      if (found.length) {
        // Instant: a smooth scroll here is cancelled by the section's own smooth scroll still running.
        found[0].scrollIntoView({ block: 'center', inline: 'center' })
        found.forEach(flash)
        setFocusTarget(null)
      } else if (tries++ < 25) {
        timer = window.setTimeout(attempt, 120) // the section is still loading its rows
      } else {
        setFocusTarget(null) // nothing to point at: the section itself is open
      }
    }
    timer = window.setTimeout(attempt, 350) // after the section's own scroll has started
    return () => window.clearTimeout(timer)
  }, [focusTarget, selectedSection])

  return showCommentInPlan
}

// ?comment=<id> (from a notification): once the comments are loaded, open the panel, flash the comment's card and
// show it in the plan. The parameter is then dropped, so a reload or Back does not jump again.
//   comments: the panel's comments (utils/serverComments.js, ids 'server-<id>'); openPanel(): show the panel
export const useCommentFromLink = ({ comments, openPanel, showCommentInPlan }) => {
  const [params, setParams] = useSearchParams()
  const wanted = params.get('comment')
  const done = useRef(null)
  useEffect(() => {
    if (!wanted || done.current === wanted || !comments?.length) return
    const comment = comments.find(c => String(c.id) === `server-${wanted}` || String(c.id) === wanted)
    if (!comment) return
    done.current = wanted
    openPanel()
    window.setTimeout(() => {
      const card = document.querySelector(`[data-comment-id="${CSS.escape(String(comment.id))}"]`)
      if (card) { card.scrollIntoView({ block: 'nearest' }); flash(card) }
    }, 400)
    // Drop ?comment= first; open the section a moment later, so a page that keeps its section in the address
    // (the instructor's) does not have that change overwritten by this one.
    setParams(p => { const next = new URLSearchParams(p); next.delete('comment'); return next }, { replace: true })
    if (sectionOfComment(comment)) window.setTimeout(() => showCommentInPlan(comment), 60)
  }, [wanted, comments, openPanel, showCommentInPlan, setParams])
}

// A click on a week's open-comment badge: open the panel, scroll to that week's open comments and flash their cards.
//   comments: the panel's comments ({ id, ilo: 'CO1-W3', resolved }); openPanel(): show the panel
export const useWeekCommentsLink = ({ comments, openPanel }) => {
  useEffect(() => {
    const onWeek = (event) => {
      const week = event.detail?.week
      const open = (comments || []).filter(c => c.ilo === week && !c.resolved)
      if (!open.length) return
      openPanel()
      window.setTimeout(() => {
        const cards = open.map(c => document.querySelector(`[data-comment-id="${CSS.escape(String(c.id))}"]`)).filter(Boolean)
        if (cards[0]) cards[0].scrollIntoView({ block: 'nearest' })
        cards.forEach(flash)
      }, 300)
    }
    window.addEventListener(WEEK_COMMENTS_EVENT, onWeek)
    return () => window.removeEventListener(WEEK_COMMENTS_EVENT, onWeek)
  }, [comments, openPanel])
}

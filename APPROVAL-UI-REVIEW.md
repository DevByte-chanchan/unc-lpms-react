# Approval Comment Window — UI/UX Review

**Component:** `src/components/ApprovalCommentBox.jsx` (484 lines)
**Styles:** `src/styles/ApprovalCommentBox.module.sass` (227 lines)
**Date:** 2026-06-27

## Scoring

| Pillar | Score | Summary |
|--------|-------|---------|
| Copywriting | 3/4 | Clear but verbose labels; acronym TLA unexplained |
| Visuals | 2.5/4 | Clean modal but heavy inline styles, no enable/disable transitions |
| Color | 3/4 | Brand-aligned, good badge semiotics, no CSS variables |
| Typography | 2.5/4 | Consistent Poppins, but inline font declarations leak |
| Spacing | 3/4 | Good grid rhythm, minor inconsistency in ref browser |
| Experience Design | 3/4 | Solid progressive disclosure, draft save/restore, no submit feedback |

## Detailed Findings (by priority)

### CRITICAL
1. **No submit feedback** — Modal closes silently after "Return with Comments". User gets no confirmation that their comments were saved or returned to the syllabus. Add a toast or banner before closing.

### HIGH
2. **Stale coverage values on CO change** — Changing Course Outcome resets ILO but leaves Coverage Type and Coverage Entry populated with values from the previous CO's ILO set. Resetting CO should cascade through the full chain: `CO → clear ILO → clear CoverageType → clear CoverageDetail`.
3. **No unsaved-changes warning** — If user fills a comment, then clicks Cancel or ✕, changes disappear without confirmation. Draft auto-save mitigates this on reopen, but the user doesn't know that. Add a "Discard unsaved changes?" confirm, or surface a "Draft restored" note on reopen.
4. **Inline styles dominate** — ~130 lines of inline `style={{}}` mixed with CSS module classes. The reference browser (`renderRefBrowser`) is almost entirely inline. Extract to CSS module for maintainability and consistency.

### MEDIUM
5. **"TLA" is unexplained** — Coverage Type option shows "TLA" without expansion or tooltip. Users unfamiliar with the acronym (Teaching-Learning Activity) may not know what to select. Label as "Teaching-Learning Activity (TLA)" or add a tooltip.
6. **"Course Outcome Number" is verbose** — Shorten label to "Course Outcome". The word "Number" adds no information.
7. **ID generation is fragile** — `Date.now() + Math.random()` for comment IDs. Use a counter or `crypto.randomUUID()`.
8. **No visual transition for disable/enable** — The 4 selects snap between enabled/disabled without any transition or opacity change. Add `opacity: 0.5` transition or a subtle background shift.
9. **Return button disconnected from parent action** — "Return with Comments" implies the comment travels with a return decision, but the modal is a standalone comment input. The actual approve/return is handled by the parent panel. This creates a mental model gap — user may think submitting the modal *is* the return action.

### LOW
10. **Close button uses raw ✕ character** — Rest of app uses `react-feather` icons for X/close actions. Replace with `<X size={20} />` for consistency.
11. **Search input font-family inline** — `style={{ fontFamily: "'Poppins', sans-serif" }}` in the ref browser search. Should inherit from body CSS.
12. **Placeholder text too generic** — "Enter your comment..." could be "Describe the issue or suggestion...". Same for the Director variant.

## What's Working Well

- Progressive disable chain (CO → ILO → Coverage Type → Coverage Entry) enforces correct data entry order
- Draft auto-save to localStorage survives accidental closes; restoration on reopen works
- Director role gets a contextual modal title + embedded reference library browser — good role-based differentiation
- Reference type badges (Textbook/OER/Online) use distinct colors for quick scanning
- Active/Deprecated/Has Issue status badges on refs are clear and well-colored
- Responsive breakpoint at 640px collapses the 4-column grid to single column
- Multiple comment sections supported for complex feedback
- `disabled` attribute properly gates the submit button when no text is entered

## Recommendations (top 3)

1. **Wire submit feedback** — Show a brief success toast before closing the modal on submit
2. **Fix cascade on CO change** — Reset Coverage Type and Coverage Detail when Course Outcome changes
3. **Extract inline styles** — Port `renderRefBrowser` and scattered inline styles into the Sass module

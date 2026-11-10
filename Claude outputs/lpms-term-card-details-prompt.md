# Prompt: Show the full school calendar and deadlines on the VPAA's term card

Paste everything below the line into your coding agent.

---

## Problem

On the VPAA Dashboard (`src/pages/AcademicTerms.jsx`), the expanded **current term** card (around lines 928–946) shows only **Semester Duration** and **Start of Classes**.

The Update Sem / Edit form already collects the whole school calendar: start of classes, prelim, midterm, semi-final and final exam (`classes_start`, `prelim_exam`, `midterm_exam`, `semifinal_exam`, `final_exam` on `academic_periods`). The card hides most of it, and it never shows the **submission deadlines** worked out from those dates.

The past-term cards (around line 1405) show only the duration.

## Goal

The expanded card is a complete, at-a-glance summary of the term:
- where the semester is now;
- every calendar date, and which one is next;
- the faculty submission deadlines;
- anything missing.

The VPAA should never have to open Edit just to see a date.

## Rules for the deadlines

These are the same rules as the course-assignment tracking.

| Requirement | Due |
|---|---|
| COAP, Syllabus, Learning Plan | 14 days before **Start of classes** |
| Midterm TOS + questionnaire/rubric | 7 days before **Midterm exam** (or `midterm_deadline` if set) |
| Finals TOS + questionnaire/rubric | 7 days before **Final exam** (or `finals_deadline` if set) |

**One place for the rule:**
- If `server/services/deadlines.js` (`dueDatesFor`) exists, use it. Make `GET /api/academic-periods` (and the single-term endpoint) include `due_dates: { pre_class, tos_midterm, tos_finals }` and `due_overridden: { tos_midterm: bool, tos_finals: bool }` for each term.
- If it doesn't exist yet, create it with `PRE_CLASS_DAYS = 14` and `PRE_EXAM_DAYS = 7`, both overridable by environment variables.

The client never computes deadlines itself.

## 1. Expanded current-term card

Keep the existing look: the slate colours, the 13 px grey labels with a small icon, the 14 px dark values, `fmtDate()`. Keep the up-arrow, the Edit button and the Update Sem button exactly where they are.

From top to bottom:

**a. Progress strip** (new)
- **Line:** "**Week 3 of 17** · 82 days left". Count weeks from `classes_start` (or from `start_date` if `classes_start` is empty) up to `end_date`, rounding up.
- **Bar:** a thin bar (6 px, rounded, slate background, dark fill) showing how much of `start_date → end_date` has passed.
- **Before the semester starts:** "Starts in 9 days".
- **After it ends:** "Ended — closes automatically".

**b. Semester duration**
- Keep the existing row, and add the length in grey: "August 11, 2026 — December 10, 2026 · 17 weeks".

**c. School calendar** (new, replaces the single "Start of Classes" row)
- **Layout:** a compact vertical timeline with one row per date, in this order: Start of classes · Prelim exam · Midterm exam · Semi-final exam · Final exam.
- **Each row:** a dot, the label, the date, and a relative hint on the right ("in 12 days", "today", "done").
  - **Past dates:** grey, with a check icon.
  - **The next upcoming date:** bold, with a dark dot and a small "Next" chip.
  - **An empty date:** "Not set" in grey italics, plus a small **Add** link that opens the Edit form.

**d. Submission deadlines** (new)
- **Rows:**
  - "COAP, Syllabus & Learning Plan": its due date, plus "(2 weeks before classes)".
  - "Midterm TOS": its due date, plus "(1 week before midterm)", or "(set manually)" when `due_overridden`.
  - "Finals TOS": the same, for finals.
- **Status chip on each row:**
  - **Upcoming** (slate);
  - **Due in N days** (amber, when ≤ 7 days away);
  - **Passed** (grey).
- **Missing date:** if the date it depends on is empty, show "Needs Start of classes" (or "Needs Midterm exam", and so on) in grey.

**e. Calendar checks** (new, only when there's something to say)

Show these in a small amber note box above the action row, one line each:
- "Prelim exam isn't set." (any calendar date empty; combine several into one line: "Not set: Prelim exam, Semi-final exam.")
- "COAP, Syllabus & Learning Plan were due before today. Faculty assigned now will be marked *Assigned late*." Show this only if that due date has passed while the term is still Active.
- "Final exam is after the end of the semester." (the order rule is broken). The form should already stop this, but older terms might still have it.

If everything is fine, show nothing.

**Too tall?** Keep the card's current width. If the content is taller than the neighbouring card, the details area scrolls inside the card (`overflowY: auto`). The action row stays visible at the bottom.

## 2. Collapsed current-term card

Under the year/semester title, add one grey line with the next upcoming item: "Next: **Midterm exam** · Oct 5 (in 12 days)". It can be a calendar date or a submission deadline, whichever comes first. If nothing is upcoming, show nothing.

## 3. Past-term cards

Under the existing duration row, add a **Show calendar** toggle. It expands the same timeline (c) and deadlines (d), all in the grey "past" style, with no chips and no Add links. Closed terms stay read-only.

## 4. Update Sem / Edit form: a live preview

Under the **School calendar** fields in the form (first screenshot), add a small **Deadlines preview** box that updates as the VPAA types:

> COAP, Syllabus & LP due **Aug 4, 2026** · Midterm TOS due **Sep 28, 2026** · Finals TOS due **Dec 3, 2026**

- **Missing date:** a deadline whose date isn't filled shows "—".
- **Calculation:** the server owns the rule, so the client gets the two day-offsets from it, e.g. returned by the periods endpoint as `deadline_rules: { pre_class_days, pre_exam_days }`. It uses them **only** for this preview.
- **Mismatch guard:** after saving, the card shows the server's `due_dates`, so the two can't drift apart.

## 5. Small fixes while you're there

- **Dates:** format all dates with the existing `fmtDate`, and work out relative days in the **Asia/Manila** date (no off-by-one around midnight).
- **Keyboard and screen readers:** the timeline should be a `<ol>` with `aria-label="School calendar"`, and each relative hint should also be in `title` for screen readers.
- **Element choice:** don't use `<section>` elements. The syllabus stylesheets have an unscoped `section { display: flex }` rule that breaks layouts. Use `<div>` or `<ol>`.

## Check

1. Set the current term to: start Aug 11, classes Aug 18, prelim Sep 8, midterm Oct 5, semi-final Nov 9, final Dec 7, end Dec 10. The expanded card shows:
   - the progress strip;
   - 17 weeks;
   - all 5 calendar rows, with the right "done / Next / in N days" states for today's date;
   - deadlines Aug 4, Sep 28 and Nov 30, each with its chip.
2. Clear Prelim and Semi-final. The timeline shows "Not set · Add" for both, and the note says "Not set: Prelim exam, Semi-final exam." Clicking **Add** opens Edit.
3. Set `midterm_deadline` manually. The Midterm TOS row shows that date with "(set manually)".
4. Collapse the card. One "Next: …" line shows.
5. A past term: **Show calendar** expands its dates in grey, with no Edit or Add.
6. In Update Sem, typing a Start of classes date updates the Deadlines preview at once. After saving, the card matches the preview.
7. Phone width (≈ 390 px): nothing overflows sideways, and the timeline rows wrap cleanly.
8. `npm run build` passes, and any server test covering `due_dates` passes.

Finish with: the files changed, and a short description of the expanded card for the dates in check 1.

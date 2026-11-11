# Prompt: OVPAA Learning Plan page: viewer UI only

Paste everything below the line into your coding agent. **UI only:** don't change the data, the mock dataset, the files the rows point to, or the TOS page.

---

## Problem

On the OVPAA's **Learning Plan** page (`src/pages/OVPAALearningPlan.jsx` → `OVPAARepository.jsx` → `src/components/PDFViewerModal.jsx`), opening a plan shows the old viewer:
- **A "File details" side panel** takes about a quarter of the width (Faculty, Course, Submitted, Approved, Academic Period, File name).
- **The PDF is shown in the browser's own PDF toolbar** (Chrome/Edge controls: draw, highlight, rotate, save…). It looks different in every browser, and doesn't match the app.

## Goal

The same look as the Learning Plan module's viewer, branch **`feature/learning-plan-submissions-management-v2`**, file `composition/client/src/components/PDFViewerModal.jsx` + `styles/PDFViewerModal.module.sass`. Use them as the visual reference:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ LEARNING PLAN · APPROVED                       [–] 117% [+] [▯]  [<] 1 / 14 [>]  [🖨] [⬇ Download PDF] [⛶] [✕] │
│ LP-ACC101-NAVARRO.pdf                                                                    │
│ ACC 101 — Fundamentals of Accounting · NAVARRO, LUIS · 1st Semester 2026-2027            │
│ Submitted Nov 2, 2026 · Approved Nov 7, 2026                                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  (light slate background)                                                                │
│        ┌──────────── page 1 (white, shadow) ────────────┐                                │
│        │                                                │                                │
│        └────────────────────────────────────────────────┘                                │
│        ┌──────────── page 2 ───────────────────────────┐                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Changes (`src/components/PDFViewerModal.jsx` + its style file)

**Header** (left side, stacked):
- **Kicker:** 11 px, uppercase, letter-spaced, slate-500: "**LEARNING PLAN · APPROVED**" (`kind` + " · APPROVED").
- **Title:** 16 px, semibold, slate-900: the file name (`file.file_name`).
- **Detail line:** 12.5 px, slate-500: `course_id — course_name · faculty name · period_label`. Leave out empty parts and their separators.
- **Second line:** same style: "Submitted {date} · Approved {date}". Use the existing `fmtDate`, and leave out a missing date.
- **Long text:** ellipsis, with the full text in `title`.

**Toolbar** (right side, one row, in this order):
1. **Zoom out**, **zoom %** (click it to reset to fit width), **zoom in**: range 25 %–250 %, steps of ×1.2.
2. **Fit width / fit page** toggle (the `Columns` icon).
3. **Previous page**, "**x / y**", **next page**: disabled at the ends. Typing a number in "x" jumps to that page.
4. **Print**.
5. **Download PDF** (dark primary button, `#19282C` like the reference). It downloads the original file under `file.file_name`.
6. **Fullscreen** toggle.
7. **Close** (red outline ✕).

Use `react-feather` icons (`ZoomOut`, `ZoomIn`, `Columns`, `ChevronLeft`, `ChevronRight`, `Printer`, `Download`, `Maximize`/`Minimize2`, `X`). Use the app's existing icon-button style (34 px square, 8 px radius, slate border). Each button gets `title` and `aria-label`.

**Body:**
- **Remove the File details side panel completely.** The document area takes the full width.
- **Background:** light slate (`#F1F5F9`). Each page is a white sheet with a soft shadow (`0 2px 16px rgba(0,0,0,.12)`), centred, with 24 px between pages.
- **Render the PDF with `pdfjs-dist`** (add it to the root `package.json` if missing; the server already uses `^4`), **not** with `<iframe>`/`<embed>`, so the browser's PDF toolbar never shows.
  - Draw each page to a `<canvas>` at the current zoom, using `devicePixelRatio` so it's sharp.
  - **Render lazily:** pages render when they scroll near view (IntersectionObserver), so a 14-page file opens fast.
  - **Text layer:** add pdf.js's text layer over each canvas, so text can be selected and found with Ctrl+F.
  - Set up the pdf.js worker the Vite way: `import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`, then `GlobalWorkerOptions.workerSrc = workerUrl`.
- **Page counter:** "x / y" updates as you scroll (the page most in view). Previous/next scroll smoothly to that page.
- **Print:** open the PDF blob in a hidden iframe and call `print()` on it, or open it in a new tab if the browser blocks that. Only the document prints.
- **Loading:** show a centered spinner with "Opening document…".
- **Can't load:** a clear message inside the viewer, "Couldn't open this file. **Download** it instead.", with the Download button still working. Never show a blank area.

**Behaviour:**
- **Keyboard:**
  - **Esc** leaves fullscreen first, then closes;
  - **← / →** (or PageUp/PageDown) change page;
  - **Ctrl + / Ctrl −** zoom.
- **Focus:** focus is trapped in the dialog and returns to the row's **View** button on close.
- **Size:** the dialog is about 1100 px wide and 90 vh tall, with 12 px rounded corners. Fullscreen fills the window.
- **Phone width (≈ 390 px):**
  - the toolbar wraps into two rows (zoom + pages / actions);
  - the zoom % and the Fit button hide;
  - **Download stays visible;**
  - no sideways scrolling of the page.

## Keep working

- **Rows and files are unchanged:** every row still opens the same file it opens today (`file_url`).
- **No-URL fallback:** the old "no URL → metadata preview card" fallback stays for mock rows that have no `file_url`, restyled to the new layout: a centred card with the same details.
- **The TOS page** uses this viewer too. Keep its `documents` tabs ("TOS Report" / "TOS Assessment") working: show them as a pill toggle in the header, left of the toolbar. The current page and zoom reset per tab. Don't change anything else about the TOS page.

## Checks

1. **Opening `LP-ACC101-NAVARRO.pdf`** shows:
   - the header (kicker, title, detail line, dates) and the toolbar;
   - **no side panel** and **no browser PDF toolbar**;
   - pages as white sheets on slate.
2. **Controls work:** zoom in/out/reset, fit toggle, previous/next, typing a page number, the scroll-updated counter, print (only the document), Download (correct file name), fullscreen, Esc, ✕.
3. **Pages:** a 14-page file opens quickly, and pages render as you scroll. Text is sharp at 200 %.
4. **Ctrl+F** finds text in the document.
5. **A broken `file_url`** shows the "Couldn't open this file" message, and Download still works.
6. **The TOS page:** both tabs still open their documents.
7. **Phone width:** usable, with no sideways overflow.
8. `npm run build` passes, and there are **no console errors or warnings** (including pdf.js worker warnings).

Finish with: the files changed, the new dependency (if any), and a one-line description of the header for `LP-ACC101-NAVARRO.pdf`.

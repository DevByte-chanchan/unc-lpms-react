# Responsive LPSM UI and Reference Filter Design

**Date:** 2026-08-15

**Scope:** every retained route under `composition/client`

**Status:** Approved direction; awaiting written-spec review

## Goal

Make the retained LPSM frontend usable and readable from a 360px phone viewport through desktop sizes. Content must not overlap, become inaccessible, or collapse into unreadable columns when either viewport width or height is constrained.

The same change removes `ALL REFERENCES` from the shared Reference Summary dropdown and makes `TEXTBOOKS` its default without hiding empty-data or server-error feedback.

## Current Failure

The approval syllabus lays out the learning plan and a fixed 380px comments panel side by side. At the roughly 740px viewport shown in the reported screenshot, the comments panel keeps its full width while the plan table is allowed to shrink. The table columns then collapse into narrow strips, text is clipped, and controls compete for the same horizontal space.

The problem is repeated in other route families through fixed widths, minimum widths without scroll wrappers, `overflow: hidden` on page-level containers, fixed-height shells, non-wrapping controls, and modals that assume desktop space. Fixing only the photographed component would leave the shared causes in place.

## Responsive Contract

The frontend uses three behavioral ranges:

| Range | Intended behavior |
| --- | --- |
| Wide: above 1024px | Existing desktop structure, including side-by-side panels where space permits |
| Compact: 721px–1024px | Wrapped controls, stacked secondary panels, scrollable wide tables |
| Mobile: 360px–720px | Compact navigation, single-column content/forms, viewport-contained dialogs |

These are layout decisions, not device detection. Resizing a desktop browser must produce the same result as a device with the same CSS viewport.

At every range:

- normal text remains readable without zooming;
- interactive controls do not overlap and retain usable hit areas;
- the page has one understandable vertical reading order;
- wide data tables scroll inside a labelled content region instead of squeezing columns;
- no page-level `overflow: hidden` can trap content outside the viewport;
- long words, course codes, names, comments, URLs, and dropdown labels wrap or ellipsize intentionally;
- keyboard focus indicators and accessible names remain available.

## Shared Layout Foundation

### Application shells

Update `Skeleton` and `SkeletonA` first because most retained pages use one of them.

- Use dynamic viewport sizing (`100dvh`) with a safe minimum rather than assuming a permanently available desktop height.
- Ensure the right/content column has `min-width: 0` so descendants may create their own scroll areas.
- Allow the content region to scroll vertically when the combined header and page content exceed the viewport.
- Keep horizontal page overflow closed; individual wide tables own their horizontal scrolling.

### Side navigation

- Preserve the current desktop icon rail and expansion behavior above 1024px.
- At compact and mobile widths, keep a narrow fixed icon rail and disable hover expansion that would consume most of the content width.
- Provide tooltips or existing accessible labels so icon-only navigation remains understandable.
- The navigation must not overlay or resize the main content after the user begins interacting.

### Headers

- Permit logo, identity, role, sign-out, and page actions to wrap into stable rows.
- Keep the signed-in identity readable; do not solve crowding by hiding the user name or role.
- Use consistent gaps and a minimum 14px content font size.
- On mobile, actions may move to a second row and align to the available width.

## Shared Content Patterns

### Tables

All retained tables receive an explicit scroll-container contract:

- semantic `<table>` structure stays intact;
- table-specific minimum widths preserve meaningful columns;
- the nearest wrapper uses `overflow-x: auto` and visible/stable scroll affordances;
- cells use readable line-height and controlled wrapping;
- sticky headers remain within the table scroll container;
- the document body itself must not acquire unintended horizontal scrolling.

Small data/card lists may reflow to cards only where they are already componentized that way. Dense learning-plan matrices remain tables because converting them into cards would hide their row/column relationships.

### Forms, filter bars, and action groups

- Two- and three-column form layouts collapse to one column on mobile.
- Search, year, semester, status, and type filters wrap without covering one another.
- Primary and secondary actions wrap as a group; destructive or approval actions remain visually distinct.
- Controls use the available width on mobile without exceeding it.

### Dialogs and popovers

- Dialog width is capped to the viewport with consistent outer spacing.
- Dialog height is capped to the dynamic viewport, with internal scrolling for long content.
- Popovers that cannot fit beside their trigger reposition inside the viewport.
- Existing confirmation and undo behavior is unchanged.

## Approval Syllabus Layout

Replace the inline side-by-side review layout and inline comments-panel sizing with named module classes.

Above 1024px, the learning plan and 380px comments panel may remain side by side.

At 1024px and below:

- the learning-plan content takes the full available width;
- the comments panel moves below it in document reading order;
- the comments panel becomes full width with a bounded internal height;
- its collapse control becomes a full-width, clearly labelled disclosure control rather than a 26px vertical strip;
- learning-plan matrices keep their own horizontal scroll instead of being squeezed;
- the page-level content region scrolls vertically so both the plan and comments remain reachable.

The navigation/action bar wraps at the same compact breakpoint rather than waiting until 600px. The section selector receives its own row when necessary. The approval-chain strip may scroll horizontally, but its labels must retain contrast and a readable font size.

## Reference Summary Dropdown

The shared `ReferenceSummary` component is used by Instructor, approvers, previews, and revisions. Change it once so every consumer receives identical behavior.

- Initial selected type becomes `Textbook`.
- Remove the `ALL REFERENCES` option.
- Remove the combined all-types rendering branch.
- Retain `TEXTBOOKS`, `OPEN EDUCATIONAL RESOURCES`, and `ONLINE RESOURCES`.
- Provide selected-category empty states.
- Keep server failure messaging visible regardless of the selected category.
- Do not change the references API or stored reference records.

## Route Coverage

Verification covers every retained route through representative page families rather than treating the screenshot as the only acceptance target:

1. Login and account flows.
2. Instructor assigned-course table and learning-plan sections.
3. Instructor ILO, topic, TLA, and reference forms.
4. Revisions and previews.
5. Approver course lists and approval syllabus for Program Head, Director of Libraries, Industry Consultant, Dean, and VPAA.
6. Program Head course offerings, consultant assignment, CO–PO, PO–PEO, and COAEP pages.
7. Director of Libraries reference library, catalog, add, view, and edit pages.
8. Shared modals, dropdowns, empty states, loading states, and error states used by those pages.

Multiple URL patterns rendering the same component do not require duplicate CSS. They do require route checks proving parameters and role shells do not change the layout contract.

## Implementation Order

1. Add automated responsive-boundary checks and the Reference dropdown regression test.
2. Repair shared shells, navigation, and headers.
3. Introduce shared table/form/dialog responsive rules.
4. Repair the approval syllabus and comments-panel stacking behavior.
5. Remove `ALL REFERENCES` and add category-specific states.
6. Audit and fix route-family exceptions.
7. Run automated tests/build, then perform visual checks at the required viewport matrix.

This order prevents page-specific rules from compensating for a broken parent layout.

## Testing and Acceptance

Implementation follows test-driven development.

Automated checks must prove:

- shared shells permit content shrinking and vertical access;
- compact navigation cannot expand over the content;
- the approval comments panel switches from side-by-side to stacked layout at or below 1024px;
- all wide matrices have an owning horizontal scroll wrapper;
- dialog dimensions are viewport bounded;
- `ReferenceSummary` cannot select or render an `All` view and defaults to `Textbook`;
- existing utility tests, JSX checks, and the Vite build still pass.

Visual acceptance uses at least these viewports:

- 1440×900 desktop;
- 1024×768 compact landscape;
- 740×1000 resized window matching the reported failure class;
- 390×844 phone portrait;
- 360×640 short phone viewport.

For each representative route family, verify:

- no content rectangles overlap unexpectedly;
- no important text is clipped;
- body-level horizontal overflow is absent;
- required table scrolling is available inside the table region;
- all actions remain visible and operable;
- content at the bottom remains reachable;
- the layout remains usable after switching sections, opening comments, and opening a modal.

## Non-Goals

- Redesigning the UNC visual identity or changing the application’s information architecture.
- Replacing semantic tables with mobile cards where matrix relationships matter.
- Changing APIs, database records, authentication, comments, or approval rules.
- Removing content merely to make a viewport test pass.
- Editing anything outside the active `composition` application and its design/test documentation.
- Implementing the separate server-backed sample-course data specification in the same change set.

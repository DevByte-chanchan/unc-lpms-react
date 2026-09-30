# Reference Discovery Workbench Design

## Goal

Turn the Director of Libraries reference-library page into a catalog workbench where a librarian can locate a record, narrow a large catalog, inspect metadata, and begin editing or archiving without losing the result list.

## Scope

This is improvement 1 only: finding and maintaining references quickly.

Included:

- Search by all fields or a selected field: title, author, reference ID, ISBN, or publisher.
- Live department, reference-type, publication-year, and active/archived facets with counts.
- Built-in views for all active, recent additions, and archived references.
- User-saved search/filter views stored in the existing browser-local data model.
- Compact sortable and paginated result table.
- A record preview panel with edit and archive/restore actions.
- Responsive behavior: a filter drawer and preview sheet on compact screens, plus horizontal table scrolling.
- Clear loading-independent empty states and a one-click filter reset.

Excluded until later stages:

- Bulk-import preview, validation, and correction workflow.
- Duplicate detection, age monitoring, and unused-reference monitoring.
- Server-side saved views or cross-device preference synchronization.

## Interaction Design

The page begins with its title, subtitle, Add Reference action, and the existing Bulk Upload action. A field selector and prominent search box form the primary control. Search terms are case-insensitive and whitespace-normalized. Multiple words may occur anywhere in the selected searchable value, but every entered word must match.

Below search, built-in and saved views appear as compact chips. Selecting a saved view restores search, facets, tab, and sort. Saving is disabled when the view is identical to the default active catalog.

The desktop work area has three regions:

1. A collapsible facet rail with visible counts and a reset action.
2. A compact result table with sortable columns and 25 rows per page.
3. A preview panel for the selected record.

Clicking a row selects it and opens the preview. Buttons inside the row stop propagation. Edit opens the existing AddReferenceModal. Archive keeps the existing confirmation. Archived records expose Restore instead.

On screens at or below 1024px, the facet rail becomes a drawer controlled by a Filters button, and the preview becomes an overlay sheet. The table keeps a minimum width and a visible horizontal scrollbar rather than compressing or overlapping text.

## Data and State

The existing reference objects remain unchanged. Discovery logic is kept in pure helpers so the page does not duplicate matching, facet, and pagination behavior.

The page owns:

- `query`
- `searchField`
- `filterDepartment`
- `filterType`
- `filterYear`
- `tab`
- `sort`
- `page`
- `viewRef`
- `filtersOpen`
- `saveViewOpen`
- `savedViews`

Saved views use `lpsm_reference_saved_views_v1` and contain only serializable discovery state. Invalid or malformed browser storage falls back to an empty list. At most ten saved views are retained.

## Accessibility

- Search uses an explicit label and submits through a form.
- Facets are buttons with pressed state instead of clickable text.
- Rows remain keyboard-selectable, while row action buttons remain independent.
- The compact filter drawer and preview sheet have dialog semantics, labels, close buttons, and Escape handling.
- Status is not communicated by color alone.

## Error and Empty States

- Malformed saved-view storage is ignored safely.
- A no-result state explains whether the library is empty or the current search has no match.
- Reset Search and Filters is shown for a no-match state.
- Existing reference synchronization, add/edit, archive/restore, and bulk-upload error behavior remains intact.

## Verification

- Unit tests cover multi-field and field-specific search, combined filters, live facet counts, pagination boundaries, and saved-view validation.
- Responsive source-contract tests verify the three-region desktop layout, compact filter drawer, preview sheet, and horizontal-scroll table.
- Existing client tests, lint, and production build must pass.
- Browser verification covers desktop and compact widths on `/role/director-of-libraries/reference-library`.


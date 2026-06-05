/**
 * RowActions — the single, consistent set of per-row actions used by the
 * management / CRUD tables (Departments, Faculty, Programs, Course
 * Offerings, …).
 *
 * Renders "View" (Eye icon) and "Edit" (pencil icon) side by side, each
 * with its icon on the left of the label. Editing is a one-click row
 * action rather than something buried inside the View modal. View opens
 * the read-only modal; Edit opens the edit form directly.
 *
 * Both actions are optional — pass only the handlers a given table needs.
 * `onEdit` is typically gated by the page (e.g. only when the academic
 * term is active), so when it's omitted the row shows just "View".
 *
 * NOTE: This is for working data only. Read-only / approved-document
 * tables (TOS, Syllabus, OVPAA approved files) intentionally do NOT use
 * this — they keep their own view-first affordances.
 */
import { Eye, Edit3 } from 'react-feather';

const linkStyle = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  color: '#111827',
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
};

const RowActions = ({ row, onView, onEdit, viewLabel = 'View' }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
    {onView && (
      <a href="#" onClick={(e) => { e.preventDefault(); onView(row); }} style={linkStyle}>
        <Eye size={16} style={{ marginRight: 6 }} />
        <span>{viewLabel}</span>
      </a>
    )}
    {onEdit && (
      <a href="#" onClick={(e) => { e.preventDefault(); onEdit(row); }} style={linkStyle}>
        <Edit3 size={16} style={{ marginRight: 6 }} />
        <span>Edit</span>
      </a>
    )}
  </div>
);

export default RowActions;

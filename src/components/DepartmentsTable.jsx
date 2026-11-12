import styles from '../styles/CoursesTable.module.sass';
import { Edit3, Send } from 'react-feather';
import { statusPillStyle } from '../services/statusPolicy.js';
import { displayName } from '../utils/nameCase.js';
import RowActionsMenu from './RowActionsMenu.jsx';
import AccessChip, { accessAction } from './AccessChip.jsx';

// A held Dean invitation can be retried here: the VPAA fixes the Dean Email in
// Edit, then sends. The server answers "Held: …" while it still isn't UNC.
const deanAction = (access) => (access && access.status === 'held' ? 'Invite now' : accessAction(access));

const DepartmentsTable = ({ departments = [], onEdit, onInvite, invitingId = null }) => {
  return (
    <div className={styles['table-container']} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflowX: 'auto', overflowY: 'hidden' }}>
      <table>
        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <tr>
            <th width={380}>NAME</th>
            <th width={140} style={{ paddingLeft: 28 }}>CODE</th>
            <th width={260}>DEAN</th>
            <th width={120} style={{ paddingLeft: 24 }}>STATUS</th>
            <th width={170}>ACCESS</th>
            <th className={styles.fill}></th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => {
            const status = d.status || 'Active';
            const action = onInvite && d.dean ? deanAction(d.access) : null;
            const busy = invitingId === d.id;
            return (
              <tr key={d.id || (d.code + '-' + d.name)}>
                <td width={380}>{d.name}</td>
                <td width={140} style={{ paddingLeft: 28 }}>{d.code}</td>
                <td width={260}>
                  {d.dean ? displayName(d.dean) : ''}
                  {d.dean && d.dean_email && <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{d.dean_email}</div>}
                </td>
                <td width={120} style={{ paddingLeft: 24 }}>
                  <span style={{ ...statusPillStyle('department', status), padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                    {status}
                  </span>
                </td>
                <td width={170}>
                  {/* Just the chip; the reason shows when you point at it. */}
                  {d.dean ? <AccessChip access={d.access} /> : <span style={{ color: '#9CA3AF', fontSize: 12, fontStyle: 'italic' }}>No Dean</span>}
                </td>
                <td className={styles.fill} style={{ paddingRight: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <RowActionsMenu
                    row={d}
                    inline={[
                      onEdit && { key: 'edit', label: 'Edit', icon: <Edit3 size={16} />, onClick: (r) => onEdit(r) },
                      action && { key: 'invite', label: busy ? 'Sending…' : action, icon: <Send size={16} />, onClick: (r) => { if (!busy) onInvite(r); } },
                    ].filter(Boolean)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DepartmentsTable;

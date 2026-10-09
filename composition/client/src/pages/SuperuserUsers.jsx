import React from "react";
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import TableScrollRegion from '../components/TableScrollRegion.jsx'
import { Search, UserPlus, X } from "react-feather";
import styles from '../styles/CoursesTable.module.sass'
import syllabusStyles from '../styles/SyllabusSections.module.sass'
import pageStyles from '../styles/ProgramHeadWorkspace.module.sass'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import { ROLES, roleMeta, getSession } from '../utils/session.js'

// The superuser's account administration: search and filter users, create an account, change a
// role, activate or deactivate. Accounts are deactivated, never deleted. The server enforces the
// safety rules (own account, last active superuser); this page just reports its refusals.
const emptyForm = { name: '', email: '', role: 'instructor' };

const SuperuserUsers = () => {
    const me = getSession();
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [notice, setNotice] = React.useState('');
    const [search, setSearch] = React.useState('');
    const [roleFilter, setRoleFilter] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('');
    const [createOpen, setCreateOpen] = React.useState(false);
    const [form, setForm] = React.useState(emptyForm);
    const [created, setCreated] = React.useState(null);
    const [busyId, setBusyId] = React.useState(null);
    const [saving, setSaving] = React.useState(false);

    const load = React.useCallback(async () => {
        setError('');
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.set('q', search.trim());
            if (roleFilter) params.set('role', roleFilter);
            if (statusFilter) params.set('status', statusFilter);
            const data = await fetchJson(`/api/users?${params}`);
            setUsers(Array.isArray(data?.users) ? data.users : []);
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load the users.'));
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter, statusFilter]);

    React.useEffect(() => { load(); }, [load]);

    const act = async (user, path, options, success) => {
        setBusyId(user.id);
        setError('');
        setNotice('');
        try {
            await fetchJson(`/api/users/${user.id}/${path}`, options);
            setNotice(success);
            await load();
        } catch (err) {
            setError(apiErrorMessage(err, 'The change was not saved.'));
        } finally {
            setBusyId(null);
        }
    };

    const changeRole = (user, role) => {
        if (role === user.role) return;
        if (!window.confirm(`Change ${user.name} from ${roleMeta(user.role)?.label} to ${roleMeta(role)?.label}? Their current sessions will end.`)) return;
        act(user, 'role', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) }, `${user.name} is now ${roleMeta(role)?.label}.`);
    };

    const toggleActive = (user) => {
        const verb = user.isActive ? 'deactivate' : 'activate';
        if (user.isActive && !window.confirm(`Deactivate ${user.name}? They are signed out and cannot sign in until reactivated.`)) return;
        act(user, verb, { method: 'PUT' }, `${user.name} was ${user.isActive ? 'deactivated' : 'activated'}.`);
    };

    // The password is shown only when the server returned it (SMTP not configured, or the email failed).
    const showCredentials = (result) => {
        if (result.temporaryPassword) {
            setCreated({ name: result.user.name, email: result.user.email, password: result.temporaryPassword });
        } else {
            setNotice(`Credentials were emailed to ${result.user.email}. The temporary password expires in 72 hours.`);
        }
    };

    const resetPassword = async (user) => {
        if (!window.confirm(`Issue a new temporary password for ${user.name}? Their current password stops working and they are signed out.`)) return;
        setBusyId(user.id);
        setError('');
        setNotice('');
        try {
            showCredentials(await fetchJson(`/api/users/${user.id}/reset-password`, { method: 'PUT' }));
            await load();
        } catch (err) {
            setError(apiErrorMessage(err, 'The password was not reset.'));
        } finally {
            setBusyId(null);
        }
    };

    const closeCreate = () => { setCreateOpen(false); setForm(emptyForm); };

    const create = async () => {
        setSaving(true);
        setError('');
        try {
            const result = await fetchJson('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            showCredentials(result);
            closeCreate();
            await load();
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not create the account.'));
        } finally {
            setSaving(false);
        }
    };

    const pageContent = (
        <div className={pageStyles.managementPage}>
            <div className={pageStyles.pageHeader}>
                <h2>User Management</h2>
                <div className={pageStyles.pageHeaderActions}>
                    <button type="button" className={pageStyles.uploadButton} onClick={() => setCreateOpen(true)}>
                        <UserPlus size={18} color="#FFFFFF" /> Create user
                    </button>
                </div>
            </div>

            {error && <div role="alert" style={{ margin: '0 0 12px', color: '#b91c1c' }}>{error}</div>}
            {notice && <div role="status" style={{ margin: '0 0 12px', color: '#166534' }}>{notice}</div>}

            <div className={`${syllabusStyles.header} ${pageStyles.dataToolbar}`}>
                <div className={pageStyles.toolbarControls}>
                    <div className={`${syllabusStyles['section-select']} ${pageStyles.searchShell}`}>
                        <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" aria-label="Search users" className={pageStyles.searchInput} />
                    </div>
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
                        <option value="">All roles</option>
                        {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Deactivated</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <p>Loading users…</p>
            ) : users.length > 0 ? (
                <TableScrollRegion label="Users" minWidth={900} className={styles['table-container']}>
                    <table>
                        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
                            <tr>
                                <th width={240}>NAME</th>
                                <th width={260}>EMAIL</th>
                                <th width={200}>ROLE</th>
                                <th width={120}>STATUS</th>
                                <th width={160}>LAST SIGN-IN</th>
                                <th className={styles.fill}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => {
                                const isMe = String(user.id) === String(me?.id);
                                const busy = busyId === user.id;
                                return (
                                    <tr key={user.id}>
                                        <td>{user.name}{isMe ? ' (you)' : ''}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <select value={user.role} disabled={isMe || busy} aria-label={`Role of ${user.name}`}
                                                title={isMe ? 'You cannot change your own role.' : undefined}
                                                onChange={(e) => changeRole(user, e.target.value)}>
                                                {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                                            </select>
                                        </td>
                                        <td>{user.isActive ? 'Active' : 'Deactivated'}</td>
                                        <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</td>
                                        <td className={styles.fill}>
                                            <button type="button" className={styles.actionLink} disabled={busy || isMe || !user.isActive}
                                                title={isMe ? 'Use Change password for your own account.' : undefined}
                                                onClick={() => resetPassword(user)}>
                                                Reset password
                                            </button>
                                            {' '}
                                            <button type="button" className={styles.actionLink} disabled={busy || (isMe && user.isActive)}
                                                title={isMe && user.isActive ? 'You cannot deactivate your own account.' : undefined}
                                                onClick={() => toggleActive(user)}>
                                                {user.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </TableScrollRegion>
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No users match</div>
                    <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420 }}>Change the search or filters, or create a user.</div>
                </div>
            )}

            {createOpen && (
                <div>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={closeCreate} />
                    <div role="dialog" aria-modal="true" aria-label="Create user"
                        className={`${pageStyles.managementDialog} ${pageStyles.dialogNarrow} ${pageStyles.dialogElevated}`}>
                        <div className={pageStyles.dialogHeader}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Create user</h2>
                            <button type="button" className="app-icon-close" aria-label="Close" onClick={closeCreate}><X size={16} /></button>
                        </div>
                        <div className={pageStyles.dialogContent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <label>Full name<br />
                                <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="SURNAME, FIRSTNAME" style={{ width: '100%' }} />
                            </label>
                            <label>Email<br />
                                <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@unc.edu.ph" style={{ width: '100%' }} />
                            </label>
                            <label>Role<br />
                                <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%' }}>
                                    {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                                </select>
                            </label>
                            <div style={{ color: '#6B7280', fontSize: 13 }}>A temporary password is generated, valid for 72 hours, and must be changed at first sign-in. It is emailed when mail is configured; otherwise it is shown once here.</div>
                        </div>
                        <div className={pageStyles.managementDialogActions}>
                            <button type="button" onClick={closeCreate}
                                style={{ flex: 1, height: 40, background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={create} disabled={saving}
                                style={{ flex: 1, height: 40, background: '#2C3744', color: '#FFFFFF', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                                {saving ? 'Creating…' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {created && (
                <div>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} />
                    <div role="dialog" aria-modal="true" aria-label="Temporary password"
                        className={`${pageStyles.managementDialog} ${pageStyles.dialogNarrow} ${pageStyles.dialogElevated}`}>
                        <div className={pageStyles.dialogHeader}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Account created</h2>
                        </div>
                        <div className={pageStyles.dialogContent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>{created.name} &lt;{created.email}&gt;</div>
                            <div>Temporary password (shown only now):</div>
                            <code style={{ fontSize: 18, padding: 8, background: '#F3F4F6', borderRadius: 6, userSelect: 'all' }}>{created.password}</code>
                            <div style={{ color: '#6B7280', fontSize: 13 }}>Give it to the user securely. It expires in 72 hours, must be changed at first sign-in, and cannot be shown again.</div>
                        </div>
                        <div className={pageStyles.managementDialogActions}>
                            <button type="button" onClick={() => setCreated(null)}
                                style={{ flex: 1, height: 40, background: '#2C3744', color: '#FFFFFF', borderRadius: 8, border: 'none', cursor: 'pointer' }}>I have saved it</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <Skeleton
            header={<Header role="Superuser" />}
            nav={<SideNavigation mode="superuser" />}
            content={pageContent}
        />
    );
}

export default SuperuserUsers;

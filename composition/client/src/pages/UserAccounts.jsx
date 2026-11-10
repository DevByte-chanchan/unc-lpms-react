import React from 'react'
import { UserPlus, X } from 'react-feather'
import Select from '../components/Select.jsx'
import TableScrollRegion from '../components/TableScrollRegion.jsx'
import { usePageSearch } from '../utils/pageSearch.js'
import PageSearch from '../components/PageSearch.jsx'
import styles from '../styles/CoursesTable.module.sass'
import syllabusStyles from '../styles/SyllabusSections.module.sass'
import pageStyles from '../styles/ProgramHeadWorkspace.module.sass'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import { getSession } from '../utils/session.js'

// User Accounts (feature/course-assignment), for the VPAA and the superuser: every account with its roles and
// invitation, create an account, change name / email / roles, enable or disable, and send a set-password
// invitation, a reset link, or a temporary password. The server (/api/user-accounts) enforces the safety rules
// (own account, superuser role, last superuser); this page reports its refusals.

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '')

const invitationLabel = (inv) => {
  if (!inv) return 'Not sent'
  switch (inv.status) {
    case 'sent': return `Sent ${fmtDate(inv.sentAt)}`
    case 'expired': return `Expired (sent ${fmtDate(inv.sentAt)})`
    case 'accepted': return `Accepted ${fmtDate(inv.acceptedAt)}`
    case 'failed': return `Failed: ${inv.lastError || 'unknown error'}`
    case 'cancelled': return 'Replaced by a newer link'
    default: return inv.status
  }
}

const emptyForm = { id: null, name: '', email: '', roles: ['instructor'] }
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })

const Dialog = ({ label, onClose, children, actions }) => (
  <div>
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 30 }} onClick={onClose} />
    <div role="dialog" aria-modal="true" aria-label={label}
      className={`${pageStyles.managementDialog} ${pageStyles.dialogNarrow} ${pageStyles.dialogElevated}`}>
      <div className={pageStyles.dialogHeader}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>{label}</h2>
        {onClose && <button type="button" className="app-icon-close" aria-label="Close" onClick={onClose}><X size={16} /></button>}
      </div>
      <div className={pageStyles.dialogContent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      <div className={pageStyles.managementDialogActions}>{actions}</div>
    </div>
  </div>
)

export const UserAccountsPanel = () => {
  const me = getSession()
  const [accounts, setAccounts] = React.useState([])
  const [roles, setRoles] = React.useState([])
  const [domain, setDomain] = React.useState('unc.edu.ph')
  // Every program and department, with who heads it now (server: Programs / Departments.stakeholder_id).
  const [units, setUnits] = React.useState({ programs: [], departments: [] })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [shown, setShown] = React.useState(null) // { title, label, value }: a password or link shown once
  const search = usePageSearch('Search name or email')
  const [roleFilter, setRoleFilter] = React.useState('')
  const [form, setForm] = React.useState(null)
  const [busyId, setBusyId] = React.useState(null)
  const [saving, setSaving] = React.useState(false)

  const roleLabel = React.useCallback((key) => roles.find(r => r.key === key)?.label || key, [roles])

  const load = React.useCallback(async () => {
    try {
      const data = await fetchJson('/api/user-accounts')
      setAccounts(Array.isArray(data?.accounts) ? data.accounts : [])
      setRoles(Array.isArray(data?.roles) ? data.roles : [])
      if (data?.domain) setDomain(data.domain)
      setUnits({ programs: data?.programs || [], departments: data?.departments || [] })
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the accounts.'))
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const q = search.trim().toLowerCase()
  const visible = accounts.filter(a =>
    (!q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)) &&
    (!roleFilter || a.roles.includes(roleFilter)))

  // Temporary password (create / reset): shown once when it was not e-mailed.
  const showDelivery = (result, who) => {
    if (result.temporaryPassword) {
      setShown({ title: 'Temporary password', label: `${who.name} <${who.email}>. Give it to them securely; it expires ${new Date(result.expiresAt).toLocaleString()}, must be changed at first sign-in, and is shown only now.`, value: result.temporaryPassword })
    } else {
      setNotice(`A temporary password was e-mailed to ${who.email}.`)
    }
  }

  const act = async (account, run) => {
    setBusyId(account.id); setError(''); setNotice('')
    try {
      await run()
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, 'The change was not saved.'))
    } finally {
      setBusyId(null)
    }
  }

  const sendLink = (account, kind) => {
    const invite = kind === 'invitation'
    const question = invite
      ? `E-mail ${account.name} a link to set their password? It works for 7 days, and any earlier link stops working.`
      : `E-mail ${account.name} a link to choose a new password? It works for 1 hour.`
    if (!window.confirm(question)) return
    act(account, async () => {
      const result = await fetchJson(`/api/user-accounts/${account.id}/${invite ? 'send-invitation' : 'send-password-reset'}`, json('POST'))
      if (result.link) setShown({ title: invite ? 'Invitation link' : 'Password reset link', label: result.message, value: result.link })
      else setNotice(result.message)
    })
  }

  const resetToTemporary = (account) => {
    if (!window.confirm(`Issue a new temporary password for ${account.name}? Their current password stops working and they are signed out.`)) return
    act(account, async () => showDelivery(await fetchJson(`/api/user-accounts/${account.id}/reset-password`, json('POST')), account))
  }

  const toggleActive = (account) => {
    const enable = account.status !== 'Active'
    if (!enable && !window.confirm(`Disable ${account.name}? They are signed out and cannot sign in until enabled.`)) return
    act(account, async () => {
      await fetchJson(`/api/user-accounts/${account.id}`, json('PATCH', { status: enable ? 'Active' : 'Disabled' }))
      setNotice(`${account.name} was ${enable ? 'enabled' : 'disabled'}.`)
    })
  }

  const toggleFormRole = (key) => setForm(f => {
    // The superuser role stands alone.
    if (key === 'superuser') return { ...f, roles: f.roles.includes('superuser') ? [] : ['superuser'] }
    const rest = f.roles.filter(r => r !== 'superuser')
    return { ...f, roles: rest.includes(key) ? rest.filter(r => r !== key) : [...rest, key] }
  })

  const save = async () => {
    setSaving(true); setError('')
    try {
      const body = { name: form.name, email: form.email, roles: form.roles }
      if (form.id) Object.assign(body, { programs: form.programs, departments: form.departments })
      if (form.id) {
        await fetchJson(`/api/user-accounts/${form.id}`, json('PATCH', body))
        setNotice(`${form.name} was updated. A role change signs them out.`)
      } else {
        const result = await fetchJson('/api/user-accounts', json('POST', body))
        showDelivery(result, result.account)
      }
      setForm(null)
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, 'The account was not saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={pageStyles.managementPage}>
      <div className={pageStyles.pageHeader}>
        <h2 className="app-page-title">User Accounts</h2>
        <div className={pageStyles.pageHeaderActions}>
          <button type="button" className="btn btn-primary" onClick={() => { setError(''); setForm(emptyForm) }}>
            <UserPlus size={18} color="#FFFFFF" /> Create account
          </button>
        </div>
      </div>

      {error && <div role="alert" style={{ margin: '0 0 12px', color: 'var(--danger)' }}>{error}</div>}
      {notice && <div role="status" style={{ margin: '0 0 12px', color: 'var(--good)' }}>{notice}</div>}

      <div className={`${syllabusStyles.header} ${pageStyles.dataToolbar}`}>
        <div className={pageStyles.toolbarControls}>
          <PageSearch />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
            <option value="">All roles</option>
            {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </Select>
        </div>
      </div>

      {loading ? <p>Loading accounts…</p> : visible.length > 0 ? (
        <TableScrollRegion label="User accounts" minWidth={1100} className={`${styles['table-container']} app-table`}>
          <table>
            <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
              <tr>
                <th width={220}>Name</th>
                <th width={240}>Email</th>
                <th width={220}>Roles</th>
                <th width={110}>Status</th>
                <th width={180}>Invitation</th>
                <th className={styles.fill}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(account => {
                const isMe = String(account.id) === String(me?.id)
                const busy = busyId === account.id
                const active = account.status === 'Active'
                // Someone who has set their own password gets a reset link, not an invitation.
                const invitable = account.mustChangePassword || !account.lastLoginAt
                return (
                  <tr key={account.id}>
                    <td>{account.name}{isMe ? ' (you)' : ''}</td>
                    <td>{account.email}</td>
                    <td>
                      {account.roles.map(roleLabel).join(', ')}
                      {[...(account.heads?.programs || []), ...(account.heads?.departments || [])].length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                          Heads {[...(account.heads?.programs || []), ...(account.heads?.departments || [])].map(x => x.name).join(', ')}
                        </div>
                      )}
                    </td>
                    <td>{active ? (account.locked ? 'Locked' : 'Active') : 'Disabled'}</td>
                    <td>{invitationLabel(account.invitation)}</td>
                    <td className={styles.fill} style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={busy}
                        onClick={() => { setError(''); setForm({ id: account.id, name: account.name, email: account.email, roles: account.roles, programs: (account.heads?.programs || []).map(p => p.id), departments: (account.heads?.departments || []).map(d => d.id) }) }}>
                        Edit
                      </button>{' '}
                      {invitable ? (
                        <button type="button" className="btn btn-secondary btn-sm" disabled={busy || !active} onClick={() => sendLink(account, 'invitation')}>
                          {account.invitation ? 'Resend invitation' : 'Send invitation'}
                        </button>
                      ) : (
                        <button type="button" className="btn btn-secondary btn-sm" disabled={busy || !active || isMe} onClick={() => sendLink(account, 'reset')}>
                          Send password reset
                        </button>
                      )}{' '}
                      <button type="button" className="btn btn-secondary btn-sm" disabled={busy || !active || isMe}
                        title={isMe ? 'Use Change password for your own account.' : undefined}
                        onClick={() => resetToTemporary(account)}>
                        Temporary password
                      </button>{' '}
                      <button type="button" className={`btn btn-sm ${active ? 'btn-danger-outline' : 'btn-secondary'}`} disabled={busy || (isMe && active)}
                        title={isMe && active ? 'You cannot disable your own account.' : undefined}
                        onClick={() => toggleActive(account)}>
                        {active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableScrollRegion>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No accounts match</div>
          <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420 }}>Change the search or filter, or create an account.</div>
        </div>
      )}

      {form && (
        <Dialog label={form.id ? 'Edit account' : 'Create account'} onClose={() => setForm(null)} actions={<>
          <button type="button" onClick={() => setForm(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button type="button" onClick={save} disabled={saving || form.roles.length === 0} className="btn btn-primary" style={{ flex: 1 }}>
            {saving ? 'Saving…' : (form.id ? 'Save' : 'Create')}
          </button>
        </>}>
          <label>Full name<br />
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="SURNAME, FIRSTNAME" className="app-input" />
          </label>
          <label>Email<br />
            <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder={`name@${domain}`} className="app-input" />
          </label>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend>Roles</legend>
            {roles.map(r => (
              <label key={r.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={form.roles.includes(r.key)} onChange={() => toggleFormRole(r.key)} />
                {r.label}
              </label>
            ))}
          </fieldset>
          {form.id && [
            { key: 'programs', role: 'program-head', legend: 'Programs this account heads', list: units.programs },
            { key: 'departments', role: 'dean', legend: 'Departments this account leads as Dean', list: units.departments },
          ].filter(g => form.roles.includes(g.role) || form[g.key].length > 0).map(g => (
            <fieldset key={g.key} style={{ border: 0, padding: 0, margin: 0 }}>
              <legend>{g.legend}</legend>
              {g.list.map(unit => {
                const mine = form[g.key].includes(unit.id)
                const holder = unit.headId && String(unit.headId) !== String(form.id) ? accounts.find(a => String(a.id) === String(unit.headId))?.name : ''
                return (
                  <label key={unit.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={mine}
                      onChange={() => setForm(f => ({ ...f, [g.key]: mine ? f[g.key].filter(id => id !== unit.id) : [...f[g.key], unit.id] }))} />
                    {unit.name}
                    {holder && !mine && <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}>(now {holder}; ticking moves it here)</span>}
                  </label>
                )
              })}
            </fieldset>
          ))}
          {!form.id && <div style={{ color: '#6B7280', fontSize: 13 }}>A temporary password is made, valid for 72 hours, and must be changed at first sign-in. It is e-mailed when mail is set up, otherwise shown once here. You can also send a set-password invitation afterwards.</div>}
        </Dialog>
      )}

      {shown && (
        <Dialog label={shown.title} actions={
          <button type="button" onClick={() => setShown(null)} className="btn btn-primary" style={{ flex: 1 }}>I have saved it</button>
        }>
          <div>{shown.label}</div>
          <code style={{ fontSize: 15, padding: 8, background: '#F3F4F6', borderRadius: 6, userSelect: 'all', wordBreak: 'break-all' }}>{shown.value}</code>
        </Dialog>
      )}
    </div>
  )
}

export default UserAccountsPanel

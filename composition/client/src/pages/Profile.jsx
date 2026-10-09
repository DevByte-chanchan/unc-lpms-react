import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Skeleton from '../layouts/SkeletonA.jsx'
import Header from '../components/HeaderA.jsx'
import SideNavigation from '../components/SideNavigation.jsx'
import pageStyles from '../styles/ProgramHeadWorkspace.module.sass'
import { API_BASE, fetchJson, apiErrorMessage } from '../utils/api.js'
import { getSession, roleMeta } from '../utils/session.js'
import { routes } from '../utils/routes.js'

const MAX_BYTES = 1024 * 1024
const TYPES = ['image/png', 'image/jpeg']

// The signed-in user's own profile: name, email, role and e-signature. The signature is stored
// encrypted on the server and is shown back only to its owner; approvers' signatures reach
// exports only for plans they approved.
const Profile = () => {
    const session = getSession()
    const [profile, setProfile] = useState(null)
    const [preview, setPreview] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [busy, setBusy] = useState(false)
    const fileInput = useRef(null)

    // The image needs the session cookie, so it is fetched and shown from a blob URL.
    const loadPreview = useCallback(async (hasSignature) => {
        setPreview(previous => { if (previous) URL.revokeObjectURL(previous); return '' })
        if (!hasSignature) return
        try {
            const res = await fetch(`${API_BASE}/api/profile/signature`, { credentials: 'include' })
            if (res.ok) setPreview(URL.createObjectURL(await res.blob()))
            else setError(apiErrorMessage(new Error(await res.text()), 'The signature could not be shown.'))
        } catch {
            setError('The signature could not be shown.')
        }
    }, [])

    const load = useCallback(async () => {
        try {
            const data = await fetchJson('/api/profile')
            setProfile(data)
            await loadPreview(data.hasSignature)
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load your profile.'))
        }
    }, [loadPreview])

    useEffect(() => { load() }, [load])

    const choose = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        setError('')
        setNotice('')
        if (!TYPES.includes(file.type)) { setError('Choose a PNG or JPEG image.'); return }
        if (file.size > MAX_BYTES) { setError('The image is larger than 1 MB.'); return }
        setBusy(true)
        try {
            await fetchJson('/api/profile/signature', { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
            setNotice(profile?.hasSignature ? 'Signature replaced.' : 'Signature saved.')
            await load()
        } catch (err) {
            setError(apiErrorMessage(err, 'The signature was not saved.'))
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        if (!window.confirm('Remove your e-signature? Exports will no longer show it.')) return
        setBusy(true)
        setError('')
        setNotice('')
        try {
            await fetchJson('/api/profile/signature', { method: 'DELETE' })
            setNotice('Signature removed.')
            await load()
        } catch (err) {
            setError(apiErrorMessage(err, 'The signature was not removed.'))
        } finally {
            setBusy(false)
        }
    }

    const content = (
        <div className={pageStyles.managementPage}>
            <div className={pageStyles.pageHeader}><h2>Profile</h2></div>

            {error && <div role="alert" style={{ margin: '0 0 12px', color: '#b91c1c' }}>{error}</div>}
            {notice && <div role="status" style={{ margin: '0 0 12px', color: '#166534' }}>{notice}</div>}

            <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', maxWidth: 520 }}>
                <dt>Name</dt><dd style={{ margin: 0 }}>{profile?.name || session?.name || '—'}</dd>
                <dt>Email</dt><dd style={{ margin: 0 }}>{profile?.email || session?.email || '—'}</dd>
                <dt>Role</dt><dd style={{ margin: 0 }}>{roleMeta(profile?.role || session?.role)?.label || '—'}</dd>
                <dt>Password</dt><dd style={{ margin: 0 }}><Link to={routes.changePassword()}>Change password</Link></dd>
            </dl>

            <h3 style={{ marginTop: 28 }}>E-signature</h3>
            <p style={{ color: '#6B7280', maxWidth: 520 }}>
                PNG or JPEG, up to 1 MB, between 16 and 2000 pixels on each side. It is stored encrypted and appears on
                the syllabus approval block and the review record only for plans you approved.
            </p>

            <div style={{ width: 320, height: 120, border: '1px dashed #9CA3AF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', marginBottom: 12 }}>
                {preview
                    ? <img src={preview} alt="Your e-signature" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                    : <span style={{ color: '#6B7280' }}>{profile?.hasSignature ? 'Loading…' : 'No signature uploaded'}</span>}
            </div>

            <input ref={fileInput} type="file" accept="image/png,image/jpeg" onChange={choose} style={{ display: 'none' }} aria-label="Signature image file" />
            <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className={pageStyles.uploadButton} disabled={busy} onClick={() => fileInput.current?.click()}>
                    {profile?.hasSignature ? 'Replace signature' : 'Upload signature'}
                </button>
                {profile?.hasSignature && (
                    <button type="button" disabled={busy} onClick={remove}
                        style={{ height: 40, padding: '0 16px', background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, cursor: 'pointer' }}>
                        Remove
                    </button>
                )}
            </div>
        </div>
    )

    return (
        <Skeleton
            header={<Header role={roleMeta(session?.role)?.label} />}
            nav={<SideNavigation mode={session?.role} />}
            content={content}
        />
    )
}

export default Profile

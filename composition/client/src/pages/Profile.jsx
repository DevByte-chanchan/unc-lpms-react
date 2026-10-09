import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Skeleton from '../layouts/SkeletonA.jsx'
import Header from '../components/HeaderA.jsx'
import SideNavigation from '../components/SideNavigation.jsx'
import styles from '../styles/Profile.module.sass'
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

    const displayName = profile?.name || session?.name || '—'
    const initial = (displayName.match(/[A-Za-z]/) || ['?'])[0].toUpperCase()

    const content = (
        <div className={styles.page}>
            <h2 className={styles.title}>Profile</h2>

            {error && <div role="alert" className={styles.alert}>{error}</div>}
            {notice && <div role="status" className={styles.ok}>{notice}</div>}

            <section className={styles.card} aria-label="Account">
                <div className={styles.identity}>
                    <div className={styles.avatar} aria-hidden="true">{initial}</div>
                    <div className={styles.identityText}>
                        <div className={styles.name}>{displayName}</div>
                        <span className={styles.roleChip}>{roleMeta(profile?.role || session?.role)?.label || '—'}</span>
                    </div>
                </div>
                <dl className={styles.details}>
                    <dt>Email</dt><dd>{profile?.email || session?.email || '—'}</dd>
                    <dt>Password</dt><dd><Link className={styles.link} to={routes.changePassword()}>Change password</Link></dd>
                </dl>
            </section>

            <section className={styles.card} aria-label="E-signature">
                <h3 className={styles.cardTitle}>E-signature</h3>
                <p className={styles.hint}>
                    PNG or JPEG, up to 1 MB, between 16 and 2000 pixels on each side. It is stored encrypted and appears on
                    the syllabus approval block and the review record only for plans you approved.
                </p>

                <div className={styles.signature}>
                    {preview
                        ? <img src={preview} alt="Your e-signature" />
                        : <span>{profile?.hasSignature ? 'Loading…' : 'No signature uploaded'}</span>}
                </div>

                <input ref={fileInput} type="file" accept="image/png,image/jpeg" onChange={choose} style={{ display: 'none' }} aria-label="Signature image file" />
                <div className={styles.actions}>
                    <button type="button" className={styles.primary} disabled={busy} onClick={() => fileInput.current?.click()}>
                        {profile?.hasSignature ? 'Replace signature' : 'Upload signature'}
                    </button>
                    {profile?.hasSignature && (
                        <button type="button" className={styles.secondary} disabled={busy} onClick={remove}>Remove</button>
                    )}
                </div>
            </section>
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

import { useEffect, useState } from 'react'
import { fetchPrivacyNotice } from '../utils/session.js'
import styles from '../styles/Privacy.module.sass'

// The Privacy Notice. It is public (readable before an account exists, and linked from registration),
// and its text and the Data Protection Officer's contact come from the server.
const Privacy = () => {
  const [notice, setNotice] = useState(undefined)

  useEffect(() => {
    let live = true
    fetchPrivacyNotice().then(found => { if (live) setNotice(found) })
    return () => { live = false }
  }, [])

  return (
    <main className={styles.page}>
      <article className={styles.card}>
        <h1 className={styles.title}>Privacy Notice</h1>
        <p className={styles.version}>
          Learning Plan Management System, University of Nueva Caceres
          {notice ? ` · version ${notice.version}` : ''}
        </p>

        {notice === undefined && <p role="status" className={styles.muted}>Loading…</p>}
        {notice === null && <p role="alert" className={styles.problem}>The Privacy Notice could not be loaded. Check your connection and try again.</p>}

        {notice && (
          <>
            {notice.sections.map(section => (
              <section key={section.title} className={styles.section}>
                <h2>{section.title}</h2>
                <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>
              </section>
            ))}

            <section className={styles.section} aria-label="Data Protection Officer">
              <h2>Data Protection Officer</h2>
              {notice.dpo.configured ? (
                <p>
                  {notice.dpo.name ? <>{notice.dpo.name}<br /></> : null}
                  <a href={`mailto:${notice.dpo.email}`}>{notice.dpo.email}</a>
                </p>
              ) : (
                <p className={styles.muted}>The Data Protection Officer's contact has not been set up yet. Ask your system administrator.</p>
              )}
            </section>
          </>
        )}

        <a className={styles.back} href="/">Back to the system</a>
      </article>
    </main>
  )
}

export default Privacy

import { useCallback, useMemo, useState } from 'react'
import styles from '../styles/Skeleton.module.sass'
import { NavContext } from './NavContext.js'
import { readCollapsed, writeCollapsed } from '../utils/navPreference.js'

const storage = () => { try { return window.localStorage } catch { return undefined } }

// The page frame every role shares: a sidebar that is open (labelled) or collapsed to icons, the top bar,
// and the content. Which one the person chose is remembered in this browser; narrow screens always show the
// icons.
const Skeleton = ({ nav, header, content }) => {
    const [collapsed, setCollapsed] = useState(() => readCollapsed(storage()))
    const toggle = useCallback(() => {
        setCollapsed(previous => { writeCollapsed(storage(), !previous); return !previous })
    }, [])
    const value = useMemo(() => ({ collapsed, toggle, available: true }), [collapsed, toggle])

    return (
        <NavContext.Provider value={value}>
            <div className={styles['main-layout']} data-layout-shell>
                <div className={styles.left} data-layout-nav data-nav-collapsed={collapsed ? 'true' : 'false'}>
                    {nav}
                </div>
                <div className={styles.right}>
                    <div className={styles.up}>
                        {header}
                    </div>
                    <div className={styles.down} data-layout-content>
                        {content}
                    </div>
                </div>
            </div>
        </NavContext.Provider>
    )
}

export default Skeleton;

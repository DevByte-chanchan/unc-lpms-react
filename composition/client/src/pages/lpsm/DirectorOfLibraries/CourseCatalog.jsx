// Director of Libraries → Course Reference Catalog.
//
// "yung Director of Libraries mag-upload... ning suggested books" [16:22], and
// the set "updates every semester after faculty finalize" [16:57] [10:19]. One
// screen: pick the subject, tick the suggested books, save for the term. The
// picker on the instructor side reads exactly what is saved here
// (`getCourseCatalog`), so a title assigned here becomes attachable there.
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Save, RefreshCw, Search, CheckCircle } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import styles from '../../../styles/CourseCatalog.module.sass';

import { fetchJson } from '../../../utils/api.js';
import { getSession } from '../../../utils/session.js';
import {
    buildCatalogView,
    getCatalogSettings,
    getCourseCatalog,
    setCourseCatalog,
    rolloverCatalog,
    termKey,
    nextTermKey,
    typeLabel
} from '../../../utils/referenceCatalog.js';

const CourseCatalog = () => {
    const session = getSession();
    const settings = useMemo(() => getCatalogSettings(), []);
    const [term, setTerm] = useState(() => termKey());

    const [courses, setCourses] = useState([]);
    const [references, setReferences] = useState([]);
    const [courseCode, setCourseCode] = useState('');
    const [search, setSearch] = useState('');
    const [type, setType] = useState('Textbook');
    const [selectedIds, setSelectedIds] = useState([]);
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        Promise.all([
            fetchJson('/api/assignments').catch(() => null),
            fetchJson('/api/references/library').catch(() => [])
        ]).then(([assignments, refs]) => {
            if (!mounted) return;
            const rows = assignments?.data || [];
            const byCode = new Map();
            rows.forEach(r => {
                const c = r?.ProgramCourseOffering?.Course;
                if (c?.course_no && !byCode.has(c.course_no)) {
                    byCode.set(c.course_no, { code: c.course_no, name: c.course_title || '' });
                }
            });
            const list = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
            setCourses(list);
            setReferences(Array.isArray(refs) ? refs : []);
            if (list.length && !courseCode) setCourseCode(list[0].code);
        }).finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
        // courseCode intentionally excluded: this only seeds the first selection
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load whatever is already assigned for this course + term.
    useEffect(() => {
        if (!courseCode) return;
        setSelectedIds(getCourseCatalog(courseCode, term).referenceIds || []);
        setNotice('');
    }, [courseCode, term]);

    const course = courses.find(c => c.code === courseCode);

    // The whole library, split by type — the director assigns from everything,
    // which is what makes a course catalog exist in the first place.
    const { rows } = useMemo(() => buildCatalogView(references, {
        courseCode,
        courseTitle: course?.name || '',
        type,
        search,
        scope: 'library',
        settings: { ...settings, enforceRecency: false }
    }), [references, courseCode, course, type, search, settings]);

    const toggle = (id) => setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

    const handleSave = () => {
        const saved = setCourseCatalog(courseCode, selectedIds, { term, updatedBy: session?.name || '' });
        setNotice(saved
            ? `Saved ${saved.referenceIds.length} suggested reference${saved.referenceIds.length === 1 ? '' : 's'} for ${courseCode} · ${term}.`
            : 'Nothing was saved — pick a subject first.');
    };

    const handleRollover = () => {
        const target = nextTermKey(term);
        const { carried } = rolloverCatalog(term, target);
        setNotice(`Carried ${carried} course catalog${carried === 1 ? '' : 's'} from ${term} into ${target}. Faculty finalise against ${target} from here.`);
        setTerm(target);
    };

    const existing = courseCode ? getCourseCatalog(courseCode, term) : null;

    return (
        <SkeletonA
            header={<HeaderA role={session?.roleLabel || 'Director of Libraries'} name={session?.name || ''} />}
            nav={<SideNavigation mode="director-of-libraries" />}
            content={
                <div className={styles.page}>
                    <div className={styles.head}>
                        <h2><BookOpen size={20} /> Course Reference Catalog</h2>
                        <p>
                            Suggested references per subject. Faculty pick from this set first;
                            searching outside it is a deliberate second step.
                        </p>
                    </div>

                    <div className={styles.controls}>
                        <label>
                            <span>Subject</span>
                            <select value={courseCode} onChange={(e) => setCourseCode(e.target.value)}>
                                {courses.map(c => (
                                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            <span>Term</span>
                            <input value={term} onChange={(e) => setTerm(e.target.value.trim())} />
                        </label>

                        <button type="button" className={styles.secondary} onClick={handleRollover}>
                            <RefreshCw size={14} /> Roll into {nextTermKey(term)}
                        </button>

                        <button type="button" className={styles.primary} onClick={handleSave} disabled={!courseCode}>
                            <Save size={14} /> Save catalog
                        </button>
                    </div>

                    {existing?.updatedAt && (
                        <div className={styles.meta}>
                            Last updated {new Date(existing.updatedAt).toLocaleDateString()}
                            {existing.updatedBy ? ` by ${existing.updatedBy}` : ''}
                            {existing.rolledOverFrom ? ` · carried over from ${existing.rolledOverFrom}` : ''}
                        </div>
                    )}

                    {notice && <div className={styles.notice}><CheckCircle size={14} /> {notice}</div>}

                    <div className={styles.toolbar}>
                        <div className={styles.search}>
                            <Search size={14} />
                            <input
                                placeholder="Search the library"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        {['Textbook', 'Open Educational Resources', 'Online Resources'].map(t => (
                            <button
                                key={t}
                                type="button"
                                className={type === t ? styles.activeTab : styles.tab}
                                onClick={() => setType(t)}
                            >
                                {t === 'Open Educational Resources' ? 'OER' : (t === 'Online Resources' ? 'Online' : t)}
                            </button>
                        ))}
                        <span className={styles.count}>{selectedIds.length} assigned to {courseCode || '—'}</span>
                    </div>

                    <div className={styles.list}>
                        {loading && <div className={styles.empty}>Loading the reference library…</div>}
                        {!loading && rows.length === 0 && <div className={styles.empty}>No references of this type match.</div>}
                        {rows.map(ref => (
                            <label key={ref.reference_id} className={styles.row}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(ref.reference_id)}
                                    onChange={() => toggle(ref.reference_id)}
                                />
                                <span className={styles.title}>{ref.title}</span>
                                <span className={styles.sub}>{ref.author || 'N/A'} · {ref.year || 'n.d.'}</span>
                                <span className={styles.tag}>{typeLabel(ref.type)}</span>
                            </label>
                        ))}
                    </div>
                </div>
            }
        />
    );
};

export default CourseCatalog;

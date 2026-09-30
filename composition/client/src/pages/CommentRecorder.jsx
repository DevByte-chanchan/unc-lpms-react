import React, { useEffect, useState } from 'react';
import SpellCheckArea from '../components/SpellCheckArea.jsx';
import { fetchJson } from '../utils/api.js';
import DropdownMultiSelect from '../components/DropdownMultiSelect.jsx';
import styles from '../styles/CommentRecorder.module.sass';

// Standalone approver comment recorder, wired to YOUR backend (port 5000).
// Chains: assignment -> ILO -> coverage type -> target(s) -> message, then POSTs to /api/comments.
// Targets are saved as real numeric IDs (topic_id / reference_id / tla_id) via CommentTargets.

// The commenter is the logged-in approver — read from localStorage 'user', not a dropdown.
const ROLE_LABELS = {
    'program-head': 'Program Head',
    'dean': 'Dean',
    'industry-consultant': 'Industry Consultant',
    'director-of-libraries': 'Director of Libraries',
};
const getCurrentRole = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const key = user?.role || '';
        return ROLE_LABELS[key] || (key || 'Approver');
    } catch { return 'Approver'; }
};

const COVERAGE_OPTIONS = [
    { value: 'topics', label: 'Topic' },
    { value: 'references', label: 'References' },
    { value: 'tlas', label: 'Teaching-Learning Activity (TLA)' },
];

export default function CommentRecorder() {
    const [assignments, setAssignments] = useState([]);
    const [assignId, setAssignId] = useState('');
    const [ilos, setIlos] = useState([]);
    const [iloId, setIloId] = useState('');
    const [commentFor, setCommentFor] = useState('');
    const [targets, setTargets] = useState([]); // [{ id, label }]
    const [selectedLabels, setSelectedLabels] = useState([]);
    const [message, setMessage] = useState('');
    const [role] = useState(getCurrentRole);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => { loadAssignments(); }, []);

    async function loadAssignments() {
        try {
            const data = await fetchJson('/api/assignments');
            const rows = Array.isArray(data) ? data : (data.data || data.rows || []);
            setAssignments(rows);
        } catch {
            setToast({ type: 'error', msg: 'Failed to load assignments (is your backend on 5000 up?)' });
        }
    }

    const getCode = (a) => {
        const c = a?.ProgramCourseOffering?.Course || {};
        return c.course_no || c.code || '';
    };

    async function onAssignChange(coAssignId) {
        setAssignId(coAssignId);
        setIloId(''); setIlos([]); setCommentFor(''); setTargets([]); setSelectedLabels([]);
        if (!coAssignId) return;
        const row = assignments.find(a => String(a.co_assign_id) === String(coAssignId));
        const offering = row?.ProgramCourseOffering;
        if (!offering?.pc_offering_id || !offering?.revision_number) return;
        try {
            const data = await fetchJson(`/api/ilos/${offering.pc_offering_id}/${offering.revision_number}`);
            const cos = data?.courseOutcomes || [];
            const flat = [];
            cos.forEach(co => (co.ilos || []).forEach(ilo => {
                flat.push({ id: ilo.id, label: `ILO ${ilo.id} — ${String(ilo.description || '').slice(0, 70)}` });
            }));
            setIlos(flat);
        } catch {
            setToast({ type: 'error', msg: 'Failed to load ILOs for this course' });
        }
    }

    // Load targets whenever the ILO or coverage type changes
    useEffect(() => {
        if (!iloId || !commentFor) { setTargets([]); setSelectedLabels([]); return; }
        let cancelled = false;
        (async () => {
            try {
                let list = [];
                if (commentFor === 'topics') {
                    const data = await fetchJson(`/api/topics/assigned/${iloId}`);
                    const arr = Array.isArray(data) ? data : (data.data || []);
                    list = arr.map(item => {
                        const tp = item.topic || item.Topic || item;
                        return { id: tp.topic_id ?? tp.id, label: tp.title || tp.name || `Topic ${tp.topic_id ?? tp.id}` };
                    });
                } else if (commentFor === 'tlas') {
                    const data = await fetchJson(`/api/tlas/ilo/${iloId}`);
                    const arr = data?.tlas || (Array.isArray(data) ? data : []);
                    list = arr.map(t => ({ id: t.id ?? t.tla_id, label: t.tlaName || t.tla_name || `TLA ${t.id ?? t.tla_id}` }));
                } else if (commentFor === 'references') {
                    const data = await fetchJson('/api/references');
                    const arr = Array.isArray(data) ? data : (data.data || data.references || []);
                    list = arr.map(r => ({ id: r.reference_id ?? r.id, label: r.title || r.name || `Reference ${r.reference_id ?? r.id}` }));
                }
                const seen = new Set();
                const dedup = [];
                list.forEach(x => { if (x.id != null && !seen.has(x.id)) { seen.add(x.id); dedup.push(x); } });
                if (!cancelled) { setTargets(dedup); setSelectedLabels([]); }
            } catch {
                if (!cancelled) setToast({ type: 'error', msg: 'Failed to load targets' });
            }
        })();
        return () => { cancelled = true; };
    }, [iloId, commentFor]);

    const canSubmit = assignId && iloId && commentFor && selectedLabels.length > 0 && message.trim() && role && !busy;

    async function submit() {
        if (!canSubmit) return;
        setBusy(true);
        setToast(null);
        const row = assignments.find(a => String(a.co_assign_id) === String(assignId));
        const code = getCode(row);
        try {
            await fetchJson('/api/comments/by-course', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    commenter_role: role,
                    message: message.trim(),
                    comment_for: commentFor,
                    target_titles: selectedLabels,
                }),
            });
            setToast({ type: 'success', msg: 'Comment saved to your database.' });
            setMessage('');
            setSelectedLabels([]);
        } catch (e) {
            setToast({ type: 'error', msg: 'Failed to save comment: ' + (e?.message || e) });
        } finally {
            setBusy(false);
        }
    }

    const assignLabel = (a) => {
        const c = a?.ProgramCourseOffering?.Course || {};
        return `${c.course_no || a.co_assign_id} — ${c.course_title || ''}`.trim();
    };

    return (
        <div className={styles.page}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Record a Comment</h2>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>
                Create a review comment against a learning plan and attach one or more targets (saved to your DB).
            </p>

            <div className={styles.field}>
                <span className={styles.label}>Reviewing as</span>
                <div className={styles.select} style={{ background: '#f8fafc', color: '#334155', fontWeight: 600 }}>{role}</div>
            </div>

            <div className={styles.field}>
                <span className={styles.label}>Learning plan</span>
                <select className={styles.select} value={assignId} onChange={(e) => onAssignChange(e.target.value)} disabled={assignments.length === 0}>
                    <option value="">{assignments.length === 0 ? '-- no learning plans assigned to you --' : '-- select a plan --'}</option>
                    {assignments.map(a => (
                        <option key={a.co_assign_id} value={a.co_assign_id}>{assignLabel(a)}</option>
                    ))}
                </select>
                {/* A disabled, silently empty dropdown looks broken. Say why. */}
                {assignments.length === 0 && (
                    <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                        You have no course offerings for this term, so there is nothing to comment on yet.
                    </span>
                )}
            </div>

            <div className={styles.field}>
                <span className={styles.label}>Intended Learning Outcome (ILO)</span>
                <select className={styles.select} value={iloId} onChange={(e) => setIloId(e.target.value)} disabled={!assignId || ilos.length === 0}>
                    <option value="">-- select ILO --</option>
                    {ilos.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                </select>
            </div>

            <div className={styles.field}>
                <span className={styles.label}>Coverage type</span>
                <select className={styles.select} value={commentFor} onChange={(e) => setCommentFor(e.target.value)} disabled={!iloId}>
                    <option value="">-- select type --</option>
                    {COVERAGE_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>

            <div className={styles.field}>
                <span className={styles.label}>Target</span>
                <DropdownMultiSelect
                    disabled={!commentFor || targets.length === 0}
                    value={selectedLabels}
                    onChange={setSelectedLabels}
                    options={targets.map(t => t.label)}
                />
            </div>

            <div className={styles.field}>
                <span className={styles.label}>Comment</span>
                <SpellCheckArea
                    value={message}
                    onChange={setMessage}
                    placeholder="Describe the issue or suggestion..."
                    padding="8px 10px"
                    minHeight={90}
                />
            </div>

            {toast && (
                <div style={{
                    marginBottom: 14, padding: '8px 12px', borderRadius: 6, fontSize: 13,
                    background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    color: toast.type === 'success' ? '#047857' : '#b91c1c',
                    border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                }}>
                    {toast.msg}
                </div>
            )}

            <button
                className={styles.submit}
                onClick={submit}
                disabled={!canSubmit}
                style={{
                    padding: '10px 18px', borderRadius: 6, border: 'none', fontSize: 14, fontWeight: 600,
                    color: '#fff', background: canSubmit ? '#1f2937' : '#94a3b8',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
            >
                {busy ? 'Saving…' : 'Save comment'}
            </button>
        </div>
    );
}

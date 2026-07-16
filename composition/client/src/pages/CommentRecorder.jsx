import React, { useEffect, useState } from 'react';
import { fetchJson } from '../utils/api.js';
import DropdownMultiSelect from '../components/DropdownMultiSelect.jsx';

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

const box = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, background: '#fff', maxWidth: 720, margin: '24px auto', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const field = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 };
const label = { fontSize: 13, fontWeight: 600, color: '#334155' };
const select = { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, background: '#fff' };

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
        } catch (e) {
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
        const code = getCode(row);
        if (!code) return;
        try {
            const data = await fetchJson(`/api/ilos/${encodeURIComponent(code)}`);
            const cos = data?.courseOutcomes || [];
            const flat = [];
            cos.forEach(co => (co.ilos || []).forEach(ilo => {
                flat.push({ id: ilo.id, label: `ILO ${ilo.id} — ${String(ilo.description || '').slice(0, 70)}` });
            }));
            setIlos(flat);
        } catch (e) {
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
            } catch (e) {
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
        const labelToId = Object.fromEntries(targets.map(t => [t.label, t.id]));
        const target_ids = selectedLabels.map(l => labelToId[l]).filter(v => v != null);
        try {
            await fetchJson('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    co_assign_id: Number(assignId),
                    commenter_role: role,
                    message: message.trim(),
                    ilo_id: Number(iloId),
                    comment_for: commentFor,
                    target_ids,
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
        <div style={box}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Record a Comment</h2>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>
                Create a review comment against a learning plan and attach one or more targets (saved to your DB).
            </p>

            <div style={field}>
                <span style={label}>Reviewing as</span>
                <div style={{ ...select, background: '#f8fafc', color: '#334155', fontWeight: 600 }}>{role}</div>
            </div>

            <div style={field}>
                <span style={label}>Learning plan</span>
                <select style={select} value={assignId} onChange={(e) => onAssignChange(e.target.value)}>
                    <option value="">-- select a plan --</option>
                    {assignments.map(a => (
                        <option key={a.co_assign_id} value={a.co_assign_id}>{assignLabel(a)}</option>
                    ))}
                </select>
            </div>

            <div style={field}>
                <span style={label}>Intended Learning Outcome (ILO)</span>
                <select style={select} value={iloId} onChange={(e) => setIloId(e.target.value)} disabled={!assignId || ilos.length === 0}>
                    <option value="">-- select ILO --</option>
                    {ilos.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                </select>
            </div>

            <div style={field}>
                <span style={label}>Coverage type</span>
                <select style={select} value={commentFor} onChange={(e) => setCommentFor(e.target.value)} disabled={!iloId}>
                    <option value="">-- select type --</option>
                    {COVERAGE_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>

            <div style={field}>
                <span style={label}>Target</span>
                <DropdownMultiSelect
                    disabled={!commentFor || targets.length === 0}
                    value={selectedLabels}
                    onChange={setSelectedLabels}
                    options={targets.map(t => t.label)}
                />
            </div>

            <div style={field}>
                <span style={label}>Comment</span>
                <textarea
                    style={{ ...select, minHeight: 90, resize: 'vertical' }}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe the issue or suggestion..."
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

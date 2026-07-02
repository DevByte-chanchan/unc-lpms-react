const BASE = '/api/courses';

const cogLevelMap = {
    toBackend: {
        'Remembering': 'Remembering',
        'Understanding': 'Understanding',
        'Applying': 'Applying',
        'Analyzing': 'Analyzing',
        'Evaluating': 'Evaluating',
        'Creating': 'Creating'
    },
    toFrontend: {
        'Remembering': 'Remembering',
        'Understanding': 'Understanding',
        'Applying': 'Applying',
        'Analyzing': 'Analyzing',
        'Evaluating': 'Evaluating',
        'Creating': 'Creating'
    }
};

export function cogToBackend(val) { return cogLevelMap.toBackend[val] || val; }
export function cogToFrontend(val) { return cogLevelMap.toFrontend[val] || val; }

const dateAssignedMap = {
    BSCS111L: 'Jun 01', BSCS212L: 'Jun 02', BSCS313L: 'Jun 03',
    BSCS214L: 'Jun 04', BSCS315L: 'Jun 05', BSCS321L: 'Jun 04',
    BSCS322L: 'Jun 03', BSCS331L: 'Jun 05', BSCS341L: 'Jun 06',
    BSCS351L: 'Jun 07', BSCS221L: 'Jun 03', BSCS222L: 'Jun 04',
    BSCS312L: 'Jun 05', BSCS324L: 'Jun 06', BSCS342L: 'Jun 07',
    BSCS223L: 'Jun 01', BSCS314L: 'Jun 02', BSCS323L: 'Jun 03',
    BSCS332L: 'Jun 04', BSCS413L: 'Jun 05',
};

export async function fetchCourses() {
    const res = await fetch(BASE);
    const data = await res.json();
    return data.map(c => {
        const fmt = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '';
        const t = c.tosStatus || {};
        const da = dateAssignedMap[c.code];
        return {
            code: c.code,
            name: c.name,
            update: fmt(c.updated_at),
            status: t.status || 'draft',
            dateSubmitted: fmt(t.submittedAt),
            dateStatus: fmt(t.returnedAt || t.approvedAt),
            dateAssigned: da ? `${da}, 2026` : '',
            exported: ''
        };
    });
}

export async function fetchCourse(courseCode) {
    const res = await fetch(`${BASE}/${courseCode}`);
    if (!res.ok) return null;
    return await res.json();
}

export async function updateCourse(courseCode, fields) {
    const res = await fetch(`${BASE}/${courseCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
    });
    if (!res.ok) throw new Error(`updateCourse failed: ${res.status}`);
    return await res.json();
}

export async function fetchOutcomes(courseCode) {
    const res = await fetch(`${BASE}/${courseCode}/outcomes`);
    if (!res.ok) return [];
    return await res.json();
}

export async function saveOutcomes(courseCode, outcomes) {
    const res = await fetch(`${BASE}/${courseCode}/outcomes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outcomes)
    });
    if (!res.ok) throw new Error(`saveOutcomes failed: ${res.status}`);
    return await res.json();
}

export async function fetchItems(courseCode) {
    const res = await fetch(`${BASE}/${courseCode}/items`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(item => ({
        id: item.id,
        question: item.instruction || '',
        rubricItem: '',
        points: String(item.points || 0),
        span: item.span || 1,
        cognitiveLevel: cogToFrontend(item.cognitiveLevel) || '',
        co: item.co || '',
        ilo: item.ilo || '',
        choices: (item.choices || []).map(c => ({
            id: c.id,
            label: c.label || '',
            text: c.text || '',
            isCorrect: c.isCorrect || false,
            sortOrder: c.sortOrder || 0
        })),
        rubricRows: (() => {
            const raw = (item.rubrics || []).map(r => ({
                id: r.id,
                name: r.criteria || '',
                description: r.description || '',
                weight: Number(r.weight) || 0,
                pts: 0,
                sortOrder: r.sortOrder || 0
            }));
            const total = Number(item.points) || 0;
            if (total && raw.length > 0) {
                const pRows = raw.map(r => ({ ...r, pts: Math.round((r.weight / 100) * total) }));
                const sum = pRows.reduce((s, r) => s + r.pts, 0);
                if (sum !== total) {
                    const last = pRows.length - 1;
                    pRows[last] = { ...pRows[last], pts: Math.max(0, total - (sum - pRows[last].pts)) };
                }
                return pRows.map(r => ({ ...r, pts: String(r.pts), weight: String(r.weight) }));
            }
            return raw.map(r => ({ ...r, weight: String(r.weight) }));
        })()
    }));
}

export async function saveItems(courseCode, items) {
    const body = items.map(item => ({
        co: item.co || '',
        ilo: item.ilo || '',
        instruction: item.instruction || item.question || '',
        points: parseInt(item.points) || 0,
        span: parseInt(item.span) || 1,
        cognitiveLevel: cogToBackend(item.cognitiveLevel) || null,
        choices: (item.choices || []).map(c => ({
            label: c.label || '',
            text: c.text || '',
            isCorrect: c.isCorrect || false,
            sortOrder: c.sortOrder || 0
        })),
        rubrics: (item.rubricRows || []).map(r => ({
            criteria: r.name || '',
            description: r.description || '',
            weight: parseFloat(r.weight) || 0,
            sortOrder: r.sortOrder || 0
        }))
    }));
    const res = await fetch(`${BASE}/${courseCode}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`saveItems failed: ${res.status}`);
    return await res.json();
}

export async function fetchStatus(courseCode) {
    const res = await fetch(`${BASE}/${courseCode}/status`);
    return await res.json();
}

export async function updateStatus(courseCode, status) {
    const res = await fetch(`${BASE}/${courseCode}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    return await res.json();
}

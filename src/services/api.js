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
        
        const da = dateAssignedMap[c.code];
        // We will adapt the frontend mapping in the component directly, since we return raw
        return {
            ...c,
            code: c.code,
            name: c.name,
            instructor: c.instructor || '',
            dateAssigned: da ? da + ', 2026' : '',
            update: da ? da + ', 2026' : '',
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

export async function fetchItems(courseCode, period) {
    const res = await fetch(`${BASE}/${courseCode}/${period}/items`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(item => ({
        id: item.id,
        iloId: item.iloId,
        iloItem: item.iloItem || null,
        question: item.instruction || '',
        rubricItem: '',
        points: String(item.points || 0),
        span: item.span || 1,
        cognitiveLevel: cogToFrontend(item.cognitiveLevel) || '',
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

export async function saveItems(courseCode, period, items) {
    const body = items.map(item => ({
        iloId: item.iloId || null,
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
    const res = await fetch(`${BASE}/${courseCode}/${period}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`saveItems failed: ${res.status}`);
    return await res.json();
}

export async function fetchStatus(courseCode, period) {
    const res = await fetch(`${BASE}/${courseCode}/${period}/status`);
    return await res.json();
}

export async function updateStatus(courseCode, period, status) {
    const res = await fetch(`${BASE}/${courseCode}/${period}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`updateStatus failed: ${res.status}`);
    return await res.json();
}

export async function fetchComments(courseCode, period) {
    const res = await fetch(`${BASE}/${courseCode}/${period}/comments`);
    if (!res.ok) return [];
    return await res.json();
}

export async function createComment(courseCode, period, data) {
    const res = await fetch(`${BASE}/${courseCode}/${period}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`createComment failed: ${res.status}`);
    return await res.json();
}

export async function deleteComment(courseCode, period, id) {
    await fetch(`${BASE}/${courseCode}/${period}/comments/${id}`, {
        method: 'DELETE'
    });
}

export async function resolveComment(courseCode, period, id, resolved) {
    const res = await fetch(`${BASE}/${courseCode}/${period}/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved })
    });
    if (!res.ok) throw new Error(`resolveComment failed: ${res.status}`);
    return await res.json();
}

export const uploadAttachment = async (courseCode, period, iloId, file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('iloId', iloId);
    formData.append('type', type);

    const res = await fetch(`${BASE}/${courseCode}/${period}/attachments`, {
        method: 'POST',
        body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
};

export const fetchAttachments = async (courseCode, period) => {
    const res = await fetch(`${BASE}/${courseCode}/${period}/attachments`);
    if (!res.ok) throw new Error('Failed to fetch attachments');
    return res.json();
};

export const deleteAttachment = async (courseCode, period, id) => {
    const res = await fetch(`${BASE}/${courseCode}/${period}/attachments/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete attachment');
    return res.json();
};




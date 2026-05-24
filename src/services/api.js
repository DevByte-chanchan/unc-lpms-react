const BASE = '/api/courses';

const cogLevelMap = {
    toBackend: {
        'Remembering': 'Remember',
        'Understanding': 'Understand',
        'Applying': 'Apply',
        'Analyzing': 'Analyze',
        'Evaluating': 'Evaluate',
        'Creating': 'Create'
    },
    toFrontend: {
        'Remember': 'Remembering',
        'Understand': 'Understanding',
        'Apply': 'Applying',
        'Analyze': 'Analyzing',
        'Evaluate': 'Evaluating',
        'Create': 'Creating'
    }
};

export function cogToBackend(val) { return cogLevelMap.toBackend[val] || val; }
export function cogToFrontend(val) { return cogLevelMap.toFrontend[val] || val; }

export async function fetchCourses() {
    const res = await fetch(BASE);
    const data = await res.json();
    return data.map(c => ({
        code: c.code,
        name: c.name,
        update: c.updated_at ? new Date(c.updated_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '',
        status: c.tosStatus?.status || 'draft',
        exported: ''
    }));
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
        rubricRows: (item.rubrics || []).map(r => ({
            id: r.id,
            name: r.criteria || '',
            description: r.criteria || '',
            criteria: r.criteria || '',
            weight: r.weight || 0,
            sortOrder: r.sortOrder || 0
        }))
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
            criteria: r.criteria || r.name || r.description || '',
            weight: parseFloat(r.weight) || 0,
            sortOrder: r.sortOrder || 0
        }))
    }));
    const res = await fetch(`${BASE}/${courseCode}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
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

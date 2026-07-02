import { fetchJson, API_BASE } from '../utils/api';

const SYNC_KEY = 'lpsm_sync_queue_v1';

function getQueue() {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return [] }
}

function saveQueue(queue) {
  try { localStorage.setItem(SYNC_KEY, JSON.stringify(queue.slice(-50))) } catch {}
}

function enqueue(action, payload) {
  const queue = getQueue();
  queue.push({ id: `SYNC-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, action, payload, createdAt: new Date().toISOString() });
  saveQueue(queue);
}

export async function syncSyllabus(courseCode, data) {
  enqueue('syllabus_save', { courseCode, data });
  try {
    await fetchJson(`${API_BASE}/api/lpsm/content/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ academic_year: data.academic_year || '2025-2026', content: data }),
    });
  } catch { /* queue will retry later */ }
}

export async function syncWorkflow(courseCode, workflow) {
  enqueue('workflow_update', { courseCode, workflow });
  try {
    await fetchJson(`${API_BASE}/api/lpsm/approvals/${courseCode}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
    });
  } catch {}
}

export async function flushSyncQueue() {
  const queue = getQueue();
  if (queue.length === 0) return;
  const pending = [...queue];
  saveQueue([]);
  for (const item of pending) {
    try {
      if (item.action === 'syllabus_save') {
        await fetchJson(`${API_BASE}/api/lpsm/content/${item.payload.courseCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            academic_year: item.payload.data.academic_year || '2025-2026',
            content: item.payload.data,
          }),
        });
      }
    } catch (e) {
      enqueue(item.action, item.payload);
      break;
    }
  }
}

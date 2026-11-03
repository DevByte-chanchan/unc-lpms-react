import { fetchJson } from './api.js'

// Polling interval for the bell's unread badge.
export const POLL_MS = 45000

export const loadUnreadCount = async () => (await fetchJson('/api/notifications/unread-count')).count
export const loadNotifications = (limit = 15) => fetchJson(`/api/notifications?limit=${limit}`)
export const markRead = (id) => fetchJson(`/api/notifications/${id}/read`, { method: 'PUT' })
export const markAllRead = () => fetchJson('/api/notifications/read-all', { method: 'PUT' })


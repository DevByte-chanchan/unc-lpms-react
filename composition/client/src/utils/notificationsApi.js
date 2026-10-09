import { fetchJson } from './api.js'

// Polling interval for the bell's unread badge.
export const POLL_MS = 45000

const json = { 'Content-Type': 'application/json' }

export const loadUnreadCount = async () => (await fetchJson('/api/notifications/unread-count')).count
export const loadNotifications = (limit = 15) => fetchJson(`/api/notifications?limit=${limit}`)
export const markRead = (id) => fetchJson(`/api/notifications/${id}/read`, { method: 'PUT' })
export const markAllRead = () => fetchJson('/api/notifications/read-all', { method: 'PUT' })

// Poke (Program Head and Dean): reviewers with a pending item on the offering, and the poke itself.
export const loadPokeTargets = async (offeringId) => (await fetchJson(`/api/notifications/poke-targets/${offeringId}`)).targets
export const sendPoke = (offeringId, targetUserId) => fetchJson('/api/notifications/poke', {
  method: 'POST', headers: json, body: JSON.stringify({ offeringId, targetUserId })
})

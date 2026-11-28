// The search box in the top bar. A page that has a list calls usePageSearch(placeholder): the box appears
// in the top bar for as long as that page is shown, and the hook returns what was typed so the page can
// filter its own list. Pages without a list register nothing, so they show no box.
import { useEffect, useSyncExternalStore } from 'react'

const EMPTY = { active: false, placeholder: '', query: '' }
let state = EMPTY
const listeners = new Set()
const emit = () => listeners.forEach(listener => listener())
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener) }
const snapshot = () => state

export const setPageSearch = (query) => { state = { ...state, query: String(query ?? '') }; emit() }
export const usePageSearchBox = () => useSyncExternalStore(subscribe, snapshot, snapshot)

export const usePageSearch = (placeholder = 'Search') => {
  useEffect(() => {
    state = { active: true, placeholder, query: '' }
    emit()
    return () => { state = EMPTY; emit() }
  }, [placeholder])
  return usePageSearchBox().query
}

// Every word typed must appear somewhere in the values (case does not matter); nothing typed matches all.
export const matchesSearch = (query, values = []) => {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = values.map(value => String(value ?? '').toLowerCase()).join(' ')
  return words.every(word => haystack.includes(word))
}

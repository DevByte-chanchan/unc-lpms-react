import { fetchJson } from './api.js'

// The program (department, PEOs with their mission marks, program outcomes) behind an offering,
// for pages 2 and 3 of its syllabus. Without an offering id there is nothing to look up: null
// gives empty tables, never another program's sample. A failed request rejects, so the export
// stops with its error message instead of printing a syllabus with the wrong program data.
export const fetchProgramAlignment = (pcId) =>
  (pcId ? fetchJson(`/api/program-outcomes/offering/${encodeURIComponent(pcId)}`) : Promise.resolve(null))

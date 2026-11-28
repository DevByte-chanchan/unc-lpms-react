/**
 * Department logo registry.
 *
 * Two sources are merged at render time:
 *
 *   1. Bundled assets — files dropped into `src/assets/dept-logos/`
 *      are picked up automatically by Vite's import.meta.glob. The
 *      lookup matches the file's basename (without extension) to the
 *      department code, case-insensitive. Example:
 *        src/assets/dept-logos/SBA.png       → matches dept code "SBA"
 *        src/assets/dept-logos/snahs.svg     → matches dept code "SNAHS"
 *
 *   2. User-uploaded library — kept in localStorage so OVPAA users
 *      can attach logos without a backend round-trip. Two keys:
 *        ovpaaLogoLibrary  → [{ id, name, dataUrl, uploaded_at, code }]
 *        ovpaaDeptLogoMap  → { [deptCode]: libraryEntryId }
 *
 *      A library entry may carry an optional `code` tag. When a logo is
 *      uploaded from a department's Insert-Logo modal it is tagged with
 *      that department's code, so it AUTO-MATCHES any department of the
 *      same code without a manual pick — mirroring how bundled assets
 *      match by filename.
 *
 * Resolution order for a given department code:
 *   user-assigned library entry      (explicit manual pick — always wins)
 *   →  bundled asset                 (pre-loaded <CODE>.png)
 *   →  library entry tagged w/ code  (auto-match an uploaded logo)
 *   →  null                          (fallback to initials avatar)
 *
 * The library is intentionally global (not period-scoped) — a logo
 * uploaded once should be reusable for any department in any term.
 */

// Vite's import.meta.glob pulls every matching asset at build time and
// returns a { path: url } map. `eager: true` resolves URLs immediately.
// BUNDLED:        { [CODE]: url }       — used everywhere to resolve a logo
// BUNDLED_FILES:  { [CODE]: filename }  — original file name (with extension),
//                                          shown as the tile label
const BUNDLED = {};
const BUNDLED_FILES = {};
(() => {
  try {
    const map = import.meta.glob(
      '../assets/dept-logos/*.{png,jpg,jpeg,svg,webp}',
      { eager: true, query: '?url', import: 'default' }
    );
    Object.entries(map).forEach(([path, url]) => {
      const file = path.split('/').pop();              // e.g. "COE.png"
      const base = file.replace(/\.[^.]+$/, '');        // e.g. "COE"
      const code = base.toUpperCase();
      BUNDLED[code] = url;
      BUNDLED_FILES[code] = file;
    });
  } catch (e) {
    /* no bundled assets */
  }
})();

const LIB_KEY = 'ovpaaLogoLibrary';
const MAP_KEY = 'ovpaaDeptLogoMap';

// Sentinel stored in the map to mean "this department was explicitly
// cleared" — needed so the user can REMOVE a bundled logo that would
// otherwise keep auto-matching by code.
export const NONE = '__none__';

const readLib = () => {
  try { return JSON.parse(localStorage.getItem(LIB_KEY) || '[]'); }
  catch (e) { return []; }
};
const writeLib = (arr) => { localStorage.setItem(LIB_KEY, JSON.stringify(arr)); };

const readMap = () => {
  try { return JSON.parse(localStorage.getItem(MAP_KEY) || '{}'); }
  catch (e) { return {}; }
};
const writeMap = (obj) => { localStorage.setItem(MAP_KEY, JSON.stringify(obj)); };

export const getLogoLibrary = () => readLib();

// Every pre-loaded asset from src/assets/dept-logos, as library-shaped
// tiles so the modal can show them alongside uploaded logos.
export const getBundledLogos = () =>
  Object.entries(BUNDLED).map(([code, url]) => ({ code, url, file: BUNDLED_FILES[code] || code }));

export const addToLogoLibrary = (name, dataUrl, code) => {
  const lib = readLib();
  const entry = {
    id: 'lg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    name: name || 'Logo',
    dataUrl,
    uploaded_at: new Date().toISOString(),
    // Optional code tag → enables auto-match for same-code departments.
    code: code ? String(code).toUpperCase() : null,
  };
  lib.push(entry);
  writeLib(lib);
  return entry;
};

export const removeFromLogoLibrary = (id) => {
  writeLib(readLib().filter((e) => e.id !== id));
  // Unbind any departments that pointed to it.
  const m = readMap();
  let dirty = false;
  Object.keys(m).forEach((code) => { if (m[code] === id) { delete m[code]; dirty = true; } });
  if (dirty) writeMap(m);
};

// Assign a logo to a department. `value` is a library entry id, a
// 'bundled:<CODE>' key, the NONE sentinel (explicit removal), or null
// (clear the override entirely, letting auto-match resume).
export const assignLogoToDept = (code, value) => {
  const m = readMap();
  if (value) m[code] = value; else delete m[code];
  writeMap(m);
};

// Explicitly remove a department's logo — even a bundled / auto-matched
// one — so the card falls back to the initials avatar.
export const removeDeptLogo = (code) => {
  const m = readMap();
  m[code] = NONE;
  writeMap(m);
};

export const getAssignedLogoId = (code) => readMap()[code] || null;

/**
 * The key identifying which library/bundled tile a department currently
 * resolves to: a library id, a 'bundled:<CODE>' key, or null. Lets the
 * modal mark the in-use tile as locked.
 */
export const getCurrentLogoKey = (code) => {
  if (!code) return null;
  const upper = String(code).toUpperCase();
  const lib = readLib();
  const map = readMap();
  const assigned = map[code] || map[upper];
  if (assigned === NONE) return null;
  if (assigned) {
    if (String(assigned).startsWith('bundled:')) return assigned;
    if (lib.find((e) => e.id === assigned)) return assigned;
  }
  if (BUNDLED[upper]) return 'bundled:' + upper;
  const tagged = lib.filter((e) => e.code === upper);
  if (tagged.length) return tagged[tagged.length - 1].id;
  return null;
};

/**
 * Set of logo keys ('bundled:<CODE>' or library id) currently in use by
 * any department in `departments`, optionally excluding one code. Lets
 * the picker lock a logo that's already taken by another card so the
 * same logo can't be assigned to two departments.
 */
export const getUsedLogoKeys = (departments, exceptCode) => {
  const used = new Set();
  const skip = exceptCode ? String(exceptCode).toUpperCase() : null;
  (departments || []).forEach((d) => {
    const code = d && d.code;
    if (!code) return;
    if (skip && String(code).toUpperCase() === skip) return;
    const key = getCurrentLogoKey(code);
    if (key) used.add(key);
  });
  return used;
};

/**
 * Resolve a department's logo URL. Returns null if neither a user
 * assignment nor a bundled asset is available.
 */
export const resolveDeptLogo = (code) => {
  if (!code) return null;
  const upper = String(code).toUpperCase();
  const lib = readLib();
  const map = readMap();

  // 1. Explicit manual assignment always wins.
  const assigned = map[code] || map[upper];
  if (assigned === NONE) return null;            // explicitly removed
  if (assigned) {
    if (String(assigned).startsWith('bundled:')) {
      return BUNDLED[assigned.slice('bundled:'.length).toUpperCase()] || null;
    }
    const hit = lib.find((e) => e.id === assigned);
    if (hit) return hit.dataUrl;
  }

  // 2. Pre-loaded bundled asset (src/assets/dept-logos/<CODE>.png).
  if (BUNDLED[upper]) return BUNDLED[upper];

  // 3. Auto-match: an uploaded library logo tagged with this code.
  //    Newest tagged entry wins so a re-upload supersedes an older one.
  const tagged = lib.filter((e) => e.code === upper);
  if (tagged.length) return tagged[tagged.length - 1].dataUrl;

  return null;
};

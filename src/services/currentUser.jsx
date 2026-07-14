/**
 * CurrentUser context — the signed-in principal.
 *
 * STUBBED until real auth exists. Everything reads from this one place, so
 * when auth lands you only swap how `STUB_USER` / `facultyId` are sourced
 * (e.g. from a token / session) — consumers don't change.
 *
 * Exposes:
 *   - name         display name (used by HeaderA across pages)
 *   - role         e.g. 'Program Head'
 *   - facultyId    this user's faculty.id IN THE ACTIVE PERIOD (faculty rows
 *                  are period-scoped, so the id is resolved per term by
 *                  matching the name against the period's Faculty list)
 *   - facultyLoaded  true once the per-period resolution attempt has settled
 *                    (so callers can wait before querying "my program(s)")
 */
import React from 'react';
import { usePeriod } from './period.jsx';
import { FacultyAPI } from './api.js';

// The stubbed signed-in user. Swap this for the authenticated principal.
// NOTE: `name` must match this person's Faculty record exactly (that's how
// facultyId — and thus "my programs" — is resolved until real auth exists).
const STUB_USER = { name: 'Olivia Vance', role: 'Program Head' };

// Same normalization the backend uses for name matching (sans honorific strip,
// which isn't needed for an exact stub name) — collapse to lowercase words.
const normalizeName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const CurrentUserContext = React.createContext({
  name: '', role: '', facultyId: null, facultyLoaded: false,
});

export const CurrentUserProvider = ({ children }) => {
  const { currentPeriod } = usePeriod();
  const periodId = currentPeriod && currentPeriod.id;

  const [facultyId, setFacultyId] = React.useState(null);
  const [facultyLoaded, setFacultyLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!periodId) { setFacultyId(null); setFacultyLoaded(false); return undefined; }
    let cancelled = false;
    setFacultyLoaded(false);
    FacultyAPI.list(periodId)
      .then((rows) => {
        if (cancelled) return;
        const key = normalizeName(STUB_USER.name);
        const match = (Array.isArray(rows) ? rows : []).find((f) => normalizeName(f.name) === key);
        setFacultyId(match ? match.id : null);
        setFacultyLoaded(true);
      })
      .catch(() => { if (!cancelled) { setFacultyId(null); setFacultyLoaded(true); } });
    return () => { cancelled = true; };
  }, [periodId]);

  const value = React.useMemo(() => ({
    name: STUB_USER.name,
    role: STUB_USER.role,
    facultyId,
    facultyLoaded,
  }), [facultyId, facultyLoaded]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
};

export const useCurrentUser = () => React.useContext(CurrentUserContext);

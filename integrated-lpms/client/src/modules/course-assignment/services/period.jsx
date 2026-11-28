import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { prettifyLabel } from './periodLabel.js';
import { PeriodsAPI, AUTH_SIGNED_IN_EVENT } from './api.js';

const STORAGE_KEY = 'course_assignment.period_id';

const PeriodContext = React.createContext({
  periods: [],
  currentPeriod: null,
  activeTerm: null,
  isCurrentTermActive: true,
  apiReachable: true,
  setCurrentPeriodId: () => {},
  refreshPeriods: () => {},
});

const semesterRank = (sem) => {
  const s = String(sem || '').trim().toLowerCase();
  if (s === 'summer' || s === '3') return 3;
  if (s === '2' || s === 'second' || s === '2nd' || s === 'sem 2' || s.startsWith('2nd')) return 2;
  if (s === '1' || s === 'first' || s === '1st' || s === 'sem 1' || s.startsWith('1st')) return 1;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const rankPeriod = (p) => {
  if (!p) return -Infinity;
  const m = String(p.school_year || '').match(/(\d{4})/);
  const year = m ? Number(m[1]) : 0;
  return year * 1e9 + semesterRank(p.semester) * 1e6 + (Number(p.sort_order) || 0) * 1e3 + (Number(p.id) || 0);
};

const currentTermOf = (periods) => {
  const list = Array.isArray(periods) ? periods : [];
  const actives = list.filter((p) => p.status === 'Active' || p.is_active);
  if (actives.length === 0) return null;
  return actives.reduce((best, p) => (rankPeriod(p) > rankPeriod(best) ? p : best), actives[0]);
};

const isWritable = (period, periods) => {
  if (!period) return true;
  const current = currentTermOf(periods);
  return !!current && current.id === period.id;
};

export const PeriodProvider = ({ children }) => {
  const [periods, setPeriods] = React.useState([]);
  const [apiReachable, setApiReachable] = React.useState(true);
  const [currentId, setCurrentId] = React.useState(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  });

  const refreshPeriods = React.useCallback(async () => {
    let rows = [];
    try {
      const raw = await PeriodsAPI.list();
      rows = Array.isArray(raw)
        ? raw.map((p) => ({
            ...p,
            id: p.id ?? p.academic_period_id,
            label: prettifyLabel(p.label),
          }))
        : [];
      setApiReachable(true);
    } catch (err) {
      if (err && err.status === 401) return;
      console.warn('[periods] could not reach API:', err && err.message);
      setApiReachable(false);
      return;
    }
    setPeriods(rows);

    setCurrentId((prev) => {
      if (prev && rows.find((p) => p.id === prev)) return prev;
      const actives = rows.filter((p) => p.status === 'Active' || p.is_active);
      const pool = actives.length > 0 ? actives : rows;
      if (pool.length === 0) return null;
      let best = pool[0];
      let bestRank = rankPeriod(best);
      for (let i = 1; i < pool.length; i += 1) {
        const r = rankPeriod(pool[i]);
        if (r > bestRank) {
          best = pool[i];
          bestRank = r;
        }
      }
      return best ? best.id : null;
    });
  }, []);

  React.useEffect(() => {
    refreshPeriods();
  }, [refreshPeriods]);

  React.useEffect(() => {
    window.addEventListener(AUTH_SIGNED_IN_EVENT, refreshPeriods);
    return () => window.removeEventListener(AUTH_SIGNED_IN_EVENT, refreshPeriods);
  }, [refreshPeriods]);

  React.useEffect(() => {
    try {
      if (currentId) window.localStorage.setItem(STORAGE_KEY, String(currentId));
    } catch {
      /* storage unavailable */
    }
  }, [currentId]);

  const currentPeriod = periods.find((p) => p.id === currentId) || null;
  const activeTerm = React.useMemo(() => currentTermOf(periods), [periods]);
  const isCurrentTermActive = isWritable(currentPeriod, periods);

  const value = React.useMemo(
    () => ({
      periods,
      currentPeriod,
      activeTerm,
      isCurrentTermActive,
      apiReachable,
      setCurrentPeriodId: setCurrentId,
      refreshPeriods,
    }),
    [periods, currentPeriod, activeTerm, isCurrentTermActive, apiReachable, refreshPeriods]
  );

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
};

export const ScopedPeriodProvider = ({ children }) => {
  const parent = React.useContext(PeriodContext);
  const [scopedId, setScopedId] = React.useState(null);
  const periods = parent.periods;

  const [searchParams] = useSearchParams();
  const linkedTerm = Number(searchParams.get('term')) || null;
  React.useEffect(() => {
    if (linkedTerm && (Array.isArray(periods) ? periods : []).some((p) => p.id === linkedTerm)) {
      setScopedId(linkedTerm);
    }
  }, [linkedTerm, periods]);

  const activeTerm = React.useMemo(() => currentTermOf(periods), [periods]);

  const defaultId = React.useMemo(() => {
    if (activeTerm) return activeTerm.id;
    const list = Array.isArray(periods) ? periods : [];
    if (list.length === 0) return parent.currentPeriod ? parent.currentPeriod.id : null;
    return list.reduce((best, p) => (rankPeriod(p) > rankPeriod(best) ? p : best), list[0]).id;
  }, [activeTerm, periods, parent.currentPeriod]);

  const effectiveId = scopedId != null ? scopedId : defaultId;
  const currentPeriod = (Array.isArray(periods) ? periods : []).find((p) => p.id === effectiveId) || null;
  const isCurrentTermActive = isWritable(currentPeriod, periods);

  const value = React.useMemo(
    () => ({
      periods,
      currentPeriod,
      activeTerm,
      isCurrentTermActive,
      apiReachable: parent.apiReachable,
      setCurrentPeriodId: setScopedId,
      refreshPeriods: parent.refreshPeriods,
    }),
    [periods, currentPeriod, activeTerm, isCurrentTermActive, parent.apiReachable, parent.refreshPeriods]
  );

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
};

export const usePeriod = () => React.useContext(PeriodContext);

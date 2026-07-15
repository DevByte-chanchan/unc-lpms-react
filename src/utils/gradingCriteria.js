const PERIODS = ['prelim', 'midterm', 'semi', 'final'];

function normalizeWeightValue(value) {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function buildFallbackRow(fallbackGroup, index) {
  const fallbackIlo = Array.isArray(fallbackGroup?.ilos) ? fallbackGroup.ilos[index] : null;
  if (!fallbackIlo) return null;

  return {
    id: fallbackIlo.id || `ILO${index + 1}`,
    assessments: Array.isArray(fallbackIlo.assessments) ? fallbackIlo.assessments : (fallbackIlo.assessments ?? ''),
    weight: fallbackIlo.weight && typeof fallbackIlo.weight === 'object' ? { ...fallbackIlo.weight } : {},
    minPassing: fallbackIlo.minPassing ?? 60
  };
}

export function normalizeGradingSystem(gradingSystem, fallbackGradingSystem = []) {
  if (!Array.isArray(gradingSystem)) return [];

  const fallbackGroups = Array.isArray(fallbackGradingSystem) ? fallbackGradingSystem : [];

  return gradingSystem.map((group) => {
    const ilos = Array.isArray(group?.ilos) ? group.ilos : [];
    const fallbackGroup = fallbackGroups.find((entry) => entry?.co === group?.co) || null;

    const normalizedIlos = [1, 2, 3].map((iloNumber, index) => {
      const expectedId = `ILO${iloNumber}`;
      const source = ilos.find((ilo) => {
        const candidateId = typeof ilo?.id === 'string' ? ilo.id : '';
        if (candidateId === expectedId) return true;
        const match = candidateId.match(/ILO(\d+)/i);
        return match ? Number(match[1]) === iloNumber : false;
      }) || null;
      const fallbackRow = buildFallbackRow(fallbackGroup, index);

      const hasSourceData = !!source && (
        (Array.isArray(source.assessments) && source.assessments.length > 0) ||
        (source.assessments && source.assessments !== '') ||
        Object.values(source.weight || {}).some((value) => value !== '' && value !== null && value !== undefined)
      );

      const row = hasSourceData ? source : (fallbackRow || source);
      const weight = row?.weight && typeof row.weight === 'object' ? row.weight : {};
      const normalizedWeight = {};

      PERIODS.forEach((period) => {
        normalizedWeight[period] = normalizeWeightValue(weight[period]) || '';
      });

      return {
        id: expectedId,
        displayId: `${group.co || 'CO1'}-${expectedId}`,
        assessments: Array.isArray(row?.assessments) ? row.assessments : (row?.assessments ?? ''),
        weight: normalizedWeight,
        minPassing: row?.minPassing ?? 60
      };
    });

    PERIODS.forEach((period) => {
      const values = normalizedIlos
        .map((ilo) => normalizeWeightValue(ilo.weight[period]))
        .filter((value) => value !== '' && value !== null && value !== undefined);

      const total = values.reduce((sum, value) => sum + Number(value), 0);
      const missing = normalizedIlos.filter((ilo) => normalizeWeightValue(ilo.weight[period]) === '');

      if (missing.length > 0 && total > 0 && total < 100) {
        const remainder = 100 - total;
        const fallbackValue = Number((remainder / missing.length).toFixed(2));
        missing.forEach((ilo) => {
          ilo.weight[period] = fallbackValue;
        });
      }
    });

    return { ...group, ilos: normalizedIlos };
  });
}

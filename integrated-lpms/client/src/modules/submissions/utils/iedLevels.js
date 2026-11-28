// IED levels for intended learning outcomes, and the COAEP performance target.
// Weights are each level's share of a course's total assessment weight.
export const IED_LEVELS = [
  { code: 'I', name: 'Introductory', weight: 20 },
  { code: 'E', name: 'Enabling', weight: 30 },
  { code: 'D', name: 'Demonstrative', weight: 50 }
]

export const DEFAULT_TARGET = { studentsPercent: 90, scorePercent: 60 }

export const levelLabel = (code) => {
  const level = IED_LEVELS.find(item => item.code === code)
  return level ? `${level.name} (${level.code}) - ${level.weight}% of course assessment` : ''
}

export const levelCode = (label) => IED_LEVELS.find(item => levelLabel(item.code) === label)?.code || null

// "90" -> 90; blank, fractions and anything outside 1-100 -> null.
export const parsePercent = (text) => {
  const value = String(text ?? '').trim()
  if (!/^[0-9]{1,3}$/.test(value)) return null
  const number = Number(value)
  return number >= 1 && number <= 100 ? number : null
}

export const targetSentence = (studentsPercent, scorePercent) =>
  `At least ${studentsPercent}% of enrolled students with a rating of at least ${scorePercent}% of the total score`

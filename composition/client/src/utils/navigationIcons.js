const NAVIGATION_ICON_NAMES = Object.freeze({
  'Learning Plan': 'FileText',
  'CO & PO Alignment': 'GitMerge',
  'PO & PEO Alignment': 'Target',
  'Outcomes Alignment': 'Target',
  COAEP: 'Clipboard',
  'Industry Consultants': 'Briefcase',
  'Not Yet Submitted': 'Clock',
  'Reference Library': 'BookOpen',
  'Approved Plans': 'CheckCircle',
  'User Management': 'Users',
})

export const navigationIconName = (label) => NAVIGATION_ICON_NAMES[label] || null

export default NAVIGATION_ICON_NAMES

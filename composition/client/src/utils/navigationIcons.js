const NAVIGATION_ICON_NAMES = Object.freeze({
  'Learning Plan': 'FileText',
  'CO & PO Alignment': 'GitMerge',
  'PO & PEO Alignment': 'Target',
  COAEP: 'UploadCloud',
  'Reference Library': 'BookOpen',
  'Course Catalog': 'Layers',
  'Approved Plans': 'CheckCircle',
})

export const navigationIconName = (label) => NAVIGATION_ICON_NAMES[label] || null

export default NAVIGATION_ICON_NAMES

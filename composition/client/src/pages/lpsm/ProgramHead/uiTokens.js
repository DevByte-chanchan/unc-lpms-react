/* ── Shared design tokens for Program Head curriculum pages ──
   Matches the app's syllabus tables (black borders, sticky white header)
   and the existing button pair (dark #19282C primary / outlined secondary). */
export const FONT = "'Poppins', sans-serif"

export const BTN_DARK = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', height: 40, background: '#19282C', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: FONT }
export const BTN_OUTLINE = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', height: 40, background: 'transparent', borderRadius: 6, color: '#000', border: '1px solid #A4A9AF', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: FONT }
export const BTN_DANGER = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', height: 40, background: '#E81123', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: FONT }

export const TH = { border: '1px solid #000', padding: '8px 10px', background: '#fff', fontWeight: 700, fontSize: 13, fontFamily: FONT, textAlign: 'left' }
export const THC = { ...TH, textAlign: 'center' }
export const TD = { border: '1px solid #000', padding: '8px 10px', fontSize: 13, fontFamily: FONT }
export const TDC = { ...TD, textAlign: 'center' }

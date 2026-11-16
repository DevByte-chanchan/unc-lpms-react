// The app's mascot: a greyhound (the University of Nueva Caceres Greyhounds), drawn here as one original SVG in the
// theme's colours: a grey coat with a white blaze, folded ears, and a teal collar with an amber tag. Poses:
//   reading   an open book held up, eyes down              empty pages ("nothing here yet")
//   thinking  eyes up to one side, thought bubbles          questions ("Discard this?", "Sign out?")
//   worried   raised brows, a sweat drop                    something went wrong
//   happy     smiling closed eyes                           something finished
// Decorative: always aria-hidden; the words beside it carry the meaning.
const COAT = '#9aa6ae'
const COAT_DARK = '#6c7881'
const BLAZE = '#eef2f4'
const NOSE = '#263236'

const PUPILS = {
  reading: { dx: 0, dy: 1.8 },
  thinking: { dx: 1.8, dy: -1.8 },
  worried: { dx: 0, dy: 0.4 },
}

const Eye = ({ cx, pose }) => {
  if (pose === 'happy') {
    return <path d={`M${cx - 3.5} 27 q3.5 -4 7 0`} fill="none" stroke={NOSE} strokeWidth="2.2" strokeLinecap="round" />
  }
  const { dx, dy } = PUPILS[pose] || PUPILS.reading
  return (
    <>
      <ellipse cx={cx} cy="26.5" rx="4.2" ry="4" fill="#fff" />
      <circle cx={cx + dx} cy={26.5 + dy} r={pose === 'worried' ? 2 : 2.6} fill={NOSE} />
      <circle cx={cx + dx + 1} cy={26.5 + dy - 1} r=".8" fill="#fff" />
    </>
  )
}

const Mascot = ({ pose = 'reading', size = 72, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    {/* shoulders and chest */}
    <path d="M16 64 C16 56 22 52 27 51 L37 51 C42 52 48 56 48 64 Z" fill={COAT} />
    <path d="M27 51 C29 57 35 57 37 51 L37 64 L27 64 Z" fill={BLAZE} />
    {/* folded-back ears */}
    <path d="M21 15 C13 12 8 18 10 25 C13 21 17 19 22 20 Z" fill={COAT_DARK} />
    <path d="M43 15 C51 12 56 18 54 25 C51 21 47 19 42 20 Z" fill={COAT_DARK} />
    {/* the long, narrow head */}
    <path d="M32 9 C42 9 47 17 46 26 C45 34 40 43 36.5 49 C34.5 52.5 29.5 52.5 27.5 49 C24 43 19 34 18 26 C17 17 22 9 32 9 Z" fill={COAT} />
    {/* white blaze down the face and a lighter muzzle */}
    <path d="M32 13 C34 21 35.5 33 34.5 44 L29.5 44 C28.5 33 30 21 32 13 Z" fill={BLAZE} />
    <ellipse cx="32" cy="46.5" rx="5.2" ry="4.4" fill="#dfe6ea" />
    {/* eyes, brows, nose and mouth */}
    <Eye cx={25.5} pose={pose} />
    <Eye cx={38.5} pose={pose} />
    {pose === 'worried' && <path d="M21 20 L28.5 21.5 M43 20 L35.5 21.5" stroke={NOSE} strokeWidth="1.8" strokeLinecap="round" />}
    <ellipse cx="32" cy="49.2" rx="3" ry="2.1" fill={NOSE} />
    {pose === 'happy'
      ? <path d="M29 51.8 q3 2.6 6 0" fill="none" stroke={NOSE} strokeWidth="1.4" strokeLinecap="round" />
      : <path d="M32 51.3 v1.2" stroke={NOSE} strokeWidth="1.2" strokeLinecap="round" />}
    {/* collar in the app's teal, with an amber tag */}
    <path d="M24.5 51.5 C29 54.5 35 54.5 39.5 51.5 L40 54.5 C35 57.5 29 57.5 24 54.5 Z" fill="var(--primary)" />
    <circle cx="32" cy="57.6" r="2" fill="var(--warn-solid)" />
    {pose === 'reading' && (
      // an open book held up in front of the chest
      <g>
        <path d="M19 52 L32 55 L45 52 L45 62 L32 64 L19 62 Z" fill="#fff" stroke="var(--primary)" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M32 55 V64" stroke="var(--primary)" strokeWidth="1.2" />
        <path d="M22 55.5 l7 1.5 M22 58.2 l7 1.5 M35 57 l7 -1.5 M35 59.7 l7 -1.5" stroke="#c3ccd1" strokeWidth="1" strokeLinecap="round" />
      </g>
    )}
    {pose === 'worried' && <path d="M51 12 q2.5 4 0 5.5 q-2.5 -1.5 0 -5.5 Z" fill="var(--accent-line)" />}
    {pose === 'thinking' && <circle cx="52" cy="10" r="2.2" fill="var(--line)" />}
    {pose === 'thinking' && <circle cx="57" cy="5" r="3" fill="var(--line)" />}
  </svg>
)

export default Mascot

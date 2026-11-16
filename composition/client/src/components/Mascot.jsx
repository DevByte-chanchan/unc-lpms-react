// The app's mascot: a small owl (wise, bookish: plans, references, the library), drawn here as one SVG in the theme's
// colours so it follows them. Poses:
//   reading   an open book in its wings, eyes down       empty pages ("nothing here yet")
//   thinking  eyes up to one side                         questions ("Discard this?", "Submit?")
//   worried   raised brows, a sweat drop                  something went wrong
//   happy     smiling closed eyes                         something finished
// Decorative: always aria-hidden; the words beside it carry the meaning.
const PUPILS = {
  reading: { dx: 0, dy: 2.5 },
  thinking: { dx: 2.5, dy: -2.5 },
  worried: { dx: 0, dy: 0 },
}

const Eye = ({ cx, pose }) => {
  if (pose === 'happy') {
    return <path d={`M${cx - 4.5} 28 q4.5 -5 9 0`} fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" />
  }
  const { dx, dy } = PUPILS[pose] || PUPILS.reading
  const r = pose === 'worried' ? 2.4 : 3.2
  return (
    <>
      <circle cx={cx} cy="27" r="7.5" fill="#fff" />
      <circle cx={cx + dx} cy={27 + dy} r={r} fill="var(--primary)" />
      <circle cx={cx + dx + 1.2} cy={27 + dy - 1.2} r="1" fill="#fff" />
    </>
  )
}

const Mascot = ({ pose = 'reading', size = 72, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    {/* ear tufts and body */}
    <path d="M17 13 L22 20 L15 21 Z M47 13 L42 20 L49 21 Z" fill="var(--primary)" />
    <path d="M14 26 C14 15 22 10 32 10 C42 10 50 15 50 26 L50 44 C50 53 42 58 32 58 C22 58 14 53 14 44 Z" fill="var(--primary)" />
    {/* wings */}
    <path d="M14 34 C9 39 10 47 15 50 C15 44 15 39 17 35 Z M50 34 C55 39 54 47 49 50 C49 44 49 39 47 35 Z" fill="#2c4247" />
    {/* belly with a few feather marks */}
    <ellipse cx="32" cy="45" rx="12" ry="10.5" fill="#dfe9e6" />
    <path d="M27 42 q1.5 1.5 3 0 M34 42 q1.5 1.5 3 0 M30.5 47 q1.5 1.5 3 0" fill="none" stroke="#b9cbc6" strokeWidth="1.2" strokeLinecap="round" />
    {/* eyes, brows, beak */}
    <Eye cx={24} pose={pose} />
    <Eye cx={40} pose={pose} />
    {pose === 'worried' && (
      <path d="M18 17.5 L27 19.5 M46 17.5 L37 19.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    )}
    <path d="M29.5 32.5 L34.5 32.5 L32 36.5 Z" fill="var(--warn-solid)" />
    {/* feet */}
    <path d="M26 58 v3 M24 61 h4 M38 58 v3 M36 61 h4" stroke="var(--warn-solid)" strokeWidth="1.8" strokeLinecap="round" />
    {pose === 'reading' && (
      // an open book held in front of the belly
      <g>
        <path d="M20 47 L32 50 L44 47 L44 55 L32 58 L20 55 Z" fill="#fff" stroke="var(--primary)" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M32 50 V58" stroke="var(--primary)" strokeWidth="1.2" />
        <path d="M23 50.5 l6 1.3 M23 53 l6 1.3 M35 51.8 l6 -1.3 M35 54.3 l6 -1.3" stroke="#b9cbc6" strokeWidth="1" strokeLinecap="round" />
      </g>
    )}
    {pose === 'worried' && <path d="M52 14 q2.5 4 0 5.5 q-2.5 -1.5 0 -5.5 Z" fill="var(--accent-line)" />}
    {pose === 'thinking' && <circle cx="54" cy="10" r="2.2" fill="var(--line)" />}
    {pose === 'thinking' && <circle cx="58" cy="5" r="3" fill="var(--line)" />}
  </svg>
)

export default Mascot

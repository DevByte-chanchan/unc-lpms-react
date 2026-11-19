// The app's mascot: Microsoft's Fluent 3D emoji (MIT, see assets/mascot/LICENSE.txt), one face per pose:
//   reading   nerd face                      empty pages ("nothing here yet")
//   thinking  thinking face                  questions ("Discard this?", "Sign out?")
//   worried   worried face                   something went wrong
//   happy     smiling face, smiling eyes     something finished
// Decorative: always aria-hidden; the words beside it carry the meaning.
import reading from '../assets/mascot/reading.png'
import thinking from '../assets/mascot/thinking.png'
import worried from '../assets/mascot/worried.png'
import happy from '../assets/mascot/happy.png'

const POSES = { reading, thinking, worried, happy }

const Mascot = ({ pose = 'reading', size = 72, className = '' }) => (
  <img className={className} src={POSES[pose] || reading} width={size} height={size} alt="" aria-hidden="true" draggable="false"
    style={{ pointerEvents: 'none', userSelect: 'none' }} />
)

export default Mascot

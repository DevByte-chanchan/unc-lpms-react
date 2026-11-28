import reading from '../../assets/mascot/reading.webp';
import thinking from '../../assets/mascot/thinking.webp';
import worried from '../../assets/mascot/worried.webp';
import happy from '../../assets/mascot/happy.webp';
import readingStill from '../../assets/mascot/reading.png';
import thinkingStill from '../../assets/mascot/thinking.png';
import worriedStill from '../../assets/mascot/worried.png';
import happyStill from '../../assets/mascot/happy.png';

const POSES = {
  reading: [reading, readingStill],
  thinking: [thinking, thinkingStill],
  worried: [worried, worriedStill],
  happy: [happy, happyStill],
};

const Mascot = ({ pose = 'reading', size = 72, className = '' }) => {
  const [moving, still] = POSES[pose] || POSES.reading;
  return (
    <picture
      style={{ display: 'inline-block', lineHeight: 0, pointerEvents: 'none', userSelect: 'none' }}
      aria-hidden="true"
    >
      <source media="(prefers-reduced-motion: reduce)" srcSet={still} />
      <img className={className} src={moving} width={size} height={size} alt="" draggable="false" />
    </picture>
  );
};

export default Mascot;

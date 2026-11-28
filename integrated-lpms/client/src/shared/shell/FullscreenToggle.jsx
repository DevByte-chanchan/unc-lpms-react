import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize, Minimize2 } from 'lucide-react';

const isOn = () => document.body.dataset.focus === '1';

const FullscreenToggle = ({ className = '' }) => {
  const [on, setOn] = useState(isOn);

  const leave = useCallback(() => {
    delete document.body.dataset.focus;
    setOn(false);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const enter = useCallback(() => {
    document.body.dataset.focus = '1';
    setOn(true);
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) {
      root.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && isOn()) leave();
    };
    const onKey = (event) => {
      if (
        event.key === 'Escape' &&
        isOn() &&
        !document.fullscreenElement &&
        !document.querySelector('[role=dialog],[role=alertdialog],[role=menu],[role=listbox]')
      ) {
        leave();
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('keydown', onKey);
    };
  }, [leave]);

  return (
    <>
      <button
        type="button"
        className={className || 'app-icon-btn'}
        onClick={on ? leave : enter}
        title={on ? 'Exit full screen' : 'Full screen'}
        aria-label={on ? 'Exit full screen' : 'Full screen'}
        aria-pressed={on}
      >
        {on ? <Minimize2 size={16} /> : <Maximize size={16} />}
      </button>
      {on &&
        createPortal(
          <div className="app-focus-exit-zone">
            <button type="button" className="app-focus-exit" onClick={leave} title="Exit full screen (Esc)">
              <Minimize2 size={14} aria-hidden="true" /> Exit full screen <kbd>Esc</kbd>
            </button>
          </div>,
          document.body
        )}
    </>
  );
};

export default FullscreenToggle;

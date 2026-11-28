import { createRoot } from 'react-dom/client';
import Toaster from './Toaster.jsx';

let push = null;
const waiting = [];
let nextId = 0;
let mounted = false;

const connect = (fn) => {
  push = fn;
  waiting.splice(0).forEach(fn);
  return () => {
    push = null;
  };
};

export const toast = (message, type = 'success') => {
  if (!message) return;
  if (!mounted) {
    mounted = true;
    const host = document.createElement('div');
    document.body.appendChild(host);
    createRoot(host).render(<Toaster connect={connect} />);
  }
  const item = { id: ++nextId, message: String(message), type: type === 'error' ? 'warning' : type };
  if (push) push(item);
  else waiting.push(item);
};

export default toast;

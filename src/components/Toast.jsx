import { useState, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '14px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
          background: toast.type === 'success' ? '#d5f4e6' : toast.type === 'warning' ? '#fef5e7' : '#fee',
          color: toast.type === 'success' ? '#27ae60' : toast.type === 'warning' ? '#f39c12' : '#e74c3c',
          borderLeft: `4px solid ${toast.type === 'success' ? '#27ae60' : toast.type === 'warning' ? '#f39c12' : '#e74c3c'}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'opacity 0.3s'
        }}>
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  );
};

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast from '../components/Toast';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, type = 'success') => setToast({ message, type, id: Date.now() }), []);
  const dismiss = useCallback(() => setToast(null), []);
  const value = useMemo(() => notify, [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <AnimatePresence>{toast && <Toast key={toast.id} toast={toast} onDismiss={dismiss} />}</AnimatePresence>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);

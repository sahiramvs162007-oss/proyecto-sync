import React, { createContext, useContext, useState, useCallback } from 'react';
import NotificationToast from '../components/NotificationToast';

const NotificationContext = createContext({
  showNotification: (message, type = 'success') => {},
});

export function NotificationProvider({ children }) {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showNotification = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
    // Ocultar después de 4 segundos
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <NotificationToast visible={toast.visible} message={toast.message} type={toast.type} />
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);

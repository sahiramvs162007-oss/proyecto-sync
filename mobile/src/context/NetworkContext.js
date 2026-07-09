import React, { createContext, useContext, useEffect, useState } from "react";
import NetworkService from "../services/NetworkService";
import SyncService from "../services/SyncService";
import { useNotification } from "./NotificationContext";

const NetworkContext = createContext({ online: true, sincronizando: false });

export function NetworkProvider({ children }) {
  const [online, setOnline] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoResumen, setUltimoResumen] = useState(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    NetworkService.isOnline().then(setOnline);

    const unsubscribe = NetworkService.subscribe(async (isOnline) => {
      setOnline(isOnline);
      if (isOnline) {
        setSincronizando(true);
        if (showNotification) showNotification('Conexión restablecida. Iniciando sincronización.', 'info');
        const resumen = await SyncService.sincronizar(showNotification);
        setUltimoResumen(resumen);
        setSincronizando(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <NetworkContext.Provider value={{ online, sincronizando, ultimoResumen }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);

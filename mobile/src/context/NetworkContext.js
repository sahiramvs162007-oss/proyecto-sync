import React, { createContext, useContext, useEffect, useState } from "react";
import NetworkService from "../services/NetworkService";
import SyncService from "../services/SyncService";

const NetworkContext = createContext({ online: true, sincronizando: false });

export function NetworkProvider({ children }) {
  const [online, setOnline] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoResumen, setUltimoResumen] = useState(null);

  useEffect(() => {
    NetworkService.isOnline().then(setOnline);

    const unsubscribe = NetworkService.subscribe(async (isOnline) => {
      setOnline(isOnline);
      if (isOnline) {
        setSincronizando(true);
        const resumen = await SyncService.sincronizar();
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

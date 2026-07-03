import NetInfo from '@react-native-community/netinfo';

const NetworkService = {
  async isOnline() {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  },

  // Suscribe un callback que se dispara cada vez que cambia el estado de red.
  // Devuelve la función para des-suscribirse (usar en useEffect cleanup).
  subscribe(callback) {
    return NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      callback(online);
    });
  }
};

export default NetworkService;

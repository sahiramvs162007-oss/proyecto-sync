import * as SecureStore from 'expo-secure-store';

/**
 * Wrapper sobre expo-secure-store (cifrado a nivel de SO).
 * Metro/Webpack elegirán automáticamente secureStorage.web.js
 * cuando el build sea para navegador, porque expo-secure-store
 * NO funciona en web.
 */
const SecureStorage = {
  async getItem(key) {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key) {
    return SecureStore.deleteItemAsync(key);
  }
};

export default SecureStorage;

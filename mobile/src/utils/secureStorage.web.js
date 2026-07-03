/**
 * Versión web: expo-secure-store no existe en navegador, así que
 * usamos localStorage. Es menos seguro que el keychain nativo
 * (por eso solo se usa aquí, nunca en la build de tablet/celular),
 * pero mantiene la misma interfaz para que AuthService no distinga plataforma.
 */
const SecureStorage = {
  async getItem(key) {
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    window.localStorage.removeItem(key);
  }
};

export default SecureStorage;

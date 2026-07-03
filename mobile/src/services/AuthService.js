import SecureStorage from '../utils/secureStorage'; // resuelve a .web.js automáticamente en build web
import RemoteDataSource from '../datasources/RemoteDataSource';
import LocalDataSource from '../datasources/LocalDataSource';
import NetworkService from './NetworkService';

const AuthService = {
  async login(email, password) {
    const online = await NetworkService.isOnline();
    if (!online) {
      // Login offline: solo permite entrar si ya existe sesión cacheada
      const cached = await SecureStorage.getItem('usuario');
      if (cached) return JSON.parse(cached);
      const err = new Error('No hay conexión y no existe una sesión previa en este dispositivo');
      err.code = 'NO_OFFLINE_SESSION';
      throw err;
    }

    const { accessToken, refreshToken, usuario } = await RemoteDataSource.login(email, password);

    await SecureStorage.setItem('access_token', accessToken);
    await SecureStorage.setItem('refresh_token', refreshToken);
    await SecureStorage.setItem('usuario', JSON.stringify(usuario));

    // Se guarda copia en el almacenamiento local (SQLite o IndexedDB según plataforma)
    // para que RemoteDataSource pueda leer el token sin depender de SecureStorage en cada request
    await LocalDataSource.setConfig('access_token', accessToken);

    return usuario;
  },

  async logout() {
    await SecureStorage.removeItem('access_token');
    await SecureStorage.removeItem('refresh_token');
    await SecureStorage.removeItem('usuario');
    await LocalDataSource.setConfig('access_token', '');
  },

  async getUsuarioActual() {
    const cached = await SecureStorage.getItem('usuario');
    return cached ? JSON.parse(cached) : null;
  },

  async ensureDeviceId() {
    let deviceId = await LocalDataSource.getConfig('device_id');
    if (!deviceId) {
      // En producción usar expo-application (getAndroidId / getIosIdForVendorAsync)
      deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await LocalDataSource.setConfig('device_id', deviceId);
    }
    return deviceId;
  }
};

export default AuthService;

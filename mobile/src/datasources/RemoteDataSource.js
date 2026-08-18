import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import LocalDataSource from "./LocalDataSource";

// Resuelve la URL del backend automáticamente:
// 1) Si hay una URL fija definida en app.json -> extra.apiUrl (backend en el
//    VPS/dominio), esa es SIEMPRE la que se usa. Es lo que se usa en producción
//    y también en desarrollo si prefieres apuntar siempre al servidor real.
// 2) Si no hay apiUrl definida, se usa la IP que el propio Expo detecta para
//    el bundler (Metro) en desarrollo -> sirve para probar contra un backend
//    corriendo en tu máquina, sin tener que hardcodear ninguna IP.
// 3) Último recurso: localhost (solo sirve en Web).
function resolveBaseUrl() {
  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (fromExtra) return fromExtra;

  const hostUri =
    Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3000`;
  }

  return "http://localhost:3000";
}

const BASE_URL = resolveBaseUrl();

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// Interceptor: adjunta el token guardado en cada request
api.interceptors.request.use(async (config) => {
  const token = await LocalDataSource.getConfig("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const deviceId = await LocalDataSource.getConfig("device_id");
  if (deviceId) config.headers["x-device-id"] = deviceId;
  return config;
});

const RemoteDataSource = {
  // ---------- AUTH ----------
  async login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    return data;
  },

  async refreshToken(refreshToken) {
    const { data } = await api.post("/auth/refresh", { refreshToken });
    return data;
  },

  async registrarPersona(datos) {
    const { data } = await api.post("/personas", datos);
    return data;
  },

  // ---------- SYNC ----------
  async uploadOperations(device_id, operations, strategy) {
    const { data } = await api.post("/sync/upload", {
      device_id,
      operations,
      strategy,
    });
    return data;
  },

  async downloadChanges(device_id) {
    const { data } = await api.get("/sync/download", { params: { device_id } });
    return data;
  },

  async confirmSync(device_id, syncedAt) {
    const { data } = await api.post("/sync/confirm", { device_id, syncedAt });
    return data;
  },
};

export default RemoteDataSource;

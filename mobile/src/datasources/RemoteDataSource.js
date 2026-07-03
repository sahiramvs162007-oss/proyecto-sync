import axios from "axios";
import { Platform } from "react-native";
import LocalDataSource from "./LocalDataSource";

// En el navegador (npm run web), el backend corre en la misma máquina -> localhost.
// En un dispositivo físico (celular/tablet con Expo Go), localhost apuntaría al propio
// dispositivo, así que ahí sí necesitas la IP de tu computador en la red Wi-Fi.
const BASE_URL =
  Platform.OS === "web" ? "http://localhost:3000" : "http://192.168.1.100:3000"; // <- cámbiala por la IP real de tu PC si pruebas en tablet/celular

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

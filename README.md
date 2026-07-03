# Proyecto Offline-First con Sincronización Bidireccional

App React Native (tablet) + Backend Node.js/Express/MySQL, con sincronización
por UUID, resolución de conflictos y cola de operaciones pendientes.

## Estructura

```
proyecto-sync/
├── backend/                  # API REST - Node.js + Express + MySQL
│   ├── src/
│   │   ├── config/db.js          # Pool de conexión MySQL
│   │   ├── migrations/           # Schema SQL + scripts migrate/seed
│   │   ├── middleware/            # authMiddleware (JWT)
│   │   ├── repositories/          # Acceso a datos (persona, sync, usuario)
│   │   ├── services/              # Lógica de negocio (auth, persona, sync)
│   │   ├── controllers/           # Handlers HTTP
│   │   ├── routes/                # /auth /personas /sync
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
└── mobile/                   # App React Native (Expo) - celular, tablet y web
    ├── src/
    │   ├── database/           # db.js (SQLite, nativo) + db.web.js (IndexedDB, navegador)
    │   ├── datasources/        # LocalDataSource(.web).js / RemoteDataSource (Axios)
    │   ├── repositories/       # PersonaRepository / SyncRepository
    │   ├── services/           # AuthService / PersonaService / SyncService / NetworkService
    │   ├── utils/               # secureStorage(.web).js, responsive.js (breakpoints)
    │   ├── components/          # ResponsiveContainer
    │   ├── context/            # NetworkContext (estado online global)
    │   ├── navigation/
    │   └── screens/             # Login, Listado, Registrar, Editar
    ├── App.js
    ├── app.json
    └── package.json
```

## Un solo código para cualquier dispositivo

La app corre igual en **celular, tablet, iOS, Android y navegador web**, sin
duplicar lógica de negocio. Esto se logra con archivos "por plataforma": el
bundler (Metro/Webpack de Expo) elige automáticamente la versión `.web.js`
cuando compila para navegador, y la versión normal (`.js`) para iOS/Android.
Ni las screens ni los services necesitan saber en qué plataforma están corriendo:

| Módulo | Nativo (iOS/Android) | Web |
|---|---|---|
| Almacenamiento local | `LocalDataSource.js` → SQLite (`expo-sqlite`) | `LocalDataSource.web.js` → IndexedDB |
| Sesión/tokens | `secureStorage.js` → `expo-secure-store` (cifrado del SO) | `secureStorage.web.js` → `localStorage` |
| Inicialización de BD | `database/db.js` | `database/db.web.js` |

Además, `ResponsiveContainer` + el hook `useResponsive()` (`src/utils/responsive.js`)
adaptan el layout: en celular es una sola columna a ancho completo, en tablet
son 2 columnas con ancho limitado, y en escritorio/web son 3 columnas centradas.

Para correr en el navegador:

```bash
cd mobile
npm install
npm run web
```

## Backend - puesta en marcha

```bash
cd backend
cp .env.example .env      # edita credenciales de MySQL
npm install
npm run migrate           # crea la base de datos y las tablas
npm run seed               # crea usuario admin@sync-app.com / Admin123!
npm run dev                 # levanta en http://localhost:3000
```

### Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Login, devuelve accessToken + refreshToken |
| POST | `/auth/refresh` | Renueva el accessToken |
| GET | `/personas` | Lista personas (requiere JWT) |
| POST | `/personas` | Crea persona directamente online |
| PUT | `/personas/:uuid` | Actualiza persona |
| DELETE | `/personas/:uuid` | Soft delete |
| POST | `/sync/upload` | Sube el lote de operaciones pendientes de la tablet |
| GET | `/sync/download?device_id=` | Descarga cambios incrementales desde el último sync |
| POST | `/sync/confirm` | Confirma la sincronización y avanza el cursor `sync_state` |

## Mobile - puesta en marcha

```bash
cd mobile
npm install
# Edita src/datasources/RemoteDataSource.js -> BASE_URL con la IP de tu backend
npm start          # abre Expo Dev Tools, escanea el QR con Expo Go en la tablet
```

> Importante: si pruebas en un dispositivo físico, `BASE_URL` debe ser la IP
> de tu computador en la red local (no `localhost`), y ambos deben estar en
> la misma red Wi-Fi.

## Flujo de sincronización implementado

1. **Registro offline**: `PersonaService.registrar()` guarda en SQLite con `sync_status: 'PENDING'` y encola la operación en `sync_queue`, con UUID generado en el dispositivo (`uuid v4`).
2. **Detección de red**: `NetworkContext` escucha `NetInfo` y dispara `SyncService.sincronizar()` automáticamente al recuperar conexión.
3. **Upload**: se agrupan las operaciones pendientes y se envían en lote a `POST /sync/upload`.
4. **Upsert por UUID en servidor**: si el UUID no existe, se crea; si existe, se resuelve conflicto (`last_write_wins` por defecto, comparando `updated_at`).
5. **Download incremental**: `GET /sync/download` devuelve solo los registros con `updated_at` posterior al último `sync_state.last_sync_at` de ese `device_id`.
6. **Aplicar y confirmar**: la tablet aplica los cambios en SQLite y llama a `POST /sync/confirm` para mover el cursor de sincronización.

## Próximos pasos sugeridos

- [ ] Agregar tests unitarios a `syncService.resolveConflict` (backend) — es la pieza más sensible a bugs.
- [ ] Implementar `expo-application` para un `device_id` estable (actualmente se genera uno aleatorio la primera vez).
- [ ] Agregar reintentos con backoff exponencial en `SyncService` para operaciones con `status: 'ERROR'`.
- [ ] Pantalla de configuración para elegir estrategia de conflicto (`server_wins` / `device_wins` / `last_write_wins`) si el proyecto lo requiere.

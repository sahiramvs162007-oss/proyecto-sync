# Documentación del Sistema de Registro de Personas con Sincronización Offline/Online

## 1. Objetivo del sistema

Permitir el registro y la gestión de personas tanto en escenarios con conexión a Internet como en aquellos donde la conectividad es limitada o inexistente, garantizando la continuidad de las actividades.

Cuando no exista conexión, la aplicación continúa funcionando utilizando una base de datos local. Una vez la conexión se restablece, el sistema sincroniza automáticamente la información con la plataforma central, evitando la pérdida de datos y manteniendo la información actualizada y consistente entre ambos entornos.

## 2. Arquitectura general

El sistema está compuesto por dos entornos de almacenamiento:

| Entorno | Tecnología | Se usa cuando... |
|---|---|---|
| Base de datos local | SQLite (dispositivo) | La aplicación trabaja en modo offline |
| Base de datos central | MySQL (servidor) | Existe conexión a Internet |

La comunicación entre ambos entornos se realiza mediante una **API REST** desarrollada en Node.js. La sincronización entre la base de datos local y la central es **automática y transparente** para el usuario: no requiere que este ejecute ninguna acción para que ocurra.

## 3. Identificador único: el documento de identidad

Cada persona se identifica **únicamente por su número de documento**. El documento es la llave que se utiliza para:

- Verificar si la persona ya existe (local o remotamente).
- Evitar registros duplicados.
- Actualizar información existente en lugar de crear un registro nuevo.
- Sincronizar registros entre la base de datos local y la central.

**Nunca** se utiliza el nombre ni el teléfono para identificar a una persona — ambos son datos que pueden cambiar o repetirse entre personas distintas, mientras que el documento no.

## 4. Estado del registro vs. Historial de eventos

Este es un punto de diseño importante que separa dos conceptos que suelen confundirse: **el estado** y **el historial**. No son lo mismo, y cada uno responde a una pregunta distinta.

| | Estado | Historial |
|---|---|---|
| Responde a | ¿Cómo se encuentra *ahora* este registro? | ¿Qué *pasó* con este registro? |
| Cantidad por persona | Uno solo, siempre vigente | Muchas filas, una por cada evento ocurrido |
| Cambia con el tiempo | Sí, se sobrescribe | No, es un registro permanente y acumulativo |
| Pertenece a | El registro de la persona | El sistema (bitácora) |

### 4.1 Estados posibles

| Estado | Descripción |
|---|---|
| `PENDIENTE` | El registro existe únicamente en la base de datos local y aún no ha sido sincronizado. |
| `SINCRONIZADO` | El registro ya fue sincronizado correctamente con la plataforma. |
| `ERROR` | La sincronización falló. El sistema reintentará automáticamente cuando exista conexión. |

El estado de una persona puede cambiar muchas veces a lo largo de su ciclo de vida. Por ejemplo:

```
Laura Vargas
PENDIENTE  →  SINCRONIZADO  →  PENDIENTE (la editaron sin Internet)  →  SINCRONIZADO
```

En cualquier momento, **el estado actual es uno solo** — es un campo del registro, no un historial en sí mismo.

### 4.2 El historial no contiene estados

El historial registra *eventos*, no el estado resultante de cada evento — eso sería redundante, porque el estado actual ya se puede consultar directamente en el registro de la persona. Por ejemplo, en el historial **no** se escribe "Estado: SINCRONIZADO"; se escribe qué ocurrió: *"Laura Vargas fue sincronizada correctamente con la plataforma."*

### 4.3 Tres conceptos independientes

```
                    Persona
                        │
        ┌───────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
     Estado         Notificación       Historial
  (condición       (mensaje          (bitácora
   actual, uno      momentáneo,       permanente,
   solo, cambia)    desaparece)       acumulativa)
```

- **Estado**: campo del registro. Solo sirve para saber cómo está *ahora* (`PENDIENTE` / `SINCRONIZADO` / `ERROR`).
- **Notificación**: mensaje momentáneo mostrado al usuario justo después de una operación. No se almacena.
- **Historial**: bitácora permanente de eventos relevantes (fecha, persona, documento, tipo de evento, resultado, descripción).

## 5. Funcionamiento general

### Modo Online (existe conexión)

- Las consultas se realizan contra la plataforma central.
- Los registros se almacenan inmediatamente en la base de datos central (MySQL).
- La información local (SQLite) también se actualiza, como caché.
- El estado del registro queda en `SINCRONIZADO`.

### Modo Offline (no existe conexión)

- Toda la información se almacena en SQLite.
- El estado del registro queda en `PENDIENTE`.
- El usuario puede seguir utilizando la aplicación con normalidad.
- La sincronización se realiza automáticamente en cuanto vuelve la conexión.

## 6. Reglas de negocio

**Registro de personas**

- Si existe conexión a Internet, el sistema consulta si la persona ya está registrada por documento. Si no existe, crea el registro; si existe, actualiza la información disponible. En ambos casos, el registro queda `SINCRONIZADO` inmediatamente.
- Si no existe conexión a Internet, el registro se almacena en la base de datos local con estado `PENDIENTE`.

**Actualización de información**

- Si una persona registrada localmente vuelve a registrarse antes de sincronizarse, el sistema actualiza el registro local existente en lugar de crear uno nuevo.
- Si una persona registrada en la plataforma vuelve a registrarse con información diferente, el sistema actualiza únicamente los datos modificados.

**Sincronización**

- La sincronización se ejecuta automáticamente cuando el dispositivo recupera la conexión a Internet, o al iniciar sesión si existen registros pendientes.
- Durante la sincronización, el sistema verifica, para cada registro, si la persona ya existe en la plataforma (por documento). Si no existe, crea el registro; si existe, actualiza únicamente la información modificada.
- Al finalizar el proceso, el estado de los registros cambia de `PENDIENTE` a `SINCRONIZADO` (o a `ERROR` si la sincronización de ese registro en particular falló).

**Notificaciones**

- El sistema informa al usuario sobre el resultado de cada operación importante: registros exitosos, actualizaciones, sincronizaciones, duplicados detectados y errores de sincronización.

### 6.1 Detalle de casos (condición → acción → notificación → historial)

| # | Caso | Condiciones | Acción | Estado resultante | Notificación | Evento en historial |
|---|---|---|---|---|---|---|
| 1 | Registro online — persona nueva | Hay Internet; el documento no existe en la plataforma | Crear en la BD central; guardar copia local | `SINCRONIZADO` | *"Persona registrada correctamente."* | Registro local → *"Laura Vargas fue registrada correctamente en la plataforma."* |
| 2 | Registro online — persona existente | Hay Internet; el documento ya existe | Actualizar solo lo modificado; no crear duplicado | `SINCRONIZADO` | *"La persona ya se encontraba registrada. La información fue actualizada correctamente."* | Actualización → *"Laura Vargas ya se encontraba registrada en la plataforma. La información fue actualizada correctamente."* |
| 3 | Registro offline — persona nueva | No hay Internet | Guardar en SQLite | `PENDIENTE` | *"Persona registrada correctamente. Se sincronizará automáticamente cuando haya conexión."* | Registro local → *"Laura Vargas fue registrada en la base de datos local."* |
| 4 | Registro offline — ya existe localmente | No hay Internet; el documento ya existe en SQLite | Actualizar el registro local existente; no duplicar | `PENDIENTE` | *"La información de la persona fue actualizada localmente."* | Actualización → *"Laura Vargas ya se encontraba registrada en la base de datos local. La información fue actualizada."* |
| 5 | Sincronización — registro nuevo | Regresa Internet; el documento no existe en la plataforma | Crear en la BD central | `SINCRONIZADO` | *"Persona sincronizada correctamente."* | Sincronización → *"Laura Vargas fue sincronizada correctamente con la plataforma."* |
| 6 | Sincronización — registro existente | Regresa Internet; el documento ya existe en la plataforma | Actualizar solo lo modificado | `SINCRONIZADO` | *"Información sincronizada correctamente."* | Sincronización → *"Laura Vargas ya se encontraba registrada en la plataforma. Durante la sincronización se actualizaron sus datos."* |
| 7 | Error de sincronización | No fue posible comunicarse con la plataforma | Mantener el registro para reintento automático | `ERROR` | *"No fue posible sincronizar algunos registros. El sistema lo intentará nuevamente."* | Error de sincronización → *"No fue posible sincronizar la información de Laura Vargas. El sistema reintentará automáticamente cuando exista conexión."* |
| 8 | Actualización online | Hay Internet | Actualizar la plataforma y SQLite | `SINCRONIZADO` | *"Información actualizada correctamente."* | Actualización → *"La información de Laura Vargas fue actualizada correctamente en la plataforma."* |
| 9 | Actualización offline | No hay Internet | Actualizar solo SQLite | `PENDIENTE` | *"Información actualizada localmente."* | Actualización → *"La información de Laura Vargas fue actualizada en la base de datos local."* |

## 7. Sincronización automática

La sincronización es completamente automática y **no depende de que el usuario presione ningún botón**. El proceso se dispara ante cualquiera de estos eventos:

| Evento | Disparador |
|---|---|
| 1. Conexión restablecida | Sin Internet → Internet disponible → Iniciar sincronización automática |
| 2. Inicio de sesión con pendientes | Inicio de sesión → Verificar pendientes → Sincronizar automáticamente |
| 3. Vuelta a primer plano | Aplicación abierta nuevamente → Verificar conexión → Sincronizar |
| 4. Sincronización manual (opcional) | Botón *"Sincronizar ahora"* — solo fuerza el mismo proceso, no es la única vía |

## 8. Flujo de sincronización

```
Detecta conexión
      │
      ▼
Buscar registros pendientes (estado PENDIENTE o ERROR)
      │
      ▼
Para cada registro:
      │
      ▼
Consultar por documento en la plataforma
      │
      ├── ¿Existe? NO ──► Crear registro ──► Estado = SINCRONIZADO
      │
      └── ¿Existe? SÍ ──► Actualizar datos ──► Estado = SINCRONIZADO
                                  │
                                  ▼
                    Registrar evento en historial
                                  │
                                  ▼
                        Mostrar notificación
```

Si la comunicación con la plataforma falla en cualquier punto, el registro permanece o pasa a estado `ERROR`, se deja para reintento automático, y se registra el evento correspondiente en el historial (Regla 7).

## 9. Sistema de notificaciones

Las notificaciones son mensajes **temporales**, mostrados al usuario inmediatamente después de una operación. No quedan almacenadas — para eso existe el historial.

| Evento | Mensaje |
|---|---|
| Registro online exitoso | Persona registrada correctamente. |
| Registro offline exitoso | Persona registrada correctamente. Se sincronizará automáticamente cuando haya conexión. |
| Persona ya existía (online) | La persona ya se encontraba registrada. La información fue actualizada correctamente. |
| Persona ya existía (local) | La información de la persona fue actualizada localmente. |
| Sincronización exitosa | Persona sincronizada correctamente. |
| Sincronización con actualización | Información sincronizada correctamente. |
| Error de sincronización | No fue posible sincronizar algunos registros. El sistema lo intentará nuevamente. |
| Conexión restablecida | Conexión restablecida. Iniciando sincronización automática. |
| Error inesperado | Ocurrió un error. Intente nuevamente. |

## 10. Historial del sistema

El historial registra **permanentemente** todos los eventos relevantes relacionados con el registro y la sincronización de personas. Cada fila del historial responde a la pregunta *"¿qué pasó?"*, nunca *"¿en qué estado quedó?"* (eso ya lo dice el campo `estado` del registro, no el historial).

Cada evento almacena:

- Fecha y hora.
- Persona involucrada.
- Documento.
- Tipo de evento.
- Resultado.
- Descripción.

### 10.1 Estructura de ejemplo

| Fecha | Persona | Documento | Evento | Resultado | Descripción |
|---|---|---|---|---|---|
| 08/07/2026 10:20 | Laura Vargas | 1002456789 | Registro local | Pendiente | Laura Vargas fue registrada en la base de datos local. |
| 08/07/2026 10:50 | Laura Vargas | 1002456789 | Sincronización | Exitosa | Laura Vargas fue sincronizada correctamente con la plataforma. |
| 08/07/2026 11:20 | Laura Vargas | 1002456789 | Actualización | Exitosa | Laura Vargas ya se encontraba registrada en la plataforma. La información fue actualizada. |
| 08/07/2026 12:05 | Laura Vargas | 1002456789 | Error de sincronización | Error | No fue posible sincronizar la información. El sistema reintentará automáticamente. |

### 10.2 Acciones que NO se registran en el historial

Para mantener un historial útil, enfocado y no ruidoso, **no** se almacenan eventos como:

- Inicio de sesión.
- Cierre de sesión.
- Cambio de pantallas.
- Consultas de información.
- Búsquedas.
- Navegación dentro de la aplicación.

El historial está reservado exclusivamente para eventos que **modifican o sincronizan información**.

## 11. Principios del sistema

| Principio | Descripción |
|---|---|
| Continuidad operativa | La aplicación nunca deja de funcionar por falta de conexión a Internet. |
| No duplicidad | El documento de identidad garantiza que una persona no sea registrada dos veces. |
| Sincronización automática | El usuario no necesita intervenir para mantener la información actualizada. |
| Consistencia de datos | Los cambios realizados offline y online convergen en un único registro. |
| Trazabilidad | Todas las operaciones relevantes quedan registradas en el historial. |
| Retroalimentación al usuario | Cada acción importante genera una notificación clara sobre el resultado del proceso. |

## 12. Resumen de piezas nuevas a implementar

A partir de este análisis, el sistema necesita tres piezas nuevas respecto a lo que ya existe:

1. **Campo `estado`** en el registro de persona, con los tres valores posibles (`PENDIENTE`, `SINCRONIZADO`, `ERROR`), calculado/actualizado en cada uno de los 9 casos de la sección 6.1 — puede unificarse con el campo `sync_status` ya existente en el diseño actual, que cumple un rol equivalente.
2. **Sistema de notificaciones**: mensajes momentáneos según la tabla de la sección 9, disparados en el mismo punto del código donde hoy se resuelve cada caso (creación, actualización, sincronización, error).
3. **Historial de eventos**: una nueva tabla/colección (local y central) con la estructura de la sección 10 — independiente del estado, que se escribe una vez por evento y nunca se sobrescribe, filtrada para excluir las acciones de la sección 10.2.

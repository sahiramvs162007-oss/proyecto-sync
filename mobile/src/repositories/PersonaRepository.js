import 'react-native-get-random-values'; // requerido por uuid en RN, importar antes de 'uuid'
import { v4 as uuidv4 } from 'uuid';
import LocalDataSource from '../datasources/LocalDataSource';

/**
 * El resto de la app (screens, services) SIEMPRE habla con este repositorio,
 * nunca directo con LocalDataSource/RemoteDataSource. Esto es lo que
 * permite que la UI funcione igual con o sin internet.
 */
const PersonaRepository = {
  /**
   * Punto de entrada único para registrar una persona, sin importar si el
   * dispositivo es celular, tablet o navegador, y sin importar si hay
   * internet o no. La cédula (documento) es la identidad real: si ya existe,
   * se actualiza ese registro (conservando su uuid interno) en vez de crear
   * uno nuevo.
   *
   * Devuelve { persona, esNuevo } para que la pantalla pueda mostrar
   * "Persona registrada" o "Persona ya existía, datos actualizados".
   */
  async guardarPersona({ documento, nombre, telefono, email, direccion }) {
    const existente = await LocalDataSource.getPersonaByDocumento(documento);

    if (existente) {
      const actualizada = await this.actualizarPersona(existente.uuid, {
        nombre, telefono, email, direccion
      });
      return { persona: actualizada, esNuevo: false };
    }

    const now = new Date().toISOString();
    const finalUuid = uuidv4();

    const persona = {
      uuid: finalUuid,
      documento,
      nombre,
      telefono,
      email,
      direccion,
      version: 1,
      created_at: now,
      updated_at: now,
      deleted: 0,
      sync_status: 'PENDING'
    };

    await LocalDataSource.upsertPersona(persona);

    await LocalDataSource.enqueueOperation({
      entity: 'personas',
      entity_uuid: finalUuid,
      action: 'INSERT',
      payload: { ...persona, client_updated_at: now }
    });

    return { persona, esNuevo: true };
  },

  async actualizarPersona(uuid, cambios) {
    const existente = await LocalDataSource.getPersonaByUuid(uuid);
    if (!existente) throw new Error('Persona no encontrada localmente');

    // Si se está cambiando el documento, verificar que no choque con otra persona
    if (cambios.documento && cambios.documento !== existente.documento) {
      const otra = await LocalDataSource.getPersonaByDocumento(cambios.documento);
      if (otra && otra.uuid !== uuid) {
        throw new Error('Ya existe otra persona registrada con ese documento');
      }
    }

    const now = new Date().toISOString();
    const persona = {
      ...existente,
      ...cambios,
      version: (existente.version || 1) + 1,
      updated_at: now,
      sync_status: 'PENDING'
    };

    await LocalDataSource.upsertPersona(persona);
    await LocalDataSource.enqueueOperation({
      entity: 'personas',
      entity_uuid: uuid,
      action: 'UPDATE',
      payload: { ...persona, client_updated_at: now }
    });

    return persona;
  },

  async eliminarPersona(uuid) {
    const now = new Date().toISOString();
    await LocalDataSource.softDeletePersona(uuid, now);
    await LocalDataSource.enqueueOperation({
      entity: 'personas',
      entity_uuid: uuid,
      action: 'DELETE',
      payload: { uuid, client_updated_at: now }
    });
  },

  async obtenerPersonas() {
    return LocalDataSource.getAllPersonas();
  },

  async obtenerPorUuid(uuid) {
    return LocalDataSource.getPersonaByUuid(uuid);
  },

  // Usado por SyncService al aplicar cambios descargados del servidor
  async aplicarCambioRemoto(personaServidor) {
    // Si ya existe otra persona con el mismo documento pero distinto UUID local,
    // debemos reconciliar (eliminar la local y conservar la del servidor)
    // para no duplicar en pantalla.
    if (personaServidor.documento) {
      const existente = await LocalDataSource.getPersonaByDocumento(personaServidor.documento);
      if (existente && existente.uuid !== personaServidor.uuid) {
        await this.reconciliarUuidLocal(existente.uuid, personaServidor);
        return;
      }
    }

    await LocalDataSource.upsertPersona({
      ...personaServidor,
      sync_status: 'SYNCED'
    });
  },

  /**
   * El servidor detectó que la cédula (documento) ya existía con otro uuid
   * "canónico" (por ejemplo: la persona se creó offline en dos dispositivos
   * distintos con la misma cédula). Se elimina la fila local vieja y se
   * guarda la versión canónica, para no terminar con dos registros de la
   * misma persona en este dispositivo.
   */
  async reconciliarUuidLocal(uuidLocalAntiguo, personaCanonica) {
    await LocalDataSource.upsertPersona({ ...personaCanonica, sync_status: 'SYNCED' });
    if (uuidLocalAntiguo !== personaCanonica.uuid) {
      await LocalDataSource.deletePersonaLocal(uuidLocalAntiguo);
    }
  }
};

export default PersonaRepository;

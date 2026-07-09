import PersonaRepository from '../repositories/PersonaRepository';
import SyncService from './SyncService';
import NetworkService from './NetworkService';
import RemoteDataSource from '../datasources/RemoteDataSource';
import HistorialRepository from '../repositories/HistorialRepository';

function validar(datos) {
  const errores = [];
  if (datos.documento) datos.documento = String(datos.documento).trim();
  if (datos.nombre) datos.nombre = String(datos.nombre).trim();
  
  if (!datos.documento) errores.push('El documento es obligatorio');
  if (!datos.nombre) errores.push('El nombre es obligatorio');
  return errores;
}

const PersonaService = {
  async registrar(datos, showNotification) {
    const errores = validar(datos);
    if (errores.length) throw new Error(errores.join(' / '));

    let isOnline = false;
    try {
      isOnline = await NetworkService.isOnline();
    } catch (e) {
      console.warn("Error verificando conexión:", e);
    }

    if (isOnline) {
      try {
        const respuesta = await RemoteDataSource.registrarPersona(datos);
        await PersonaRepository.guardarPersonaSincronizada(respuesta.persona);
        
        const { persona, isNew } = respuesta;
        const nombre = persona.nombre || datos.nombre;
        
        if (isNew) {
          if (showNotification) showNotification('Persona registrada correctamente.', 'success');
          await HistorialRepository.logEvento({
            persona: nombre,
            documento: datos.documento,
            evento: 'Registro local',
            resultado: 'Exitosa',
            descripcion: `${nombre} fue registrada correctamente en la plataforma.`
          });
        } else {
          if (showNotification) showNotification('La persona ya se encontraba registrada. La información fue actualizada correctamente.', 'info');
          await HistorialRepository.logEvento({
            persona: nombre,
            documento: datos.documento,
            evento: 'Actualización',
            resultado: 'Exitosa',
            descripcion: `${nombre} ya se encontraba registrada en la plataforma. La información fue actualizada correctamente.`
          });
        }
        return { persona, esNuevo: isNew };
      } catch (error) {
        console.warn("Fallo el registro online, cayendo al flujo offline:", error.message);
      }
    }

    // Flujo Offline
    const result = await PersonaRepository.guardarPersona(datos);
    const { persona, esNuevo } = result;
    const nombre = persona.nombre || datos.nombre;

    if (esNuevo) {
      if (showNotification) showNotification('Persona registrada correctamente. Se sincronizará automáticamente cuando haya conexión.', 'info');
      await HistorialRepository.logEvento({
        persona: nombre,
        documento: datos.documento,
        evento: 'Registro local',
        resultado: 'Pendiente',
        descripcion: `${nombre} fue registrada en la base de datos local.`
      });
    } else {
      if (showNotification) showNotification('La información de la persona fue actualizada localmente.', 'info');
      await HistorialRepository.logEvento({
        persona: nombre,
        documento: datos.documento,
        evento: 'Actualización',
        resultado: 'Pendiente',
        descripcion: `${nombre} ya se encontraba registrada en la base de datos local. La información fue actualizada.`
      });
    }
    
    // Disparar sincronización en segundo plano inmediatamente si hay conexión (intentarlo de todos modos)
    SyncService.sincronizar(showNotification).catch(console.error);
    
    return result;
  },

  async editar(uuid, cambios) {
    const errores = validar(cambios);
    if (errores.length) throw new Error(errores.join(' / '));
    const result = await PersonaRepository.actualizarPersona(uuid, cambios);
    
    SyncService.sincronizar().catch(console.error);
    
    return result;
  },

  async eliminar(uuid) {
    const result = await PersonaRepository.eliminarPersona(uuid);
    SyncService.sincronizar().catch(console.error);
    return result;
  },

  async listar() {
    return PersonaRepository.obtenerPersonas();
  },

  async obtener(uuid) {
    return PersonaRepository.obtenerPorUuid(uuid);
  }
};

export default PersonaService;

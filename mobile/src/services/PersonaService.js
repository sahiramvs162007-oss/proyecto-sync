import PersonaRepository from '../repositories/PersonaRepository';
import SyncService from './SyncService';

function validar(datos) {
  const errores = [];
  if (datos.documento) datos.documento = String(datos.documento).trim();
  if (datos.nombre) datos.nombre = String(datos.nombre).trim();
  
  if (!datos.documento) errores.push('El documento es obligatorio');
  if (!datos.nombre) errores.push('El nombre es obligatorio');
  return errores;
}

const PersonaService = {
  async registrar(datos) {
    const errores = validar(datos);
    if (errores.length) throw new Error(errores.join(' / '));
    const result = await PersonaRepository.guardarPersona(datos);
    
    // Disparar sincronización en segundo plano inmediatamente si hay conexión
    SyncService.sincronizar().catch(console.error);
    
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

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';
import LocalDataSource from '../datasources/LocalDataSource';

const HistorialRepository = {
  async logEvento({ persona, documento, evento, resultado, descripcion }) {
    const db = await getDb();
    const now = new Date().toISOString();
    const finalUuid = uuidv4();
    
    await db.runAsync(
      `INSERT INTO historial (uuid, fecha, persona, documento, evento, resultado, descripcion, sync_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [finalUuid, now, persona, documento, evento, resultado, descripcion, 'PENDING']
    );

    // Encolar para sincronizar al backend
    await LocalDataSource.enqueueOperation({
      entity: 'historial',
      entity_uuid: finalUuid,
      action: 'INSERT',
      payload: { 
        uuid: finalUuid, 
        fecha: now, 
        persona, 
        documento, 
        evento, 
        resultado, 
        descripcion 
      }
    });
  },

  async obtenerHistorial() {
    const db = await getDb();
    return db.getAllAsync(`SELECT * FROM historial ORDER BY fecha DESC`);
  },

  async aplicarCambioRemoto(eventoServidor) {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO historial (uuid, fecha, persona, documento, evento, resultado, descripcion, sync_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventoServidor.uuid, 
        eventoServidor.fecha || new Date().toISOString(), 
        eventoServidor.persona, 
        eventoServidor.documento, 
        eventoServidor.evento, 
        eventoServidor.resultado, 
        eventoServidor.descripcion, 
        'SYNCED'
      ]
    );
  }
};

export default HistorialRepository;

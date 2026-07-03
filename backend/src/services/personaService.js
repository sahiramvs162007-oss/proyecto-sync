const { v4: uuidv4, validate: isUuid } = require('uuid');
const personaRepository = require('../repositories/personaRepository');
const syncRepository = require('../repositories/syncRepository');

function validatePersona(data) {
  if (data.documento) data.documento = String(data.documento).trim();
  if (data.nombre) data.nombre = String(data.nombre).trim();

  if (!data.documento) {
    const err = new Error('El documento es obligatorio');
    err.status = 400;
    throw err;
  }
  if (!data.nombre) {
    const err = new Error('El nombre es obligatorio');
    err.status = 400;
    throw err;
  }
}

const personaService = {
  async list() {
    return personaRepository.findAll();
  },

  async getByUuid(uuid) {
    const persona = await personaRepository.findByUuid(uuid);
    if (!persona || persona.deleted) {
      const err = new Error('Persona no encontrada');
      err.status = 404;
      throw err;
    }
    return persona;
  },

  // Registro creado directamente ONLINE (no viene de la cola de sync de la tablet)
  async create(data, device_id) {
    validatePersona(data);
    
    if (data.documento) {
      const duplicate = await personaRepository.findByDocumento(data.documento);
      if (duplicate) {
        return this.update(duplicate.uuid, data, device_id);
      }
    }

    const uuid = data.uuid && isUuid(data.uuid) ? data.uuid : uuidv4();

    const existing = await personaRepository.findByUuid(uuid);
    if (existing) {
      const err = new Error('Ya existe una persona con ese UUID');
      err.status = 409;
      throw err;
    }

    const persona = await personaRepository.create({ ...data, uuid, device_id });
    await syncRepository.logOperation({
      entity: 'personas',
      entity_uuid: uuid,
      action: 'INSERT',
      payload: persona,
      device_id
    });
    return persona;
  },

  async update(uuid, data, device_id) {
    validatePersona(data);
    const existing = await this.getByUuid(uuid);

    if (data.documento && data.documento !== existing.documento) {
      const duplicate = await personaRepository.findByDocumento(data.documento);
      if (duplicate && duplicate.uuid !== uuid) {
        const err = new Error('Ya existe otra persona registrada con ese documento');
        err.status = 409;
        throw err;
      }
    }

    const persona = await personaRepository.update(existing.uuid, { ...data, device_id });
    await syncRepository.logOperation({
      entity: 'personas',
      entity_uuid: uuid,
      action: 'UPDATE',
      payload: persona,
      device_id
    });
    return persona;
  },

  async remove(uuid, device_id) {
    await this.getByUuid(uuid);
    const persona = await personaRepository.softDelete(uuid, device_id);
    await syncRepository.logOperation({
      entity: 'personas',
      entity_uuid: uuid,
      action: 'DELETE',
      payload: { uuid },
      device_id
    });
    return persona;
  }
};

module.exports = personaService;

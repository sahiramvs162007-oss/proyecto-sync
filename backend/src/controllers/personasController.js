const personaService = require('../services/personaService');

function getDeviceId(req) {
  return req.headers['x-device-id'] || 'server-web';
}

const personasController = {
  async list(req, res) {
    try {
      const personas = await personaService.list();
      res.json(personas);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async getOne(req, res) {
    try {
      const persona = await personaService.getByUuid(req.params.uuid);
      res.json(persona);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async create(req, res) {
    try {
      const result = await personaService.create(req.body, getDeviceId(req));
      if (result.isNew) {
        res.status(201).json(result);
      } else {
        res.status(200).json(result);
      }
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async update(req, res) {
    try {
      const persona = await personaService.update(req.params.uuid, req.body, getDeviceId(req));
      res.json(persona);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async remove(req, res) {
    try {
      const persona = await personaService.remove(req.params.uuid, getDeviceId(req));
      res.json(persona);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
};

module.exports = personasController;

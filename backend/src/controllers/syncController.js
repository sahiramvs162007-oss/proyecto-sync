const syncService = require('../services/syncService');

const syncController = {
  // POST /sync/upload  { device_id, operations: [...], strategy? }
  async upload(req, res) {
    try {
      const { device_id, operations, strategy } = req.body;
      const results = await syncService.processUpload({ device_id, operations, strategy });
      res.json({ results });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  // GET /sync/download?device_id=xxx
  async download(req, res) {
    try {
      const { device_id } = req.query;
      const data = await syncService.processDownload(device_id);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  // POST /sync/confirm  { device_id, syncedAt }
  async confirm(req, res) {
    try {
      const { device_id, syncedAt } = req.body;
      const state = await syncService.confirmSync({ device_id, syncedAt });
      res.json(state);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
};

module.exports = syncController;

const authService = require('../services/authService');

const authController = {
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },

  async logout(req, res) {
    // Con JWT stateless no hay sesión que destruir en servidor;
    // el cliente simplemente descarta los tokens almacenados.
    res.json({ message: 'Sesión cerrada' });
  }
};

module.exports = authController;

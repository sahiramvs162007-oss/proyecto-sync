const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const usuarioRepository = require('../repositories/usuarioRepository');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const authService = {
  async register({ nombre, email, password, rol }) {
    const existing = await usuarioRepository.findByEmail(email);
    if (existing) {
      const err = new Error('El email ya está registrado');
      err.status = 409;
      throw err;
    }
    const password_hash = await bcrypt.hash(password, 10);
    const usuario = await usuarioRepository.create({
      uuid: uuidv4(),
      nombre,
      email,
      password_hash,
      rol
    });
    return this._buildAuthResponse(usuario);
  },

  async login({ email, password }) {
    const usuario = await usuarioRepository.findByEmail(email);
    if (!usuario) {
      const err = new Error('Credenciales inválidas');
      err.status = 401;
      throw err;
    }
    const valid = await bcrypt.compare(password, usuario.password_hash);
    if (!valid) {
      const err = new Error('Credenciales inválidas');
      err.status = 401;
      throw err;
    }
    return this._buildAuthResponse(usuario);
  },

  async refresh(refreshToken) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      const e = new Error('Refresh token inválido o expirado');
      e.status = 401;
      throw e;
    }
    const usuario = await usuarioRepository.findById(decoded.id);
    if (!usuario) {
      const e = new Error('Usuario no encontrado');
      e.status = 404;
      throw e;
    }
    return this._buildAuthResponse(usuario);
  },

  _buildAuthResponse(usuario) {
    const payload = { id: usuario.id, uuid: usuario.uuid, email: usuario.email, rol: usuario.rol };
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      usuario: payload
    };
  }
};

module.exports = authService;

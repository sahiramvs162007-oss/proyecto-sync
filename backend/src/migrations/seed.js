/**
 * Crea el usuario administrador inicial.
 * Uso: npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');

(async () => {
  const email = 'admin@sync-app.com';
  const password = 'Admin123!';

  try {
    const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('ℹ️  El usuario admin ya existe, no se crea de nuevo');
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO usuarios (uuid, nombre, email, password_hash, rol) VALUES (?, ?, ?, ?, 'admin')`,
      [uuidv4(), 'Administrador', email, password_hash]
    );

    console.log('✅ Usuario admin creado');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creando el seed:', err.message);
    process.exit(1);
  }
})();

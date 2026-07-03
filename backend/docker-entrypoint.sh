#!/bin/sh
set -e

echo "⏳ Esperando a que MySQL acepte conexiones..."
until node -e "
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
}).then(c => c.end()).catch(() => process.exit(1));
"; do
  sleep 2
done

echo "✅ MySQL disponible"

echo "📦 Ejecutando migración..."
npm run migrate

echo "🌱 Ejecutando seed..."
npm run seed

echo "🚀 Levantando servidor..."
exec npm start

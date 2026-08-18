/**
 * ============================================================
 * LIMPIEZA DE DUPLICADOS POR DOCUMENTO (cédula)
 * ============================================================
 * Uso:  npm run cleanup:duplicates            (modo simulación, no escribe nada)
 *       npm run cleanup:duplicates -- --apply (aplica los cambios de verdad)
 *
 * Qué hace:
 * 1. Crea una tabla de respaldo `personas_backup_pre_dedup` con una copia
 *    exacta de `personas` ANTES de tocar nada (por si hay que revertir).
 * 2. Agrupa las personas activas (deleted = 0) por documento normalizado
 *    (TRIM, por si hay espacios que hacen que "123" y "123 " parezcan
 *    documentos distintos y en realidad no lo son).
 * 3. Para cada grupo con más de un registro:
 *      - Elige un registro "canónico" (el de updated_at más reciente).
 *      - Completa en el canónico los campos que tenga vacíos (nombre,
 *        telefono, email, direccion) tomando el valor más reciente
 *        disponible entre los duplicados que sí lo tengan.
 *      - Marca los demás registros del grupo como deleted = 1 (soft delete),
 *        NUNCA se borran físicamente, para no romper referencias de
 *        sync_log ni "revivir" el registro si algún dispositivo todavía
 *        no sincronizó ese borrado.
 * 4. Imprime un reporte de todo lo que hizo (o haría, en modo simulación).
 *
 * Por qué "canónico = más reciente" y no "el primero creado":
 * asumimos que la versión más reciente refleja mejor la realidad actual
 * de la persona. Si tu caso de negocio requiere lo contrario (conservar
 * el primer registro, por ejemplo por ID legal), ajusta la función
 * elegirCanonico() más abajo.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const APLICAR = process.argv.includes('--apply');

function elegirCanonico(grupo) {
  // El más reciente por updated_at gana; en empate, el de mayor `version`;
  // en empate absoluto, el de menor `id` (el más antiguo registrado).
  return [...grupo].sort((a, b) => {
    const t = new Date(b.updated_at) - new Date(a.updated_at);
    if (t !== 0) return t;
    if (b.version !== a.version) return b.version - a.version;
    return a.id - b.id;
  })[0];
}

function combinarCampos(canonico, grupo) {
  const campos = ['nombre', 'telefono', 'email', 'direccion'];
  const combinado = { ...canonico };
  const otros = grupo
    .filter((p) => p.id !== canonico.id)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  for (const campo of campos) {
    if (!combinado[campo] || String(combinado[campo]).trim() === '') {
      const conValor = otros.find((p) => p[campo] && String(p[campo]).trim() !== '');
      if (conValor) combinado[campo] = conValor[campo];
    }
  }
  return combinado;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sync_app',
    dateStrings: true
  });

  console.log(APLICAR ? '⚠️  MODO APLICAR: se van a modificar datos reales.' : 'ℹ️  MODO SIMULACIÓN: no se modifica nada, solo se reporta.');

  try {
    // 1. Backup de seguridad (solo si vamos a aplicar cambios de verdad)
    if (APLICAR) {
      await connection.query('DROP TABLE IF EXISTS personas_backup_pre_dedup');
      await connection.query('CREATE TABLE personas_backup_pre_dedup AS SELECT * FROM personas');
      console.log('✅ Backup creado en la tabla personas_backup_pre_dedup');
    }

    // 2. Agrupar por documento normalizado (TRIM) entre las personas activas
    const [rows] = await connection.query(
      `SELECT * FROM personas WHERE deleted = 0 ORDER BY documento`
    );

    const grupos = new Map();
    for (const persona of rows) {
      const clave = String(persona.documento).trim();
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave).push(persona);
    }

    const duplicados = [...grupos.entries()].filter(([, personas]) => personas.length > 1);

    if (duplicados.length === 0) {
      console.log('✅ No se encontraron documentos duplicados. No hay nada que limpiar.');
      return;
    }

    console.log(`🔎 Se encontraron ${duplicados.length} documentos con registros duplicados:\n`);

    let totalFusionados = 0;

    for (const [documento, grupo] of duplicados) {
      const canonico = elegirCanonico(grupo);
      const combinado = combinarCampos(canonico, grupo);
      const perdedores = grupo.filter((p) => p.id !== canonico.id);

      console.log(`── Documento "${documento}" (${grupo.length} registros) ──────────────`);
      console.log(`   Canónico: uuid=${canonico.uuid}  id=${canonico.id}  actualizado=${canonico.updated_at}`);
      for (const p of perdedores) {
        console.log(`   Se marca como eliminado: uuid=${p.uuid}  id=${p.id}  actualizado=${p.updated_at}`);
      }

      if (APLICAR) {
        await connection.query(
          `UPDATE personas SET nombre = ?, telefono = ?, email = ?, direccion = ?, version = version + 1
           WHERE uuid = ?`,
          [combinado.nombre, combinado.telefono, combinado.email, combinado.direccion, canonico.uuid]
        );

        const uuidsPerdedores = perdedores.map((p) => p.uuid);
        if (uuidsPerdedores.length > 0) {
          await connection.query(
            `UPDATE personas SET deleted = 1, version = version + 1 WHERE uuid IN (?)`,
            [uuidsPerdedores]
          );
        }
      }

      totalFusionados += perdedores.length;
      console.log('');
    }

    console.log(`📊 Resumen: ${duplicados.length} documentos afectados, ${totalFusionados} registros ${APLICAR ? 'eliminados (soft delete)' : 'que se eliminarían'}.`);

    if (!APLICAR) {
      console.log('\nEsto fue una simulación. Para aplicar los cambios de verdad, corre:');
      console.log('  npm run cleanup:duplicates -- --apply');
    } else {
      console.log('\n✅ Limpieza aplicada. Siguiente paso: correr "npm run migrate" para aplicar el UNIQUE en documento.');
    }
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ Error durante la limpieza:', err.message);
  process.exitCode = 1;
});

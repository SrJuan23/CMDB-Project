const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  max: 1
});

const CUENTAS = [
  { email: 'admin@hiberus.com', password: 'Admin123!*', rol: 'ADMIN', asignado: true },
  { email: 'gestor@hiberus.com', password: 'Gestor123!*', rol: 'GESTOR', asignado: true },
  { email: 'consulta@hiberus.com', password: 'Consulta123!*', rol: 'CONSULTA', asignado: false }
];

(async () => {
  for (const c of CUENTAS) {
    const r = await pool.query(
      `UPDATE usuarios
       SET password_hash = $1,
           puede_iniciar_sesion = TRUE,
           password_change_required = FALSE,
           estado = 'ACTIVO',
           rol = $2,
           puede_ser_asignado = $3
       WHERE email = $4
       RETURNING id, nombre, email, rol`,
      [bcrypt.hashSync(c.password, 10), c.rol, c.asignado, c.email]
    );
    if (r.rows[0]) {
      console.log(`OK  ${c.email.padEnd(26)} rol=${r.rows[0].rol.padEnd(8)} login=TRUE  (${r.rows[0].nombre})`);
    } else {
      console.log(`NO ENCONTRADO: ${c.email}`);
    }
  }
  await pool.end();
})();
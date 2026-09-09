import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { db, initDatabase } from './database';
import { parseExcelBuffer, commitExcelImport } from '../services/excelService';

export async function runSeed() {
  console.log('--- Initializing TTECH CMDB Database ---');
  initDatabase();

  // 1. Seed Users
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM usuarios').get() as { count: number }).count;
  if (userCount === 0) {
    console.log('Seeding default users...');
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('Admin123!*', salt);
    const gestorHash = bcrypt.hashSync('Gestor123!*', salt);
    const consultaHash = bcrypt.hashSync('Consulta123!*', salt);

    const insertUser = db.prepare(`
      INSERT INTO usuarios (nombre, email, password_hash, rol, estado)
      VALUES (?, ?, ?, ?, 'ACTIVO')
    `);

    insertUser.run('Administrador General', 'admin@ttech.com', adminHash, 'ADMIN');
    insertUser.run('Juan Cadavid (Gestor)', 'gestor@ttech.com', gestorHash, 'GESTOR');
    insertUser.run('Auditor Consulta', 'consulta@ttech.com', consultaHash, 'CONSULTA');
    console.log('Users created: admin@ttech.com, gestor@ttech.com, consulta@ttech.com');
  }

  // 2. Check if assets already exist
  const assetCount = (db.prepare('SELECT COUNT(*) as count FROM activos').get() as { count: number }).count;
  if (assetCount > 0) {
    console.log(`Database already has ${assetCount} assets. Skipping asset seeding.`);
    return;
  }

  // 3. Try to load from CMDB_Soporte.xlsx
  const possiblePaths = [
    path.resolve(__dirname, '../../../data/CMDB_Soporte.xlsx'),
    path.resolve(__dirname, '../../data/CMDB_Soporte.xlsx'),
    path.resolve(__dirname, '../data/CMDB_Soporte.xlsx'),
    path.resolve('data/CMDB_Soporte.xlsx')
  ];

  let loadedFromExcel = false;
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      console.log(`Found Excel file at: ${filePath}. Importing initial assets...`);
      const fileBuffer = fs.readFileSync(filePath);
      const preview = parseExcelBuffer(fileBuffer);
      console.log(`Excel parsed: ${preview.total_encontrados} rows (${preview.activos_hoja} activos, ${preview.inactivos_hoja} inactivos)`);
      const result = commitExcelImport(preview.detalles, 'Seed Inicial Automático');
      console.log(`Import result: ${result.importados} creados, ${result.actualizados} actualizados, ${result.errores.length} errores`);
      loadedFromExcel = true;
      break;
    }
  }

  if (!loadedFromExcel) {
    console.log('Excel file not found, creating sample data matching specification...');
    // Seed Sample Clients
    const clientes = [
      'DU BRANDS SAS', 'DEPARTAMENTO DE CORDOBA', 'SUCAMPO SULLANTA', 'CARRAZOS S A S',
      'INVERSIONES CLINICA DEL META S.A.', 'ALCALDIA DE LEBRIJA', 'ENERGETICOS INTEGRALES LTDA',
      'SUNNY APP SAS', 'COASPHARMA SAS', 'AGUAS DE BUGA S.A. E.S.P.',
      'TERMINAL METROPOLITANA DE TRANSPORTES DE BARRANQUILLA', 'BANCO BOGOTA'
    ];
    const insertCliente = db.prepare('INSERT INTO clientes (nombre, estado) VALUES (?, "ACTIVO")');
    for (const c of clientes) insertCliente.run(c);

    // Seed Platforms
    const plataformas = ['FortiEDR Cloud', 'FortiMail Cloud', 'DWDM FIBERNET', 'Palo Alto Panorama', 'Cisco DNA'];
    const insertPlataforma = db.prepare('INSERT INTO plataformas (nombre, estado) VALUES (?, "ACTIVO")');
    for (const p of plataformas) insertPlataforma.run(p);

    // Seed Leaders and Admins
    const lideres = ['Harold Carretero', 'Carlos Mendoza', 'Diana Valencia'];
    const insertPersona = db.prepare('INSERT INTO personas (nombre, tipo, estado) VALUES (?, ?, "ACTIVO")');
    for (const l of lideres) insertPersona.run(l, 'LIDER');

    const admins = ['Juan Cadavid', 'Diego Gomez Herrera', 'William Parra', 'Natalia Ruiz'];
    for (const a of admins) insertPersona.run(a, 'ADMINISTRADOR');

    // Create sample assets
    const insertActivo = db.prepare(`
      INSERT INTO activos (
        codigo, cliente_id, hostname, serial_number, plataforma_id, ip_url_gestion,
        lider_id, cogestion, inicio_gestion, fin_gestion, correo_soporte, soporte_n1, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertActivo.run('ACT-000001', 1, 'FortiEDR MSSP', 'FEDRPOTA25000025', 1, 'https://telefonicacolombia.fortiedr.com/login?logout', 1, 'NO', '2024-04-24', '2026-04-23', 'te_soporte_seguridad@telefonica.com', 'NO', 'ACTIVO');
    insertActivo.run('ACT-000002', 9, 'FortiMail MSSP', 'FEVMSPM000237464', 2, 'https://www.fortimailcloud.com/user/', 1, 'NO', '2024-07-25', '2025-07-24', 'soporte.tech@telefonica.com', 'SI', 'INACTIVO');
    insertActivo.run('ACT-000003', 12, 'OSW3-W', '25534', 3, '10.120.45.12', 2, 'SI', '2024-01-15', '2026-09-20', null, 'SI', 'ACTIVO');
    insertActivo.run('ACT-000004', 12, 'UNIDAD ALIMENTACIÓN', '24402', 3, '10.120.45.13', 2, 'SI', '2024-01-15', '2026-09-08', null, 'SI', 'ACTIVO');
    insertActivo.run('ACT-000005', 4, 'UNIDAD DE AIREACIÓN', '22378', 3, 'N/A', 1, 'NO', '2023-11-01', '2026-08-15', null, 'NO', 'ACTIVO');
  }

  // 4. Seed sample related tickets (for section 58 integration readiness)
  const ticketsCount = (db.prepare('SELECT COUNT(*) as count FROM tickets_relacionados').get() as { count: number }).count;
  if (ticketsCount === 0) {
    const assets = db.prepare('SELECT id, codigo FROM activos LIMIT 10').all() as { id: number; codigo: string }[];
    const insertTicket = db.prepare(`
      INSERT INTO tickets_relacionados (activo_id, ticket_codigo, titulo, estado, prioridad)
      VALUES (?, ?, ?, ?, ?)
    `);

    assets.slice(0, 3).forEach((a, idx) => {
      insertTicket.run(a.id, `TCK-${100 + idx * 12}`, 'Mantenimiento preventivo y actualización de firmware', 'RESUELTO', 'MEDIA');
      insertTicket.run(a.id, `TCK-${142 + idx * 7}`, 'Alerta de conectividad y latencia intermitente', 'ABIERTO', 'ALTA');
    });
  }

  const finalTotal = (db.prepare('SELECT COUNT(*) as count FROM activos').get() as { count: number }).count;
  const activosTotal = (db.prepare("SELECT COUNT(*) as count FROM activos WHERE estado = 'ACTIVO'").get() as { count: number }).count;
  const inactivosTotal = (db.prepare("SELECT COUNT(*) as count FROM activos WHERE estado = 'INACTIVO'").get() as { count: number }).count;
  console.log(`--- Seeding Complete: ${finalTotal} total activos (${activosTotal} ACTIVOS, ${inactivosTotal} INACTIVOS) ---`);
}

// Run directly if called as a script
if (require.main === module) {
  runSeed().catch(console.error);
}

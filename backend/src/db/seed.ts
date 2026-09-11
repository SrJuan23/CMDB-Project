import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { getOne, getAll, run, initDatabase } from './database';
import { parseExcelBuffer, commitExcelImport } from '../services/excelService';

export async function runSeed() {
  console.log('--- Initializing TTECH CMDB Database ---');
  initDatabase();

  const userCountRow = await getOne('SELECT COUNT(*) as count FROM usuarios');
  const userCount = userCountRow ? userCountRow.count : 0;
  if (userCount === 0) {
    console.log('Seeding default users...');
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync(process.env.SEED_ADMIN_PASSWORD || 'Admin123!*', salt);
    const gestorHash = bcrypt.hashSync(process.env.SEED_GESTOR_PASSWORD || 'Gestor123!*', salt);
    const consultaHash = bcrypt.hashSync(process.env.SEED_CONSULTA_PASSWORD || 'Consulta123!*', salt);

    await run('INSERT INTO usuarios (nombre, email, password_hash, rol, estado) VALUES (?, ?, ?, ?, ?)', [
      'Administrador General', 'admin@ttech.com', adminHash, 'ADMIN', 'ACTIVO'
    ]);
    await run('INSERT INTO usuarios (nombre, email, password_hash, rol, estado) VALUES (?, ?, ?, ?, ?)', [
      'Juan Cadavid (Gestor)', 'gestor@ttech.com', gestorHash, 'GESTOR', 'ACTIVO'
    ]);
    await run('INSERT INTO usuarios (nombre, email, password_hash, rol, estado) VALUES (?, ?, ?, ?, ?)', [
      'Auditor Consulta', 'consulta@ttech.com', consultaHash, 'CONSULTA', 'ACTIVO'
    ]);
    console.log('Users created: admin@ttech.com, gestor@ttech.com, consulta@ttech.com');
  }

  const assetCountRow = await getOne('SELECT COUNT(*) as count FROM activos');
  const assetCount = assetCountRow ? assetCountRow.count : 0;
  if (assetCount > 0) {
    console.log(`Database already has ${assetCount} assets. Skipping asset seeding.`);
    return;
  }

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
      const preview = await parseExcelBuffer(fileBuffer);
      console.log(`Excel parsed: ${preview.total_encontrados} rows (${preview.activos_hoja} activos, ${preview.inactivos_hoja} inactivos)`);
      const result = await commitExcelImport(preview.detalles, 'Seed Inicial Automático');
      console.log(`Import result: ${result.importados} creados, ${result.actualizados} actualizados, ${result.errores.length} errores`);
      loadedFromExcel = true;
      break;
    }
  }

  if (!loadedFromExcel) {
    console.log('Excel file not found, creating sample data matching specification...');
    const clientes = [
      'DU BRANDS SAS', 'DEPARTAMENTO DE CORDOBA', 'SUCAMPO SULLANTA', 'CARRAZOS S A S',
      'INVERSIONES CLINICA DEL META S.A.', 'ALCALDIA DE LEBRIJA', 'ENERGETICOS INTEGRALES LTDA',
      'SUNNY APP SAS', 'COASPHARMA SAS', 'AGUAS DE BUGA S.A. E.S.P.',
      'TERMINAL METROPOLITANA DE TRANSPORTES DE BARRANQUILLA', 'BANCO BOGOTA'
    ];
    for (const c of clientes) {
      await run('INSERT INTO clientes (nombre, estado) VALUES (?, ?)', [c, 'ACTIVO']);
    }

    const plataformas = ['FortiEDR Cloud', 'FortiMail Cloud', 'DWDM FIBERNET', 'Palo Alto Panorama', 'Cisco DNA'];
    for (const p of plataformas) {
      await run('INSERT INTO plataformas (nombre, estado) VALUES (?, ?)', [p, 'ACTIVO']);
    }

    const lideres = ['Harold Carretero', 'Carlos Mendoza', 'Diana Valencia'];
    for (const l of lideres) {
      await run('INSERT INTO personas (nombre, tipo, estado) VALUES (?, ?, ?)', [l, 'LIDER', 'ACTIVO']);
    }

    const admins = ['Juan Cadavid', 'Diego Gomez Herrera', 'William Parra', 'Natalia Ruiz'];
    for (const a of admins) {
      await run('INSERT INTO personas (nombre, tipo, estado) VALUES (?, ?, ?)', [a, 'ADMINISTRADOR', 'ACTIVO']);
    }

    const sampleAssets = [
      { codigo: 'ACT-000001', cliente_id: 1, hostname: 'FortiEDR MSSP', serial_number: 'FEDRPOTA25000025', plataforma_id: 1, ip_url_gestion: 'https://telefonicacolombia.fortiedr.com/login?logout', lider_id: 1, cogestion: 'NO', inicio_gestion: '2024-04-24', fin_gestion: '2026-04-23', correo_soporte: 'te_soporte_seguridad@telefonica.com', soporte_n1: 'NO', estado: 'ACTIVO' },
      { codigo: 'ACT-000002', cliente_id: 9, hostname: 'FortiMail MSSP', serial_number: 'FEVMSPM000237464', plataforma_id: 2, ip_url_gestion: 'https://www.fortimailcloud.com/user/', lider_id: 1, cogestion: 'NO', inicio_gestion: '2024-07-25', fin_gestion: '2025-07-24', correo_soporte: 'soporte.tech@telefonica.com', soporte_n1: 'SI', estado: 'INACTIVO' },
      { codigo: 'ACT-000003', cliente_id: 12, hostname: 'OSW3-W', serial_number: '25534', plataforma_id: 3, ip_url_gestion: '10.120.45.12', lider_id: 2, cogestion: 'SI', inicio_gestion: '2024-01-15', fin_gestion: '2026-09-20', correo_soporte: null, soporte_n1: 'SI', estado: 'ACTIVO' },
      { codigo: 'ACT-000004', cliente_id: 12, hostname: 'UNIDAD ALIMENTACIÓN', serial_number: '24402', plataforma_id: 3, ip_url_gestion: '10.120.45.13', lider_id: 2, cogestion: 'SI', inicio_gestion: '2024-01-15', fin_gestion: '2026-09-08', correo_soporte: null, soporte_n1: 'SI', estado: 'ACTIVO' },
      { codigo: 'ACT-000005', cliente_id: 4, hostname: 'UNIDAD DE AIREACIÓN', serial_number: '22378', plataforma_id: 3, ip_url_gestion: 'N/A', lider_id: 1, cogestion: 'NO', inicio_gestion: '2023-11-01', fin_gestion: '2026-08-15', correo_soporte: null, soporte_n1: 'NO', estado: 'ACTIVO' }
    ];

    for (const asset of sampleAssets) {
      await run(`
        INSERT INTO activos (
          codigo, cliente_id, hostname, serial_number, plataforma_id, ip_url_gestion,
          lider_id, cogestion, inicio_gestion, fin_gestion, correo_soporte, soporte_n1, estado, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        asset.codigo, asset.cliente_id, asset.hostname, asset.serial_number, asset.plataforma_id,
        asset.ip_url_gestion, asset.lider_id, asset.cogestion, asset.inicio_gestion, asset.fin_gestion,
        asset.correo_soporte, asset.soporte_n1, asset.estado
      ]);
    }
  }

  const ticketsCountRow = await getOne('SELECT COUNT(*) as count FROM tickets_relacionados');
  const ticketsCount = ticketsCountRow ? ticketsCountRow.count : 0;
  if (ticketsCount === 0) {
    const assets = await getAll('SELECT id, codigo FROM activos LIMIT 10');
    for (let i = 0; i < Math.min(3, assets.length); i++) {
      const a = assets[i];
      await run('INSERT INTO tickets_relacionados (activo_id, ticket_codigo, titulo, estado, prioridad) VALUES (?, ?, ?, ?, ?)', [
        a.id, `TCK-${100 + i * 12}`, 'Mantenimiento preventivo y actualización de firmware', 'RESUELTO', 'MEDIA'
      ]);
      await run('INSERT INTO tickets_relacionados (activo_id, ticket_codigo, titulo, estado, prioridad) VALUES (?, ?, ?, ?, ?)', [
        a.id, `TCK-${142 + i * 7}`, 'Alerta de conectividad y latencia intermitente', 'ABIERTO', 'ALTA'
      ]);
    }
  }

  const finalTotalRow = await getOne('SELECT COUNT(*) as count FROM activos');
  const finalTotal = finalTotalRow ? finalTotalRow.count : 0;
  const activosTotalRow = await getOne("SELECT COUNT(*) as count FROM activos WHERE estado = 'ACTIVO'");
  const activosTotal = activosTotalRow ? activosTotalRow.count : 0;
  const inactivosTotalRow = await getOne("SELECT COUNT(*) as count FROM activos WHERE estado = 'INACTIVO'");
  const inactivosTotal = inactivosTotalRow ? inactivosTotalRow.count : 0;
  console.log(`--- Seeding Complete: ${finalTotal} total activos (${activosTotal} ACTIVOS, ${inactivosTotal} INACTIVOS) ---`);
}

if (require.main === module) {
  runSeed().catch(console.error);
}

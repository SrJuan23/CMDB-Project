import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { getOne, run, initDatabase } from './database';
import { parseExcelBuffer, commitExcelImport } from '../services/excelService';

export async function runSeed() {
  console.log('--- Initializing Hiberus CMDB Database ---');
  await initDatabase();

  const userCountRow = await getOne('SELECT COUNT(*) as count FROM usuarios');
  const userCount = userCountRow ? userCountRow.count : 0;
  if (userCount === 0) {
    console.log('Seeding default users...');
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync(process.env.SEED_ADMIN_PASSWORD || 'Admin123!*', salt);
    const gestorHash = bcrypt.hashSync(process.env.SEED_GESTOR_PASSWORD || 'Gestor123!*', salt);
    const consultaHash = bcrypt.hashSync(process.env.SEED_CONSULTA_PASSWORD || 'Consulta123!*', salt);

    await run('INSERT INTO usuarios (nombre, email, password_hash, rol, estado) VALUES (?, ?, ?, ?, ?)', [
      'Administrador General', 'admin@hiberus.com', adminHash, 'ADMIN', 'ACTIVO'
    ]);
    await run('INSERT INTO usuarios (nombre, email, password_hash, rol, estado) VALUES (?, ?, ?, ?, ?)', [
      'Juan Cadavid (Gestor)', 'gestor@hiberus.com', gestorHash, 'GESTOR', 'ACTIVO'
    ]);
    await run('INSERT INTO usuarios (nombre, email, password_hash, rol, estado) VALUES (?, ?, ?, ?, ?)', [
      'Auditor Consulta', 'consulta@hiberus.com', consultaHash, 'CONSULTA', 'ACTIVO'
    ]);
    console.log('Users created: admin@hiberus.com, gestor@hiberus.com, consulta@hiberus.com');
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
    console.log('No initial asset spreadsheet found. No sample records were added.');
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

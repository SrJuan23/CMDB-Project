import xlsx from 'xlsx';
import { getOne, getAll, run, transaction } from '../db/database';
import { parseExcelDate, calculateVigencia } from './vigenciaService';

export interface ExcelRowParsed {
  cliente: string;
  hostname: string;
  serial_number: string;
  plataforma: string;
  ip_url_gestion: string;
  lider: string;
  administradores: string[];
  cogestion: string;
  soporte_n1: string;
  correo_soporte: string;
  inicio_gestion: string | null;
  fin_gestion: string | null;
  pep: string;
  estado: 'ACTIVO' | 'INACTIVO';
  row_number: number;
  sheet_name: string;
  is_duplicate: boolean;
  duplicate_info?: string;
  errors: string[];
}

export interface ImportPreviewResult {
  total_encontrados: number;
  activos_hoja: number;
  inactivos_hoja: number;
  nuevos: number;
  posibles_duplicados: number;
  errores_count: number;
  detalles: ExcelRowParsed[];
  errores: { fila: number; hoja: string; error: string }[];
}

function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\s+/g, ' ').trim();
}

function parseAdmins(val: any): string[] {
  if (!val) return [];
  const str = String(val).replace(/\s+/g, ' ').trim();
  if (!str || str.toUpperCase() === 'N/A') return [];
  return str.split(/[,;/]+/).map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length > 0);
}

export async function parseExcelBuffer(buffer: Buffer): Promise<ImportPreviewResult> {
  const wb = xlsx.read(buffer, { type: 'buffer' });
  const rowsParsed: ExcelRowParsed[] = [];
  const errores: { fila: number; hoja: string; error: string }[] = [];

  const existingRows = await getAll('SELECT id, codigo, serial_number, hostname FROM activos') as {
    id: number;
    codigo: string;
    serial_number: string;
    hostname: string;
  }[];
  const existingSerialMap = new Map<string, { id: number; codigo: string; hostname: string }>();
  existingRows.forEach(r => {
    if (r.serial_number) {
      existingSerialMap.set(r.serial_number.toUpperCase().trim(), r);
    }
  });

  const seenInExcel = new Set<string>();

  wb.SheetNames.forEach(sheetName => {
    const isActivoSheet = sheetName.toUpperCase().includes('ACTIVO') && !sheetName.toUpperCase().includes('INACTIVO');
    const isInactivoSheet = sheetName.toUpperCase().includes('INACTIVO');
    
    const defaultEstado: 'ACTIVO' | 'INACTIVO' = isInactivoSheet ? 'INACTIVO' : 'ACTIVO';

    const ws = wb.Sheets[sheetName];
    const data: any[] = xlsx.utils.sheet_to_json(ws);

    data.forEach((row, idx) => {
      const rowNum = idx + 2;
      const rowErrors: string[] = [];

      const getVal = (possibleKeys: string[]): any => {
        for (const k of possibleKeys) {
          if (row[k] !== undefined && row[k] !== null) return row[k];
          const found = Object.keys(row).find(
            actualKey => actualKey.replace(/\s+/g, ' ').trim().toLowerCase() === k.replace(/\s+/g, ' ').trim().toLowerCase()
          );
          if (found && row[found] !== undefined && row[found] !== null) return row[found];
        }
        return '';
      };

      const cliente = cleanString(getVal(['Cliente', 'Empresa']));
      const hostname = cleanString(getVal(['Hostname', 'Nombre Equipo', 'Host']));
      const serial = cleanString(getVal(['Serial Number', 'Serial', 'Numero de Serie']));
      const plataforma = cleanString(getVal(['Platform', 'Plataforma', 'Tecnologia']));
      const ipUrl = cleanString(getVal(['IP/Url Gestión', 'IP/URL Gestion', 'IP', 'URL', 'Gestion']));
      const correo = cleanString(getVal(['Correo Perteneciente', 'Correo Soporte', 'Email', 'Correo']));
      const lider = cleanString(getVal(['Lider', 'Líder', 'Responsable']));
      const adminsRaw = getVal(['Administrador(s)', 'Administrador', 'Administradores']);
      const admins = parseAdmins(adminsRaw);
      
      let cogestion = cleanString(getVal(['Cogestión', 'Cogestion'])).toUpperCase();
      if (cogestion !== 'SI' && cogestion !== 'NO') {
        cogestion = cogestion.includes('S') ? 'SI' : 'NO';
      }

      let soporteN1 = cleanString(getVal(['Damos Soporte N1 ¿?', 'Soporte N1', 'Soporte N1 ¿?'])).toUpperCase();
      if (soporteN1 !== 'SI' && soporteN1 !== 'NO') {
        soporteN1 = soporteN1.includes('S') ? 'SI' : 'NO';
      }

      const inicioRaw = getVal(['Inicio\r\nGestion', 'Inicio Gestion', 'Inicio de Gestion', 'Fecha Inicio']);
      const finRaw = getVal(['Fin Gestion', 'Fin de Gestion', 'Fecha Fin']);
      const pep = cleanString(getVal(['PEP', 'Codigo PEP']));

      const inicioGestion = parseExcelDate(inicioRaw);
      const finGestion = parseExcelDate(finRaw);

      if (!cliente && !hostname && !serial) {
        return;
      }

      if (!cliente) rowErrors.push('Falta el nombre del Cliente');
      if (!hostname) rowErrors.push('Falta el Hostname');
      if (!serial) rowErrors.push('Falta el Serial Number');
      if (!plataforma) rowErrors.push('Falta la Plataforma');

      const serialKey = serial.toUpperCase();
      let isDuplicate = false;
      let duplicateInfo: string | undefined;

      if (serialKey) {
        if (existingSerialMap.has(serialKey)) {
          const match = existingSerialMap.get(serialKey)!;
          isDuplicate = true;
          duplicateInfo = `Ya existe en BD (${match.codigo} - ${match.hostname})`;
        } else if (seenInExcel.has(serialKey)) {
          isDuplicate = true;
          duplicateInfo = `Serial repetido dentro del archivo Excel`;
        }
        seenInExcel.add(serialKey);
      }

      const item: ExcelRowParsed = {
        cliente: cliente || 'CLIENTE SIN ASIGNAR',
        hostname: hostname || 'SIN HOSTNAME',
        serial_number: serial || 'S/N',
        plataforma: plataforma || 'GENERAL',
        ip_url_gestion: ipUrl || 'N/A',
        lider: lider || 'Sin asignar',
        administradores: admins,
        cogestion,
        soporte_n1: soporteN1,
        correo_soporte: correo,
        inicio_gestion: inicioGestion,
        fin_gestion: finGestion,
        pep,
        estado: defaultEstado,
        row_number: rowNum,
        sheet_name: sheetName,
        is_duplicate: isDuplicate,
        duplicate_info: duplicateInfo,
        errors: rowErrors
      };

      rowsParsed.push(item);
      if (rowErrors.length > 0) {
        errores.push({ fila: rowNum, hoja: sheetName, error: rowErrors.join(', ') });
      }
    });
  });

  const total = rowsParsed.length;
  const activosHoja = rowsParsed.filter(r => r.sheet_name.toUpperCase().includes('ACTIVO') && !r.sheet_name.toUpperCase().includes('INACTIVO')).length;
  const inactivosHoja = rowsParsed.filter(r => r.sheet_name.toUpperCase().includes('INACTIVO')).length;
  const duplicates = rowsParsed.filter(r => r.is_duplicate).length;

  return {
    total_encontrados: total,
    activos_hoja: activosHoja,
    inactivos_hoja: inactivosHoja,
    nuevos: total - duplicates,
    posibles_duplicados: duplicates,
    errores_count: errores.length,
    detalles: rowsParsed,
    errores
  };
}

export async function commitExcelImport(rows: ExcelRowParsed[], usuarioNombre = 'Sistema / Importación'): Promise<{
  importados: number;
  actualizados: number;
  errores: string[];
}> {
  let importados = 0;
  let actualizados = 0;
  const errores: string[] = [];

  const getOrCreateCliente = async (nombre: string): Promise<number> => {
    const clean = cleanString(nombre);
    let row = await getOne('SELECT id FROM clientes WHERE LOWER(TRIM(nombre)) = LOWER(?)', [clean]);
    if (row) return row.id;
    try {
      const res = await run('INSERT INTO clientes (nombre, estado) VALUES (?, ?)', [clean, 'ACTIVO']);
      return res.lastInsertRowid;
    } catch {
      const found = await getOne('SELECT id FROM clientes WHERE LOWER(TRIM(nombre)) = LOWER(?)', [clean]);
      return found!.id;
    }
  };

  const getOrCreatePlataforma = async (nombre: string): Promise<number> => {
    const clean = cleanString(nombre);
    let row = await getOne('SELECT id FROM plataformas WHERE LOWER(TRIM(nombre)) = LOWER(?)', [clean]);
    if (row) return row.id;
    try {
      const res = await run('INSERT INTO plataformas (nombre, estado) VALUES (?, ?)', [clean, 'ACTIVO']);
      return res.lastInsertRowid;
    } catch {
      const found = await getOne('SELECT id FROM plataformas WHERE LOWER(TRIM(nombre)) = LOWER(?)', [clean]);
      return found!.id;
    }
  };

  const getOrCreatePersona = async (nombre: string, tipo: 'LIDER' | 'ADMINISTRADOR' | 'AMBOS'): Promise<number> => {
    const clean = cleanString(nombre);
    let row = await getOne('SELECT id, tipo FROM personas WHERE LOWER(TRIM(nombre)) = LOWER(?)', [clean]);
    if (row) {
      if (row.tipo !== 'AMBOS' && row.tipo !== tipo) {
        await run('UPDATE personas SET tipo = ? WHERE id = ?', ['AMBOS', row.id]);
      }
      return row.id;
    }
    try {
      const res = await run('INSERT INTO personas (nombre, tipo, estado) VALUES (?, ?, ?)', [clean, tipo, 'ACTIVO']);
      return res.lastInsertRowid;
    } catch {
      const found = await getOne('SELECT id, tipo FROM personas WHERE LOWER(TRIM(nombre)) = LOWER(?)', [clean]);
      if (found!.tipo !== 'AMBOS' && found!.tipo !== tipo) {
        await run('UPDATE personas SET tipo = ? WHERE id = ?', ['AMBOS', found!.id]);
      }
      return found!.id;
    }
  };

  const getLastCodeNum = async (): Promise<number> => {
    const row = await getOne("SELECT MAX(CAST(SUBSTRING(codigo, 5) AS INTEGER)) as max_num FROM activos WHERE codigo LIKE 'ACT-%'");
    return row?.max_num || 0;
  };

  const nextCodeNum = await getLastCodeNum();

  await transaction(async () => {
    for (const row of rows) {
      try {
        const clienteId = await getOrCreateCliente(row.cliente);
        const plataformaId = await getOrCreatePlataforma(row.plataforma);
        let liderId: number | null = null;
        if (row.lider && row.lider !== 'Sin asignar') {
          liderId = await getOrCreatePersona(row.lider, 'LIDER');
        }

        const existing = await getOne('SELECT id, codigo, estado FROM activos WHERE LOWER(TRIM(serial_number)) = LOWER(?)', [row.serial_number.trim()]);

        if (existing) {
          await run(`
            UPDATE activos SET
              cliente_id = ?, hostname = ?, plataforma_id = ?, ip_url_gestion = ?,
              lider_id = ?, cogestion = ?, inicio_gestion = ?, fin_gestion = ?,
              correo_soporte = ?, soporte_n1 = ?, pep = ?, estado = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            clienteId, row.hostname, plataformaId, row.ip_url_gestion,
            liderId, row.cogestion, row.inicio_gestion, row.fin_gestion,
            row.correo_soporte, row.soporte_n1, row.pep, row.estado, existing.id
          ]);

          await run('DELETE FROM activo_administrador WHERE activo_id = ?', [existing.id]);
          for (const adminName of row.administradores) {
            const adminId = await getOrCreatePersona(adminName, 'ADMINISTRADOR');
            await run('INSERT INTO activo_administrador (activo_id, persona_id) VALUES (?, ?)', [existing.id, adminId]);
          }

          await run(`
            INSERT INTO historial_activo (activo_id, usuario_nombre, campo, valor_anterior, valor_nuevo)
            VALUES (?, ?, ?, ?, ?)
          `, [existing.id, usuarioNombre, 'Importación Excel', 'Registro previo', `Actualizado desde hoja ${row.sheet_name}`]);

          actualizados++;
        } else {
          const nextNum = nextCodeNum + importados + actualizados + 1;
          const codigo = `ACT-${String(nextNum).padStart(6, '0')}`;

          const res = await run(`
            INSERT INTO activos (
              codigo, cliente_id, hostname, serial_number, plataforma_id, ip_url_gestion,
              lider_id, cogestion, inicio_gestion, fin_gestion, correo_soporte, soporte_n1,
              pep, estado, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `, [
            codigo, clienteId, row.hostname, row.serial_number, plataformaId,
            row.ip_url_gestion, liderId, row.cogestion, row.inicio_gestion,
            row.fin_gestion, row.correo_soporte, row.soporte_n1, row.pep, row.estado
          ]);

          const newId = res.lastInsertRowid;

          for (const adminName of row.administradores) {
            const adminId = await getOrCreatePersona(adminName, 'ADMINISTRADOR');
            await run('INSERT INTO activo_administrador (activo_id, persona_id) VALUES (?, ?)', [newId, adminId]);
          }

          await run(`
            INSERT INTO historial_activo (activo_id, usuario_nombre, campo, valor_anterior, valor_nuevo)
            VALUES (?, ?, ?, ?, ?)
          `, [newId, usuarioNombre, 'Creación', null, `Creado vía importación Excel (${codigo})`]);

          importados++;
        }
      } catch (err: any) {
        errores.push(`Fila ${row.row_number} (${row.serial_number}): ${err.message}`);
      }
    }
  });

  return { importados, actualizados, errores };
}

export function exportActivosToExcel(activos: any[]): Buffer {
  const data = activos.map(a => {
    const vig = calculateVigencia(a.fin_gestion);
    return {
      'Código': a.codigo,
      'Estado': a.estado,
      'Cliente': a.cliente_nombre,
      'Hostname': a.hostname,
      'Serial Number': a.serial_number,
      'Plataforma': a.plataforma_nombre,
      'IP / URL Gestión': a.ip_url_gestion,
      'Líder': a.lider_nombre || 'Sin asignar',
      'Administrador(es)': a.administradores || 'Sin asignar',
      'Cogestión': a.cogestion,
      'Soporte N1': a.soporte_n1,
      'Correo de Soporte': a.correo_soporte || 'N/A',
      'Inicio Gestión': a.inicio_gestion || 'N/A',
      'Fin Gestión': a.fin_gestion || 'N/A',
      'Días Restantes': vig.dias_restantes !== null ? vig.dias_restantes : 'N/A',
      'Vigencia': vig.texto_vigencia,
      'Estado Vigencia': vig.estado_vigencia,
      'PEP': a.pep || 'N/A'
    };
  });

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Activos CMDB TTECH');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function exportActivosToCSV(activos: any[]): string {
  const header = [
    'Código', 'Estado', 'Cliente', 'Hostname', 'Serial Number', 'Plataforma',
    'IP / URL Gestión', 'Líder', 'Administrador(es)', 'Cogestión', 'Soporte N1',
    'Correo de Soporte', 'Inicio Gestión', 'Fin Gestión', 'Días Restantes', 'Vigencia', 'Estado Vigencia'
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = activos.map(a => {
    const vig = calculateVigencia(a.fin_gestion);
    return [
      escapeCSV(a.codigo),
      escapeCSV(a.estado),
      escapeCSV(a.cliente_nombre),
      escapeCSV(a.hostname),
      escapeCSV(a.serial_number),
      escapeCSV(a.plataforma_nombre),
      escapeCSV(a.ip_url_gestion),
      escapeCSV(a.lider_nombre || 'Sin asignar'),
      escapeCSV(a.administradores || 'Sin asignar'),
      escapeCSV(a.cogestion),
      escapeCSV(a.soporte_n1),
      escapeCSV(a.correo_soporte || 'N/A'),
      escapeCSV(a.inicio_gestion || 'N/A'),
      escapeCSV(a.fin_gestion || 'N/A'),
      escapeCSV(vig.dias_restantes !== null ? vig.dias_restantes : ''),
      escapeCSV(vig.texto_vigencia),
      escapeCSV(vig.estado_vigencia)
    ].join(',');
  });

  return [header.join(','), ...rows].join('\r\n');
}

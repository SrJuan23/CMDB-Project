import { Response } from 'express';
import { getOne, getAll } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { calculateVigencia, formatDateSpanish } from '../services/vigenciaService';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  try {
    const configRow = await getOne("SELECT valor FROM configuracion WHERE clave = 'dias_proximo_vencer'");
    const threshold = configRow ? parseInt(configRow.valor, 10) : 30;

    const allActivos = await getAll(`
      SELECT 
        a.id, a.codigo, a.hostname, a.serial_number, a.estado, a.fin_gestion,
        a.cogestion, a.soporte_n1, a.cliente_id, a.plataforma_id, a.lider_id,
        c.nombre AS cliente_nombre,
        p.nombre AS plataforma_nombre,
        l.nombre AS lider_nombre,
        STRING_AGG(DISTINCT adm.nombre) AS administradores_nombres
      FROM activos a
      JOIN clientes c ON a.cliente_id = c.id
      JOIN plataformas p ON a.plataforma_id = p.id
      LEFT JOIN personas l ON a.lider_id = l.id
      LEFT JOIN activo_administrador aa ON a.id = aa.activo_id
      LEFT JOIN personas adm ON aa.persona_id = adm.id
      GROUP BY a.id
    `);

    const totalClientesRow = await getOne('SELECT COUNT(*) as count FROM clientes');
    const totalPlataformasRow = await getOne('SELECT COUNT(*) as count FROM plataformas');
    const totalClientes = totalClientesRow ? totalClientesRow.count : 0;
    const totalPlataformas = totalPlataformasRow ? totalPlataformasRow.count : 0;

    let activosCount = 0;
    let inactivosCount = 0;
    let vigentesCount = 0;
    let proximosCount = 0;
    let vencidosCount = 0;

    let vencen7 = 0;
    let vencen30 = 0;
    let vencen60 = 0;
    let vencen90 = 0;

    const plataformaCounts = new Map<string, number>();
    const clienteCounts = new Map<string, number>();
    const liderCounts = new Map<string, number>();
    const adminCounts = new Map<string, number>();

    let cogestionSi = 0;
    let cogestionNo = 0;

    let soporteN1Si = 0;
    let soporteN1No = 0;

    const atencionRequerida: any[] = [];

    allActivos.forEach(a => {
      if (a.estado === 'ACTIVO') activosCount++;
      else inactivosCount++;

      if (a.cogestion === 'SI') cogestionSi++;
      else cogestionNo++;

      if (a.soporte_n1 === 'SI') soporteN1Si++;
      else soporteN1No++;

      if (a.plataforma_nombre) {
        plataformaCounts.set(a.plataforma_nombre, (plataformaCounts.get(a.plataforma_nombre) || 0) + 1);
      }

      if (a.cliente_nombre) {
        clienteCounts.set(a.cliente_nombre, (clienteCounts.get(a.cliente_nombre) || 0) + 1);
      }

      const lider = a.lider_nombre || 'Sin asignar';
      liderCounts.set(lider, (liderCounts.get(lider) || 0) + 1);

      if (a.administradores_nombres) {
        a.administradores_nombres.split(',').forEach((name: string) => {
          const admClean = name.trim();
          adminCounts.set(admClean, (adminCounts.get(admClean) || 0) + 1);
        });
      }

      const vig = calculateVigencia(a.fin_gestion, threshold);
      if (vig.estado_vigencia === 'VIGENTE') vigentesCount++;
      else if (vig.estado_vigencia === 'PRÓXIMO A VENCER') proximosCount++;
      else if (vig.estado_vigencia === 'VENCIDO') vencidosCount++;

      if (vig.dias_restantes !== null) {
        if (vig.dias_restantes < 0) {
        } else {
          if (vig.dias_restantes <= 7) vencen7++;
          if (vig.dias_restantes <= 30) vencen30++;
          if (vig.dias_restantes <= 60) vencen60++;
          if (vig.dias_restantes <= 90) vencen90++;
        }

        if (vig.dias_restantes <= 60 && a.estado === 'ACTIVO') {
          atencionRequerida.push({
            id: a.id,
            codigo: a.codigo,
            hostname: a.hostname,
            serial_number: a.serial_number,
            cliente_nombre: a.cliente_nombre,
            plataforma_nombre: a.plataforma_nombre,
            lider_nombre: a.lider_nombre || 'Sin asignar',
            administradores_str: a.administradores_nombres || 'Sin asignar',
            fin_gestion: a.fin_gestion,
            fin_gestion_formateada: formatDateSpanish(a.fin_gestion),
            dias_restantes: vig.dias_restantes,
            texto_vigencia: vig.texto_vigencia,
            estado_vigencia: vig.estado_vigencia,
            badge_color: vig.badge_color
          });
        }
      }
    });

    atencionRequerida.sort((a, b) => a.dias_restantes - b.dias_restantes);

    const sortedPlataformas = Array.from(plataformaCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const sortedClientes = Array.from(clienteCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const sortedLideres = Array.from(liderCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const sortedAdmins = Array.from(adminCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return res.json({
      kpis: {
        total_activos: allActivos.length,
        activos: activosCount,
        inactivos: inactivosCount,
        vigentes: vigentesCount,
        proximos_a_vencer: proximosCount,
        vencidos: vencidosCount,
        total_clientes: totalClientes,
        total_plataformas: totalPlataformas
      },
      vigencias: {
        vencidos: vencidosCount,
        vencen_7_dias: vencen7,
        vencen_30_dias: vencen30,
        vencen_60_dias: vencen60,
        vencen_90_dias: vencen90,
        vigentes: vigentesCount
      },
      graficos: {
        plataformas: {
          labels: sortedPlataformas.map(p => p[0]),
          data: sortedPlataformas.map(p => p[1])
        },
        clientes: {
          labels: sortedClientes.map(c => c[0]),
          data: sortedClientes.map(c => c[1])
        },
        estados: {
          labels: ['ACTIVO', 'INACTIVO'],
          data: [activosCount, inactivosCount]
        },
        vigencias: {
          labels: ['VIGENTE', 'PRÓXIMO A VENCER', 'VENCIDO'],
          data: [vigentesCount, proximosCount, vencidosCount]
        },
        lideres: {
          labels: sortedLideres.map(l => l[0]),
          data: sortedLideres.map(l => l[1])
        },
        administradores: {
          labels: sortedAdmins.map(adm => adm[0]),
          data: sortedAdmins.map(adm => adm[1])
        },
        cogestion: {
          labels: ['SI', 'NO'],
          data: [cogestionSi, cogestionNo]
        },
        soporte_n1: {
          labels: ['SI', 'NO'],
          data: [soporteN1Si, soporteN1No]
        }
      },
      atencion_requerida: atencionRequerida.slice(0, 15)
    });
  } catch (error: any) {
    console.error('Error en getDashboardStats:', error);
    return res.status(500).json({ error: error.message });
  }
}

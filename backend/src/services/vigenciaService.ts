export interface VigenciaInfo {
  dias_restantes: number | null;
  texto_vigencia: string;
  estado_vigencia: 'VIGENTE' | 'PRÓXIMO A VENCER' | 'VENCIDO' | 'SIN FECHA';
  badge_color: 'cyan' | 'warning' | 'danger' | 'neutral';
  fecha_fin_formateada: string;
  fecha_inicio_formateada: string;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel base date is 1899-12-30 (due to 1900 leap year bug)
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  if (typeof val === 'string') {
    val = val.trim();
    if (!val || val.toUpperCase() === 'N/A') return null;

    // Check DD/MM/YYYY or DD-MM-YYYY
    const slashParts = val.split(/[/-]/);
    if (slashParts.length === 3) {
      if (slashParts[2].length === 4 || slashParts[2].length === 2) {
        // DD/MM/YYYY or DD/MM/YY
        const day = slashParts[0].padStart(2, '0');
        const month = slashParts[1].padStart(2, '0');
        const year = slashParts[2].length === 2 ? `20${slashParts[2]}` : slashParts[2];
        return `${year}-${month}-${day}`;
      } else if (slashParts[0].length === 4) {
        // YYYY-MM-DD
        const year = slashParts[0];
        const month = slashParts[1].padStart(2, '0');
        const day = slashParts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  return null;
}

export function formatDateSpanish(isoDate: string | Date | null): string {
  if (!isoDate) return 'N/A';
  let dateStr: string;
  if (isoDate instanceof Date) {
    dateStr = isoDate.toISOString().split('T')[0];
  } else {
    dateStr = isoDate;
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const mes = MESES[monthIdx] || parts[1];
  return `${day} ${mes} ${year}`;
}

export function calculateVigencia(finGestion: string | Date | null, diasThreshold = 30): VigenciaInfo {
  if (!finGestion) {
    return {
      dias_restantes: null,
      texto_vigencia: 'Sin fecha límite',
      estado_vigencia: 'SIN FECHA',
      badge_color: 'neutral',
      fecha_fin_formateada: 'N/A',
      fecha_inicio_formateada: 'N/A'
    };
  }

  let finDateStr: string;
  if (finGestion instanceof Date) {
    finDateStr = finGestion.toISOString().split('T')[0];
  } else {
    finDateStr = finGestion;
  }

  // Parse YYYY-MM-DD as local midnight
  const [y, m, d] = finDateStr.split('-').map(num => parseInt(num, 10));
  const finDate = new Date(y, m - 1, d, 23, 59, 59, 999);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const diffTime = finDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let estado_vigencia: 'VIGENTE' | 'PRÓXIMO A VENCER' | 'VENCIDO';
  let texto_vigencia: string;
  let badge_color: 'cyan' | 'warning' | 'danger';

  if (diffDays < 0) {
    estado_vigencia = 'VENCIDO';
    const diasVencido = Math.abs(diffDays);
    texto_vigencia = diasVencido === 1 ? 'Vencido hace 1 día' : `Vencido hace ${diasVencido} días`;
    badge_color = 'danger';
  } else if (diffDays <= diasThreshold) {
    estado_vigencia = 'PRÓXIMO A VENCER';
    texto_vigencia = diffDays === 1 ? '1 día restante' : `${diffDays} días restantes`;
    badge_color = 'warning';
  } else {
    estado_vigencia = 'VIGENTE';
    texto_vigencia = `${diffDays} días restantes`;
    badge_color = 'cyan';
  }

  return {
    dias_restantes: diffDays,
    texto_vigencia,
    estado_vigencia,
    badge_color,
    fecha_fin_formateada: formatDateSpanish(finDateStr),
    fecha_inicio_formateada: 'N/A'
  };
}

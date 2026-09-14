export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'GESTOR' | 'CONSULTA';
}

export interface VigenciaInfo {
  dias_restantes: number | null;
  texto_vigencia: string;
  estado_vigencia: 'VIGENTE' | 'PRÓXIMO A VENCER' | 'VENCIDO' | 'SIN FECHA';
  badge_color: 'cyan' | 'warning' | 'danger' | 'neutral';
  fecha_fin_formateada: string;
  fecha_inicio_formateada: string;
}

export interface PersonaAdmin {
  id: number;
  nombre: string;
  email?: string;
}

export interface Activo {
  id: number;
  codigo: string;
  cliente_id: number;
  hostname: string;
  serial_number: string;
  plataforma_id: number;
  ip_url_gestion: string;
  generacion_actas?: string | null;
  pet?: string | null;
  nombre_proyecto?: string | null;
  cogestion: 'SI' | 'NO';
  inicio_gestion: string | null;
  fin_gestion: string | null;
  correo_soporte: string | null;
  soporte_n1: 'SI' | 'NO';
  pep?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  created_at: string;
  updated_at: string;
  cliente_nombre: string;
  plataforma_nombre: string;
  plataforma_sku: string | null;
  plataforma_pet: string | null;
  administradores?: PersonaAdmin[];
  administradores_str: string;
  vigencia: VigenciaInfo;
  dias_restantes: number | null;
  estado_vigencia: 'VIGENTE' | 'PRÓXIMO A VENCER' | 'VENCIDO' | 'SIN FECHA';
  inicio_gestion_formateada: string;
  fin_gestion_formateada: string;
  generacion_actas_formateada?: string;
  tickets_relacionados?: any[];
  historial?: any[];
}

export interface Cliente {
  id: number;
  nombre: string;
  contacto?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  created_at: string;
  total_activos: number;
  activos_count: number;
  inactivos_count: number;
  vencidos_count: number;
  proximos_count: number;
}

export interface Plataforma {
  id: number;
  nombre: string;
  sku?: string | null;
  descripcion?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  created_at: string;
  total_activos: number;
  activos_count: number;
  inactivos_count: number;
  vencidos_count: number;
}

export interface Persona {
  id: number;
  nombre: string;
  email?: string | null;
  tipo: 'ADMINISTRADOR';
  estado: 'ACTIVO' | 'INACTIVO';
  created_at: string;
  como_administrador?: {
    total: number;
    activos: number;
    inactivos: number;
    vencidos: number;
    proximos: number;
  };
  total_activos: number;
  activos_count: number;
  inactivos_count: number;
  proximos_count: number;
  vencidos_count: number;
}

export interface HistorialItem {
  id: number;
  activo_id: number;
  activo_codigo: string;
  activo_hostname: string;
  usuario_id: number | null;
  usuario_nombre: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  fecha: string;
}

export interface DashboardStats {
  kpis: {
    total_activos: number;
    activos: number;
    inactivos: number;
    vigentes: number;
    proximos_a_vencer: number;
    vencidos: number;
    total_clientes: number;
    total_plataformas: number;
  };
  vigencias: {
    vencidos: number;
    vencen_7_dias: number;
    vencen_30_dias: number;
    vencen_60_dias: number;
    vencen_90_dias: number;
    vigentes: number;
  };
  graficos: {
    plataformas: { labels: string[]; data: number[] };
    clientes: { labels: string[]; data: number[] };
    estados: { labels: string[]; data: number[] };
    vigencias: { labels: string[]; data: number[] };
    administradores: { labels: string[]; data: number[] };
    cogestion: { labels: string[]; data: number[] };
    soporte_n1: { labels: string[]; data: number[] };
  };
  atencion_requerida: {
    id: number;
    codigo: string;
    hostname: string;
    serial_number: string;
    cliente_nombre: string;
    plataforma_nombre: string;
    administradores_str: string;
    fin_gestion: string | null;
    fin_gestion_formateada: string;
    dias_restantes: number;
    texto_vigencia: string;
    estado_vigencia: string;
    badge_color: 'cyan' | 'warning' | 'danger';
  }[];
}

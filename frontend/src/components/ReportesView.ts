import { DashboardStats } from '../types';

export function renderReportesView(stats: DashboardStats | null): string {
  if (!stats) return '<div class="text-center py-12 text-slate-400 font-body">Cargando reportes...</div>';

  const k = stats.kpis;
  const v = stats.vigencias;

  return `
    <div class="space-y-5 animate-fadeIn">
      <div>
        <h2 class="text-2xl font-extrabold text-[#19255A] font-heading">Reportes</h2>
        <p class="text-xs text-slate-500 font-body mt-0.5">Generación y exportación de reportes</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-2">Inventario General</h3>
          <p class="text-xs text-slate-500 font-body mb-3">Todos los activos registrados en la CMDB.</p>
          <div class="text-2xl font-extrabold text-[#0945F7] font-heading mb-3">${k.total_activos}</div>
          <button id="report-inventario" class="btn-secondary w-full text-xs">Exportar</button>
        </div>

        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-2">Activos Activos</h3>
          <p class="text-xs text-slate-500 font-body mb-3">Equipos en operación y producción.</p>
          <div class="text-2xl font-extrabold text-emerald-600 font-heading mb-3">${k.activos}</div>
          <button id="report-activos" class="btn-secondary w-full text-xs">Exportar</button>
        </div>

        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-2">Activos Inactivos</h3>
          <p class="text-xs text-slate-500 font-body mb-3">Equipos desincorporados o en pausa.</p>
          <div class="text-2xl font-extrabold text-slate-600 font-heading mb-3">${k.inactivos}</div>
          <button id="report-inactivos" class="btn-secondary w-full text-xs">Exportar</button>
        </div>

        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-2">Activos Vencidos</h3>
          <p class="text-xs text-slate-500 font-body mb-3">Equipos con fecha de gestión expirada.</p>
          <div class="text-2xl font-extrabold text-rose-600 font-heading mb-3">${v.vencidos}</div>
          <button id="report-vencidos" class="btn-secondary w-full text-xs">Exportar</button>
        </div>

        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-2">Próximos a Vencer (30d)</h3>
          <p class="text-xs text-slate-500 font-body mb-3">Equipos que requieren atención.</p>
          <div class="text-2xl font-extrabold text-amber-600 font-heading mb-3">${v.vencen_30_dias}</div>
          <button id="report-proximos" class="btn-secondary w-full text-xs">Exportar</button>
        </div>

        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-2">Distribución por Cliente</h3>
          <p class="text-xs text-slate-500 font-body mb-3">Top clientes con más activos.</p>
          <div class="text-2xl font-extrabold text-[#5B53FF] font-heading mb-3">${stats.graficos.clientes.labels.length}</div>
          <button id="report-clientes" class="btn-secondary w-full text-xs">Exportar</button>
        </div>
      </div>

      <div class="cmdb-card p-5">
        <h3 class="text-sm font-bold text-[#19255A] font-heading mb-3 uppercase tracking-wide">Exportación Rápida</h3>
        <p class="text-xs text-slate-500 font-body mb-4">Descarga la base completa en formato Excel o CSV.</p>
        <div class="flex items-center gap-3 flex-wrap">
          <button id="report-export-excel" class="btn-primary text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar Excel
          </button>
          <button id="report-export-csv" class="btn-secondary text-sm">Exportar CSV</button>
        </div>
      </div>
    </div>
  `;
}

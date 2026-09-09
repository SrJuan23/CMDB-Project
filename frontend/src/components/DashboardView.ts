import { DashboardStats } from '../types';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Store chart instances to destroy before re-rendering
const chartInstances: { [key: string]: Chart } = {};

export function renderDashboardView(stats: DashboardStats): string {
  const { kpis, vigencias, atencion_requerida } = stats;

  return `
    <div class="space-y-8 animate-fadeIn">
      <!-- Welcome Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl md:text-3xl font-extrabold text-[#19255A] font-heading">
            CMDB Dashboard
          </h2>
          <p class="text-sm text-slate-500 font-body mt-1">
            Monitoreo global de infraestructura, plataformas y vigencia de contratos de servicio
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button id="dash-new-asset-btn" class="btn-primary text-xs md:text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            + Nuevo Activo
          </button>
          <button id="dash-import-excel-btn" class="btn-secondary text-xs md:text-sm">
            <svg class="w-4 h-4 text-[#0945F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Importar Excel
          </button>
        </div>
      </div>

      <!-- 1. Principal KPIs Grid (Section 18) -->
      <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Activos -->
        <div class="cmdb-card p-5 border-l-4 border-l-[#0945F7]">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider font-heading">Total Activos</span>
            <span class="p-2 bg-[#EDF0FF] text-[#0945F7] rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </span>
          </div>
          <div class="mt-3 text-3xl font-extrabold text-[#19255A] font-heading">${kpis.total_activos}</div>
          <div class="mt-1 text-xs text-slate-400">Equipos y servicios administrados</div>
        </div>

        <!-- Activos Activos -->
        <div class="cmdb-card p-5 border-l-4 border-l-emerald-500">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-emerald-700 uppercase tracking-wider font-heading">Activos Activos</span>
            <span class="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </span>
          </div>
          <div class="mt-3 text-3xl font-extrabold text-emerald-600 font-heading">${kpis.activos}</div>
          <div class="mt-1 text-xs text-emerald-700 font-medium">Operando en producción</div>
        </div>

        <!-- Activos Inactivos -->
        <div class="cmdb-card p-5 border-l-4 border-l-slate-400">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider font-heading">Activos Inactivos</span>
            <span class="p-2 bg-slate-100 text-slate-500 rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            </span>
          </div>
          <div class="mt-3 text-3xl font-extrabold text-slate-600 font-heading">${kpis.inactivos}</div>
          <div class="mt-1 text-xs text-slate-400">Desincorporados o en pausa</div>
        </div>

        <!-- Activos Vigentes -->
        <div class="cmdb-card p-5 border-l-4 border-l-[#00CDE2]">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-[#006671] uppercase tracking-wider font-heading">Gestión Vigente</span>
            <span class="p-2 bg-[#E6F9FB] text-[#00CDE2] rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </span>
          </div>
          <div class="mt-3 text-3xl font-extrabold text-[#006671] font-heading">${kpis.vigentes}</div>
          <div class="mt-1 text-xs text-[#006671]">Dentro de cobertura regular</div>
        </div>

        <!-- Próximos a vencer -->
        <div class="cmdb-card p-5 border-l-4 border-l-amber-500">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-amber-700 uppercase tracking-wider font-heading">Próximos a Vencer</span>
            <span class="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </span>
          </div>
          <div class="mt-3 text-3xl font-extrabold text-amber-600 font-heading">${kpis.proximos_a_vencer}</div>
          <div class="mt-1 text-xs text-amber-700 font-medium">Requieren renovación pronto</div>
        </div>

        <!-- Vencidos -->
        <div class="cmdb-card p-5 border-l-4 border-l-rose-500">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-rose-700 uppercase tracking-wider font-heading">Activos Vencidos</span>
            <span class="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </span>
          </div>
          <div class="mt-3 text-3xl font-extrabold text-rose-600 font-heading">${kpis.vencidos}</div>
          <div class="mt-1 text-xs text-rose-700 font-medium">Fecha de gestión expirada</div>
        </div>

        <!-- Clientes -->
        <div class="cmdb-card p-5 border-l-4 border-l-[#5B53FF]">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-[#5B53FF] uppercase tracking-wider font-heading">Clientes</span>
            <span class="p-2 bg-[#EDF0FF] text-[#5B53FF] rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </span>
          </div>
          <div class="mt-3 text-3xl font-extrabold text-[#19255A] font-heading">${kpis.total_clientes}</div>
          <div class="mt-1 text-xs text-slate-400">Empresas con servicios</div>
        </div>

        <!-- Plataformas -->
        <div class="cmdb-card p-5 border-l-4 border-l-[#001F90]">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-[#001F90] uppercase tracking-wider font-heading">Plataformas</span>
            <span class="p-2 bg-[#EDF0FF] text-[#001F90] rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>
            </span>
          </div>
          <div class="mt-3 text-3xl font-extrabold text-[#19255A] font-heading">${kpis.total_plataformas}</div>
          <div class="mt-1 text-xs text-slate-400">Tecnologías soportadas</div>
        </div>
      </div>

      <!-- 2. Dashboard de Vigencias (Section 19) -->
      <div class="bg-gradient-to-br from-[#19255A] to-[#001F90] rounded-2xl p-6 text-white shadow-md">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold font-heading text-white flex items-center gap-2">
              <svg class="w-5 h-5 text-[#00CDE2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Control y Alertas de Vigencia
            </h3>
            <p class="text-xs text-[#D7E2FF]/80 mt-0.5">Seguimiento preventivo de fechas de vencimiento de contratos y licencias</p>
          </div>
          <span class="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold font-heading text-[#00CDE2]">
            Cálculo Dinámico
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <!-- Vencidos -->
          <div class="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-4 border border-rose-400/30 transition">
            <div class="text-xs font-semibold text-rose-300 font-heading">Vencidos</div>
            <div class="text-2xl font-black font-heading text-white mt-1">${vigencias.vencidos}</div>
            <div class="text-[11px] text-rose-200/80 mt-1">Requieren atención crítica</div>
          </div>

          <!-- Vencen en 7 días -->
          <div class="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-4 border border-amber-400/30 transition">
            <div class="text-xs font-semibold text-amber-300 font-heading">Vencen en 7 días</div>
            <div class="text-2xl font-black font-heading text-white mt-1">${vigencias.vencen_7_dias}</div>
            <div class="text-[11px] text-amber-200/80 mt-1">Urgencia alta</div>
          </div>

          <!-- Vencen en 30 días -->
          <div class="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-4 border border-amber-300/30 transition">
            <div class="text-xs font-semibold text-amber-200 font-heading">Vencen en 30 días</div>
            <div class="text-2xl font-black font-heading text-white mt-1">${vigencias.vencen_30_dias}</div>
            <div class="text-[11px] text-amber-100/80 mt-1">Ciclo de renovación</div>
          </div>

          <!-- Vencen en 60 días -->
          <div class="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-4 border border-[#00CDE2]/30 transition">
            <div class="text-xs font-semibold text-[#00CDE2] font-heading">Vencen en 60 días</div>
            <div class="text-2xl font-black font-heading text-white mt-1">${vigencias.vencen_60_dias}</div>
            <div class="text-[11px] text-[#D7E2FF]/80 mt-1">En planeación</div>
          </div>

          <!-- Vencen en 90 días -->
          <div class="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl p-4 border border-blue-400/30 transition">
            <div class="text-xs font-semibold text-blue-300 font-heading">Vencen en 90 días</div>
            <div class="text-2xl font-black font-heading text-white mt-1">${vigencias.vencen_90_dias}</div>
            <div class="text-[11px] text-blue-200/80 mt-1">Seguimiento trimestral</div>
          </div>
        </div>
      </div>

      <!-- 3. Sección "Atención Requerida" (Section 30) -->
      <div class="cmdb-card overflow-hidden">
        <div class="p-5 border-b border-[#EDF0FF] flex items-center justify-between bg-[#F7F8FD]/60">
          <div class="flex items-center gap-3">
            <span class="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </span>
            <div>
              <h3 class="text-base font-bold text-[#19255A] font-heading">Atención Requerida</h3>
              <p class="text-xs text-slate-500 font-body">Equipos vencidos o que vencen dentro de los próximos 60 días</p>
            </div>
          </div>
          <span class="text-xs font-bold text-slate-500 font-heading">
            ${atencion_requerida.length} equipos prioritarios
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm font-body">
            <thead class="bg-[#F7F8FD] text-slate-500 text-xs font-bold uppercase font-heading border-b border-[#EDF0FF]">
              <tr>
                <th class="px-5 py-3">Código</th>
                <th class="px-5 py-3">Cliente</th>
                <th class="px-5 py-3">Hostname</th>
                <th class="px-5 py-3">Plataforma</th>
                <th class="px-5 py-3">Fin Gestión</th>
                <th class="px-5 py-3">Vigencia</th>
                <th class="px-5 py-3">Administrador</th>
                <th class="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${atencion_requerida.length === 0 ? `
                <tr>
                  <td colspan="8" class="px-5 py-8 text-center text-slate-400 text-sm">
                    No hay activos en estado crítico de vencimiento.
                  </td>
                </tr>
              ` : atencion_requerida.map(item => `
                <tr class="hover:bg-[#F7F8FD] transition-colors">
                  <td class="px-5 py-3 font-mono text-xs font-bold text-[#0945F7]">
                    ${item.codigo}
                  </td>
                  <td class="px-5 py-3 font-semibold text-[#19255A] max-w-[180px] truncate" title="${item.cliente_nombre}">
                    ${item.cliente_nombre}
                  </td>
                  <td class="px-5 py-3 font-medium text-slate-700">
                    ${item.hostname}
                  </td>
                  <td class="px-5 py-3 text-slate-600 text-xs">
                    <span class="px-2 py-0.5 bg-[#EDF0FF] text-[#0945F7] rounded font-semibold text-[11px] font-heading">
                      ${item.plataforma_nombre}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-xs text-slate-600 whitespace-nowrap">
                    ${item.fin_gestion_formateada}
                  </td>
                  <td class="px-5 py-3 whitespace-nowrap">
                    <span class="${
                      item.badge_color === 'danger' ? 'badge-vencido' :
                      item.badge_color === 'warning' ? 'badge-proximo' :
                      'badge-vigente'
                    }">
                      ${item.texto_vigencia}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-xs text-slate-600 max-w-[160px] truncate" title="${item.administradores_str}">
                    ${item.administradores_str}
                  </td>
                  <td class="px-5 py-3 text-right whitespace-nowrap">
                    <button data-view-activo="${item.id}" class="text-xs font-semibold text-[#0945F7] hover:text-[#001F90] hover:underline font-heading">
                      Ver activo →
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4. Interactive Charts Grid (Section 20) -->
      <div>
        <div class="mb-4">
          <h3 class="text-lg font-bold text-[#19255A] font-heading flex items-center gap-2">
            <svg class="w-5 h-5 text-[#0945F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
            Análisis y Estadísticas Visuales
          </h3>
          <p class="text-xs text-slate-500 font-body">Distribución interactiva de activos por plataforma, cliente, vigencia, administradores y cogestión</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <!-- Activos por Plataforma -->
          <div class="cmdb-card p-5 flex flex-col justify-between">
            <div class="font-bold text-sm text-[#19255A] font-heading mb-3">Activos por Plataforma</div>
            <div class="h-56 relative">
              <canvas id="chart-plataformas"></canvas>
            </div>
          </div>

          <!-- Activos por Estado de Vigencia -->
          <div class="cmdb-card p-5 flex flex-col justify-between">
            <div class="font-bold text-sm text-[#19255A] font-heading mb-3">Activos por Vigencia</div>
            <div class="h-56 relative">
              <canvas id="chart-vigencia"></canvas>
            </div>
          </div>

          <!-- Activos por Estado (Activo vs Inactivo) -->
          <div class="cmdb-card p-5 flex flex-col justify-between">
            <div class="font-bold text-sm text-[#19255A] font-heading mb-3">Activo vs Inactivo</div>
            <div class="h-56 relative">
              <canvas id="chart-estados"></canvas>
            </div>
          </div>

          <!-- Cogestión y Soporte N1 -->
          <div class="cmdb-card p-5 flex flex-col justify-between">
            <div class="font-bold text-sm text-[#19255A] font-heading mb-3">Cogestión & Soporte N1</div>
            <div class="h-56 relative">
              <canvas id="chart-cogestion"></canvas>
            </div>
          </div>

          <!-- Top Clientes (Spans 2 columns) -->
          <div class="cmdb-card p-5 md:col-span-2">
            <div class="font-bold text-sm text-[#19255A] font-heading mb-3">Top Clientes con Mayor Volumen de Activos</div>
            <div class="h-64 relative">
              <canvas id="chart-clientes"></canvas>
            </div>
          </div>

          <!-- Activos por Administrador (Spans 2 columns) -->
          <div class="cmdb-card p-5 md:col-span-2">
            <div class="font-bold text-sm text-[#19255A] font-heading mb-3">Carga de Activos por Administrador</div>
            <div class="h-64 relative">
              <canvas id="chart-administradores"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initDashboardCharts(stats: DashboardStats) {
  // Destroy previous charts
  Object.values(chartInstances).forEach(c => c.destroy());

  // 1. Chart Plataformas (Doughnut)
  const ctxPlat = document.getElementById('chart-plataformas') as HTMLCanvasElement;
  if (ctxPlat) {
    chartInstances['plataformas'] = new Chart(ctxPlat, {
      type: 'doughnut',
      data: {
        labels: stats.graficos.plataformas.labels,
        datasets: [{
          data: stats.graficos.plataformas.data,
          backgroundColor: ['#0945F7', '#00CDE2', '#5B53FF', '#19255A', '#3B4779', '#006671', '#001F90', '#93C5FD'],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Lato', size: 11 } } }
        }
      }
    });
  }

  // 2. Chart Vigencias (Doughnut)
  const ctxVig = document.getElementById('chart-vigencia') as HTMLCanvasElement;
  if (ctxVig) {
    chartInstances['vigencia'] = new Chart(ctxVig, {
      type: 'doughnut',
      data: {
        labels: stats.graficos.vigencias.labels,
        datasets: [{
          data: stats.graficos.vigencias.data,
          backgroundColor: ['#00CDE2', '#F59E0B', '#EF4444'],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Lato', size: 11 } } }
        }
      }
    });
  }

  // 3. Chart Estados (Pie)
  const ctxEst = document.getElementById('chart-estados') as HTMLCanvasElement;
  if (ctxEst) {
    chartInstances['estados'] = new Chart(ctxEst, {
      type: 'pie',
      data: {
        labels: stats.graficos.estados.labels,
        datasets: [{
          data: stats.graficos.estados.data,
          backgroundColor: ['#10B981', '#94A3B8'],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Lato', size: 11 } } }
        }
      }
    });
  }

  // 4. Chart Cogestión vs Soporte N1 (Bar)
  const ctxCog = document.getElementById('chart-cogestion') as HTMLCanvasElement;
  if (ctxCog) {
    chartInstances['cogestion'] = new Chart(ctxCog, {
      type: 'bar',
      data: {
        labels: ['Cogestión (SI)', 'Cogestión (NO)', 'Soporte N1 (SI)', 'Soporte N1 (NO)'],
        datasets: [{
          label: 'Cantidad',
          data: [
            stats.graficos.cogestion.data[0] || 0,
            stats.graficos.cogestion.data[1] || 0,
            stats.graficos.soporte_n1.data[0] || 0,
            stats.graficos.soporte_n1.data[1] || 0
          ],
          backgroundColor: ['#0945F7', '#D7E2FF', '#00CDE2', '#DDDDFE'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
          x: { grid: { display: false }, ticks: { font: { family: 'Lato', size: 10 } } }
        }
      }
    });
  }

  // 5. Chart Clientes (Horizontal Bar)
  const ctxCli = document.getElementById('chart-clientes') as HTMLCanvasElement;
  if (ctxCli) {
    chartInstances['clientes'] = new Chart(ctxCli, {
      type: 'bar',
      data: {
        labels: stats.graficos.clientes.labels,
        datasets: [{
          label: 'Activos',
          data: stats.graficos.clientes.data,
          backgroundColor: '#0945F7',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: '#F1F5F9' } },
          y: { grid: { display: false }, ticks: { font: { family: 'Lato', size: 11 } } }
        }
      }
    });
  }

  // 6. Chart Administradores (Bar)
  const ctxAdm = document.getElementById('chart-administradores') as HTMLCanvasElement;
  if (ctxAdm) {
    chartInstances['administradores'] = new Chart(ctxAdm, {
      type: 'bar',
      data: {
        labels: stats.graficos.administradores.labels,
        datasets: [{
          label: 'Activos Administrados',
          data: stats.graficos.administradores.data,
          backgroundColor: '#5B53FF',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
          x: { grid: { display: false }, ticks: { font: { family: 'Lato', size: 11 } } }
        }
      }
    });
  }
}

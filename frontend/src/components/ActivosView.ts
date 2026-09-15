import { Activo, Cliente, Plataforma, User } from '../types';

export function renderActivosView(
  activos: Activo[],
  total: number,
  page: number,
  limit: number,
  totalPages: number,
  counts: { todos: number; activos: number; inactivos: number; vigentes: number; proximos: number; vencidos: number },
  filters: Record<string, string>,
  clientes: Cliente[],
  plataformas: Plataforma[],
  usuarios: User[] = []
): string {
  const currentEstado = filters.estado || 'TODOS';
  const admins = usuarios.filter(user => user.rol === 'ADMIN');

  return `
    <div class="space-y-5 animate-fadeIn">
      <!-- Top Title & Action Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold text-[#19255A] font-heading flex items-center gap-2.5">
            CMDB / Registro de Activos
          </h2>
          <p class="text-xs text-slate-500 font-body mt-0.5">
            Gestión centralizada de infraestructura tecnológica y ciclo de vida de activos
          </p>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <button id="activos-new-btn" class="btn-primary text-xs sm:text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Nuevo Activo
          </button>
          <button id="activos-export-btn" class="btn-secondary text-xs sm:text-sm">
            <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Exportar
          </button>
        </div>
      </div>

      <!-- Tabs Header (Section 21) -->
      <div class="flex items-center justify-between border-b border-[#EDF0FF] pb-2 flex-wrap gap-3">
        <div class="flex items-center gap-2">
          <!-- TODOS TAB -->
          <button 
            data-filter-estado="TODOS" 
            class="tab-estado-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-heading transition-all flex items-center gap-2 ${
              currentEstado === 'TODOS'
                ? 'bg-[#0945F7] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-[#EDF0FF] hover:text-[#0945F7] border border-[#EDF0FF]'
            }"
          >
            <span>TODOS</span>
            <span class="px-2 py-0.5 text-[11px] rounded-full ${
              currentEstado === 'TODOS' ? 'bg-white/20 text-white' : 'bg-[#EDF0FF] text-[#0945F7]'
            }">${counts.todos}</span>
          </button>

          <!-- ACTIVOS TAB -->
          <button 
            data-filter-estado="ACTIVO" 
            class="tab-estado-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-heading transition-all flex items-center gap-2 ${
              currentEstado === 'ACTIVO'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-[#EDF0FF]'
            }"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>ACTIVOS</span>
            <span class="px-2 py-0.5 text-[11px] rounded-full ${
              currentEstado === 'ACTIVO' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            }">${counts.activos}</span>
          </button>

          <!-- INACTIVOS TAB -->
          <button 
            data-filter-estado="INACTIVO" 
            class="tab-estado-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-heading transition-all flex items-center gap-2 ${
              currentEstado === 'INACTIVO'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-700 border border-[#EDF0FF]'
            }"
          >
            <span class="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>INACTIVOS</span>
            <span class="px-2 py-0.5 text-[11px] rounded-full ${
              currentEstado === 'INACTIVO' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }">${counts.inactivos}</span>
          </button>
        </div>

        <!-- Quick Filter Indicators -->
        <div class="flex items-center gap-2">
          <button id="toggle-filter-panel-btn" class="px-3 py-1.5 bg-white border border-[#D7E2FF] hover:bg-[#EDF0FF] text-xs font-bold font-heading text-[#0945F7] rounded-lg transition flex items-center gap-1.5 shadow-xs">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            Filtros Avanzados
            ${Object.keys(filters).filter(k => k !== 'estado' && k !== 'page' && k !== 'limit' && k !== 'sort_by' && k !== 'sort_order' && filters[k]).length > 0 ? `
              <span class="w-2 h-2 rounded-full bg-[#0945F7]"></span>
            ` : ''}
          </button>
        </div>
      </div>

      <!-- Advanced Filter Drawer (Section 28) -->
      <div id="filter-panel" class="cmdb-card p-4 bg-white border border-[#D7E2FF]">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <!-- Cliente Filter -->
          <div>
            <label class="block font-bold text-slate-600 font-heading mb-1">Cliente</label>
            <select id="filter-cliente" class="cmdb-input text-xs py-1.5">
              <option value="">Todos los clientes</option>
              ${clientes.map(c => `<option value="${c.id}" ${filters.cliente_id === String(c.id) ? 'selected' : ''}>${c.nombre}</option>`).join('')}
            </select>
          </div>

          <!-- Plataforma Filter -->
          <div>
            <label class="block font-bold text-slate-600 font-heading mb-1">Plataforma</label>
            <select id="filter-plataforma" class="cmdb-input text-xs py-1.5">
              <option value="">Todas las plataformas</option>
              ${plataformas.map(p => `<option value="${p.id}" ${filters.plataforma_id === String(p.id) ? 'selected' : ''}>${p.sku ? `${p.sku} - ` : ''}${p.nombre}</option>`).join('')}
            </select>
          </div>

          <!-- Administrador Filter -->
          <div>
            <label class="block font-bold text-slate-600 font-heading mb-1">Administrador</label>
            <select id="filter-administrador" class="cmdb-input text-xs py-1.5">
              <option value="">Todos los administradores</option>
              ${admins.map(a => `<option value="${a.id}" ${filters.administrador_id === String(a.id) ? 'selected' : ''}>${a.nombre}</option>`).join('')}
            </select>
          </div>

          <!-- Vigencia Filter -->
          <div>
            <label class="block font-bold text-slate-600 font-heading mb-1">Estado Vigencia</label>
            <select id="filter-vigencia" class="cmdb-input text-xs py-1.5">
              <option value="">Todas las vigencias</option>
              <option value="VIGENTE" ${filters.vigencia === 'VIGENTE' ? 'selected' : ''}>VIGENTE</option>
              <option value="PROXIMO" ${filters.vigencia === 'PROXIMO' ? 'selected' : ''}>PRÓXIMO A VENCER</option>
              <option value="VENCIDO" ${filters.vigencia === 'VENCIDO' ? 'selected' : ''}>VENCIDO</option>
            </select>
          </div>

          <!-- Rango Vencimiento Filter -->
          <div>
            <label class="block font-bold text-slate-600 font-heading mb-1">Vence en</label>
            <select id="filter-dias-rango" class="cmdb-input text-xs py-1.5">
              <option value="">Cualquier fecha</option>
              <option value="7" ${filters.dias_rango === '7' ? 'selected' : ''}>Próximos 7 días</option>
              <option value="30" ${filters.dias_rango === '30' ? 'selected' : ''}>Próximos 30 días</option>
              <option value="60" ${filters.dias_rango === '60' ? 'selected' : ''}>Próximos 60 días</option>
              <option value="90" ${filters.dias_rango === '90' ? 'selected' : ''}>Próximos 90 días</option>
            </select>
          </div>

          <!-- Cogestión Filter -->
          <div>
            <label class="block font-bold text-slate-600 font-heading mb-1">Cogestión</label>
            <select id="filter-cogestion" class="cmdb-input text-xs py-1.5">
              <option value="">Todos</option>
              <option value="SI" ${filters.cogestion === 'SI' ? 'selected' : ''}>SI</option>
              <option value="NO" ${filters.cogestion === 'NO' ? 'selected' : ''}>NO</option>
            </select>
          </div>

          <!-- Soporte N1 Filter -->
          <div>
            <label class="block font-bold text-slate-600 font-heading mb-1">¿Soporte N1?</label>
            <select id="filter-soporte-n1" class="cmdb-input text-xs py-1.5">
              <option value="">Todos</option>
              <option value="SI" ${filters.soporte_n1 === 'SI' ? 'selected' : ''}>SI</option>
              <option value="NO" ${filters.soporte_n1 === 'NO' ? 'selected' : ''}>NO</option>
            </select>
          </div>

          <!-- Ordenar por (Section 29) -->
          <div>
            <label class="block font-bold text-slate-600 font-heading mb-1">Ordenar por</label>
            <select id="filter-sort-by" class="cmdb-input text-xs py-1.5">
              <option value="id" ${filters.sort_by === 'id' ? 'selected' : ''}>ID / Creación</option>
              <option value="dias_restantes" ${filters.sort_by === 'dias_restantes' ? 'selected' : ''}>Menor días restantes (Vencimiento)</option>
              <option value="cliente" ${filters.sort_by === 'cliente' ? 'selected' : ''}>Cliente</option>
              <option value="hostname" ${filters.sort_by === 'hostname' ? 'selected' : ''}>Hostname</option>
              <option value="serial_number" ${filters.sort_by === 'serial_number' ? 'selected' : ''}>Serial Number</option>
              <option value="plataforma" ${filters.sort_by === 'plataforma' ? 'selected' : ''}>Plataforma</option>
              <option value="fin_gestion" ${filters.sort_by === 'fin_gestion' ? 'selected' : ''}>Fin de gestión</option>
            </select>
          </div>

          <!-- Orden Dirección -->
          <div>
            <label class="block font-bold text-slate-600 font-heading mb-1">Dirección</label>
            <select id="filter-sort-order" class="cmdb-input text-xs py-1.5">
              <option value="asc" ${filters.sort_order === 'asc' ? 'selected' : ''}>Ascendente (A-Z, Menor)</option>
              <option value="desc" ${filters.sort_order === 'desc' ? 'selected' : ''}>Descendente (Z-A, Mayor)</option>
            </select>
          </div>

          <!-- Clear Filters -->
          <div class="sm:col-span-2 flex items-end">
            <button id="clear-filters-btn" class="w-full py-2 px-3 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition font-heading flex items-center justify-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              Limpiar Todos los Filtros
            </button>
          </div>
        </div>
      </div>

      <!-- Professional Table Container (Section 22) -->
      <div class="cmdb-card overflow-hidden">
        <!-- Table Top Info -->
        <div class="px-5 py-3.5 bg-white border-b border-[#EDF0FF] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div class="text-slate-500 font-body">
            Mostrando <span class="font-bold text-[#19255A]">${activos.length}</span> de <span class="font-bold text-[#19255A]">${total}</span> activos encontrados
            ${filters.q ? `<span class="ml-2 px-2 py-0.5 bg-[#EDF0FF] text-[#0945F7] font-semibold rounded">Búsqueda: "${filters.q}"</span>` : ''}
          </div>

          <div class="flex items-center gap-2">
            <span class="text-slate-500 font-body">Filas por página:</span>
            <select id="select-limit" class="px-2 py-1 bg-[#F7F8FD] border border-[#D7E2FF] rounded text-xs text-[#19255A] font-medium outline-none">
              <option value="10" ${limit === 10 ? 'selected' : ''}>10</option>
              <option value="25" ${limit === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${limit === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${limit === 100 ? 'selected' : ''}>100</option>
              <option value="all" ${limit === total ? 'selected' : ''}>Todos</option>
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm font-body">
            <thead class="bg-[#F7F8FD] text-slate-500 text-xs font-bold uppercase font-heading border-b border-[#EDF0FF]">
              <tr>
                <th class="px-4 py-3 whitespace-nowrap">Código</th>
                <th class="px-4 py-3 whitespace-nowrap">Estado</th>
                <th class="px-4 py-3 whitespace-nowrap">Cliente</th>
                <th class="px-4 py-3 whitespace-nowrap">Hostname</th>
                <th class="px-4 py-3 whitespace-nowrap">Serial Number</th>
                <th class="px-4 py-3 whitespace-nowrap">Plataforma</th>
                <th class="px-4 py-3 whitespace-nowrap">PET / Proyecto</th>
                <th class="px-4 py-3 whitespace-nowrap">Gestión</th>
                <th class="px-4 py-3 whitespace-nowrap">Administrador(es)</th>
                <th class="px-4 py-3 whitespace-nowrap">Fin Gestión</th>
                <th class="px-4 py-3 whitespace-nowrap">Vigencia</th>
                <th class="px-4 py-3 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${activos.length === 0 ? `
                <tr>
                  <td colspan="12" class="px-5 py-12 text-center text-slate-400">
                    <div class="flex flex-col items-center justify-center gap-2">
                      <svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      <p class="text-sm font-medium text-slate-500 font-heading">No se encontraron activos con los filtros aplicados</p>
                      <button id="empty-clear-btn" class="mt-2 text-xs font-bold text-[#0945F7] hover:underline font-heading">Limpiar filtros de búsqueda</button>
                    </div>
                  </td>
                </tr>
              ` : activos.map(a => `
                <tr class="hover:bg-[#F7F8FD] transition-colors group">
                  <!-- Código -->
                  <td class="px-4 py-3 font-mono text-xs font-bold text-[#0945F7] whitespace-nowrap">
                    <button data-view-activo="${a.id}" class="hover:underline flex items-center gap-1">
                      ${a.codigo}
                    </button>
                  </td>

                  <!-- Estado -->
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="${a.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'}">
                      <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${a.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                      ${a.estado}
                    </span>
                  </td>

                  <!-- Cliente -->
                  <td class="px-4 py-3 font-semibold text-[#19255A] max-w-[160px] truncate whitespace-nowrap" title="${a.cliente_nombre}">
                    <button data-view-cliente="${a.cliente_id}" class="hover:text-[#0945F7] hover:underline text-left">
                      ${a.cliente_nombre}
                    </button>
                  </td>

                  <!-- Hostname -->
                  <td class="px-4 py-3 font-medium text-slate-700 max-w-[150px] truncate whitespace-nowrap" title="${a.hostname}">
                    ${a.hostname}
                  </td>

                  <!-- Serial Number (Section 6) -->
                  <td class="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                    <div class="flex items-center gap-1.5">
                      <span>${a.serial_number}</span>
                      <button data-copy="${a.serial_number}" data-copy-label="Serial Number" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#0945F7] transition" title="Copiar Serial">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                      </button>
                    </div>
                  </td>

                  <!-- Plataforma -->
                  <td class="px-4 py-3 text-xs whitespace-nowrap">
                    <span class="px-2 py-0.5 bg-[#EDF0FF] text-[#0945F7] font-semibold rounded font-heading text-[11px]">
                      ${a.plataforma_sku ? a.plataforma_sku : a.plataforma_nombre}
                    </span>
                  </td>

                  <!-- PET / Proyecto -->
                  <td class="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    <div class="font-semibold text-[#19255A]">${a.pet || '—'}</div>
                    <div class="text-[11px] text-slate-500 max-w-[140px] truncate" title="${a.nombre_proyecto || 'Sin proyecto'}">${a.nombre_proyecto || 'Sin proyecto'}</div>
                  </td>

                  <!-- Gestión (IP / URL) (Section 8) -->
                  <td class="px-4 py-3 text-xs whitespace-nowrap">
                    ${a.ip_url_gestion && a.ip_url_gestion.startsWith('http') ? `
                      <div class="flex items-center gap-1">
                        <a href="${a.ip_url_gestion}" target="_blank" rel="noopener noreferrer" class="text-[#0945F7] hover:underline inline-flex items-center gap-1 font-medium" title="Abrir URL de gestión">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                          Abrir
                        </a>
                        <button data-copy="${a.ip_url_gestion}" data-copy-label="URL de Gestión" class="p-1 text-slate-400 hover:text-[#0945F7]" title="Copiar URL">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                        </button>
                      </div>
                    ` : `
                      <span class="text-slate-500 font-mono text-[11px]">${a.ip_url_gestion || 'N/A'}</span>
                    `}
                  </td>

                  <!-- Administrador -->
                  <td class="px-4 py-3 text-xs text-slate-600 max-w-[150px] truncate whitespace-nowrap" title="${a.administradores_str}">
                    ${a.administradores_str || '<span class="text-slate-400 italic">Sin asignar</span>'}
                  </td>

                  <!-- Fin de Gestión -->
                  <td class="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    ${a.fin_gestion_formateada}
                  </td>

                  <!-- Vigencia (Dynamic calculation) -->
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="${
                      a.vigencia.badge_color === 'danger' ? 'badge-vencido' :
                      a.vigencia.badge_color === 'warning' ? 'badge-proximo' :
                      a.vigencia.badge_color === 'cyan' ? 'badge-vigente' :
                      'badge-neutral'
                    }">
                      ${a.vigencia.texto_vigencia}
                    </span>
                  </td>

                  <!-- Acciones -->
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1">
                      <!-- Ver 360 -->
                      <button data-view-activo="${a.id}" class="p-1.5 text-slate-500 hover:text-[#0945F7] hover:bg-[#EDF0FF] rounded-lg transition" title="Ver Vista 360°">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </button>

                      <!-- Toggle Estado (Section 25 & 26) -->
                      <button data-toggle-estado="${a.id}" data-current-estado="${a.estado}" data-codigo="${a.codigo}" class="p-1.5 ${
                        a.estado === 'ACTIVO' ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      } rounded-lg transition" title="${a.estado === 'ACTIVO' ? 'Cambiar a INACTIVO' : 'Reactivar a ACTIVO'}">
                        ${a.estado === 'ACTIVO' ? `
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        ` : `
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        `}
                      </button>

                      <!-- Editar -->
                      <button data-edit-activo="${a.id}" class="p-1.5 text-slate-500 hover:text-[#0945F7] hover:bg-[#EDF0FF] rounded-lg transition" title="Editar Activo">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div class="px-5 py-3.5 bg-white border-t border-[#EDF0FF] flex items-center justify-between flex-wrap gap-3 text-xs font-heading">
          <div class="text-slate-500 font-body">
            Página <span class="font-bold text-[#19255A]">${page}</span> de <span class="font-bold text-[#19255A]">${totalPages || 1}</span>
          </div>

          <div class="flex items-center gap-1.5">
            <button id="prev-page-btn" ${page <= 1 ? 'disabled' : ''} class="px-3 py-1.5 border border-[#D7E2FF] rounded-lg font-bold hover:bg-[#EDF0FF] disabled:opacity-40 disabled:pointer-events-none transition text-slate-600 flex items-center gap-1">
              ← Anterior
            </button>
            <span class="px-3 py-1.5 bg-[#EDF0FF] text-[#0945F7] font-bold rounded-lg">${page}</span>
            <button id="next-page-btn" ${page >= totalPages ? 'disabled' : ''} class="px-3 py-1.5 border border-[#D7E2FF] rounded-lg font-bold hover:bg-[#EDF0FF] disabled:opacity-40 disabled:pointer-events-none transition text-slate-600 flex items-center gap-1">
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

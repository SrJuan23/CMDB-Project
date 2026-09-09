import { Plataforma } from '../types';

export function renderPlataformasView(plataformas: Plataforma[]): string {
  return `
    <div class="space-y-5 animate-fadeIn">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold text-[#19255A] font-heading">Plataformas</h2>
          <p class="text-xs text-slate-500 font-body mt-0.5">Tecnologías y servicios soportados</p>
        </div>
        <button id="plataforma-new-btn" class="btn-primary text-xs sm:text-sm">+ Nueva Plataforma</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${plataformas.length === 0 ? `
          <div class="md:col-span-3 cmdb-card p-8 text-center text-slate-400 font-body">No hay plataformas registradas.</div>
        ` : plataformas.map(p => `
          <div class="cmdb-card-interactive p-5">
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-sm font-bold text-[#19255A] font-heading leading-tight pr-2">${p.nombre}</h3>
              <span class="${p.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'} text-[10px]">${p.estado}</span>
            </div>
            ${p.descripcion ? `<p class="text-xs text-slate-500 font-body mb-3 line-clamp-2">${p.descripcion}</p>` : ''}
            <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#EDF0FF]">
              <div class="text-center">
                <div class="text-lg font-extrabold text-[#0945F7] font-heading">${p.total_activos || 0}</div>
                <div class="text-[10px] text-slate-500 font-heading uppercase">Activos</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-extrabold text-emerald-600 font-heading">${p.activos_count || 0}</div>
                <div class="text-[10px] text-slate-500 font-heading uppercase">Activos</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-extrabold text-rose-600 font-heading">${p.vencidos_count || 0}</div>
                <div class="text-[10px] text-slate-500 font-heading uppercase">Vencidos</div>
              </div>
            </div>
            <div class="flex items-center gap-1 mt-3 pt-3 border-t border-[#EDF0FF]">
              <button data-view-plataforma="${p.id}" class="flex-1 px-3 py-1.5 text-xs font-bold text-[#0945F7] hover:bg-[#EDF0FF] rounded-lg transition font-heading">Ver activos</button>
              <button data-edit-plataforma="${p.id}" class="p-1.5 text-slate-400 hover:text-[#0945F7] hover:bg-[#EDF0FF] rounded-lg transition" title="Editar">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button data-delete-plataforma="${p.id}" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Eliminar">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

import { Persona } from '../types';
import type { NavigationTab } from './Sidebar';

export function renderPersonasView(personas: Persona[], currentTab: NavigationTab): string {
  const filtered = personas.filter(p => {
    if (currentTab === 'usuarios') return p.tipo === 'ADMINISTRADOR';
    return true;
  });
  const title = 'Usuarios';

  return `
    <div class="space-y-5 animate-fadeIn">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold text-[#19255A] font-heading">${title}</h2>
          <p class="text-xs text-slate-500 font-body mt-0.5">${filtered.length} personas registradas</p>
        </div>
        <button id="persona-new-btn" class="btn-primary text-xs sm:text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nueva Persona
        </button>
      </div>

      <div class="cmdb-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm font-body">
            <thead class="bg-[#F7F8FD] text-slate-500 text-xs font-bold uppercase font-heading border-b border-[#EDF0FF]">
              <tr>
                <th class="px-4 py-3">Nombre</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">Tipo</th>
                <th class="px-4 py-3">Activos</th>
                <th class="px-4 py-3">Activos</th>
                <th class="px-4 py-3">Inactivos</th>
                <th class="px-4 py-3">Vencidos</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${filtered.length === 0 ? `<tr><td colspan="8" class="text-center py-12 text-slate-400">Sin personas registradas</td></tr>` : filtered.map(p => `
                <tr class="hover:bg-[#F7F8FD] transition-colors">
                  <td class="px-4 py-3 font-semibold text-[#19255A]"><button data-view-persona="${p.id}" class="hover:text-[#0945F7] hover:underline">${p.nombre}</button></td>
                  <td class="px-4 py-3 text-slate-600 text-xs">${p.email || '—'}</td>
                  <td class="px-4 py-3"><span class="px-2 py-0.5 bg-[#EDF0FF] text-[#0945F7] font-semibold rounded text-[11px]">${p.tipo}</span></td>
                  <td class="px-4 py-3 text-center font-bold text-[#0945F7]">${p.total_activos || 0}</td>
                  <td class="px-4 py-3 text-center font-semibold text-emerald-600">${p.activos_count || 0}</td>
                  <td class="px-4 py-3 text-center text-slate-500">${p.inactivos_count || 0}</td>
                  <td class="px-4 py-3 text-center font-semibold text-rose-600">${p.vencidos_count || 0}</td>
                  <td class="px-4 py-3 text-right">
                    <button data-edit-persona="${p.id}" class="p-1.5 text-slate-400 hover:text-[#0945F7] hover:bg-[#EDF0FF] rounded-lg transition" title="Editar">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button data-delete-persona="${p.id}" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Eliminar">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

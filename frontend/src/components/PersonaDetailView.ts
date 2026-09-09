import { api } from '../services/api';

export function renderPersonaDetailView(personaId: number): string {
  return `
    <div class="space-y-5 animate-fadeIn">
      <div class="flex items-center gap-3">
        <button id="back-to-persona-btn" class="p-2 rounded-lg text-slate-500 hover:bg-[#EDF0FF] hover:text-[#0945F7] transition" title="Volver">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h2 class="text-2xl font-extrabold text-[#19255A] font-heading">Cargando persona...</h2>
      </div>
      <div id="persona-detail-content" class="hidden"></div>
    </div>
  `;
}

export function initPersonaDetailView(personaId: number): void {
  const container = document.getElementById('persona-detail-content');
  const heading = document.querySelector('main h2');
  if (!container || !heading) return;

  api.getPersonaActivos(personaId).then((data: any) => {
    heading.textContent = data.persona.nombre;
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div class="cmdb-card p-4 border-l-4 border-l-[#0945F7]">
          <div class="text-xs font-bold text-slate-500 uppercase font-heading">Total</div>
          <div class="text-2xl font-extrabold text-[#19255A] font-heading mt-1">${data.activos.length}</div>
        </div>
        <div class="cmdb-card p-4 border-l-4 border-l-emerald-500">
          <div class="text-xs font-bold text-emerald-700 uppercase font-heading">Activos</div>
          <div class="text-2xl font-extrabold text-emerald-600 font-heading mt-1">${data.activos.filter((a: any) => a.estado === 'ACTIVO').length}</div>
        </div>
        <div class="cmdb-card p-4 border-l-4 border-l-amber-500">
          <div class="text-xs font-bold text-amber-700 uppercase font-heading">Por vencer</div>
          <div class="text-2xl font-extrabold text-amber-600 font-heading mt-1">${data.activos.filter((a: any) => a.vigencia.estado_vigencia === 'PRÓXIMO A VENCER').length}</div>
        </div>
        <div class="cmdb-card p-4 border-l-4 border-l-rose-500">
          <div class="text-xs font-bold text-rose-700 uppercase font-heading">Vencidos</div>
          <div class="text-2xl font-extrabold text-rose-600 font-heading mt-1">${data.activos.filter((a: any) => a.vigencia.estado_vigencia === 'VENCIDO').length}</div>
        </div>
      </div>

      <div class="cmdb-card overflow-hidden">
        <div class="px-5 py-3 border-b border-[#EDF0FF]">
          <h3 class="text-sm font-bold text-[#19255A] font-heading uppercase tracking-wide">Activos Asociados (${data.activos.length})</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm font-body">
            <thead class="bg-[#F7F8FD] text-slate-500 text-xs font-bold uppercase font-heading border-b border-[#EDF0FF]">
              <tr>
                <th class="px-4 py-3">Código</th>
                <th class="px-4 py-3">Cliente</th>
                <th class="px-4 py-3">Hostname</th>
                <th class="px-4 py-3">Plataforma</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3">Vigencia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${data.activos.map((a: any) => `
                <tr class="hover:bg-[#F7F8FD] transition-colors">
                  <td class="px-4 py-3 font-mono text-xs font-bold text-[#0945F7]"><button data-view-activo="${a.id}" class="hover:underline">${a.codigo}</button></td>
                  <td class="px-4 py-3 text-slate-700">${a.cliente_nombre}</td>
                  <td class="px-4 py-3 font-medium text-slate-700">${a.hostname}</td>
                  <td class="px-4 py-3"><span class="px-2 py-0.5 bg-[#EDF0FF] text-[#0945F7] font-semibold rounded text-[11px]">${a.plataforma_nombre}</span></td>
                  <td class="px-4 py-3"><span class="${a.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'}">${a.estado}</span></td>
                  <td class="px-4 py-3"><span class="${a.vigencia.badge_color === 'danger' ? 'badge-vencido' : a.vigencia.badge_color === 'warning' ? 'badge-proximo' : 'badge-vigente'}">${a.vigencia.texto_vigencia}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).catch(err => {
    heading.textContent = 'Error al cargar la persona';
    container.classList.remove('hidden');
    container.innerHTML = `<div class="text-center py-12 text-rose-600 font-body">${err.message || 'Error desconocido'}</div>`;
  });
}

import { api } from '../services/api';

export function renderPlataformaDetailView(plataformaId: number): string {
  return `
    <div class="space-y-5 animate-fadeIn">
      <div class="flex items-center gap-3">
        <button id="back-to-plataforma-btn" class="p-2 rounded-lg text-slate-500 hover:bg-[#EDF0FF] hover:text-[#0945F7] transition" title="Volver">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h2 class="text-2xl font-extrabold text-[#19255A] font-heading">Cargando plataforma...</h2>
      </div>
      <div id="plataforma-detail-content" class="hidden"></div>
    </div>
  `;
}

export function initPlataformaDetailView(plataformaId: number): void {
  const container = document.getElementById('plataforma-detail-content');
  const heading = document.querySelector('main h2');
  if (!container || !heading) return;

  api.getPlataformaActivos(plataformaId).then((data: any) => {
    heading.textContent = data.plataforma.nombre;
    container.classList.remove('hidden');
    container.innerHTML = `
      ${data.plataforma.descripcion ? `<p class="text-sm text-slate-500 font-body">${data.plataforma.descripcion}</p>` : ''}
      <div class="cmdb-card overflow-hidden">
        <div class="px-5 py-3 border-b border-[#EDF0FF]">
          <h3 class="text-sm font-bold text-[#19255A] font-heading uppercase tracking-wide">Activos (${data.activos.length})</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm font-body">
            <thead class="bg-[#F7F8FD] text-slate-500 text-xs font-bold uppercase font-heading border-b border-[#EDF0FF]">
              <tr>
                <th class="px-4 py-3">Código</th>
                <th class="px-4 py-3">Cliente</th>
                <th class="px-4 py-3">Hostname</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3">Fin Gestión</th>
                <th class="px-4 py-3">Vigencia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${data.activos.map((a: any) => `
                <tr class="hover:bg-[#F7F8FD] transition-colors">
                  <td class="px-4 py-3 font-mono text-xs font-bold text-[#0945F7]"><button data-view-activo="${a.id}" class="hover:underline">${a.codigo}</button></td>
                  <td class="px-4 py-3"><button data-view-cliente="${a.cliente_id}" class="text-slate-700 hover:text-[#0945F7] hover:underline font-medium">${a.cliente_nombre}</button></td>
                  <td class="px-4 py-3 font-medium text-slate-700">${a.hostname}</td>
                  <td class="px-4 py-3"><span class="${a.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'}">${a.estado}</span></td>
                  <td class="px-4 py-3 text-xs text-slate-600">${a.fin_gestion_formateada}</td>
                  <td class="px-4 py-3"><span class="${a.vigencia.badge_color === 'danger' ? 'badge-vencido' : a.vigencia.badge_color === 'warning' ? 'badge-proximo' : 'badge-vigente'}">${a.vigencia.texto_vigencia}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).catch(err => {
    heading.textContent = 'Error al cargar la plataforma';
    container.classList.remove('hidden');
    container.innerHTML = `<div class="text-center py-12 text-rose-600 font-body">${err.message || 'Error desconocido'}</div>`;
  });
}

import { api } from '../services/api';

export function renderClienteDetailView(clienteId: number): string {
  return `
    <div class="space-y-5 animate-fadeIn">
      <div class="flex items-center gap-3">
        <button id="back-to-cliente-btn" class="p-2 rounded-lg text-slate-500 hover:bg-[#EDF0FF] hover:text-[#0945F7] transition" title="Volver">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h2 class="text-2xl font-extrabold text-[#19255A] font-heading">Cargando cliente...</h2>
      </div>
      <div id="cliente-detail-content" class="hidden"></div>
    </div>
  `;
}

export function initClienteDetailView(clienteId: number): void {
  const container = document.getElementById('cliente-detail-content');
  const heading = document.querySelector('main h2');
  if (!container || !heading) return;

  api.getCliente360(clienteId).then((data: any) => {
    heading.textContent = data.cliente.nombre;
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div class="cmdb-card p-5 border-l-4 border-l-[#0945F7]">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider font-heading">Total Activos</div>
          <div class="mt-2 text-3xl font-extrabold text-[#19255A] font-heading">${data.resumen.total_activos}</div>
        </div>
        <div class="cmdb-card p-5 border-l-4 border-l-emerald-500">
          <div class="text-xs font-bold text-emerald-700 uppercase tracking-wider font-heading">Activos Operando</div>
          <div class="mt-2 text-3xl font-extrabold text-emerald-600 font-heading">${data.resumen.activos}</div>
        </div>
        <div class="cmdb-card p-5 border-l-4 border-l-rose-500">
          <div class="text-xs font-bold text-rose-700 uppercase tracking-wider font-heading">Vencidos</div>
          <div class="mt-2 text-3xl font-extrabold text-rose-600 font-heading">${data.resumen.vencidos}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-3 uppercase tracking-wide">Plataformas Utilizadas</h3>
          <div class="space-y-2">
            ${data.plataformas_utilizadas.length === 0 ? '<p class="text-sm text-slate-400">Sin plataformas registradas</p>' :
              data.plataformas_utilizadas.map((p: any) => `<div class="flex items-center justify-between p-2 bg-[#F7F8FD] rounded"><span class="text-sm text-slate-700">${p.nombre}</span><span class="text-xs font-bold text-[#0945F7]">${p.cantidad}</span></div>`).join('')}
          </div>
        </div>
        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-3 uppercase tracking-wide">Administradores</h3>
          <div class="space-y-2">
            ${data.administradores.length === 0 ? '<p class="text-sm text-slate-400">Sin administradores asignados</p>' :
              data.administradores.map((a: any) => `<div class="flex items-center justify-between p-2 bg-[#F7F8FD] rounded"><span class="text-sm text-slate-700">${a.nombre}</span><span class="text-xs font-bold text-[#0945F7]">${a.cantidad}</span></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="cmdb-card overflow-hidden">
        <div class="px-5 py-3 border-b border-[#EDF0FF]">
          <h3 class="text-sm font-bold text-[#19255A] font-heading uppercase tracking-wide">Activos del Cliente (${data.activos.length})</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm font-body">
            <thead class="bg-[#F7F8FD] text-slate-500 text-xs font-bold uppercase font-heading border-b border-[#EDF0FF]">
              <tr>
                <th class="px-4 py-3">Código</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3">Hostname</th>
                <th class="px-4 py-3">Plataforma</th>
                <th class="px-4 py-3">Fin Gestión</th>
                <th class="px-4 py-3">Vigencia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${data.activos.map((a: any) => `
                <tr class="hover:bg-[#F7F8FD] transition-colors">
                  <td class="px-4 py-3 font-mono text-xs font-bold text-[#0945F7]"><button data-view-activo="${a.id}" class="hover:underline">${a.codigo}</button></td>
                  <td class="px-4 py-3"><span class="${a.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'}">${a.estado}</span></td>
                  <td class="px-4 py-3 font-medium text-slate-700">${a.hostname}</td>
                  <td class="px-4 py-3"><span class="px-2 py-0.5 bg-[#EDF0FF] text-[#0945F7] font-semibold rounded text-[11px]">${a.plataforma_nombre}</span></td>
                  <td class="px-4 py-3 text-xs text-slate-600">${a.fin_gestion_formateada}</td>
                  <td class="px-4 py-3">
                    <span class="${a.vigencia.badge_color === 'danger' ? 'badge-vencido' : a.vigencia.badge_color === 'warning' ? 'badge-proximo' : 'badge-vigente'}">${a.vigencia.texto_vigencia}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).catch(err => {
    heading.textContent = 'Error al cargar el cliente';
    container.classList.remove('hidden');
    container.innerHTML = `<div class="text-center py-12 text-rose-600 font-body">${err.message || 'Error desconocido'}</div>`;
  });
}

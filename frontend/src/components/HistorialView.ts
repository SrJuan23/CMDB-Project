import { HistorialItem } from '../types';

export function renderHistorialView(historial: HistorialItem[], total: number, page: number, limit: number, totalPages: number): string {
  return `
    <div class="space-y-5 animate-fadeIn">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold text-[#19255A] font-heading">Historial de Cambios</h2>
          <p class="text-xs text-slate-500 font-body mt-0.5">Auditoría completa de modificaciones — ${total} registros</p>
        </div>
      </div>

      <div class="cmdb-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm font-body">
            <thead class="bg-[#F7F8FD] text-slate-500 text-xs font-bold uppercase font-heading border-b border-[#EDF0FF]">
              <tr>
                <th class="px-4 py-3 whitespace-nowrap">Fecha</th>
                <th class="px-4 py-3">Usuario</th>
                <th class="px-4 py-3">Activo</th>
                <th class="px-4 py-3">Campo</th>
                <th class="px-4 py-3">Valor Anterior</th>
                <th class="px-4 py-3">Valor Nuevo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${historial.length === 0 ? `<tr><td colspan="6" class="text-center py-12 text-slate-400">Sin cambios registrados</td></tr>` : historial.map(h => `
                <tr class="hover:bg-[#F7F8FD] transition-colors">
                  <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">${new Date(h.fecha).toLocaleString('es-CO')}</td>
                  <td class="px-4 py-3"><span class="font-semibold text-[#0945F7]">${h.usuario_nombre}</span></td>
                  <td class="px-4 py-3 font-mono text-xs font-bold text-[#0945F7]">${h.activo_codigo}</td>
                  <td class="px-4 py-3 text-sm font-medium text-slate-700">${h.campo}</td>
                  <td class="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate" title="${h.valor_anterior || ''}">${h.valor_anterior || 'N/A'}</td>
                  <td class="px-4 py-3 text-xs text-slate-700 max-w-[200px] truncate" title="${h.valor_nuevo || ''}">${h.valor_nuevo || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${totalPages > 1 ? `
          <div class="px-5 py-3 bg-white border-t border-[#EDF0FF] flex items-center justify-between text-xs font-heading">
            <div class="text-slate-500">Página <span class="font-bold text-[#19255A]">${page}</span> de <span class="font-bold text-[#19255A]">${totalPages}</span></div>
            <div class="flex items-center gap-1.5">
              <button id="hist-prev-page" ${page <= 1 ? 'disabled' : ''} class="px-3 py-1.5 border border-[#D7E2FF] rounded-lg font-bold hover:bg-[#EDF0FF] disabled:opacity-40 transition">← Anterior</button>
              <button id="hist-next-page" ${page >= totalPages ? 'disabled' : ''} class="px-3 py-1.5 border border-[#D7E2FF] rounded-lg font-bold hover:bg-[#EDF0FF] disabled:opacity-40 transition">Siguiente →</button>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

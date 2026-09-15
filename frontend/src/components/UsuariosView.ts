import { User } from '../types';

export function renderUsuariosView(usuarios: User[]): string {
  return `
    <div class="space-y-5 animate-fadeIn">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold text-[#19255A] font-heading">Usuarios</h2>
          <p class="text-xs text-slate-500 font-body mt-0.5">${usuarios.length} usuarios registrados</p>
        </div>
        <button id="usuario-new-btn" class="btn-primary text-xs sm:text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nuevo Usuario
        </button>
      </div>
      <div class="cmdb-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm font-body">
            <thead class="bg-[#F7F8FD] text-slate-500 text-xs font-bold uppercase font-heading border-b border-[#EDF0FF]">
              <tr>
                <th class="px-4 py-3">Nombre</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">Rol</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3">Primer acceso</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${usuarios.length === 0 ? '<tr><td colspan="6" class="text-center py-12 text-slate-400">Sin usuarios registrados</td></tr>' : usuarios.map(u => `
                <tr class="hover:bg-[#F7F8FD] transition-colors">
                  <td class="px-4 py-3 font-semibold text-[#19255A]">${u.nombre}</td>
                  <td class="px-4 py-3 text-slate-600 text-xs">${u.email}</td>
                  <td class="px-4 py-3"><span class="px-2 py-0.5 bg-[#EDF0FF] text-[#0945F7] font-semibold rounded text-[11px]">${u.rol}</span></td>
                  <td class="px-4 py-3"><span class="${u.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'} text-[10px]">${u.estado || 'ACTIVO'}</span></td>
                  <td class="px-4 py-3 text-xs ${u.password_change_required ? 'text-amber-600 font-semibold' : 'text-slate-500'}">${u.password_change_required ? 'Pendiente' : 'Completado'}</td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    <button data-edit-usuario="${u.id}" class="p-1.5 text-slate-400 hover:text-[#0945F7] hover:bg-[#EDF0FF] rounded-lg transition" title="Editar">✎</button>
                    <button data-delete-usuario="${u.id}" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Eliminar">🗑</button>
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

import { api } from '../services/api';

export function renderActivoDetailView(activoId: number): string {
  return `
    <div class="space-y-5 animate-fadeIn">
      <div class="flex items-center gap-3">
        <button id="back-to-list-btn" class="p-2 rounded-lg text-slate-500 hover:bg-[#EDF0FF] hover:text-[#0945F7] transition" title="Volver">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h2 class="text-2xl font-extrabold text-[#19255A] font-heading">Cargando activo...</h2>
      </div>
      <div id="activo-detail-content" class="hidden"></div>
    </div>
  `;
}

export function initActivoDetailView(activoId: number): void {
  const container = document.getElementById('activo-detail-content');
  const heading = document.querySelector('main h2');
  if (!container || !heading) return;

  api.getActivoById(activoId).then(activo => {
    heading.innerHTML = `<span class="font-mono text-[#0945F7]">${activo.codigo}</span> <span class="text-slate-500">— ${activo.hostname}</span>`;
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div class="flex items-center gap-2">
          <span class="${activo.estado === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'}">
            <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${activo.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
            ${activo.estado}
          </span>
          <span class="${
            activo.vigencia.badge_color === 'danger' ? 'badge-vencido' :
            activo.vigencia.badge_color === 'warning' ? 'badge-proximo' :
            activo.vigencia.badge_color === 'cyan' ? 'badge-vigente' : 'badge-neutral'
          }">${activo.vigencia.texto_vigencia}</span>
        </div>
        <div class="flex items-center gap-2">
          <button data-edit-activo="${activo.id}" class="btn-secondary text-xs">Editar</button>
          <button data-toggle-estado="${activo.id}" data-current-estado="${activo.estado}" data-codigo="${activo.codigo}" class="btn-secondary text-xs">${activo.estado === 'ACTIVO' ? 'Cambiar a INACTIVO' : 'Reactivar'}</button>
          <button data-delete-activo="${activo.id}" data-codigo="${activo.codigo}" class="btn-danger text-xs">Eliminar</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-3 uppercase tracking-wide">Información General</h3>
          <div class="space-y-3 text-sm">
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">Cliente</div>
              <button data-view-cliente="${activo.cliente_id}" class="font-semibold text-[#19255A] hover:text-[#0945F7] hover:underline">${activo.cliente_nombre}</button>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">Hostname</div>
              <div class="font-medium text-slate-700">${activo.hostname}</div>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">Serial Number</div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-slate-700">${activo.serial_number}</span>
                <button data-copy="${activo.serial_number}" data-copy-label="Serial" class="p-1 text-slate-400 hover:text-[#0945F7]"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
              </div>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">Plataforma</div>
              <span class="px-2 py-0.5 bg-[#EDF0FF] text-[#0945F7] font-semibold rounded font-heading text-xs">${activo.plataforma_nombre}</span>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">PEP</div>
              <div class="font-medium text-slate-700">${activo.pep || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-3 uppercase tracking-wide">Gestión y Vigencia</h3>
          <div class="space-y-3 text-sm">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <div class="text-xs text-slate-500 font-heading mb-0.5">Inicio</div>
                <div class="font-medium text-slate-700">${activo.inicio_gestion_formateada}</div>
              </div>
              <div>
                <div class="text-xs text-slate-500 font-heading mb-0.5">Fin</div>
                <div class="font-medium text-slate-700">${activo.fin_gestion_formateada}</div>
              </div>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">Días restantes</div>
              <div class="font-bold text-[#19255A] text-lg font-heading">${activo.dias_restantes !== null ? activo.dias_restantes : 'Sin fecha'}</div>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">Cogestión</div>
              <span class="${activo.cogestion === 'SI' ? 'badge-activo' : 'badge-neutral'}">${activo.cogestion}</span>
            </div>
          </div>
        </div>

        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-3 uppercase tracking-wide">Administración</h3>
          <div class="space-y-3 text-sm">
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">Líder</div>
              <div class="font-medium text-slate-700">${activo.lider_nombre || 'Sin asignar'}</div>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">Administrador(es)</div>
              <div class="font-medium text-slate-700">${activo.administradores_str || 'Sin asignar'}</div>
            </div>
          </div>
        </div>

        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-3 uppercase tracking-wide">Acceso y Soporte</h3>
          <div class="space-y-3 text-sm">
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">URL / IP de gestión</div>
              <div class="flex items-center gap-2 flex-wrap">
                ${activo.ip_url_gestion && activo.ip_url_gestion.startsWith('http') ?
                  `<a href="${activo.ip_url_gestion}" target="_blank" rel="noopener noreferrer" class="text-[#0945F7] hover:underline font-medium">Abrir gestión →</a>` :
                  `<span class="font-mono text-slate-700">${activo.ip_url_gestion || 'N/A'}</span>`}
                <button data-copy="${activo.ip_url_gestion}" data-copy-label="URL" class="p-1 text-slate-400 hover:text-[#0945F7]"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
              </div>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">Correo de soporte</div>
              <div class="flex items-center gap-2 flex-wrap">
                ${activo.correo_soporte ? `<a href="mailto:${activo.correo_soporte}" class="text-[#0945F7] hover:underline font-medium">${activo.correo_soporte}</a>` : '<span class="text-slate-400">N/A</span>'}
                ${activo.correo_soporte ? `<button data-copy="${activo.correo_soporte}" data-copy-label="Email" class="p-1 text-slate-400 hover:text-[#0945F7]"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>` : ''}
              </div>
            </div>
            <div>
              <div class="text-xs text-slate-500 font-heading mb-0.5">¿Soporte N1?</div>
              <span class="${activo.soporte_n1 === 'SI' ? 'badge-activo' : 'badge-neutral'}">${activo.soporte_n1}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="cmdb-card p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-[#19255A] font-heading uppercase tracking-wide">
            Tickets Relacionados (${activo.tickets_relacionados?.length || 0})
          </h3>
          <button id="add-ticket-btn" data-activo-id="${activo.id}" class="text-xs font-bold text-[#0945F7] hover:underline font-heading flex items-center gap-1">
            + Nuevo Ticket
          </button>
        </div>
        ${!activo.tickets_relacionados || activo.tickets_relacionados.length === 0 ? `
          <p class="text-xs text-slate-400 font-body py-2">No hay tickets registrados para este activo.</p>
        ` : `
          <div class="space-y-2">
            ${activo.tickets_relacionados.map((t: any) => `
              <div class="flex items-center justify-between p-3 bg-[#F7F8FD] rounded-lg">
                <div>
                  <span class="font-mono text-xs font-bold text-[#0945F7]">${t.ticket_codigo}</span>
                  <span class="ml-2 text-sm text-slate-700">${t.titulo}</span>
                  <span class="ml-2 text-[10px] text-slate-400 font-heading">(${t.prioridad || 'MEDIA'})</span>
                </div>
                <span class="text-xs font-semibold ${t.estado === 'ABIERTO' ? 'badge-vencido' : 'badge-activo'}">${t.estado}</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      ${activo.historial && activo.historial.length > 0 ? `
        <div class="cmdb-card p-5">
          <h3 class="text-sm font-bold text-[#19255A] font-heading mb-3 uppercase tracking-wide">Historial de Cambios</h3>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            ${activo.historial.map((h: any) => `
              <div class="flex items-start gap-3 p-3 border-l-2 border-[#0945F7] bg-[#F7F8FD] rounded-r-lg">
                <div class="flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-bold text-[#0945F7]">${h.usuario_nombre}</span>
                    <span class="text-xs text-slate-400">•</span>
                    <span class="text-xs text-slate-500">${new Date(h.fecha).toLocaleString('es-CO')}</span>
                  </div>
                  <div class="text-sm font-semibold text-[#19255A] mt-1">${h.campo}</div>
                  <div class="text-xs text-slate-600 mt-0.5">${h.valor_anterior || 'N/A'} → ${h.valor_nuevo || 'N/A'}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }).catch(err => {
    heading.textContent = 'Error al cargar el activo';
    container.classList.remove('hidden');
    container.innerHTML = `<div class="text-center py-12 text-rose-600 font-body">${err.message || 'Error desconocido'}</div>`;
  });
}

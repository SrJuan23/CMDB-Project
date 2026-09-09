export function renderConfiguracionView(config: Record<string, string>): string {
  return `
    <div class="space-y-5 animate-fadeIn">
      <div>
        <h2 class="text-2xl font-extrabold text-[#19255A] font-heading">Configuración</h2>
        <p class="text-xs text-slate-500 font-body mt-0.5">Parámetros generales del sistema</p>
      </div>

      <div class="cmdb-card p-6 max-w-2xl">
        <h3 class="text-sm font-bold text-[#19255A] font-heading mb-4 uppercase tracking-wide">Parámetros de Vigencia</h3>
        <form class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Días para alerta de próximo vencimiento</label>
            <input type="number" id="config-dias" min="1" max="365" value="${config.dias_proximo_vencer || '30'}" class="cmdb-input" />
            <p class="text-[11px] text-slate-500 font-body mt-1">Cantidad de días antes del vencimiento para mostrar alerta "PRÓXIMO A VENCER".</p>
          </div>

          <div class="flex items-start gap-2 pt-2 border-t border-[#EDF0FF]">
            <input type="checkbox" id="config-bloquear" ${config.bloquear_duplicados_serial === '1' ? 'checked' : ''} class="mt-1" />
            <div>
              <label for="config-bloquear" class="text-sm font-semibold text-[#19255A] font-heading cursor-pointer">Bloquear duplicados de Serial Number</label>
              <p class="text-[11px] text-slate-500 font-body mt-0.5">Si está activo, no se permitirá crear un activo con un Serial Number ya existente. Si está inactivo, solo mostrará advertencia.</p>
            </div>
          </div>

          <div class="pt-2 flex justify-end">
            <button type="button" id="save-config-btn" class="btn-primary">Guardar Configuración</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

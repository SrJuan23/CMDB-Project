import './style.css';
import { api, getToken, clearToken } from './services/api';
import { User, Activo, Cliente, Plataforma, Persona, DashboardStats, HistorialItem } from './types';
import { renderSidebar, NavigationTab } from './components/Sidebar';
import { renderNavbar } from './components/Navbar';
import { renderDashboardView, initDashboardCharts } from './components/DashboardView';
import { renderActivosView } from './components/ActivosView';
import { renderActivoDetailView, initActivoDetailView } from './components/ActivoDetailView';
import { renderClientesView } from './components/ClientesView';
import { renderClienteDetailView, initClienteDetailView } from './components/ClienteDetailView';
import { renderPlataformasView } from './components/PlataformasView';
import { renderPlataformaDetailView, initPlataformaDetailView } from './components/PlataformaDetailView';
import { renderPersonasView } from './components/PersonasView';
import { renderPersonaDetailView, initPersonaDetailView } from './components/PersonaDetailView';
import { renderHistorialView } from './components/HistorialView';
import { renderConfiguracionView } from './components/ConfiguracionView';
import { renderReportesView } from './components/ReportesView';
import { showToast, showConfirmDialog, copyToClipboard } from './utils/ui';

type DetailView = 
  | { type: 'activo'; id: number } 
  | { type: 'cliente'; id: number } 
  | { type: 'plataforma'; id: number } 
  | { type: 'persona'; id: number } 
  | null;

let currentTab: NavigationTab = 'dashboard';
let currentUser: User | null = null;
let sidebarCollapsed = false;
let detailView: DetailView = null;
let dashboardStats: DashboardStats | null = null;
let allClientes: Cliente[] = [];
let allPlataformas: Plataforma[] = [];
let allPersonas: Persona[] = [];
let activosData: Activo[] = [];
let activosMeta = { total: 0, page: 1, limit: 25, totalPages: 1 };
let activosCounts = { todos: 0, activos: 0, inactivos: 0, vigentes: 0, proximos: 0, vencidos: 0 };
let historialData: HistorialItem[] = [];
let historialMeta = { total: 0, page: 1, limit: 50, totalPages: 1 };
let configData: Record<string, string> = {};
let notificationsCount = 0;
let globalListenersSetup = false;

const activosFilters: Record<string, string> = { 
  estado: 'TODOS', 
  page: '1', 
  limit: '25', 
  sort_by: 'id', 
  sort_order: 'desc' 
};

async function init() {
  if (!getToken()) {
    showLogin();
    return;
  }

  try {
    currentUser = await api.me();
  } catch {
    clearToken();
    showLogin();
    return;
  }

  await loadInitialData();
  renderApp();
  setupGlobalListeners();
}

async function loadActivos() {
  try {
    const res = await api.getActivos(activosFilters);
    activosData = res.data || [];
    activosMeta = {
      total: res.total || 0,
      page: res.page || 1,
      limit: res.limit || 25,
      totalPages: res.totalPages || 1
    };
    if (res.counts) {
      activosCounts = res.counts;
    }
  } catch (err: any) {
    console.error('Error al cargar activos:', err);
    showToast(err.message || 'Error al cargar activos', 'error');
  }
}

async function loadHistorial() {
  try {
    const res = await api.getHistorial({ 
      limit: String(historialMeta.limit), 
      page: String(historialMeta.page) 
    });
    historialData = res.data || [];
    historialMeta = { 
      total: res.total, 
      page: res.page, 
      limit: res.limit, 
      totalPages: res.totalPages 
    };
  } catch (err: any) {
    showToast(err.message || 'Error al cargar historial', 'error');
  }
}

async function loadInitialData() {
  try {
    const [stats, clientes, plataformas, personas, historial, config, activos] = await Promise.all([
      api.getDashboardStats().catch(() => null),
      api.getClientes().catch(() => []),
      api.getPlataformas().catch(() => []),
      api.getPersonas().catch(() => []),
      api.getHistorial({ limit: '50' }).catch(() => ({ data: [], total: 0, page: 1, limit: 50, totalPages: 1 })),
      api.getConfig().catch(() => ({ dias_proximo_vencer: '30', bloquear_duplicados_serial: '0' })),
      api.getActivos(activosFilters).catch(() => ({ 
        data: [], total: 0, page: 1, limit: 25, totalPages: 1, 
        counts: { todos: 0, activos: 0, inactivos: 0, vigentes: 0, proximos: 0, vencidos: 0 } 
      }))
    ]);

    dashboardStats = stats;
    allClientes = clientes;
    allPlataformas = plataformas;
    allPersonas = personas;
    historialData = historial.data || [];
    historialMeta = { 
      total: historial.total, 
      page: historial.page, 
      limit: historial.limit, 
      totalPages: historial.totalPages 
    };
    configData = config;
    activosData = activos.data || [];
    activosMeta = {
      total: activos.total,
      page: activos.page,
      limit: activos.limit,
      totalPages: activos.totalPages
    };
    if (activos.counts) activosCounts = activos.counts;
    notificationsCount = (stats?.kpis?.vencidos || 0) + (stats?.kpis?.proximos_a_vencer || 0);
  } catch (err) {
    console.error('Error in loadInitialData:', err);
  }
}

function showLogin() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="min-h-screen bg-[#F7F8FD] flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl border border-[#EDF0FF] shadow-lg p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0945F7] to-[#5B53FF] text-white flex items-center justify-center font-bold text-2xl font-heading shadow-lg mx-auto mb-4 ring-2 ring-[#00CDE2]/40">
            <svg class="w-8 h-8 text-[#00CDE2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-extrabold text-[#19255A] font-heading">TTECH CMDB</h1>
          <p class="text-sm text-slate-500 font-body mt-1">Plataforma de Gestión de Activos Tecnológicos</p>
        </div>

        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Email</label>
            <input type="email" id="login-email" required value="admin@ttech.com" class="cmdb-input" placeholder="usuario@ttech.com" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Contraseña</label>
            <input type="password" id="login-password" required value="Admin123!*" class="cmdb-input" placeholder="••••••••" />
          </div>
          <button type="submit" class="btn-primary w-full">Iniciar Sesión</button>
        </form>

        <div class="mt-6 pt-4 border-t border-[#EDF0FF] text-xs text-slate-500 space-y-1 font-body">
          <div class="font-bold text-[#19255A]">Usuarios de prueba:</div>
          <div class="flex justify-between"><span>ADMIN:</span> <span class="font-mono">admin@ttech.com (Admin123!*)</span></div>
          <div class="flex justify-between"><span>GESTOR:</span> <span class="font-mono">gestor@ttech.com (Gestor123!*)</span></div>
          <div class="flex justify-between"><span>CONSULTA:</span> <span class="font-mono">consulta@ttech.com (Consulta123!*)</span></div>
        </div>

        <p class="text-center text-xs text-slate-400 mt-6 font-body">Suite Corporativa TTECH v2.4</p>
      </div>
    </div>`;

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const email = (document.getElementById('login-email') as HTMLInputElement).value;
      const pass = (document.getElementById('login-password') as HTMLInputElement).value;
      const res = await api.login(email, pass);
      currentUser = res.user;
      await loadInitialData();
      renderApp();
      setupGlobalListeners();
      showToast(`Bienvenido ${currentUser.nombre}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error de autenticación', 'error');
    }
  });
}

function renderApp() {
  if (!currentUser) return;
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="flex min-h-screen bg-[#F7F8FD]">
      ${renderSidebar(currentTab, sidebarCollapsed, dashboardStats?.kpis?.total_activos || activosMeta.total || 0)}
      <div class="flex-1 flex flex-col min-w-0">
        ${renderNavbar(currentUser, handleSearch, handleRoleChange, handleNotifications, notificationsCount)}
        <main id="main-content" class="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">${renderCurrentView()}</main>
      </div>
    </div>`;

  if (currentTab === 'dashboard' && dashboardStats) {
    initDashboardCharts(dashboardStats);
  }

  if (detailView) {
    if (detailView.type === 'activo') initActivoDetailView(detailView.id);
    else if (detailView.type === 'cliente') initClienteDetailView(detailView.id);
    else if (detailView.type === 'plataforma') initPlataformaDetailView(detailView.id);
    else if (detailView.type === 'persona') initPersonaDetailView(detailView.id);
  }
}

function renderCurrentView(): string {
  if (detailView) {
    if (detailView.type === 'activo') return renderActivoDetailView(detailView.id);
    if (detailView.type === 'cliente') return renderClienteDetailView(detailView.id);
    if (detailView.type === 'plataforma') return renderPlataformaDetailView(detailView.id);
    if (detailView.type === 'persona') return renderPersonaDetailView(detailView.id);
  }

  switch (currentTab) {
    case 'dashboard': 
      return dashboardStats ? renderDashboardView(dashboardStats) : '<div class="text-center py-12 text-slate-400 font-body">Cargando dashboard...</div>';
    case 'activos': 
      return renderActivosView(
        activosData, 
        activosMeta.total, 
        activosMeta.page, 
        activosMeta.limit, 
        activosMeta.totalPages, 
        activosCounts, 
        activosFilters, 
        allClientes, 
        allPlataformas, 
        allPersonas
      );
    case 'clientes': 
      return renderClientesView(allClientes);
    case 'plataformas': 
      return renderPlataformasView(allPlataformas);
    case 'lideres': 
    case 'administradores': 
      return renderPersonasView(allPersonas, currentTab);
    case 'historial': 
      return renderHistorialView(
        historialData, 
        historialMeta.total, 
        historialMeta.page, 
        historialMeta.limit, 
        historialMeta.totalPages
      );
    case 'configuracion': 
      return renderConfiguracionView(configData);
    case 'reportes': 
      return renderReportesView(dashboardStats);
    default: 
      return dashboardStats ? renderDashboardView(dashboardStats) : '<div class="text-center py-12 text-slate-400 font-body">Cargando...</div>';
  }
}

async function navigateTo(tab: NavigationTab) {
  currentTab = tab;
  detailView = null;

  if (tab === 'activos') {
    activosFilters.page = '1';
    await loadActivos();
  } else if (tab === 'historial') {
    await loadHistorial();
  }

  renderApp();
  window.scrollTo(0, 0);
}

function showActivoDetail(id: number) {
  detailView = { type: 'activo', id };
  renderApp();
  window.scrollTo(0, 0);
}

function showClienteDetail(id: number) {
  detailView = { type: 'cliente', id };
  renderApp();
  window.scrollTo(0, 0);
}

function showPlataformaDetail(id: number) {
  detailView = { type: 'plataforma', id };
  renderApp();
  window.scrollTo(0, 0);
}

function showPersonaDetail(id: number) {
  detailView = { type: 'persona', id };
  renderApp();
  window.scrollTo(0, 0);
}

async function handleSearch(query: string) {
  currentTab = 'activos';
  detailView = null;
  activosFilters.page = '1';
  if (query.trim()) {
    activosFilters.q = query.trim();
  } else {
    delete activosFilters.q;
  }
  await loadActivos();
  renderApp();
}

function performSearch() {
  const i = document.getElementById('global-search-input') as HTMLInputElement;
  if (i) handleSearch(i.value);
}

async function handleRoleChange(newRole: string) {
  const roleCreds: Record<string, { email: string; pass: string }> = {
    ADMIN: { email: 'admin@ttech.com', pass: 'Admin123!*' },
    GESTOR: { email: 'gestor@ttech.com', pass: 'Gestor123!*' },
    CONSULTA: { email: 'consulta@ttech.com', pass: 'Consulta123!*' }
  };

  if (!roleCreds[newRole]) return;

  try {
    showToast(`Cambiando a sesión ${newRole}...`, 'info');
    const res = await api.login(roleCreds[newRole].email, roleCreds[newRole].pass);
    currentUser = res.user;
    await loadInitialData();
    renderApp();
    showToast(`Sesión activa como: ${newRole}`, 'success');
  } catch (err: any) {
    showToast(err.message || 'Error al cambiar rol', 'error');
  }
}

function handleNotifications() {
  if (!notificationsCount) {
    showToast('No hay activos vencidos o próximos a vencer', 'info');
    return;
  }
  currentTab = 'activos';
  detailView = null;
  activosFilters.estado = 'TODOS';
  activosFilters.vigencia = 'PROXIMO';
  activosFilters.page = '1';
  loadActivos().then(() => renderApp());
}

function logout() {
  showConfirmDialog({
    title: 'Cerrar Sesión',
    message: '¿Estás seguro de que deseas salir del sistema CMDB?',
    confirmText: 'Cerrar Sesión',
    cancelText: 'Cancelar',
    isDanger: true,
    onConfirm: async () => {
      clearToken();
      currentUser = null;
      detailView = null;
      currentTab = 'dashboard';
      activosFilters.estado = 'TODOS';
      activosFilters.page = '1';
      showLogin();
    }
  });
}

async function toggleEstado(id: number, estadoActual: string, codigo: string) {
  const nuevoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
  showConfirmDialog({
    title: `Cambiar estado a ${nuevoEstado}`,
    message: `¿Deseas marcar el activo ${codigo} como ${nuevoEstado}?`,
    confirmText: `Confirmar (${nuevoEstado})`,
    cancelText: 'Cancelar',
    isDanger: nuevoEstado === 'INACTIVO',
    onConfirm: async () => {
      try {
        await api.cambiarEstado(id, nuevoEstado as any);
        showToast(`${codigo} actualizado a ${nuevoEstado}`, 'success');
        await loadInitialData();
        renderApp();
      } catch (err: any) {
        showToast(err.message || 'Error al cambiar estado', 'error');
      }
    }
  });
}

function showImportExcelModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-bold text-[#19255A] font-heading flex items-center gap-2">
          <svg class="w-5 h-5 text-[#0945F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Importación Masiva desde Excel
        </h3>
        <button id="close-modal-x" class="text-slate-400 hover:text-slate-600 p-1">✕</button>
      </div>
      <p class="text-xs text-slate-500 font-body mb-4">
        Sube un archivo Excel con pestañas ACTIVO e INACTIVO para actualizar o incorporar activos a la CMDB.
      </p>

      <div class="border-2 border-dashed border-[#D7E2FF] rounded-xl p-6 text-center hover:bg-[#F7F8FD] transition cursor-pointer mb-3">
        <input type="file" id="excel-file-input" accept=".xlsx,.xls" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:font-heading file:bg-[#0945F7] file:text-white hover:file:bg-[#001F90] cursor-pointer"/>
        <p class="text-[11px] text-slate-400 mt-2">Formatos aceptados: .xlsx, .xls</p>
      </div>

      <div class="mb-4">
        <button id="use-default-file-btn" class="w-full py-2 px-3 text-xs font-bold text-[#0945F7] bg-[#EDF0FF] hover:bg-[#D7E2FF] rounded-lg transition font-heading flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          O usar archivo base del servidor (data/CMDB_Soporte.xlsx)
        </button>
      </div>

      <div id="preview-result-container" class="hidden flex-1 overflow-y-auto border border-[#EDF0FF] rounded-xl p-3 mb-3 bg-[#F7F8FD]">
        <div class="text-xs font-bold text-[#19255A] font-heading mb-2">Vista previa de importación:</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs mb-3">
          <div class="p-2 bg-white rounded-lg border border-slate-200">
            <div class="text-slate-400 text-[10px] uppercase font-heading">Total</div>
            <div id="prev-total" class="font-bold text-base text-[#19255A]">0</div>
          </div>
          <div class="p-2 bg-white rounded-lg border border-slate-200">
            <div class="text-slate-400 text-[10px] uppercase font-heading">Nuevos</div>
            <div id="prev-nuevos" class="font-bold text-base text-emerald-600">0</div>
          </div>
          <div class="p-2 bg-white rounded-lg border border-slate-200">
            <div class="text-slate-400 text-[10px] uppercase font-heading">Duplicados</div>
            <div id="prev-dup" class="font-bold text-base text-amber-600">0</div>
          </div>
          <div class="p-2 bg-white rounded-lg border border-slate-200">
            <div class="text-slate-400 text-[10px] uppercase font-heading">Errores</div>
            <div id="prev-err" class="font-bold text-base text-rose-600">0</div>
          </div>
        </div>
        <div id="prev-err-list" class="text-[11px] text-rose-600 space-y-1"></div>
      </div>

      <div class="flex justify-end gap-3 mt-auto pt-2 border-t border-[#EDF0FF]">
        <button id="cancel-import-btn" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition font-heading">
          Cancelar
        </button>
        <button id="confirm-import-btn" class="px-4 py-2 text-xs font-semibold text-white bg-[#0945F7] hover:bg-[#001F90] rounded-lg transition font-heading shadow-sm disabled:opacity-50 disabled:pointer-events-none" disabled>
          Proceder con la importación
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const cleanup = () => modal.remove();

  modal.querySelector('#cancel-import-btn')?.addEventListener('click', cleanup);
  modal.querySelector('#close-modal-x')?.addEventListener('click', cleanup);
  modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });

  const fileInput = modal.querySelector('#excel-file-input') as HTMLInputElement;
  const useDefaultBtn = modal.querySelector('#use-default-file-btn') as HTMLButtonElement;
  const confirmBtn = modal.querySelector('#confirm-import-btn') as HTMLButtonElement;
  const previewContainer = modal.querySelector('#preview-result-container') as HTMLDivElement;

  let selectedFile: File | undefined = undefined;

  async function runPreview(file?: File) {
    selectedFile = file;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Analizando archivo...';

    try {
      const prev = await api.previewExcel(file);
      previewContainer.classList.remove('hidden');
      (modal.querySelector('#prev-total') as HTMLElement).textContent = String(prev.total_encontrados);
      (modal.querySelector('#prev-nuevos') as HTMLElement).textContent = String(prev.nuevos);
      (modal.querySelector('#prev-dup') as HTMLElement).textContent = String(prev.posibles_duplicados);
      (modal.querySelector('#prev-err') as HTMLElement).textContent = String(prev.errores_count);

      const errList = modal.querySelector('#prev-err-list') as HTMLElement;
      if (prev.errores && prev.errores.length > 0) {
        errList.innerHTML = prev.errores.map((e: any) => `<div>• Fila ${e.fila} (${e.hoja}): ${e.error}</div>`).join('');
      } else {
        errList.innerHTML = `<div class="text-emerald-600 font-medium">✓ Validación correcta sin errores estructurales.</div>`;
      }

      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirmar e Importar a Base de Datos';
    } catch (err: any) {
      showToast(err.message || 'Error al analizar archivo', 'error');
      confirmBtn.textContent = 'Reintentar';
    }
  }

  fileInput?.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (f) runPreview(f);
  });

  useDefaultBtn?.addEventListener('click', () => {
    runPreview(undefined);
  });

  confirmBtn?.addEventListener('click', async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Importando datos...';
    try {
      const res = await api.executeImport(selectedFile);
      cleanup();
      showToast(`Importación completada: ${res.importados} creados, ${res.actualizados} actualizados`, 'success');
      await loadInitialData();
      renderApp();
    } catch (err: any) {
      showToast(err.message || 'Error en importación', 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Reintentar Importación';
    }
  });
}

function exportActivos(customParams?: Record<string, string>) {
  const params = { ...activosFilters, ...(customParams || {}) };
  window.open(api.getExportUrl(params), '_blank');
  showToast('Generando archivo para descarga...', 'info');
}

function showActivoForm(activo?: any) {
  const isEdit = !!activo;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto';

  const leaders = allPersonas.filter(p => p.tipo === 'LIDER' || p.tipo === 'AMBOS');
  const admins = allPersonas.filter(p => p.tipo === 'ADMINISTRADOR' || p.tipo === 'AMBOS');
  const currentAdminIds = new Set((activo?.administradores || []).map((a: any) => a.id));

  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-[#19255A] font-heading">
          ${isEdit ? `Editar Activo (${activo.codigo})` : 'Nuevo Activo Tecnológico'}
        </h3>
        <button id="close-modal-x" class="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <form id="activo-form" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Cliente -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Cliente *</label>
            <select id="f-cli" required class="cmdb-input text-xs">
              <option value="">Seleccionar cliente</option>
              ${allClientes.map(c => `<option value="${c.id}" ${activo?.cliente_id === c.id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
            </select>
          </div>

          <!-- Hostname -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Hostname *</label>
            <input type="text" id="f-host" value="${activo?.hostname || ''}" required class="cmdb-input text-xs" placeholder="Ej: FW-CORP-01" />
          </div>

          <!-- Serial Number -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Serial Number *</label>
            <input type="text" id="f-serial" value="${activo?.serial_number || ''}" required class="cmdb-input text-xs font-mono" placeholder="Ej: FGT60E4Q18012345" />
          </div>

          <!-- Plataforma -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Plataforma *</label>
            <select id="f-plat" required class="cmdb-input text-xs">
              <option value="">Seleccionar plataforma</option>
              ${allPlataformas.map(p => `<option value="${p.id}" ${activo?.plataforma_id === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}
            </select>
          </div>

          <!-- IP / URL Gestión -->
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">IP / URL de Gestión *</label>
            <input type="text" id="f-url" value="${activo?.ip_url_gestion || ''}" required class="cmdb-input text-xs font-mono" placeholder="Ej: https://192.168.1.1:8443 o IP de administración" />
          </div>

          <!-- Líder -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Líder Asignado</label>
            <select id="f-lider" class="cmdb-input text-xs">
              <option value="">Sin asignar</option>
              ${leaders.map(p => `<option value="${p.id}" ${activo?.lider_id === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}
            </select>
          </div>

          <!-- Cogestión -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Cogestión</label>
            <select id="f-cog" class="cmdb-input text-xs">
              <option value="NO" ${!activo || activo.cogestion === 'NO' ? 'selected' : ''}>NO</option>
              <option value="SI" ${activo?.cogestion === 'SI' ? 'selected' : ''}>SI</option>
            </select>
          </div>

          <!-- Fechas de Gestión -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Inicio de Gestión</label>
            <input type="date" id="f-ini" value="${activo?.inicio_gestion || ''}" class="cmdb-input text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Fin de Gestión (Vencimiento)</label>
            <input type="date" id="f-fin" value="${activo?.fin_gestion || ''}" class="cmdb-input text-xs" />
          </div>

          <!-- Correo Soporte -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Correo de Soporte</label>
            <input type="email" id="f-mail" value="${activo?.correo_soporte || ''}" class="cmdb-input text-xs" placeholder="soporte@empresa.com" />
          </div>

          <!-- Soporte N1 -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">¿Soporte N1?</label>
            <select id="f-n1" class="cmdb-input text-xs">
              <option value="NO" ${!activo || activo.soporte_n1 === 'NO' ? 'selected' : ''}>NO</option>
              <option value="SI" ${activo?.soporte_n1 === 'SI' ? 'selected' : ''}>SI</option>
            </select>
          </div>

          <!-- Estado -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Estado</label>
            <select id="f-est" class="cmdb-input text-xs">
              <option value="ACTIVO" ${!activo || activo.estado === 'ACTIVO' ? 'selected' : ''}>ACTIVO</option>
              <option value="INACTIVO" ${activo?.estado === 'INACTIVO' ? 'selected' : ''}>INACTIVO</option>
            </select>
          </div>

          <!-- Código PEP -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Código PEP</label>
            <input type="text" id="f-pep" value="${activo?.pep || ''}" class="cmdb-input text-xs" placeholder="PEP-XXXX" />
          </div>

          <!-- Administradores Asignados -->
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Administradores Técnicos</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-[#F7F8FD] rounded-xl border border-[#EDF0FF] max-h-36 overflow-y-auto">
              ${admins.map(a => `
                <label class="flex items-center gap-2 text-xs font-body text-slate-700 cursor-pointer">
                  <input type="checkbox" name="admin_ids" value="${a.id}" ${currentAdminIds.has(a.id) ? 'checked' : ''} class="rounded border-slate-300 text-[#0945F7] focus:ring-[#0945F7]"/>
                  <span class="truncate" title="${a.nombre}">${a.nombre}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-3 border-t border-[#EDF0FF]">
          <button type="button" id="cancel-activo-form" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition font-heading">
            Cancelar
          </button>
          <button type="submit" class="btn-primary text-xs">
            ${isEdit ? 'Guardar Cambios' : 'Crear Activo'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  const cleanup = () => modal.remove();

  modal.querySelector('#cancel-activo-form')?.addEventListener('click', cleanup);
  modal.querySelector('#close-modal-x')?.addEventListener('click', cleanup);
  modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });

  modal.querySelector('#activo-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const checkedAdmins: number[] = [];
    modal.querySelectorAll('input[name="admin_ids"]:checked').forEach((cb: any) => {
      checkedAdmins.push(parseInt(cb.value, 10));
    });

    const data: any = {
      cliente_id: (document.getElementById('f-cli') as HTMLSelectElement).value,
      hostname: (document.getElementById('f-host') as HTMLInputElement).value,
      serial_number: (document.getElementById('f-serial') as HTMLInputElement).value,
      plataforma_id: (document.getElementById('f-plat') as HTMLSelectElement).value,
      ip_url_gestion: (document.getElementById('f-url') as HTMLInputElement).value,
      lider_id: (document.getElementById('f-lider') as HTMLSelectElement).value || null,
      cogestion: (document.getElementById('f-cog') as HTMLSelectElement).value,
      inicio_gestion: (document.getElementById('f-ini') as HTMLInputElement).value || null,
      fin_gestion: (document.getElementById('f-fin') as HTMLInputElement).value || null,
      correo_soporte: (document.getElementById('f-mail') as HTMLInputElement).value || null,
      soporte_n1: (document.getElementById('f-n1') as HTMLSelectElement).value,
      estado: (document.getElementById('f-est') as HTMLSelectElement).value,
      pep: (document.getElementById('f-pep') as HTMLInputElement).value || null,
      administradores_ids: checkedAdmins
    };

    try {
      if (isEdit && activo) {
        await api.updateActivo(activo.id, data);
        showToast('Activo actualizado con éxito', 'success');
      } else {
        await api.createActivo(data);
        showToast('Activo creado con éxito', 'success');
      }
      cleanup();
      await loadInitialData();
      renderApp();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar activo', 'error');
    }
  });
}

function showTicketModal(activoId: number) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-[#19255A] font-heading">Registrar Ticket de Soporte</h3>
        <button id="close-ticket-x" class="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <form id="ticket-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Código del Ticket *</label>
          <input type="text" id="t-code" required class="cmdb-input text-xs font-mono" placeholder="Ej: INC-98432 o TCK-2026-01" />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Título / Descripción del Caso *</label>
          <input type="text" id="t-title" required class="cmdb-input text-xs" placeholder="Ej: Falla en enlace de fibra o cambio de fuente" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Prioridad</label>
            <select id="t-prio" class="cmdb-input text-xs">
              <option value="BAJA">BAJA</option>
              <option value="MEDIA" selected>MEDIA</option>
              <option value="ALTA">ALTA</option>
              <option value="CRITICA">CRÍTICA</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Estado</label>
            <select id="t-status" class="cmdb-input text-xs">
              <option value="ABIERTO" selected>ABIERTO</option>
              <option value="EN PROCESO">EN PROCESO</option>
              <option value="RESUELTO">RESUELTO</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" id="cancel-ticket-form" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition font-heading">
            Cancelar
          </button>
          <button type="submit" class="btn-primary text-xs">Guardar Ticket</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  const cleanup = () => modal.remove();

  modal.querySelector('#cancel-ticket-form')?.addEventListener('click', cleanup);
  modal.querySelector('#close-ticket-x')?.addEventListener('click', cleanup);
  modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });

  modal.querySelector('#ticket-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      activo_id: activoId,
      ticket_codigo: (document.getElementById('t-code') as HTMLInputElement).value.trim(),
      titulo: (document.getElementById('t-title') as HTMLInputElement).value.trim(),
      prioridad: (document.getElementById('t-prio') as HTMLSelectElement).value,
      estado: (document.getElementById('t-status') as HTMLSelectElement).value
    };

    try {
      await api.createTicket(data);
      showToast('Ticket registrado exitosamente', 'success');
      cleanup();
      initActivoDetailView(activoId);
    } catch (err: any) {
      showToast(err.message || 'Error al crear ticket', 'error');
    }
  });
}

function showClienteForm(cliente?: any) {
  const isEdit = !!cliente;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-[#19255A] font-heading">${isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
        <button id="close-modal-x" class="text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <form id="cliente-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Nombre de la Empresa *</label>
          <input type="text" id="f-cli-nom" value="${cliente?.nombre || ''}" required class="cmdb-input text-xs" placeholder="Ej: EMPRESA S.A.S" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Contacto / Teléfono / Correo</label>
          <input type="text" id="f-cli-cont" value="${cliente?.contacto || ''}" class="cmdb-input text-xs" placeholder="Ej: Juan Pérez (contacto@empresa.com)" />
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" id="cancel-cliente-form" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition font-heading">Cancelar</button>
          <button type="submit" class="btn-primary text-xs">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(modal);
  const cleanup = () => modal.remove();

  modal.querySelector('#cancel-cliente-form')?.addEventListener('click', cleanup);
  modal.querySelector('#close-modal-x')?.addEventListener('click', cleanup);
  modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });

  modal.querySelector('#cliente-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { 
      nombre: (document.getElementById('f-cli-nom') as HTMLInputElement).value.trim(), 
      contacto: (document.getElementById('f-cli-cont') as HTMLInputElement).value.trim() 
    };
    try {
      if (isEdit && cliente) {
        await api.updateCliente(cliente.id, data);
        showToast('Cliente actualizado', 'success');
      } else {
        await api.createCliente(data);
        showToast('Cliente creado', 'success');
      }
      cleanup();
      await loadInitialData();
      renderApp();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar cliente', 'error');
    }
  });
}

function showPlataformaForm(plataforma?: any) {
  const isEdit = !!plataforma;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-[#19255A] font-heading">${isEdit ? 'Editar Plataforma' : 'Nueva Plataforma'}</h3>
        <button id="close-modal-x" class="text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <form id="plataforma-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Nombre de Tecnología / Plataforma *</label>
          <input type="text" id="f-plat-nom" value="${plataforma?.nombre || ''}" required class="cmdb-input text-xs" placeholder="Ej: Fortinet FortiGate, Palo Alto, Cisco" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Descripción</label>
          <textarea id="f-plat-desc" class="cmdb-input text-xs" rows="3" placeholder="Detalles de la plataforma o versión...">${plataforma?.descripcion || ''}</textarea>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" id="cancel-plataforma-form" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition font-heading">Cancelar</button>
          <button type="submit" class="btn-primary text-xs">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(modal);
  const cleanup = () => modal.remove();

  modal.querySelector('#cancel-plataforma-form')?.addEventListener('click', cleanup);
  modal.querySelector('#close-modal-x')?.addEventListener('click', cleanup);
  modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });

  modal.querySelector('#plataforma-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { 
      nombre: (document.getElementById('f-plat-nom') as HTMLInputElement).value.trim(), 
      descripcion: (document.getElementById('f-plat-desc') as HTMLTextAreaElement).value.trim() 
    };
    try {
      if (isEdit && plataforma) {
        await api.updatePlataforma(plataforma.id, data);
        showToast('Plataforma actualizada', 'success');
      } else {
        await api.createPlataforma(data);
        showToast('Plataforma creada', 'success');
      }
      cleanup();
      await loadInitialData();
      renderApp();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar plataforma', 'error');
    }
  });
}

function showPersonaForm(persona?: any) {
  const isEdit = !!persona;
  const defaultTipo = currentTab === 'lideres' ? 'LIDER' : currentTab === 'administradores' ? 'ADMINISTRADOR' : 'AMBOS';
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-[#19255A] font-heading">${isEdit ? 'Editar Responsable' : 'Nuevo Responsable Técnico'}</h3>
        <button id="close-modal-x" class="text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <form id="persona-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Nombre Completo *</label>
          <input type="text" id="f-per-nom" value="${persona?.nombre || ''}" required class="cmdb-input text-xs" placeholder="Ej: Carlos Mendoza" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Correo Electrónico</label>
          <input type="email" id="f-per-mail" value="${persona?.email || ''}" class="cmdb-input text-xs" placeholder="carlos.mendoza@ttech.com" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Rol / Tipo</label>
          <select id="f-per-tipo" class="cmdb-input text-xs">
            <option value="LIDER" ${(persona?.tipo || defaultTipo) === 'LIDER' ? 'selected' : ''}>Líder Técnico</option>
            <option value="ADMINISTRADOR" ${(persona?.tipo || defaultTipo) === 'ADMINISTRADOR' ? 'selected' : ''}>Administrador</option>
            <option value="AMBOS" ${(persona?.tipo || defaultTipo) === 'AMBOS' ? 'selected' : ''}>Ambos (Líder y Administrador)</option>
          </select>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" id="cancel-persona-form" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition font-heading">Cancelar</button>
          <button type="submit" class="btn-primary text-xs">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(modal);
  const cleanup = () => modal.remove();

  modal.querySelector('#cancel-persona-form')?.addEventListener('click', cleanup);
  modal.querySelector('#close-modal-x')?.addEventListener('click', cleanup);
  modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });

  modal.querySelector('#persona-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { 
      nombre: (document.getElementById('f-per-nom') as HTMLInputElement).value.trim(), 
      email: (document.getElementById('f-per-mail') as HTMLInputElement).value.trim(), 
      tipo: (document.getElementById('f-per-tipo') as HTMLSelectElement).value 
    };
    try {
      if (isEdit && persona) {
        await api.updatePersona(persona.id, data);
        showToast('Responsable actualizado', 'success');
      } else {
        await api.createPersona(data);
        showToast('Responsable creado', 'success');
      }
      cleanup();
      await loadInitialData();
      renderApp();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar responsable', 'error');
    }
  });
}

function showEditActivoById(id: number) {
  api.getActivoById(id)
    .then(activo => showActivoForm(activo))
    .catch(err => showToast(err.message || 'Error al obtener activo', 'error'));
}

function showEditClienteById(id: number) {
  const c = allClientes.find(x => x.id === id);
  if (c) showClienteForm(c);
}

function showEditPlataformaById(id: number) {
  const p = allPlataformas.find(x => x.id === id);
  if (p) showPlataformaForm(p);
}

function showEditPersonaById(id: number) {
  const p = allPersonas.find(x => x.id === id);
  if (p) showPersonaForm(p);
}

async function deleteActivo(id: number, codigo: string) {
  showConfirmDialog({
    title: 'Eliminar Activo',
    message: `¿Deseas eliminar definitivamente el activo ${codigo}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar Activo',
    cancelText: 'Cancelar',
    isDanger: true,
    onConfirm: async () => {
      try {
        await api.deleteActivo(id);
        showToast(`Activo ${codigo} eliminado`, 'success');
        detailView = null;
        await loadInitialData();
        renderApp();
      } catch (err: any) {
        showToast(err.message || 'Error al eliminar activo', 'error');
      }
    }
  });
}

function setupGlobalListeners() {
  if (globalListenersSetup) return;
  globalListenersSetup = true;

  // Global delegation for clicks
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    // 1. Sidebar tab navigation
    const tabBtn = target.closest('.nav-tab-btn');
    if (tabBtn) {
      const tab = tabBtn.getAttribute('data-tab') as NavigationTab;
      if (tab) navigateTo(tab);
      return;
    }

    const btn = target.closest('button');
    if (!btn) return;

    // View Navigation
    if (btn.hasAttribute('data-view-activo')) {
      const id = Number(btn.getAttribute('data-view-activo'));
      if (!isNaN(id)) showActivoDetail(id);
      return;
    }
    if (btn.hasAttribute('data-view-cliente')) {
      const id = Number(btn.getAttribute('data-view-cliente'));
      if (!isNaN(id)) showClienteDetail(id);
      return;
    }
    if (btn.hasAttribute('data-view-plataforma')) {
      const id = Number(btn.getAttribute('data-view-plataforma'));
      if (!isNaN(id)) showPlataformaDetail(id);
      return;
    }
    if (btn.hasAttribute('data-view-persona')) {
      const id = Number(btn.getAttribute('data-view-persona'));
      if (!isNaN(id)) showPersonaDetail(id);
      return;
    }

    // Edit Modals
    if (btn.hasAttribute('data-edit-activo')) {
      const id = Number(btn.getAttribute('data-edit-activo'));
      if (!isNaN(id)) showEditActivoById(id);
      return;
    }
    if (btn.hasAttribute('data-edit-cliente')) {
      const id = Number(btn.getAttribute('data-edit-cliente'));
      if (!isNaN(id)) showEditClienteById(id);
      return;
    }
    if (btn.hasAttribute('data-edit-plataforma')) {
      const id = Number(btn.getAttribute('data-edit-plataforma'));
      if (!isNaN(id)) showEditPlataformaById(id);
      return;
    }
    if (btn.hasAttribute('data-edit-persona')) {
      const id = Number(btn.getAttribute('data-edit-persona'));
      if (!isNaN(id)) showEditPersonaById(id);
      return;
    }

    // Delete Modals
    if (btn.hasAttribute('data-delete-activo')) {
      const id = Number(btn.getAttribute('data-delete-activo'));
      const codigo = btn.getAttribute('data-codigo') || '';
      if (!isNaN(id)) deleteActivo(id, codigo);
      return;
    }
    if (btn.hasAttribute('data-delete-cliente')) {
      const id = Number(btn.getAttribute('data-delete-cliente'));
      showConfirmDialog({
        title: 'Eliminar Cliente',
        message: '¿Eliminar este cliente y desasociar sus registros?',
        confirmText: 'Eliminar',
        isDanger: true,
        onConfirm: async () => {
          try {
            await api.deleteCliente(id);
            showToast('Cliente eliminado', 'success');
            await loadInitialData();
            renderApp();
          } catch (err: any) {
            showToast(err.message || 'Error al eliminar cliente', 'error');
          }
        }
      });
      return;
    }
    if (btn.hasAttribute('data-delete-plataforma')) {
      const id = Number(btn.getAttribute('data-delete-plataforma'));
      showConfirmDialog({
        title: 'Eliminar Plataforma',
        message: '¿Eliminar esta plataforma tecnológica?',
        confirmText: 'Eliminar',
        isDanger: true,
        onConfirm: async () => {
          try {
            await api.deletePlataforma(id);
            showToast('Plataforma eliminada', 'success');
            await loadInitialData();
            renderApp();
          } catch (err: any) {
            showToast(err.message || 'Error al eliminar plataforma', 'error');
          }
        }
      });
      return;
    }
    if (btn.hasAttribute('data-delete-persona')) {
      const id = Number(btn.getAttribute('data-delete-persona'));
      showConfirmDialog({
        title: 'Eliminar Responsable',
        message: '¿Eliminar este líder / administrador?',
        confirmText: 'Eliminar',
        isDanger: true,
        onConfirm: async () => {
          try {
            await api.deletePersona(id);
            showToast('Responsable eliminado', 'success');
            await loadInitialData();
            renderApp();
          } catch (err: any) {
            showToast(err.message || 'Error al eliminar responsable', 'error');
          }
        }
      });
      return;
    }

    // Utilities
    if (btn.hasAttribute('data-copy')) {
      copyToClipboard(btn.getAttribute('data-copy') || '', btn.getAttribute('data-copy-label') || 'Información');
      return;
    }
    if (btn.hasAttribute('data-toggle-estado')) {
      await toggleEstado(
        Number(btn.getAttribute('data-toggle-estado')), 
        btn.getAttribute('data-current-estado') || 'ACTIVO', 
        btn.getAttribute('data-codigo') || ''
      );
      return;
    }

    // Filter Estado Tabs
    if (btn.hasAttribute('data-filter-estado')) {
      activosFilters.estado = btn.getAttribute('data-filter-estado') || 'TODOS';
      activosFilters.page = '1';
      detailView = null;
      await loadActivos();
      renderApp();
      return;
    }

    // Activo Detail: Add ticket
    if (btn.id === 'add-ticket-btn') {
      const activoId = Number(btn.getAttribute('data-activo-id'));
      if (!isNaN(activoId)) showTicketModal(activoId);
      return;
    }

    // Activos Pagination
    if (btn.id === 'prev-page-btn') {
      const p = Number(activosFilters.page || '1');
      if (p > 1) {
        activosFilters.page = String(p - 1);
        await loadActivos();
        renderApp();
      }
      return;
    }
    if (btn.id === 'next-page-btn') {
      const p = Number(activosFilters.page || '1');
      if (p < activosMeta.totalPages) {
        activosFilters.page = String(p + 1);
        await loadActivos();
        renderApp();
      }
      return;
    }

    // Historial Pagination
    if (btn.id === 'hist-prev-page') {
      if (historialMeta.page > 1) {
        historialMeta.page--;
        await loadHistorial();
        renderApp();
      }
      return;
    }
    if (btn.id === 'hist-next-page') {
      if (historialMeta.page < historialMeta.totalPages) {
        historialMeta.page++;
        await loadHistorial();
        renderApp();
      }
      return;
    }

    // Clear Filters
    if (btn.id === 'clear-filters-btn' || btn.id === 'empty-clear-btn') {
      activosFilters.estado = 'TODOS';
      activosFilters.page = '1';
      activosFilters.limit = '25';
      activosFilters.sort_by = 'id';
      activosFilters.sort_order = 'desc';
      delete activosFilters.cliente_id;
      delete activosFilters.plataforma_id;
      delete activosFilters.lider_id;
      delete activosFilters.administrador_id;
      delete activosFilters.vigencia;
      delete activosFilters.dias_rango;
      delete activosFilters.cogestion;
      delete activosFilters.soporte_n1;
      delete activosFilters.q;
      detailView = null;
      await loadActivos();
      renderApp();
      return;
    }

    // Excel & Quick Actions
    if (btn.id === 'sidebar-import-btn' || btn.id === 'dash-import-excel-btn' || btn.id === 'activos-import-btn') {
      showImportExcelModal();
      return;
    }
    if (btn.id === 'activos-export-btn') {
      exportActivos();
      return;
    }
    if (btn.id === 'activos-new-btn' || btn.id === 'dash-new-asset-btn') {
      showActivoForm();
      return;
    }
    if (btn.id === 'cliente-new-btn') {
      showClienteForm();
      return;
    }
    if (btn.id === 'plataforma-new-btn') {
      showPlataformaForm();
      return;
    }
    if (btn.id === 'persona-new-btn') {
      showPersonaForm();
      return;
    }

    // Topbar
    if (btn.id === 'nav-logout-btn') {
      logout();
      return;
    }
    if (btn.id === 'sidebar-toggle-btn') {
      sidebarCollapsed = !sidebarCollapsed;
      renderApp();
      return;
    }
    if (btn.id === 'nav-notifications-btn') {
      handleNotifications();
      return;
    }
    if (btn.id === 'toggle-filter-panel-btn') {
      const panel = document.getElementById('filter-panel');
      if (panel) panel.classList.toggle('hidden');
      return;
    }
    if (btn.id === 'back-to-list-btn' || btn.id === 'back-to-cliente-btn' || btn.id === 'back-to-plataforma-btn' || btn.id === 'back-to-persona-btn') {
      detailView = null;
      renderApp();
      return;
    }

    // Configuration Save
    if (btn.id === 'save-config-btn') {
      const dias = (document.getElementById('config-dias') as HTMLInputElement)?.value;
      const bloquear = (document.getElementById('config-bloquear') as HTMLInputElement)?.checked ? '1' : '0';
      try {
        await api.updateConfig({ dias_proximo_vencer: dias, bloquear_duplicados_serial: bloquear });
        showToast('Configuración guardada exitosamente', 'success');
        configData = await api.getConfig();
        await loadInitialData();
        renderApp();
      } catch (err: any) {
        showToast(err.message || 'Error al guardar configuración', 'error');
      }
      return;
    }

    // Reports Execution
    if (btn.id === 'report-inventario') {
      exportActivos({ estado: 'TODOS', format: 'excel' });
      return;
    }
    if (btn.id === 'report-activos') {
      exportActivos({ estado: 'ACTIVO', format: 'excel' });
      return;
    }
    if (btn.id === 'report-inactivos') {
      exportActivos({ estado: 'INACTIVO', format: 'excel' });
      return;
    }
    if (btn.id === 'report-vencidos') {
      exportActivos({ vigencia: 'VENCIDO', format: 'excel' });
      return;
    }
    if (btn.id === 'report-proximos') {
      exportActivos({ dias_rango: '30', format: 'excel' });
      return;
    }
    if (btn.id === 'report-clientes') {
      exportActivos({ sort_by: 'cliente', sort_order: 'asc', format: 'excel' });
      return;
    }
    if (btn.id === 'report-export-excel') {
      exportActivos({ format: 'excel' });
      return;
    }
    if (btn.id === 'report-export-csv') {
      exportActivos({ format: 'csv' });
      return;
    }
  });

  // Global delegation for changes (dropdown filters and role switcher)
  document.addEventListener('change', async (e) => {
    const target = e.target as HTMLElement;

    if (target.id === 'role-select') {
      await handleRoleChange((target as HTMLSelectElement).value);
      return;
    }

    const filterMap: Record<string, string> = {
      'select-limit': 'limit',
      'filter-sort-by': 'sort_by',
      'filter-sort-order': 'sort_order',
      'filter-cliente': 'cliente_id',
      'filter-plataforma': 'plataforma_id',
      'filter-lider': 'lider_id',
      'filter-administrador': 'administrador_id',
      'filter-vigencia': 'vigencia',
      'filter-dias-rango': 'dias_rango',
      'filter-cogestion': 'cogestion',
      'filter-soporte-n1': 'soporte_n1'
    };

    if (target.id in filterMap) {
      const select = target as HTMLSelectElement;
      const key = filterMap[target.id];
      if (select.value) {
        (activosFilters as any)[key] = select.value;
      } else {
        delete (activosFilters as any)[key];
      }
      activosFilters.page = '1';
      detailView = null;
      await loadActivos();
      renderApp();
    }
  });

  // Global delegation for search input Enter key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const searchInput = document.getElementById('global-search-input') as HTMLInputElement;
      if (document.activeElement === searchInput) {
        performSearch();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

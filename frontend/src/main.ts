import './style.css';
import { api, getToken, clearToken } from './services/api';
import { User, Activo, Cliente, Plataforma, DashboardStats, HistorialItem } from './types';
import { renderSidebar, NavigationTab } from './components/Sidebar';
import { renderNavbar } from './components/Navbar';
import { renderDashboardView, initDashboardCharts, DashboardSection, getSavedOrder, saveVisible, saveOrder } from './components/DashboardView';
import { renderActivosView } from './components/ActivosView';
import { renderActivoDetailView, initActivoDetailView } from './components/ActivoDetailView';
import { renderClientesView } from './components/ClientesView';
import { renderClienteDetailView, initClienteDetailView } from './components/ClienteDetailView';
import { renderPlataformasView } from './components/PlataformasView';
import { renderPlataformaDetailView, initPlataformaDetailView } from './components/PlataformaDetailView';
import { renderUsuariosView } from './components/UsuariosView';
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
let isDashboardEditing = false;
let dashboardVisibleSections: Set<string> = new Set(['kpis', 'vigencias', 'atencion', 'charts']);
let allClientes: Cliente[] = [];
let allPlataformas: Plataforma[] = [];
let allUsers: User[] = [];
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
    if (currentUser.password_change_required) {
      await showRequiredPasswordChange();
    }
  } catch {
    clearToken();
    showLogin();
    return;
  }

  const savedTab = localStorage.getItem('cmdb_current_tab');
  if (savedTab && ['dashboard','activos','clientes','plataformas','usuarios','reportes','historial','configuracion'].includes(savedTab)) {
    currentTab = savedTab as NavigationTab;
  }
  if (currentTab === 'usuarios' && currentUser.rol !== 'ADMIN') {
    currentTab = 'dashboard';
  }

  const savedOrder = localStorage.getItem('cmdb_dashboard_order');
  if (savedOrder) {
    try {
      const order = JSON.parse(savedOrder) as DashboardSection[];
      if (Array.isArray(order) && order.length > 0) {
        localStorage.setItem('cmdb_dashboard_order', JSON.stringify(order));
      }
    } catch {}
  }

  const savedVisible = localStorage.getItem('cmdb_dashboard_visible');
  if (savedVisible) {
    try {
      const arr = JSON.parse(savedVisible) as string[];
      if (Array.isArray(arr) && arr.length > 0) {
        dashboardVisibleSections = new Set(arr);
      }
    } catch {}
  }

  await loadInitialData();
  setupGlobalListeners();
  renderApp();
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
    const [stats, clientes, plataformas, usuarios, historial, config, activos] = await Promise.all([
      api.getDashboardStats().catch(() => null),
      api.getClientes().catch(() => []),
      api.getPlataformas().catch(() => []),
      currentUser?.rol === 'ADMIN' ? api.getUsuarios().catch(() => []) : api.getUsuariosAsignables().catch(() => []),
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
    allUsers = usuarios;
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
          <h1 class="text-2xl font-extrabold text-[#19255A] font-heading">Hiberus CMDB</h1>
          <p class="text-sm text-slate-500 font-body mt-1">Plataforma de Gestión de Activos Tecnológicos</p>
        </div>

        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Email</label>
            <input type="email" id="login-email" required value="" class="cmdb-input" placeholder="usuario@empresa.com" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Contraseña</label>
            <input type="password" id="login-password" required value="" class="cmdb-input" placeholder="••••••••" />
          </div>
          <button type="submit" class="btn-primary w-full">Iniciar Sesión</button>
        </form>

        <p class="text-center text-xs text-slate-400 mt-6 font-body">Suite Corporativa Hiberus</p>
      </div>
    </div>`;

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const email = (document.getElementById('login-email') as HTMLInputElement).value;
      const pass = (document.getElementById('login-password') as HTMLInputElement).value;
      const res = await api.login(email, pass);
      currentUser = res.user;
      if (res.password_change_required || res.user.password_change_required) {
        await showRequiredPasswordChange();
      }
      await loadInitialData();
      setupGlobalListeners();
      renderApp();
      showToast(`Bienvenido ${currentUser.nombre}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error de autenticación', 'error');
    }
  });
}

async function showRequiredPasswordChange(): Promise<void> {
  return new Promise((resolve, reject) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h3 class="text-lg font-bold text-[#19255A] font-heading">Actualiza tu contraseña</h3>
        <p class="text-xs text-slate-500 mt-1 mb-4">Por seguridad, debes cambiar la contraseña inicial antes de continuar.</p>
        <form id="required-password-form" class="space-y-4">
          <input type="password" id="required-current-password" required class="cmdb-input text-xs" placeholder="Contraseña actual" />
          <input type="password" id="required-new-password" required minlength="8" class="cmdb-input text-xs" placeholder="Nueva contraseña (mínimo 8 caracteres)" />
          <input type="password" id="required-confirm-password" required minlength="8" class="cmdb-input text-xs" placeholder="Confirmar nueva contraseña" />
          <button type="submit" class="btn-primary w-full">Guardar contraseña</button>
        </form>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#required-password-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const current = (modal.querySelector('#required-current-password') as HTMLInputElement).value;
      const next = (modal.querySelector('#required-new-password') as HTMLInputElement).value;
      const confirmation = (modal.querySelector('#required-confirm-password') as HTMLInputElement).value;
      if (next !== confirmation) {
        showToast('Las contraseñas nuevas no coinciden.', 'error');
        return;
      }
      try {
        await api.changePassword(current, next);
        if (currentUser) currentUser.password_change_required = false;
        modal.remove();
        showToast('Contraseña actualizada correctamente.', 'success');
        resolve();
      } catch (error: any) {
        showToast(error.message || 'No se pudo actualizar la contraseña.', 'error');
        reject(error);
      }
    });
  });
}

function renderApp() {
  if (!currentUser) return;
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="flex h-screen bg-[#F7F8FD] overflow-hidden">
      ${renderSidebar(currentTab, sidebarCollapsed, dashboardStats?.kpis?.total_activos || activosMeta.total || 0, currentUser.rol)}
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        ${renderNavbar(currentUser, handleSearch, handleNotifications, notificationsCount)}
        <main id="main-content" class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">${renderCurrentView()}</main>
      </div>
    </div>`;

  if (currentTab === 'dashboard' && dashboardStats) {
    try {
      initDashboardCharts(dashboardStats);
    } catch (e) {
      console.error('Error initDashboardCharts:', e);
    }
    initDashboardSortable();
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
      return dashboardStats ? renderDashboardView(dashboardStats, isDashboardEditing, dashboardVisibleSections) : '<div class="text-center py-12 text-slate-400 font-body">Cargando dashboard...</div>';
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
        allUsers
      );
    case 'clientes': 
      return renderClientesView(allClientes);
    case 'plataformas': 
      return renderPlataformasView(allPlataformas);
    case 'usuarios':
      return renderUsuariosView(allUsers);
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
  localStorage.setItem('cmdb_current_tab', tab);
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

async function toggleEstadoCliente(id: number, estadoActual: string) {
  const nuevoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
  showConfirmDialog({
    title: `Cambiar estado a ${nuevoEstado}`,
    message: `¿Deseas cambiar este cliente a ${nuevoEstado}?`,
    confirmText: `Confirmar (${nuevoEstado})`,
    cancelText: 'Cancelar',
    isDanger: nuevoEstado === 'INACTIVO',
    onConfirm: async () => {
      try {
        await api.cambiarEstadoCliente(id, nuevoEstado);
        showToast(`Cliente actualizado a ${nuevoEstado}`, 'success');
        await loadInitialData();
        renderApp();
      } catch (err: any) {
        showToast(err.message || 'Error al cambiar estado', 'error');
      }
    }
  });
}

async function toggleEstadoPlataforma(id: number, estadoActual: string) {
  const nuevoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
  showConfirmDialog({
    title: `Cambiar estado a ${nuevoEstado}`,
    message: `¿Deseas cambiar esta plataforma a ${nuevoEstado}?`,
    confirmText: `Confirmar (${nuevoEstado})`,
    cancelText: 'Cancelar',
    isDanger: nuevoEstado === 'INACTIVO',
    onConfirm: async () => {
      try {
        await api.cambiarEstadoPlataforma(id, nuevoEstado);
        showToast(`Plataforma actualizada a ${nuevoEstado}`, 'success');
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

  const admins = allUsers.filter(user => user.rol === 'ADMIN' && user.estado === 'ACTIVO');
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
              ${allPlataformas.map(p => `<option value="${p.id}" ${activo?.plataforma_id === p.id ? 'selected' : ''}>${p.sku ? `${p.sku} - ` : ''}${p.nombre}</option>`).join('')}
            </select>
          </div>

          <!-- IP / URL Gestión -->
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">IP / URL de Gestión *</label>
            <input type="text" id="f-url" value="${activo?.ip_url_gestion || ''}" required class="cmdb-input text-xs font-mono" placeholder="Ej: https://192.168.1.1:8443 o IP de administración" />
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
            <input type="email" id="f-mail" value="${activo ? (activo.correo_soporte || '') : 'soporte.tech@telefonica.com'}" class="cmdb-input text-xs" placeholder="soporte@empresa.com" />
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

          <!-- PET -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">PET</label>
            <input type="text" id="f-pet" value="${activo?.pet || ''}" class="cmdb-input text-xs" placeholder="PET-001" />
          </div>

          <!-- Nombre del Proyecto -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Nombre del Proyecto</label>
            <input type="text" id="f-nombre-proyecto" value="${activo?.nombre_proyecto || ''}" class="cmdb-input text-xs" placeholder="Proyecto X" />
          </div>

          <!-- Generación de Actas -->
          <div>
            <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Generación de Actas</label>
            <input type="date" id="f-generacion-actas" value="${activo?.generacion_actas || ''}" class="cmdb-input text-xs" />
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
      cogestion: (document.getElementById('f-cog') as HTMLSelectElement).value,
      inicio_gestion: (document.getElementById('f-ini') as HTMLInputElement).value || null,
      fin_gestion: (document.getElementById('f-fin') as HTMLInputElement).value || null,
      correo_soporte: (document.getElementById('f-mail') as HTMLInputElement).value || null,
      soporte_n1: (document.getElementById('f-n1') as HTMLSelectElement).value,
      estado: (document.getElementById('f-est') as HTMLSelectElement).value,
      pet: (document.getElementById('f-pet') as HTMLInputElement).value || null,
      nombre_proyecto: (document.getElementById('f-nombre-proyecto') as HTMLInputElement).value || null,
      generacion_actas: (document.getElementById('f-generacion-actas') as HTMLInputElement).value || null,
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
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">SKU</label>
          <input type="text" id="f-plat-sku" value="${plataforma?.sku || ''}" class="cmdb-input text-xs" placeholder="Ej: FG-VM-100, PAN-OS-11" />
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
      sku: (document.getElementById('f-plat-sku') as HTMLInputElement).value.trim() || null,
      descripcion: (document.getElementById('f-plat-desc') as HTMLTextAreaElement).value.trim() || null
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

function showUsuarioForm(usuario?: User) {
  const isEdit = !!usuario;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
      <h3 class="text-lg font-bold text-[#19255A] font-heading mb-4">${isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
      <form id="usuario-form" class="space-y-4">
        <input type="text" id="f-user-name" value="${usuario?.nombre || ''}" required class="cmdb-input text-xs" placeholder="Nombre completo" />
        <input type="email" id="f-user-email" value="${usuario?.email || ''}" required class="cmdb-input text-xs" placeholder="usuario@empresa.com" />
        <select id="f-user-role" class="cmdb-input text-xs">
          <option value="ADMIN" ${usuario?.rol === 'ADMIN' ? 'selected' : ''}>Admin</option>
          <option value="GESTOR" ${usuario?.rol === 'GESTOR' ? 'selected' : ''}>Gestor</option>
          <option value="CONSULTA" ${usuario?.rol === 'CONSULTA' ? 'selected' : ''}>Consulta / lector</option>
        </select>
        <select id="f-user-state" class="cmdb-input text-xs">
          <option value="ACTIVO" ${usuario?.estado !== 'INACTIVO' ? 'selected' : ''}>Activo</option>
          <option value="INACTIVO" ${usuario?.estado === 'INACTIVO' ? 'selected' : ''}>Inactivo</option>
        </select>
        <input type="password" id="f-user-password" ${isEdit ? '' : 'required'} minlength="8" class="cmdb-input text-xs" placeholder="${isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña inicial (mínimo 8 caracteres)'}" />
        ${!isEdit ? '<p class="text-[11px] text-slate-500">El usuario deberá cambiar esta contraseña en su primer acceso.</p>' : ''}
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" id="cancel-user-form" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button type="submit" class="btn-primary text-xs">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  const cleanup = () => modal.remove();
  modal.querySelector('#cancel-user-form')?.addEventListener('click', cleanup);
  modal.querySelector('#usuario-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const password = (modal.querySelector('#f-user-password') as HTMLInputElement).value;
    const data: any = {
      nombre: (modal.querySelector('#f-user-name') as HTMLInputElement).value.trim(),
      email: (modal.querySelector('#f-user-email') as HTMLInputElement).value.trim(),
      rol: (modal.querySelector('#f-user-role') as HTMLSelectElement).value,
      estado: (modal.querySelector('#f-user-state') as HTMLSelectElement).value
    };
    if (password) data.password = password;
    try {
      if (usuario) await api.updateUsuario(usuario.id, data);
      else await api.createUsuario({ ...data, password });
      cleanup();
      await loadInitialData();
      renderApp();
      showToast('Usuario guardado correctamente.', 'success');
    } catch (error: any) {
      showToast(error.message || 'No se pudo guardar el usuario.', 'error');
    }
  });
}

function showPersonaForm(persona?: any) {
  const isEdit = !!persona;
  const defaultTipo = 'ADMINISTRADOR';
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-[#19255A] font-heading">${isEdit ? 'Editar Persona Técnica' : 'Nueva Persona Técnica'}</h3>
        <button id="close-modal-x" class="text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <form id="persona-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Nombre Completo *</label>
          <input type="text" id="f-per-nom" value="${persona?.nombre || ''}" required class="cmdb-input text-xs" placeholder="Ej: Carlos Mendoza" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Correo Electrónico</label>
          <input type="email" id="f-per-mail" value="${persona?.email || ''}" class="cmdb-input text-xs" placeholder="persona@empresa.com" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 font-heading mb-1">Rol / Tipo</label>
          <select id="f-per-tipo" class="cmdb-input text-xs">
            <option value="ADMINISTRADOR" ${(persona?.tipo || defaultTipo) === 'ADMINISTRADOR' ? 'selected' : ''}>Administrador</option>
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

      function showUsuarioForm(usuario?: User) {
        const isEdit = !!usuario;
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm';
        modal.innerHTML = `
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-[#19255A] font-heading">${isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button id="close-modal-x" class="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form id="usuario-form" class="space-y-4">
              <input type="text" id="f-user-name" value="${usuario?.nombre || ''}" required class="cmdb-input text-xs" placeholder="Nombre completo" />
              <input type="email" id="f-user-email" value="${usuario?.email || ''}" required class="cmdb-input text-xs" placeholder="usuario@empresa.com" />
              <select id="f-user-role" class="cmdb-input text-xs">
                <option value="ADMIN" ${usuario?.rol === 'ADMIN' ? 'selected' : ''}>Admin</option>
                <option value="GESTOR" ${usuario?.rol === 'GESTOR' ? 'selected' : ''}>Gestor</option>
                <option value="CONSULTA" ${usuario?.rol === 'CONSULTA' ? 'selected' : ''}>Consulta / lector</option>
              </select>
              <select id="f-user-state" class="cmdb-input text-xs">
                <option value="ACTIVO" ${usuario?.estado !== 'INACTIVO' ? 'selected' : ''}>Activo</option>
                <option value="INACTIVO" ${usuario?.estado === 'INACTIVO' ? 'selected' : ''}>Inactivo</option>
              </select>
              <input type="password" id="f-user-password" ${isEdit ? '' : 'required'} minlength="8" class="cmdb-input text-xs" placeholder="${isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña inicial (mínimo 8 caracteres)'}" />
              ${!isEdit ? '<p class="text-[11px] text-slate-500">El usuario deberá cambiar esta contraseña en su primer acceso.</p>' : ''}
              <div class="flex justify-end gap-3 pt-2">
                <button type="button" id="cancel-user-form" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" class="btn-primary text-xs">${isEdit ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>`;
        document.body.appendChild(modal);
        const cleanup = () => modal.remove();
        modal.querySelector('#close-modal-x')?.addEventListener('click', cleanup);
        modal.querySelector('#cancel-user-form')?.addEventListener('click', cleanup);
        modal.querySelector('#usuario-form')?.addEventListener('submit', async (event) => {
          event.preventDefault();
          const password = (modal.querySelector('#f-user-password') as HTMLInputElement).value;
          const data: any = {
            nombre: (modal.querySelector('#f-user-name') as HTMLInputElement).value.trim(),
            email: (modal.querySelector('#f-user-email') as HTMLInputElement).value.trim(),
            rol: (modal.querySelector('#f-user-role') as HTMLSelectElement).value,
            estado: (modal.querySelector('#f-user-state') as HTMLSelectElement).value
          };
          if (password) data.password = password;
          try {
            if (isEdit && usuario) await api.updateUsuario(usuario.id, data);
            else await api.createUsuario({ ...data, password });
            cleanup();
            showToast(`Usuario ${isEdit ? 'actualizado' : 'creado'} correctamente.`, 'success');
            await loadInitialData();
            renderApp();
          } catch (error: any) {
            showToast(error.message || 'No se pudo guardar el usuario.', 'error');
          }
        });
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

function showEditUsuarioById(id: number) {
  const usuario = allUsers.find(user => user.id === id);
  if (usuario) showUsuarioForm(usuario);
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
    if (btn.hasAttribute('data-edit-usuario')) {
      const id = Number(btn.getAttribute('data-edit-usuario'));
      if (!isNaN(id)) showEditUsuarioById(id);
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
        message: '¿Eliminar esta persona técnica?',
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
    if (btn.hasAttribute('data-delete-usuario')) {
      const id = Number(btn.getAttribute('data-delete-usuario'));
      showConfirmDialog({
        title: 'Eliminar Usuario',
        message: '¿Eliminar este usuario? Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        isDanger: true,
        onConfirm: async () => {
          try {
            await api.deleteUsuario(id);
            showToast('Usuario eliminado', 'success');
            await loadInitialData();
            renderApp();
          } catch (error: any) {
            showToast(error.message || 'No se pudo eliminar el usuario.', 'error');
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
    if (btn.hasAttribute('data-toggle-cliente')) {
      await toggleEstadoCliente(
        Number(btn.getAttribute('data-toggle-cliente')),
        btn.getAttribute('data-current-estado') || 'ACTIVO'
      );
      return;
    }
    if (btn.hasAttribute('data-toggle-plataforma')) {
      await toggleEstadoPlataforma(
        Number(btn.getAttribute('data-toggle-plataforma')),
        btn.getAttribute('data-current-estado') || 'ACTIVO'
      );
      return;
    }

    // Dashboard editing
    if (btn.id === 'edit-dashboard-btn') {
      isDashboardEditing = true;
      renderApp();
      setupGlobalListeners();
      initDashboardSortable();
      return;
    }
    if (btn.id === 'exit-edit-mode-btn') {
      isDashboardEditing = false;
      renderApp();
      setupGlobalListeners();
      return;
    }
    if (btn.hasAttribute('data-remove-section')) {
      const sectionId = btn.getAttribute('data-remove-section');
      if (sectionId) {
        dashboardVisibleSections.delete(sectionId);
        saveVisible(dashboardVisibleSections);
        renderApp();
        setupGlobalListeners();
      }
      return;
    }
    if (btn.hasAttribute('data-move-section')) {
      const sectionId = btn.getAttribute('data-move-section');
      const direction = btn.getAttribute('data-direction');
      if (sectionId && direction) {
        const order = getSavedOrder();
        const idx = order.indexOf(sectionId as any);
        if (idx !== -1) {
          const newIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (newIdx >= 0 && newIdx < order.length) {
            const temp = order[idx];
            order[idx] = order[newIdx];
            order[newIdx] = temp;
            saveOrder(order);
            renderApp();
            setupGlobalListeners();
            initDashboardSortable();
          }
        }
      }
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

    // Filter Estado Tabs
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
      delete activosFilters.cliente_id;
      delete activosFilters.plataforma_id;
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

    if (btn.id === 'activos-export-btn') {
      exportActivos();
      return;
    }
    if (btn.id === 'activos-new-btn' || btn.id === 'dash-new-asset-btn') {
      showActivoForm();
      return;
    }
    if (btn.id === 'usuario-new-btn') {
      showUsuarioForm();
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

  // Global delegation for changes
  document.addEventListener('change', async (e) => {
    const target = e.target as HTMLElement;

    if (target.id === 'add-section-select') {
      const select = target as HTMLSelectElement;
      const sectionId = select.value;
      if (sectionId) {
        dashboardVisibleSections.add(sectionId);
        saveVisible(dashboardVisibleSections);
        const order = getSavedOrder();
        if (!order.includes(sectionId as any)) {
          order.push(sectionId as any);
          saveOrder(order);
        }
        renderApp();
        setupGlobalListeners();
        initDashboardSortable();
      }
      return;
    }

    const filterMap: Record<string, string> = {
      'select-limit': 'limit',
      'filter-sort-by': 'sort_by',
      'filter-sort-order': 'sort_order',
      'filter-cliente': 'cliente_id',
      'filter-plataforma': 'plataforma_id',
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

function initDashboardSortable() {
  // No-op: sorting is handled by move buttons via data-move-section
}

document.addEventListener('DOMContentLoaded', init);

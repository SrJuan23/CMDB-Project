import { User } from '../types';
import { clearToken } from '../services/api';

export function renderNavbar(
  user: User,
  onSearch: (q: string) => void,
  onRoleChange: (newRole: 'ADMIN' | 'GESTOR' | 'CONSULTA') => void,
  onOpenNotifications: () => void,
  unreadAlertsCount = 0
): string {
  return `
    <header class="h-16 bg-white border-b border-[#EDF0FF] px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <!-- Left: Mobile Toggle & Brand/Search -->
      <div class="flex items-center gap-4 flex-1">
        <button id="sidebar-toggle-btn" class="p-2 rounded-lg text-slate-500 hover:bg-[#EDF0FF] hover:text-[#0945F7] transition" title="Alternar menú lateral">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>

        <!-- Global Search Input -->
        <div class="relative max-w-md w-full hidden sm:block">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </span>
          <input 
            id="global-search-input" 
            type="text" 
            placeholder="Buscar activo, cliente, hostname, serial (ej. FEDRPOTA25000025)..." 
            class="w-full pl-9 pr-12 py-2 bg-[#F7F8FD] hover:bg-white focus:bg-white border border-[#D7E2FF] rounded-xl text-xs sm:text-sm text-[#19255A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0945F7] transition-all font-body"
          />
          <span class="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 font-mono">↵</span>
        </div>
      </div>

      <!-- Right: Actions & User Info -->
      <div class="flex items-center gap-3 md:gap-5">
        <!-- Notification Button with badge -->
        <button id="nav-notifications-btn" class="relative p-2 text-slate-600 hover:text-[#0945F7] hover:bg-[#EDF0FF] rounded-xl transition" title="Alertas de Vencimiento">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          ${unreadAlertsCount > 0 ? `
            <span class="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
              ${unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
            </span>
          ` : ''}
        </button>

        <!-- Role Quick Switcher Demo Pill -->
        <div class="hidden lg:flex items-center bg-[#EDF0FF] rounded-lg p-0.5 border border-[#D7E2FF] text-xs font-heading font-medium">
          <span class="px-2 text-slate-500">Rol:</span>
          <select id="role-select" class="bg-transparent text-[#0945F7] font-bold py-1 pr-2 outline-none cursor-pointer">
            <option value="ADMIN" ${user.rol === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
            <option value="GESTOR" ${user.rol === 'GESTOR' ? 'selected' : ''}>GESTOR</option>
            <option value="CONSULTA" ${user.rol === 'CONSULTA' ? 'selected' : ''}>CONSULTA</option>
          </select>
        </div>

        <div class="h-6 w-px bg-slate-200 hidden sm:block"></div>

        <!-- User Profile Dropdown -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0945F7] to-[#00CDE2] text-white flex items-center justify-center font-bold text-sm font-heading shadow-xs">
            ${user.nombre.substring(0, 2).toUpperCase()}
          </div>
          <div class="hidden sm:block text-left leading-tight">
            <div class="text-sm font-bold text-[#19255A] font-heading flex items-center gap-1.5">
              ${user.nombre}
            </div>
            <span class="text-[11px] font-semibold text-[#0945F7] uppercase tracking-wider font-heading">
              ${user.rol}
            </span>
          </div>
          <button id="nav-logout-btn" class="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" title="Cerrar Sesión">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </div>
    </header>
  `;
}

export type NavigationTab = 
  | 'dashboard'
  | 'activos'
  | 'clientes'
  | 'plataformas'
  | 'lideres'
  | 'administradores'
  | 'reportes'
  | 'historial'
  | 'configuracion';

export function renderSidebar(currentTab: NavigationTab, isCollapsed: boolean, activosCount = 0): string {
  const items: { id: NavigationTab; label: string; icon: string; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`
    },
    {
      id: 'activos',
      label: 'CMDB / Activos',
      icon: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>`,
      badge: activosCount > 0 ? String(activosCount) : undefined
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`
    },
    {
      id: 'plataformas',
      label: 'Plataformas',
      icon: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>`
    },
    {
      id: 'lideres',
      label: 'Líderes',
      icon: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`
    },
    {
      id: 'administradores',
      label: 'Administradores',
      icon: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`
    },
    {
      id: 'reportes',
      label: 'Reportes',
      icon: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`
    },
    {
      id: 'historial',
      label: 'Historial',
      icon: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      icon: `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
    }
  ];

  return `
    <aside id="sidebar-container" class="bg-[#19255A] text-white flex flex-col transition-all duration-300 z-40 min-h-screen shrink-0 ${
      isCollapsed ? 'w-20' : 'w-64'
    }">
      <!-- Logo Branding Header -->
      <div class="h-16 flex items-center gap-3 px-5 border-b border-[#3B4779]/60">
        <div class="w-10 h-10 rounded-xl bg-[#0945F7] text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0 ring-2 ring-[#00CDE2]/40">
          <svg class="w-6 h-6 text-[#00CDE2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        ${!isCollapsed ? `
          <div class="overflow-hidden whitespace-nowrap">
            <h1 class="text-base font-extrabold tracking-wide font-heading text-white flex items-center gap-1.5">
              TTECH <span class="text-[#00CDE2]">CMDB</span>
            </h1>
            <p class="text-[10px] uppercase font-bold text-[#D7E2FF]/70 tracking-widest font-heading">Asset Management</p>
          </div>
        ` : ''}
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
        ${items.map(item => {
          const isActive = currentTab === item.id;
          return `
            <button 
              data-tab="${item.id}" 
              class="nav-tab-btn w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'} rounded-xl text-sm font-medium font-heading transition-all ${
                isActive 
                  ? 'bg-[#0945F7] text-white shadow-sm font-bold ring-1 ring-white/20' 
                  : 'text-slate-300 hover:bg-[#3B4779]/40 hover:text-white'
              }"
              title="${item.label}"
            >
              <div class="flex items-center gap-3">
                <span class="${isActive ? 'text-[#00CDE2]' : 'text-slate-400 group-hover:text-white'}">
                  ${item.icon}
                </span>
                ${!isCollapsed ? `<span>${item.label}</span>` : ''}
              </div>
              ${!isCollapsed && item.badge ? `
                <span class="px-2 py-0.5 text-[11px] font-bold rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#3B4779] text-[#00CDE2]'
                }">
                  ${item.badge}
                </span>
              ` : ''}
            </button>
          `;
        }).join('')}
      </nav>

      <!-- Suite Footer -->
      ${!isCollapsed ? `
        <div class="p-4 border-t border-[#3B4779]/50 bg-[#19255A]/50 text-center">
          <div class="text-[11px] text-slate-400 font-body">Suite Corporativa TTECH</div>
          <div class="text-[10px] text-[#00CDE2] font-semibold font-heading mt-0.5">CMDB & Support Desk v2.4</div>
        </div>
      ` : ''}
    </aside>
  `;
}

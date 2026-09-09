// UI Utilities: Toasts, Confirm Dialogs, Copy to Clipboard

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 font-body ${
    type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
    type === 'error' ? 'bg-rose-50 text-rose-900 border-rose-200' :
    type === 'warning' ? 'bg-amber-50 text-amber-900 border-amber-200' :
    'bg-blue-50 text-blue-900 border-blue-200'
  }`;

  const iconSvg =
    type === 'success' ? '<svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' :
    type === 'error' ? '<svg class="w-5 h-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' :
    type === 'warning' ? '<svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>' :
    '<svg class="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

  toast.innerHTML = `
    ${iconSvg}
    <div class="flex-1">${message}</div>
    <button class="text-slate-400 hover:text-slate-600">&times;</button>
  `;

  toast.querySelector('button')?.addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function copyToClipboard(text: string, label = 'Información') {
  if (!text || text === 'N/A') {
    showToast('No hay información para copiar', 'warning');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${label} copiado al portapapeles`, 'success');
  }).catch(() => {
    showToast('Error al copiar al portapapeles', 'error');
  });
}

export function showConfirmDialog({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false,
  onConfirm
}: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const modalContainer = document.createElement('div');
  modalContainer.className = 'fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn';

  modalContainer.innerHTML = `
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all animate-scaleIn">
      <h3 class="text-lg font-bold text-[#19255A] font-heading mb-2">${title}</h3>
      <p class="text-sm text-slate-600 font-body mb-6 leading-relaxed">${message}</p>
      <div class="flex justify-end gap-3">
        <button id="cancel-btn" class="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition font-heading">
          ${cancelText}
        </button>
        <button id="confirm-btn" class="px-4 py-2 text-sm font-semibold text-white rounded-lg transition font-heading shadow-sm ${
          isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0945F7] hover:bg-[#001F90]'
        }">
          ${confirmText}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  const cleanup = () => {
    modalContainer.remove();
  };

  modalContainer.querySelector('#cancel-btn')?.addEventListener('click', cleanup);
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) cleanup();
  });

  modalContainer.querySelector('#confirm-btn')?.addEventListener('click', async () => {
    cleanup();
    await onConfirm();
  });
}

import { User, Activo, Cliente, Plataforma, Persona, DashboardStats, HistorialItem } from '../types';

const API_BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('hiberus_token');
}

export function setToken(token: string) {
  localStorage.setItem('hiberus_token', token);
}

export function clearToken() {
  localStorage.removeItem('hiberus_token');
  localStorage.removeItem('hiberus_user');
}

export function getUser(): User | null {
  const u = localStorage.getItem('hiberus_user');
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export function setUser(user: User) {
  localStorage.setItem('hiberus_user', JSON.stringify(user));
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User; password_change_required?: boolean }> {
    const res = await request<{ token: string; user: User; password_change_required?: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(res.token);
    setUser(res.user);
    return res;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  async getUsuarios(): Promise<User[]> {
    return request('/usuarios');
  },

  async getUsuariosAsignables(): Promise<User[]> {
    return request('/usuarios/asignables');
  },

  async createUsuario(data: { nombre: string; email: string; password: string; rol: User['rol']; estado?: User['estado'] }): Promise<any> {
    return request('/usuarios', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateUsuario(id: number | string, data: Partial<{ nombre: string; email: string; password: string; rol: User['rol']; estado: User['estado'] }>): Promise<any> {
    return request(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async deleteUsuario(id: number | string): Promise<any> {
    return request(`/usuarios/${id}`, { method: 'DELETE' });
  },

  async me(): Promise<User> {
    const res = await request<User>('/auth/me');
    setUser(res);
    return res;
  },

  // Activos
  async getActivos(params: Record<string, string> = {}): Promise<{
    data: Activo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    counts: { todos: number; activos: number; inactivos: number; vigentes: number; proximos: number; vencidos: number };
  }> {
    const qs = new URLSearchParams(params).toString();
    return request(`/activos${qs ? `?${qs}` : ''}`);
  },

  async getActivoById(id: number | string): Promise<Activo> {
    return request(`/activos/${id}`);
  },

  async checkSerial(serial_number: string, exclude_id?: number | string): Promise<{ exists: boolean; match?: any }> {
    const qs = new URLSearchParams({ serial_number, ...(exclude_id ? { exclude_id: String(exclude_id) } : {}) }).toString();
    return request(`/activos/check-serial?${qs}`);
  },

  async createActivo(data: any): Promise<{ id: number; codigo: string; message: string }> {
    return request('/activos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateActivo(id: number | string, data: any): Promise<{ message: string }> {
    return request(`/activos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async cambiarEstado(id: number | string, nuevo_estado: 'ACTIVO' | 'INACTIVO'): Promise<{ message: string; nuevo_estado: string }> {
    return request(`/activos/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ nuevo_estado })
    });
  },

  async deleteActivo(id: number | string): Promise<{ message: string }> {
    return request(`/activos/${id}`, {
      method: 'DELETE'
    });
  },

  // Clientes
  async getClientes(): Promise<Cliente[]> {
    return request('/clientes');
  },

  async getCliente360(id: number | string): Promise<{
    cliente: Cliente;
    resumen: any;
    plataformas_utilizadas: { nombre: string; cantidad: number }[];
    administradores: { nombre: string; cantidad: number }[];
    activos: Activo[];
  }> {
    return request(`/clientes/${id}/360`);
  },

  async createCliente(data: { nombre: string; contacto?: string }): Promise<any> {
    return request('/clientes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateCliente(id: number | string, data: any): Promise<any> {
    return request(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteCliente(id: number | string): Promise<any> {
    return request(`/clientes/${id}`, {
      method: 'DELETE'
    });
  },

  async cambiarEstadoCliente(id: number | string, nuevo_estado: 'ACTIVO' | 'INACTIVO'): Promise<any> {
    return request(`/clientes/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ nuevo_estado })
    });
  },

  // Plataformas
  async getPlataformas(): Promise<Plataforma[]> {
    return request('/plataformas');
  },

  async getPlataformaActivos(id: number | string): Promise<{ plataforma: Plataforma; activos: Activo[] }> {
    return request(`/plataformas/${id}/activos`);
  },

  async createPlataforma(data: { nombre: string; sku?: string | null; descripcion?: string | null }): Promise<any> {
    return request('/plataformas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updatePlataforma(id: number | string, data: any): Promise<any> {
    return request(`/plataformas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deletePlataforma(id: number | string): Promise<any> {
    return request(`/plataformas/${id}`, {
      method: 'DELETE'
    });
  },

  async cambiarEstadoPlataforma(id: number | string, nuevo_estado: 'ACTIVO' | 'INACTIVO'): Promise<any> {
    return request(`/plataformas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ nuevo_estado })
    });
  },

  // Personas
  async getPersonas(tipo?: string): Promise<Persona[]> {
    const qs = tipo ? `?tipo=${tipo}` : '';
    return request(`/personas${qs}`);
  },

  async getPersonaActivos(id: number | string): Promise<{ persona: Persona; activos: Activo[] }> {
    return request(`/personas/${id}/activos`);
  },

  async createPersona(data: { nombre: string; email?: string; tipo?: string }): Promise<any> {
    return request('/personas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updatePersona(id: number | string, data: any): Promise<any> {
    return request(`/personas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deletePersona(id: number | string): Promise<any> {
    return request(`/personas/${id}`, {
      method: 'DELETE'
    });
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return request('/dashboard/stats');
  },

  // Excel
  async previewExcel(file?: File): Promise<any> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    return request('/excel/preview', {
      method: 'POST',
      body: formData
    });
  },

  async executeImport(file?: File): Promise<any> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    return request('/excel/import', {
      method: 'POST',
      body: formData
    });
  },

  getExportUrl(params: Record<string, string> = {}): string {
    const token = getToken();
    const qs = new URLSearchParams(params);
    if (token) qs.append('token', token);
    return `${API_BASE}/excel/export?${qs.toString()}`;
  },

  // Historial
  async getHistorial(params: Record<string, string> = {}): Promise<{
    data: HistorialItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qs = new URLSearchParams(params).toString();
    return request(`/historial${qs ? `?${qs}` : ''}`);
  },

  // Config
  async getConfig(): Promise<Record<string, string>> {
    return request('/config');
  },

  async updateConfig(data: Record<string, any>): Promise<any> {
    return request('/config', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

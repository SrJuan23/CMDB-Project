# TTECH CMDB - Plataforma de Gestión de Activos Tecnológicos

Aplicación web empresarial para la gestión de una CMDB (Configuration Management Database) y registro de activos tecnológicos. Reemplaza el manejo de información mediante Excel por una plataforma centralizada, moderna y escalable.

## Stack Tecnológico

- **Frontend**: TypeScript + Vite + Tailwind CSS + Chart.js (SPA vanilla)
- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: SQLite (producción lista para migrar a MySQL)
- **Autenticación**: JWT + bcrypt
- **Roles**: ADMIN, GESTOR, CONSULTA

## Características

- CRUD completo de activos, clientes, plataformas, líderes y administradores
- Dashboard con KPIs y gráficos interactivos
- Cálculo automático de vigencias y alertas de vencimiento
- Importación masiva desde Excel
- Exportación a Excel y CSV
- Historial de cambios (auditoría)
- Búsqueda global y filtros avanzados
- Vista 360° de clientes y activos
- Sistema de roles y permisos

## Estructura del Proyecto

```
CMDB-Project/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Lógica de cada recurso
│   │   ├── routes/         # Definición de endpoints
│   │   ├── middleware/     # Auth, validaciones
│   │   ├── services/       # Lógica de negocio (Excel, vigencias)
│   │   ├── db/             # Conexión y schema
│   │   └── server.ts       # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Vistas (render por templates)
│   │   ├── services/       # API client
│   │   ├── types/          # Interfaces TypeScript
│   │   └── utils/          # UI helpers (toast, modals)
│   ├── index.html
│   └── package.json
└── data/
    └── CMDB_Soporte.xlsx   # Datos iniciales
```

## Instalación y Ejecución

```bash
# Instalar dependencias
npm run install:all

# Desarrollo (backend + frontend)
npm run dev

# Backend únicamente
npm run dev:backend

# Frontend únicamente
npm run dev:frontend

# Seed de base de datos
npm run seed

# Build producción
npm run build
```

## Credenciales por defecto

| Rol | Email | Password |
|-----|-------|----------|
| ADMIN | admin@ttech.com | Admin123!* |
| GESTOR | gestor@ttech.com | Gestor123!* |
| CONSULTA | consulta@ttech.com | Consulta123!* |

## Endpoints Principales

```
POST   /api/auth/login
GET    /api/auth/me
GET    /api/activos
GET    /api/activos/:id
POST   /api/activos
PUT    /api/activos/:id
DELETE /api/activos/:id
PATCH  /api/activos/:id/estado
GET    /api/clientes
GET    /api/clientes/:id/360
POST   /api/clientes
PUT    /api/clientes/:id
DELETE /api/clientes/:id
GET    /api/plataformas
GET    /api/plataformas/:id/activos
POST   /api/plataformas
PUT    /api/plataformas/:id
DELETE /api/plataformas/:id
GET    /api/personas
GET    /api/personas/:id/activos
POST   /api/personas
PUT    /api/personas/:id
DELETE /api/personas/:id
GET    /api/dashboard/stats
POST   /api/excel/preview
POST   /api/excel/import
GET    /api/excel/export
GET    /api/historial
GET    /api/config
PUT    /api/config
```

## Licencia

ISC - TTECH

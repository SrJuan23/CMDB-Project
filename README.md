# TTECH CMDB - Plataforma de Gestión de Activos Tecnológicos

Aplicación web empresarial para la gestión de una CMDB (Configuration Management Database) y registro de activos tecnológicos.

## Stack Tecnológico

- **Frontend**: TypeScript + Vite + Tailwind CSS + Chart.js
- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: PostgreSQL (producción) / SQLite (desarrollo)
- **Auth**: JWT + bcrypt

## Requisitos

- Node.js >= 18
- npm >= 9
- PostgreSQL 16 (si ejecutas la base de datos localmente)

## Inicio rápido (desarrollo)

```bash
# 1. Clonar
git clone <repo-url> && cd CMDB-Project

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores:
# - JWT_SECRET (obligatorio en producción)
# - PG_PASSWORD (si usas PostgreSQL)

# 3. Iniciar backend y frontend según las instrucciones siguientes
```

## Inicio local

```bash
# 1. Instalar dependencias
npm run install:all

# 2. Backend desarrolloSqlite por defecto)
cd backend
npm run dev

# 3. En otra terminal, frontend
cd frontend
npm run dev

# 4. Seed de base de datos (solo primera vez)
cd backend
npm run seed
```

## Credenciales por defecto (solo desarrollo)

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

## Notas

- El archivo `backend/.env` **no** se versiona. Copiá desde `.env.example`.
- Para producción, cambiá `JWT_SECRET` y configurá `DB_TYPE=postgres`.
- Los seeds por defecto son solo para desarrollo.
- Backend sirve el frontend build si existe `frontend/dist/`.

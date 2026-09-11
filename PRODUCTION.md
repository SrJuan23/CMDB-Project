# TTECH CMDB - Guía de Producción

## Requisitos previos

- Node.js >= 18
- npm >= 9
- PM2 (opcional pero recomendado): `npm install -g pm2`
- Una cuenta de Railway con un servicio PostgreSQL

---

## 1. Build de producción

```bash
# Backend
cd backend
npm install --production
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

El build del frontend se genera en `frontend/dist/`. El backend sirve automáticamente el frontend si detecta esta carpeta.

---

## 2. Variables de entorno

Copiar `backend/.env.example` a `backend/.env` y configurar:

### Desarrollo (SQLite)
```env
NODE_ENV=development
PORT=5000
DB_TYPE=sqlite
JWT_SECRET=<clave-secreta-larga-min-64-caracteres>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
LOG_LEVEL=info
```

### Producción (PostgreSQL)
```env
NODE_ENV=production
PORT=5000
DB_TYPE=postgres
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=<contraseña-segura>
PG_DATABASE=cmdb_ttech
JWT_SECRET=<clave-secreta-larga-min-64-caracteres>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://cmdb.ttech.com,https://ttech-cmdb.netlify.app
LOG_LEVEL=info
DEFAULT_EXPIRING_DAYS=30
```

**IMPORTANTE**: Nunca commitear el archivo `.env` a git.

---

## 3. Inicio con PM2 (recomendado)

```bash
cd backend
npm run pm2:start

# Comandos útiles
npm run pm2:status   # Ver estado
npm run pm2:logs     # Ver logs en vivo
npm run pm2:restart  # Reiniciar
npm run pm2:stop     # Detener
```

Guardar configuración para auto-inicio:
```bash
pm2 startup
pm2 save
```

---

## 4. Backup de base de datos

### PostgreSQL (producción)
```bash
# Backup manual
pg_dump -U postgres -d cmdb_ttech -F c -f backups/cmdb-backup-$(date +%Y-%m-%d).dump

# Restore
pg_restore -U postgres -d cmdb_ttech backups/cmdb-backup-YYYY-MM-DD.dump
```

### SQLite (desarrollo)
```bash
cd backend
npm run backup
```

Los backups se guardan en `backend/backups/` con retención de 30 días.

### Backup automático

#### Linux/macOS (cron - PostgreSQL)
```bash
# Editar crontab
crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * /usr/bin/pg_dump -U postgres -d cmdb_ttech -F c -f /path/to/cmdb/backend/backups/cmdb-backup-\$(date +\%Y-\%m-\%d).dump >> /path/to/cmdb/logs/backup-cron.log 2>&1
```

#### Windows (Task Scheduler)
Crear tarea programada que ejecute `backend\scripts\backup.bat` diariamente.

### Restore
```bash
# Detener el backend
pm2 stop cmdb-backend

# Restaurar backup PostgreSQL
pg_restore -U postgres -d cmdb_ttech backups/cmdb-backup-YYYY-MM-DD.dump

# Restaurar backup SQLite
# cp backups/cmdb-backup-YYYY-MM-DDTHH-MM-SSZ.sqlite data/cmdb.sqlite

# Iniciar el backend
pm2 start cmdb-backend
```

---

## 5. Logs

Los logs se guardan en `backend/logs/`:
- `combined.log` - Todos los logs
- `error.log` - Solo errores
- `pm2-out.log` - Salida estándar de PM2
- `pm2-error.log` - Errores de PM2

Rotación automática: los archivos rotan a los 5 MB.

---

## 6. Monitoreo

### Health check
```bash
curl https://cmdb.ttech.com/api/health
```

### PM2 Plus (opcional)
```bash
pm2 plus
```

### Logs en tiempo real
```bash
pm2 logs cmdb-backend --lines 100
```

---

## 7. Seguridad en producción

- [x] JWT_SECRET obligatorio y largo
- [x] CORS restringido a dominios específicos
- [x] Helmet activado
- [x] Rate limiting en /api/ y /api/auth
- [x] Prepared statements (sin SQL injection)
- [x] .gitignore endurecido
- [ ] Cambiar JWT_SECRET por defecto
- [ ] Configurar firewall (solo 80, 443, SSH)
- [ ] Deshabilitar root login en servidor
- [ ] Actualizar dependencias regularmente

---

## 9. Actualización a producción

```bash
# 1. Backup antes de actualizar
npm run backup

# 2. Pull de cambios
git pull origin main

# 3. Build
npm run build
cd frontend && npm install && npm run build && cd ..

# 4. Reiniciar
pm2 restart cmdb-backend

# 5. Verificar logs
pm2 logs cmdb-backend --lines 50
```

---

## 10. Troubleshooting

### El backend no inicia
```bash
pm2 logs cmdb-backend --lines 100
```

### La base de datos está bloqueada
**SQLite**: SQLite usa WAL mode. Si hay problemas:
```bash
# Detener backend
pm2 stop cmdb-backend

# Eliminar archivos WAL/SHM
rm data/cmdb.sqlite-wal data/cmdb.sqlite-shm

# Iniciar
pm2 start cmdb-backend
```

**PostgreSQL**: Verificar que el servicio esté corriendo:
```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

### El frontend no carga
Verificar que exista `frontend/dist/index.html` y que el backend tenga permiso de lectura.

---

## Contacto

Soporte: soporte.tech@telefonica.com

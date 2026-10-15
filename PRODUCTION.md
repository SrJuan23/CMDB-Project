# TTECH CMDB - Guía de Producción

## Requisitos previos

- Node.js >= 18
- npm >= 9
- PM2 (opcional pero recomendado): `npm install -g pm2`
- PostgreSQL 16 instalado y accesible desde el backend (puerto 5432)

---

## 1. Build de producción

```bash
# Backend (incluye dependencias de desarrollo para compilar TypeScript)
cd backend
npm install
npm run build

# Frontend
cd ../frontend
npm install
npm run build

# En backend, elimina las dependencias de desarrollo después de compilar
cd ../backend
npm prune --omit=dev
```

El build del frontend se genera en `frontend/dist/`. El backend sirve automáticamente el frontend si detecta esta carpeta.

---

## 1.1. Crear la base de datos y cargar el Excel

Para una base nueva, carga primero el dump PostgreSQL de migración en una base vacía:

```bash
psql -h <host> -p <puerto> -U <usuario> -d <base_vacía> -f "C:\ruta\CMDB_MIGRACION.sql"
```

Configura `backend/.env` para apuntar a esa base y arranca la aplicación. `initDatabase()` aplica las columnas y migraciones pendientes automáticamente: renombra las fechas de gestión a fechas de servicio, conserva sus valores, consolida `pet`/`pep_` de activos en `pep` y crea las fechas de licencias. La base debe estar vacía al importar el dump; no se debe ejecutar sobre una base que ya tenga las mismas tablas.

En bases existentes, el arranque aplica esos cambios de esquema sobre sus datos; no importa automáticamente el dump ni elimina registros existentes, salvo las columnas retiradas que se consolidan en `pep`. El seed dejó de crear clientes, activos y tickets de ejemplo. Si se quiere cargar registros desde Excel, se puede usar `node scripts/import_excel.js "C:\ruta\al\archivo.xlsx"`.

## 1.2. Actualizar en Ubuntu Server por SSH

La migración usa PostgreSQL y lee `backend/.env`; no depende de Windows ni de una sesión SSH interactiva. En una base existente, respalda primero la base y luego ejecuta desde la carpeta de la aplicación:

```bash
cd /ruta/a/CMDB-Project
git pull origin main

cd frontend
npm install
npm run build

cd ../backend
npm install
npm run build
npm run migrate
npm prune --omit=dev
pm2 restart cmdb-backend --update-env
pm2 save
```

`npm run migrate` aplica el esquema de forma idempotente usando la conexión definida en `backend/.env`; si falla, no reinicies el servicio y revisa el error y los permisos PostgreSQL. El backend también aplica la migración al arrancar. No hace falta copiar el dump a una base existente. Para crear una base nueva con los datos del dump, copia el archivo SQL al servidor de forma segura y restáuralo una sola vez en una base vacía antes del primer arranque. No compartas claves privadas SSH ni contraseñas; utiliza la cuenta y el procedimiento de despliegue autorizados por la empresa.

---

## 2. Variables de entorno

Copiar `backend/.env.example` a `backend/.env` y configurar:

### Desarrollo (PostgreSQL)
```env
NODE_ENV=development
PORT=5000
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=<contraseña-segura>
PG_DATABASE=cmdb_hiberus
JWT_SECRET=<clave-secreta-larga-min-64-caracteres>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
LOG_LEVEL=info
DEFAULT_EXPIRING_DAYS=30
```

### Producción (PostgreSQL)
```env
NODE_ENV=production
PORT=5000
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=<contraseña-segura>
PG_DATABASE=cmdb_hiberus
JWT_SECRET=<clave-secreta-larga-min-64-caracteres>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
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
pg_dump -U postgres -d cmdb_hiberus -F c -f backups/cmdb-backup-$(date +%Y-%m-%d).dump

# Restore
pg_restore -U postgres -d cmdb_hiberus backups/cmdb-backup-YYYY-MM-DD.dump
```

### Backup automático

#### Linux/macOS (cron - PostgreSQL)
```bash
# Editar crontab
crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * /usr/bin/pg_dump -U postgres -d cmdb_hiberus -F c -f /path/to/cmdb/backend/backups/cmdb-backup-\$(date +\%Y-\%m-\%d).dump >> /path/to/cmdb/logs/backup-cron.log 2>&1
```

#### Windows (Task Scheduler)
Crear tarea programada que ejecute `backend\scripts\backup.bat` diariamente.

### Restore
```bash
# Detener el backend
pm2 stop cmdb-backend

# Restaurar backup PostgreSQL
pg_restore -U postgres -d cmdb_hiberus backups/cmdb-backup-YYYY-MM-DD.dump

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
curl http://localhost:5000/api/health
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

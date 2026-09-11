# TTECH CMDB - Deployment en Railway

## Guía paso a paso

### 1. Preparar el repositorio

```bash
# Asegurate de que todos los cambios estén commiteados
git add .
git commit -m "feat: add Railway deployment configuration"
git push origin main
```

### 2. Crear proyecto en Railway

1. Ve a [railway.app](https://railway.app) y crea una cuenta
2. Click en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Autoriza Railway y selecciona tu repositorio `CMDB-Project`
5. Railway detectará automáticamente el `railway.toml` y configurará el deploy

### 3. Agregar PostgreSQL

1. En el dashboard del proyecto, click en **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway creará automáticamente la base de datos y proveerá la variable `DATABASE_URL`
3. No necesitas configurar nada más, el código ya usa `DATABASE_URL` automáticamente

### 4. Configurar variables de entorno

En **Settings** → **Variables**, agregar:

```
NODE_ENV=production
JWT_SECRET=<tu-secret-super-seguro-min-64-caracteres>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://tu-dominio.railway.app,https://ttech-cmdb.netlify.app
DEFAULT_EXPIRING_DAYS=30
LOG_LEVEL=info
```

**IMPORTANTE**: 
- `DATABASE_URL` y `PG_*` las provee Railway automáticamente cuando agregas PostgreSQL
- No commitear el `.env` con secrets reales

### 5. Configurar el servicio

Railway debería detectar automáticamente:
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Root Directory**: `/` (raíz del repo)

Si no lo detecta automáticamente, configurar manualmente:
- **Build Command**: `cd backend && npm ci --only=production && npm run build`
- **Start Command**: `cd backend && npm run start`
- **Port**: `5000`

### 6. Deploy

Railway hará deploy automáticamente. Podés ver el progreso en **Deployments**.

Una vez finalizado:
- **API**: `https://tu-proyecto.up.railway.app`
- **Health**: `https://tu-proyecto.up.railway.app/api/health`
- **Frontend**: `https://tu-proyecto.up.railway.app`

### 7. Configurar dominio custom (opcional)

1. En **Settings** → **Domains**
2. Agregar tu dominio: `cmdb.ttech.com`
3. Configurar DNS en tu proveedor:
   - Tipo: `CNAME`
   - Nombre: `cmdb`
   - Valor: `tu-proyecto.up.railway.app`

### 8. Seed de base de datos

Después del primer deploy, ejecutar el seed:

```bash
# Opción 1: Usar Railway CLI
railway run npm run seed

# Opción 2: Desde el dashboard
# Ir a tu servicio → "Deploy" → "Run Command"
# Ejecutar: npm run seed
```

### 9. Verificar funcionamiento

```bash
# Health check
curl https://tu-proyecto.up.railway.app/api/health

# Login de prueba
curl -X POST https://tu-proyecto.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ttech.com","password":"Admin123!*"}'
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Ambiente | `production` |
| `PORT` | Puerto del servidor | `5000` |
| `DB_TYPE` | Tipo de BD | `postgres` |
| `DATABASE_URL` | URL de PostgreSQL (Railway lo provee) | `postgresql://...` |
| `JWT_SECRET` | Secret para JWT (OBLIGATORIO en prod) | `tu-secret-64-caracteres-min` |
| `JWT_EXPIRES_IN` | Duración del token | `7d` |
| `CORS_ORIGIN` | Orígenes permitidos | `https://cmdb.ttech.com` |
| `DEFAULT_EXPIRING_DAYS` | Días por defecto para próximos a vencer | `30` |
| `LOG_LEVEL` | Nivel de logs | `info` |

## Notas importantes

- **PostgreSQL**: Railway provee PostgreSQL como servicio independiente.
- **Persistencia**: Railway monta un volumen en `/app/data` para SQLite (solo desarrollo). En producción usá PostgreSQL.
- **Logs**: Disponibles en **Deployments** → **View Logs**
- **Métricas**: Disponibles en **Metrics** (CPU, RAM, Requests)
- **Backups**: Configurar en **PostgreSQL** → **Backups**

## Troubleshooting

### El build falla
- Verificar que `package.json` tenga los scripts correctos
- Verificar que `tsconfig.json` esté configurado correctamente
- Ver logs en **Deployments**

### La app no inicia
- Verificar que `JWT_SECRET` esté configurado
- Verificar que `PORT` sea `5000`
- Ver logs en **Deployments** → **View Logs**

### No puedo conectarme a la BD
- Verificar que el servicio PostgreSQL esté corriendo
- Railway provee `DATABASE_URL` automáticamente
- No necesitas configurar `PG_HOST`, `PG_USER`, etc. individualmente

### El frontend no carga
- Verificar que exista `frontend/dist/` después del build
- El backend sirve el frontend automáticamente en producción
- Verificar que la ruta `/` devuelva `index.html`

## Costos estimados

- **Railway Hobby**: $5 USD/mes (incluye $5 de crédito)
- **PostgreSQL**: Incluido en el plan Hobby
- **Total**: ~$5-10 USD/mes para tráfico moderado

## Monitoreo

- **Logs**: Railway dashboard → Deployments → View Logs
- **Métricas**: CPU, RAM, Requests en Metrics
- **Alertas**: Configurar en Settings → Notifications

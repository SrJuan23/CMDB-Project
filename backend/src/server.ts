import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { initDatabase } from './db/database';
import { runSeed } from './db/seed';

import authRoutes from './routes/authRoutes';
import activosRoutes from './routes/activosRoutes';
import clientesRoutes from './routes/clientesRoutes';
import plataformasRoutes from './routes/plataformasRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import excelRoutes from './routes/excelRoutes';
import historialRoutes from './routes/historialRoutes';
import configRoutes from './routes/configRoutes';
import personasRoutes from './routes/personasRoutes';
import usuariosRoutes from './routes/usuariosRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

initDatabase()
  .then(() => runSeed())
  .catch(err => {
    console.error('Error during database initialization:', err);
    process.exit(1);
  });

app.use('/api/auth', authRoutes);
app.use('/api/activos', activosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/plataformas', plataformasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/config', configRoutes);
app.use('/api/personas', personasRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), platform: 'TTECH CMDB' });
});

const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const frontendPublic = path.resolve(__dirname, '../public');

if (fs.existsSync(frontendPublic)) {
  app.use(express.static(frontendPublic));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.resolve(frontendPublic, 'index.html'));
  });
} else if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.resolve(frontendDist, 'index.html'));
  });
}

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  TTECH CMDB REST API SERVER`);
  console.log(`  Running on: http://localhost:${PORT}`);
  console.log(`  Health:     http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});

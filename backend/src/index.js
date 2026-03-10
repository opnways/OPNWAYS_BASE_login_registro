import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

import { authConfig } from './features/auth/utils/authConfig.js';

// Confiar en Reverse Proxies en Producción para Rate Limiting
app.set('trust proxy', 1);

// Middleware
// Endurecimiento explícito de headers HTTP con Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Previene bloqueos agresivos en APIs puras
}));

// CORS Exact Match (sin wildcards peligrosos en credenciales)
app.use(cors({
    origin: (origin, callback) => {
        // Permitir llamadas sin origen si es Postman o Server-to-Server,
        // pero validarlo si existe contra la lista permitida.
        if (!origin || authConfig.corsAllowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
}));
// Correlation ID Middleware para auditoría
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// Sobreescribir formato morgan para incluir req.id y no filtrar IP original
morgan.token('id', req => req.id);
app.use(morgan(':id :remote-addr - :method :url :status :response-time ms - :res[content-length]'));

// Base API Contract Response Helper
app.use((req, res, next) => {
    res.success = (data) => res.json({ success: true, data, error: null });
    res.error = (message, status = 400) => res.status(status).json({ success: false, data: null, error: message });
    next();
});

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(cookieParser());

// Routes (Screaming Architecture: features/auth)
import authRoutes from './features/auth/api/AuthRoutes.js';
app.use('/api/auth', authRoutes);

import { register } from './features/auth/utils/metrics.js';

app.get('/metrics', async (req, res) => {
    // Proteger /metrics con contraseña básica si está en producción
    if (process.env.NODE_ENV === 'production') {
        const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
        const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

        const metricsUser = process.env.METRICS_USER || 'admin';
        const metricsPass = process.env.METRICS_PASSWORD;

        if (!metricsPass || login !== metricsUser || password !== metricsPass) {
            res.set('WWW-Authenticate', 'Basic realm="401"');
            return res.status(401).send('Authentication required.');
        }
    }

    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err.message);
    }
});

import pool from './utils/db.js';

app.get('/health', async (req, res) => {
    try {
        // Readiness check simple a BD
        await pool.query('SELECT 1');
        res.success({ status: 'up', database: 'connected' });
    } catch (err) {
        console.error('Healthcheck failed:', err.message);
        res.status(503).json({ success: false, data: null, error: 'Servicio no disponible' });
    }
});

// Manejador global de Errores seguro
app.use((err, req, res, next) => {
    console.error(`[ERROR][${req.id}]`, err.stack || err.message || err);

    if (err.type === 'entity.too.large') {
        return res.error('El tamaño de la petición excede el límite permitido de 50kb', 413);
    }

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
         return res.error('JSON malformado en la petición', 400);
    }

    res.error('Ocurrió un error interno del servidor.', 500);
});

app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
});

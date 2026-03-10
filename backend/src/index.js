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

// Confiar en Reverse Proxies en Producción de forma dinámica (Configurable vía Zod).
// NOTA TÉCNICA: Solo activar TRUST_PROXY=true cuando la API se encuentra
// detrás de un Reverse Proxy confiable (Nginx, ALB, etc.) que sobreescriba y sanee
// la cabecera X-Forwarded-For para prevenir IP Spoofing por parte del cliente.
if (authConfig.app.trustProxy) {
    app.set('trust proxy', 1);
}

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
// Correlation ID Middleware para auditoría segura
app.use((req, res, next) => {
    // Validar el request ID si viene del cliente. Si no cumple formato estricto (UUID), se rechaza
    // y se regenera uno propio. Esto evita Log Forging, Injection y cross-site tracing malicioso.
    const incomingReqId = req.headers['x-request-id'];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (incomingReqId && uuidRegex.test(incomingReqId)) {
        req.id = incomingReqId;
    } else {
        req.id = crypto.randomUUID();
    }

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

// Mejorar protección de /metrics. Retiene loopback check si no hay password para mantener seguridad por defecto.
app.get('/metrics', async (req, res) => {
    const metricsPass = process.env.METRICS_PASSWORD;

    // Si NO hay contraseña configurada en producción, mantenemos el comportamiento default seguro (Loopback only)
    if (!metricsPass && process.env.NODE_ENV === 'production') {
        const clientIp = req.ip || req.socket?.remoteAddress || '';
        const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || clientIp === '::ffff:172.19.0.1';

        if (!isLoopback) {
            return res.status(403).json({ success: false, data: null, error: 'Acceso denegado.' });
        }
    } else if (metricsPass) {
        // Si hay password, se exige SIEMPRE (incluso en dev o desde otra IP interna)
        const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
        const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
        const metricsUser = process.env.METRICS_USER || 'admin';

        if (login !== metricsUser || password !== metricsPass) {
            res.set('WWW-Authenticate', 'Basic realm="metrics"');
            return res.status(401).send('Authentication required.');
        }
    }

    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end('Error al recolectar métricas');
    }
});

import pool from './utils/db.js';

// Liveness (El proceso Express corre y atiende peticiones)
app.get('/health/live', (req, res) => {
    res.status(200).send('OK');
});

// Readiness (El sistema tiene dependencias, como la base de datos, en línea)
// Reemplaza el antiguo /health, sirviendo ahora una versión más simple para evitar information disclosure
app.get('/health/ready', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).send('OK');
    } catch (err) {
        console.error('Healthcheck DB Readiness failed:', err.message);
        res.status(503).send('Not Ready');
    }
});

// Alias por compatibilidad con viejos deployers que usen el endpoint anterior
// Se delega al middleware interno y se sirve 200 directo para no romper balanceadores tontos que fallan en 301.
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.success({ status: 'up', database: 'connected' });
    } catch (err) {
        console.error('Healthcheck DB Readiness failed:', err.message);
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

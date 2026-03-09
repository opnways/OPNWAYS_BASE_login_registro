import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

import { authConfig } from './features/auth/utils/authConfig.js';

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
    origin: authConfig.corsAllowedOrigins,
    credentials: true
}));
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
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err.message);
    }
});

app.get('/health', (req, res) => {
    res.success({ status: 'up' });
});

app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.error('El tamaño de la petición excede el límite permitido de 50kb', 413);
    }
    next(err);
});

app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
});

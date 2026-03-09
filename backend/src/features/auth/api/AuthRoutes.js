import express from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/AuthService.js';
import { TokenService } from '../services/TokenService.js';
import { z } from 'zod';
import { generateCsrfToken, verifyCsrf } from '../utils/csrf.js';
import { authCookies } from './authCookies.js';
import { authConfig } from '../utils/authConfig.js';

import {
    authRequestsTotal,
    authEndpointDurationSeconds,
    authInternalErrorsTotal,
    authRefreshRotationsTotal,
    authRefreshRevocationsTotal
} from '../utils/metrics.js';

const router = express.Router();

// Middleware para instrumentación de métricas
router.use((req, res, next) => {
    const path = req.path;
    let endpoint = 'unknown';

    if (path.startsWith('/register')) endpoint = 'register';
    else if (path.startsWith('/login')) endpoint = 'login';
    else if (path.startsWith('/forgot')) endpoint = 'forgot';
    else if (path.startsWith('/reset')) endpoint = 'reset';
    else if (path.startsWith('/refresh')) endpoint = 'refresh';
    else if (path.startsWith('/logout')) endpoint = 'logout';
    else if (path.startsWith('/me')) endpoint = 'me';

    res.locals.authEndpoint = endpoint;
    const startTimer = authEndpointDurationSeconds.startTimer();

    res.on('finish', () => {
        let statusCode = res.statusCode.toString();

        // Prevent DoS via cardinality explosion in Prometheus metrics
        const allowedStatuses = ['200', '400', '401', '403', '404', '413', '429', '500'];
        if (!allowedStatuses.includes(statusCode)) {
            statusCode = res.statusCode >= 500 ? '500' : 'unknown';
        }

        authRequestsTotal.inc({ endpoint, status: statusCode });
        startTimer({ endpoint, status: statusCode });

        if (res.statusCode >= 500) {
            authInternalErrorsTotal.inc({ endpoint });
        }
    });

    next();
});

const createLimiter = (maxRequests) => rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: maxRequests,
    message: { success: false, data: null, error: 'Demasiadas solicitudes, por favor inténtalo de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = createLimiter(20);
const forgotLimiter = createLimiter(5);
const resetLimiter = createLimiter(5);
const refreshLimiter = createLimiter(60);
const registerLimiter = createLimiter(10);


const passwordSchema = z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe incluir al menos una mayúscula')
    .regex(/[0-9]/, 'La contraseña debe incluir al menos un número')
    .regex(/[^A-Za-z0-9]/, 'La contraseña debe incluir al menos un carácter especial');

const registerSchema = z.object({
    email: z.string().trim().toLowerCase().email('Email inválido'),
    password: passwordSchema
});

const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email('Email inválido'),
    password: z.string().min(8, 'La contraseña es requerida')
});

const forgotSchema = z.object({
    email: z.string().trim().toLowerCase().email('Email inválido')
});

const resetSchema = z.object({
    token: z.string().min(20, 'Token requerido'),
    password: passwordSchema
});

router.get('/csrf', (req, res) => {
    const token = generateCsrfToken();
    authCookies.setCsrfCookie(res, token);
    res.success({ csrfToken: token });
});

router.post('/register', registerLimiter, async (req, res) => {
    try {
        const result = registerSchema.safeParse(req.body);
        if (!result.success) {
            return res.error('Datos inválidos.', 400);
        }

        const { email, password } = result.data;
        const user = await AuthService.register(email, password);
        res.success(user);
    } catch (err) {
        console.error('Register error:', err.message);
        res.error('No se ha podido crear la cuenta.', 400);
    }
});

router.post('/login', loginLimiter, async (req, res) => {
    try {
        const result = loginSchema.safeParse(req.body);
        if (!result.success) {
            return res.error('Datos inválidos.', 400);
        }

        const { email, password } = result.data;
        const { user, accessToken, refreshToken } = await AuthService.login(email, password);

        authCookies.setSessionCookies(res, accessToken, refreshToken);

        res.success({ user });
    } catch (err) {
        console.error('Login error:', err.message);
        res.error(err.message, 401);
    }
});

router.post('/logout', verifyCsrf, async (req, res) => {
    try {
        const refreshToken = req.cookies[authConfig.cookies.refreshTokenName];
        if (refreshToken) {
            const hash = TokenService.hashToken(refreshToken);
            await AuthService.logout(hash);
            authRefreshRevocationsTotal.inc({ reason: 'logout' });
        }
        authCookies.clearSessionCookies(res);
        res.success({ message: 'Sesión cerrada exitosamente' });
    } catch (err) {
        console.error('Logout error:', err);
        res.error('No se pudo cerrar sesión correctamente');
    }
});

router.post('/refresh', refreshLimiter, verifyCsrf, async (req, res) => {
    try {
        const refreshToken = req.cookies[authConfig.cookies.refreshTokenName];
        if (!refreshToken) {
            throw new Error('No se encontró token de refresco');
        }

        const hash = TokenService.hashToken(refreshToken);
        const { accessToken, refreshToken: newRefreshToken } = await AuthService.refresh(hash);

        authCookies.setSessionCookies(res, accessToken, newRefreshToken);

        authRefreshRotationsTotal.inc();
        authRefreshRevocationsTotal.inc({ reason: 'rotation' });

        res.success({ message: 'Token renovado exitosamente' });
    } catch (err) {
        console.error('Refresh error:', err.message);
        // Fix 8: Siempre mensaje genérico al cliente; detalles de seguridad quedan en el log
        res.error('Sesión inválida.', 401);
    }
});

router.get('/me', async (req, res) => {
    try {
        const token = req.cookies[authConfig.cookies.accessTokenName];
        if (!token) throw new Error('No autenticado');

        const decoded = TokenService.verifyAccessToken(token);
        if (!decoded) throw new Error('Token inválido');

        const user = await AuthService.getMe(decoded.sub);
        res.success(user);
    } catch (err) {
        // Silent fail for me endpoint to avoid log noise on checkSession
        res.error(err.message, 401);
    }
});

router.post('/forgot', forgotLimiter, async (req, res) => {
    try {
        const result = forgotSchema.safeParse(req.body);
        if (!result.success) {
            return res.error('Datos inválidos.', 400);
        }

        const { email } = result.data;
        await AuthService.forgotPassword(email);
        res.success({ message: 'Si el correo está registrado, recibirás un enlace de recuperación.' });
    } catch (err) {
        console.error('Forgot error:', err.message);
        res.error('No se pudo procesar la solicitud.');
    }
});

router.post('/reset', resetLimiter, verifyCsrf, async (req, res) => {
    try {
        const result = resetSchema.safeParse(req.body);
        if (!result.success) {
            return res.error('Datos inválidos.', 400);
        }

        const { token, password } = result.data;
        await AuthService.resetPassword(token, password);
        res.success({ message: 'Tu contraseña ha sido actualizada exitosamente.' });
    } catch (err) {
        console.error('Reset error:', err.message);
        res.error(err.message);
    }
});

export default router;

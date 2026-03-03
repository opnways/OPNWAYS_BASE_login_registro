import express from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/AuthService.js';
import { TokenService } from '../services/TokenService.js';
import { z } from 'zod';

import { loginAttempts, loginFailures, refreshAttempts, refreshFailures, rateLimitHits, passwordResetRequests } from '../utils/metrics.js';

const router = express.Router();

const createLimiter = (maxRequests) => rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: maxRequests,
    handler: (req, res, next, options) => {
        rateLimitHits.inc({ endpoint: req.baseUrl + req.path });
        res.status(options.statusCode).json(options.message);
    },
    message: { success: false, data: null, error: 'Demasiadas solicitudes, por favor inténtalo de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const loginLimiter = createLimiter(20);
const forgotLimiter = createLimiter(5);
const resetLimiter = createLimiter(5);
const refreshLimiter = createLimiter(60);
const registerLimiter = createLimiter(10);

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
};

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
    loginAttempts.inc();
    try {
        const result = loginSchema.safeParse(req.body);
        if (!result.success) {
            loginFailures.inc({ reason: 'validation' });
            return res.error('Datos inválidos.', 400);
        }

        const { email, password } = result.data;
        const { user, accessToken, refreshToken } = await AuthService.login(email, password);

        res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.success({ user });
    } catch (err) {
        loginFailures.inc({ reason: 'auth' });
        console.error('Login error:', err.message);
        res.error(err.message, 401);
    }
});

router.post('/logout', async (req, res) => {
    try {
        const refreshToken = req.cookies.refresh_token;
        if (refreshToken) {
            const hash = TokenService.hashToken(refreshToken);
            await AuthService.logout(hash);
        }
        res.clearCookie('access_token', cookieOptions);
        res.clearCookie('refresh_token', cookieOptions);
        res.success({ message: 'Sesión cerrada exitosamente' });
    } catch (err) {
        console.error('Logout error:', err);
        res.error('No se pudo cerrar sesión correctamente');
    }
});

router.post('/refresh', refreshLimiter, async (req, res) => {
    refreshAttempts.inc();
    try {
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) {
            refreshFailures.inc();
            throw new Error('No se encontró token de refresco');
        }

        const hash = TokenService.hashToken(refreshToken);
        const { accessToken, refreshToken: newRefreshToken } = await AuthService.refresh(hash);

        res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.success({ message: 'Token renovado exitosamente' });
    } catch (err) {
        refreshFailures.inc();
        console.error('Refresh error:', err);
        res.error(err.message, 401);
    }
});

router.get('/me', async (req, res) => {
    try {
        const token = req.cookies.access_token;
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
    passwordResetRequests.inc();
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

router.post('/reset', resetLimiter, async (req, res) => {
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

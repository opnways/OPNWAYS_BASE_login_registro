import express from 'express';
import { AuthService } from '../services/AuthService.js';
import { TokenService } from '../services/TokenService.js';
import { z } from 'zod';

const router = express.Router();

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
};

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});

router.post('/register', async (req, res) => {
    try {
        const { email, password } = registerSchema.parse(req.body);
        const user = await AuthService.register(email, password);
        res.success(user);
    } catch (err) {
        console.error('Register error:', err);
        res.error(err.message);
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { user, accessToken, refreshToken } = await AuthService.login(email, password);

        res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.success({ user });
    } catch (err) {
        console.error('Login error:', err);
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
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        res.success({ message: 'Logged out' });
    } catch (err) {
        console.error('Logout error:', err);
        res.error(err.message);
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) throw new Error('No refresh token');

        const hash = TokenService.hashToken(refreshToken);
        const { accessToken, refreshToken: newRefreshToken } = await AuthService.refresh(hash);

        res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie('refresh_token', newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.success({ message: 'Token refreshed' });
    } catch (err) {
        console.error('Refresh error:', err);
        res.error(err.message, 401);
    }
});

router.get('/me', async (req, res) => {
    try {
        const token = req.cookies.access_token;
        if (!token) throw new Error('Not authenticated');

        const decoded = TokenService.verifyAccessToken(token);
        if (!decoded) throw new Error('Invalid token');

        const user = await AuthService.getMe(decoded.sub);
        res.success(user);
    } catch (err) {
        // Silent fail for me endpoint to avoid log noise on checkSession
        res.error(err.message, 401);
    }
});

router.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        await AuthService.forgotPassword(email);
        res.success({ message: 'If the email exists, a reset link was sent' });
    } catch (err) {
        res.error(err.message);
    }
});

router.post('/reset', async (req, res) => {
    try {
        const { token, password } = req.body;
        await AuthService.resetPassword(token, password);
        res.success({ message: 'Password reset successfully' });
    } catch (err) {
        res.error(err.message);
    }
});

export default router;

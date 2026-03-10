const DEFAULT_ACCESS_TTL = '15m';
const DEFAULT_REFRESH_TTL = '7d';

const toArray = (value, fallback = []) => {
    if (!value) return fallback;
    return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const toJwtExpiresIn = (value, fallback) => {
    if (!value) return fallback;
    if (/^\d+$/.test(value)) return `${value}s`;
    return value;
};

const ttlToMs = (value, fallbackMs) => {
    if (!value) return fallbackMs;

    if (/^\d+$/.test(value)) {
        return Number(value) * 1000;
    }

    const match = value.match(/^(\d+)([smhd])$/i);
    if (!match) return fallbackMs;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    const unitMap = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    return amount * unitMap[unit];
};

import { z } from 'zod';

// Validar y endurecer configuración crítica en el arranque (Fail-Fast)
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_NAME: z.string().default('Auth Starter'),
    APP_URL: z.string().url('APP_URL debe ser una URL válida (ej. https://midominio.com)'),
    API_URL: z.string().url('API_URL debe ser una URL válida (ej. https://api.midominio.com)'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres para seguridad'),
    // JWT_REFRESH_SECRET ha sido eliminado por el diseño de Refresh Token opaco.
    CORS_ALLOWED_ORIGINS: z.string().min(1, 'CORS_ALLOWED_ORIGINS requerido')
        // Validar lista separada por comas asegurando URLs válidas
        .refine((val) => val.split(',').every(url => {
            try { new URL(url.trim()); return true; } catch { return false; }
        }), 'CORS_ALLOWED_ORIGINS debe contener solo URLs válidas'),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    TRUST_PROXY: z.enum(['true', 'false']).default('false')
}).superRefine((data, ctx) => {
    // Si COOKIE_SAMESITE es 'none', es obligatorio que el entorno sea seguro
    if (data.COOKIE_SAMESITE === 'none' && data.NODE_ENV !== 'production') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "COOKIE_SAMESITE='none' requiere que la aplicación se sirva en HTTPS. Revisa tu NODE_ENV."
        });
    }
});

let parsedEnv;
try {
    parsedEnv = envSchema.parse({
        NODE_ENV: process.env.NODE_ENV,
        APP_NAME: process.env.APP_NAME,
        APP_URL: process.env.APP_URL || 'http://localhost:5173',
        API_URL: process.env.API_URL || 'http://localhost:3000/api',
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || (['development', 'test'].includes(process.env.NODE_ENV) ? 'dev_only_secret_access_do_not_use_in_prod_123' : ''),
        CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173',
        COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
        COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
        TRUST_PROXY: process.env.TRUST_PROXY
    });
} catch (err) {
    console.error('❌ CRITICAL ERROR: Configuración de entorno inválida o insegura. Abortando arranque.');
    console.error(err.errors);
    process.exit(1);
}

export const authConfig = {
    app: {
        name: parsedEnv.APP_NAME,
        appUrl: parsedEnv.APP_URL,
        apiUrl: parsedEnv.API_URL,
        trustProxy: parsedEnv.TRUST_PROXY === 'true'
    },
    corsAllowedOrigins: toArray(parsedEnv.CORS_ALLOWED_ORIGINS),
    redirects: {
        loginSuccess: process.env.LOGIN_SUCCESS_REDIRECT || '/dashboard',
        logout: process.env.LOGOUT_REDIRECT || '/login',
        defaultAuth: process.env.DEFAULT_AUTH_REDIRECT || '/dashboard'
    },
    cookies: {
        accessTokenName: process.env.COOKIE_NAME_ACCESS || 'access_token',
        refreshTokenName: process.env.COOKIE_NAME_REFRESH || 'refresh_token',
        csrfTokenName: 'csrf_token',
        domain: parsedEnv.COOKIE_DOMAIN || undefined,
        secure: parsedEnv.NODE_ENV === 'production',
        sameSite: parsedEnv.COOKIE_SAMESITE,
        path: '/'
    },
    token: {
        accessTtl: toJwtExpiresIn(process.env.ACCESS_TOKEN_TTL, DEFAULT_ACCESS_TTL),
        refreshTtl: toJwtExpiresIn(process.env.REFRESH_TOKEN_TTL, DEFAULT_REFRESH_TTL),
        accessMaxAgeMs: ttlToMs(process.env.ACCESS_TOKEN_TTL, 15 * 60 * 1000),
        refreshMaxAgeMs: ttlToMs(process.env.REFRESH_TOKEN_TTL, 7 * 24 * 60 * 60 * 1000)
    }
};

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

export const authConfig = {
    app: {
        name: process.env.APP_NAME || 'Auth Starter',
        appUrl: process.env.APP_URL || 'http://localhost:5173',
        apiUrl: process.env.API_URL || 'http://localhost:3000/api'
    },
    corsAllowedOrigins: toArray(process.env.CORS_ALLOWED_ORIGINS, [process.env.FRONTEND_URL || 'http://localhost:5173']),
    redirects: {
        loginSuccess: process.env.LOGIN_SUCCESS_REDIRECT || '/dashboard',
        logout: process.env.LOGOUT_REDIRECT || '/login',
        defaultAuth: process.env.DEFAULT_AUTH_REDIRECT || '/dashboard'
    },
    cookies: {
        accessTokenName: process.env.COOKIE_NAME_ACCESS || 'access_token',
        refreshTokenName: process.env.COOKIE_NAME_REFRESH || 'refresh_token',
        csrfTokenName: 'csrf_token',
        // COOKIE_DOMAIN debe especificarse en producción para dominios multi-tier (e.g. .midominio.com).
        // Evita undefined para que no se use solo localhost-only o un host demasiado amplio por defecto.
        domain: process.env.COOKIE_DOMAIN || undefined,
        secure: process.env.NODE_ENV === 'production',
        // 'lax' es correcto si app y auth.midominio.com navegan,
        // pero se usa 'strict' si se alojan estrictamente bajo la MISMA url visible de host
        // y se prefiere no arriesgar ataques cross-site por default.
        // Dado el escenario A de subdominios, 'lax' es suficiente mientras el domain sea estricto.
        sameSite: process.env.COOKIE_SAMESITE || 'lax',
        path: '/'
    },
    token: {
        accessTtl: toJwtExpiresIn(process.env.ACCESS_TOKEN_TTL, DEFAULT_ACCESS_TTL),
        refreshTtl: toJwtExpiresIn(process.env.REFRESH_TOKEN_TTL, DEFAULT_REFRESH_TTL),
        accessMaxAgeMs: ttlToMs(process.env.ACCESS_TOKEN_TTL, 15 * 60 * 1000),
        refreshMaxAgeMs: ttlToMs(process.env.REFRESH_TOKEN_TTL, 7 * 24 * 60 * 60 * 1000)
    }
};

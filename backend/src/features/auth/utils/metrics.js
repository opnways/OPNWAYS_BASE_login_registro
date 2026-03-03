import client from 'prom-client';

// Registro global
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Contadores de Auth
export const loginAttempts = new client.Counter({
    name: 'auth_login_attempts_total',
    help: 'Total login attempts',
    registers: [register]
});

export const loginFailures = new client.Counter({
    name: 'auth_login_failures_total',
    help: 'Total login failures',
    labelNames: ['reason'],
    registers: [register]
});

export const refreshAttempts = new client.Counter({
    name: 'auth_refresh_attempts_total',
    help: 'Total refresh token attempts',
    registers: [register]
});

export const refreshFailures = new client.Counter({
    name: 'auth_refresh_failures_total',
    help: 'Total refresh token failures',
    registers: [register]
});

export const rateLimitHits = new client.Counter({
    name: 'auth_rate_limit_hits_total',
    help: 'Total rate limit hits',
    labelNames: ['endpoint'],
    registers: [register]
});

export const passwordResetRequests = new client.Counter({
    name: 'auth_password_reset_requests_total',
    help: 'Total password reset requests',
    registers: [register]
});

export { register };

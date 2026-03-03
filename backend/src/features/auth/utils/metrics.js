import client from 'prom-client';
import { AuthRepository } from '../repository/AuthRepository.js';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const authRequestsTotal = new client.Counter({
    name: 'auth_requests_total',
    help: 'Total processed auth requests',
    labelNames: ['endpoint', 'status'],
    registers: [register]
});

export const authEndpointDurationSeconds = new client.Histogram({
    name: 'auth_endpoint_duration_seconds',
    help: 'Duration of auth endpoints in seconds',
    labelNames: ['endpoint', 'status'],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [register]
});

export const authInternalErrorsTotal = new client.Counter({
    name: 'auth_internal_errors_total',
    help: 'Total internal 5xx errors in auth endpoints',
    labelNames: ['endpoint'],
    registers: [register]
});

export const authRefreshRotationsTotal = new client.Counter({
    name: 'auth_refresh_rotations_total',
    help: 'Total successful refresh token rotations',
    registers: [register]
});

export const authRefreshRevocationsTotal = new client.Counter({
    name: 'auth_refresh_revocations_total',
    help: 'Total revoked refresh tokens by reason',
    labelNames: ['reason'],
    registers: [register]
});

export const authActiveSessions = new client.Gauge({
    name: 'auth_active_sessions',
    help: 'Number of active (non-revoked, non-expired) refresh tokens',
    registers: [register],
    async collect() {
        try {
            const count = await AuthRepository.countActiveSessions();
            this.set(count);
        } catch (err) {
            console.error('Failed to collect auth_active_sessions:', err.message);
        }
    }
});

export { register };

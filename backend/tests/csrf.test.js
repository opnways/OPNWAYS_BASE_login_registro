import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { generateCsrfToken, verifyCsrf } from '../src/features/auth/utils/csrf.js';

// Setup de app de prueba mínima
const app = express();
app.use(cookieParser());
app.use(express.json());

// Middleware emulador de la inyección de errores estándar de la api
app.use((req, res, next) => {
    res.error = (message, status = 400) => res.status(status).json({ success: false, data: null, error: message });
    next();
});

// Helper nativo para los tests sin depender de authRoutes entero
app.post('/test-csrf', verifyCsrf, (req, res) => {
    res.status(200).json({ success: true, message: 'Operación permitida' });
});

test('CSRF Protection Middleware', async (t) => {
    const validToken = generateCsrfToken();
    const maliciousToken = generateCsrfToken();

    await t.test('Debe rechazar la petición POST si no hay cookies ni headers', async () => {
        const response = await request(app).post('/test-csrf').send({ data: 'hacker' });
        assert.strictEqual(response.status, 403);
        assert.strictEqual(response.body.error, 'Token CSRF faltante');
    });

    await t.test('Debe rechazar la petición POST si la cookie existe pero falta el header', async () => {
        const response = await request(app)
            .post('/test-csrf')
            .set('Cookie', [`csrf_token=${validToken}`])
            .send({ data: 'hacker' });

        assert.strictEqual(response.status, 403);
        assert.strictEqual(response.body.error, 'Token CSRF faltante');
    });

    await t.test('Debe rechazar la petición POST si los tokens son distintos (Ataque MitM o Forge)', async () => {
        const response = await request(app)
            .post('/test-csrf')
            .set('Cookie', [`csrf_token=${validToken}`])
            .set('X-CSRF-Token', maliciousToken)
            .send({ data: 'hacker' });

        assert.strictEqual(response.status, 403);
        assert.strictEqual(response.body.error, 'Token CSRF inválido');
    });

    await t.test('Debe aceptar la petición POST mutadora si Token y Cookie matchean legítimamente', async () => {
        const response = await request(app)
            .post('/test-csrf')
            .set('Cookie', [`csrf_token=${validToken}`])
            .set('X-CSRF-Token', validToken)
            .send({ data: 'legit' });

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.body.success, true);
    });
});

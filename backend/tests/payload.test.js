import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';

// Setup de app de prueba simulando comportamiento clave del original
const app = express();

app.use((req, res, next) => {
    res.error = (message, status = 400) => res.status(status).json({ success: false, data: null, error: message });
    next();
});

app.use(express.json({ limit: '50kb' }));

app.post('/test-payload', (req, res) => {
    res.status(200).json({ success: true, data: 'OK' });
});

app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.error('El tamaño de la petición excede el límite permitido de 50kb', 413);
    }
    next(err);
});

test('Seguridad de Express Body Parser', async (t) => {
    await t.test('Debe aceptar un Payload pequeño (< 50kb)', async () => {
        const response = await request(app)
            .post('/test-payload')
            .send({ data: 'hacker'.repeat(100) }); // Pequeño

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.body.success, true);
    });

    await t.test('Debe Denegar y arrojar 413 ante un Payload monstruoso (> 50kb)', async () => {
        // payload = 100kb+ 
        const giantString = 'h'.repeat(60000);

        const response = await request(app)
            .post('/test-payload')
            .send({ data: giantString });

        assert.strictEqual(response.status, 413);
        assert.strictEqual(response.body.error, 'El tamaño de la petición excede el límite permitido de 50kb');
    });
});

import crypto from 'crypto';
import { authConfig } from '../utils/authConfig.js';

export const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// NOTA TÉCNICA (Double-Submit Cookie):
// Este modelo es stateless y asume que el subdominio no está comprometido.
// La validación en tiempo constante se mantiene para evitar enumeración.
// Una limitación real es que un atacante que controle otro subdominio (ej. vulnerable.dominio.com)
// podría sobreescribir la cookie en auth.dominio.com (Session fixation).
// Si esto se vuelve un riesgo explotable en la topología real, se migrará a CSRF Tokens stateful
// vinculados al access_token (vía JWT claim).
export const verifyCsrf = (req, res, next) => {
    const cookieToken = req.cookies[authConfig.cookies.csrfTokenName];
    const headerToken = req.headers['x-csrf-token'];

    if (!cookieToken || !headerToken) {
        return res.error('Token CSRF faltante', 403);
    }

    if (cookieToken.length !== 64 || headerToken.length !== 64 ||
        !/^[0-9a-fA-F]+$/.test(cookieToken) || !/^[0-9a-fA-F]+$/.test(headerToken)) {
        return res.error('Token CSRF malformado', 403);
    }

    try {
        const cookieBuffer = Buffer.from(cookieToken, 'hex');
        const headerBuffer = Buffer.from(headerToken, 'hex');

        if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
            return res.error('Token CSRF inválido', 403);
        }
    } catch (err) {
        return res.error('Token CSRF malformado', 403);
    }

    next();
};

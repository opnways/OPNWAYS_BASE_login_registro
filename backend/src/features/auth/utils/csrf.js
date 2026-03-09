import crypto from 'crypto';
import { authConfig } from '../utils/authConfig.js';

export const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

export const verifyCsrf = (req, res, next) => {
    const cookieToken = req.cookies[authConfig.cookies.csrfTokenName];
    const headerToken = req.headers['x-csrf-token'];

    if (!cookieToken || !headerToken) {
        return res.error('Token CSRF faltante', 403);
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

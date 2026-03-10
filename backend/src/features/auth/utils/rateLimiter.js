export const createEmailRateLimiter = (maxRequests, windowMs = 15 * 60 * 1000) => {
    // In-memory store for rate limiting by email
    const store = new Map();

    return (req, res, next) => {
        if (!req.body || !req.body.email) {
            return next();
        }

        const email = String(req.body.email).trim().toLowerCase();
        const now = Date.now();

        // Clean up expired entries lazily
        for (const [key, data] of store.entries()) {
            if (now > data.resetTime) {
                store.delete(key);
            }
        }

        let record = store.get(email);

        if (!record) {
            record = {
                count: 1,
                resetTime: now + windowMs
            };
            store.set(email, record);
            return next();
        }

        if (now > record.resetTime) {
            // Window expired, reset
            record.count = 1;
            record.resetTime = now + windowMs;
            return next();
        }

        record.count++;

        if (record.count > maxRequests) {
            return res.status(429).json({
                success: false,
                data: null,
                error: 'Demasiadas solicitudes para esta cuenta, por favor inténtalo de nuevo más tarde.'
            });
        }

        next();
    };
};

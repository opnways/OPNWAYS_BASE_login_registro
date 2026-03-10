export const createEmailRateLimiter = (maxRequests, windowMs = 15 * 60 * 1000) => {
    // In-memory store for rate limiting by email
    const store = new Map();
    const maxEntries = 10000;

    return (req, res, next) => {
        if (!req.body || !req.body.email) {
            return next();
        }

        const email = String(req.body.email).trim().toLowerCase();
        const now = Date.now();

        // 1. Clean up expired entries if we feel the map is getting large
        // We do this opportunistically to save memory before allocating more.
        if (store.size > maxEntries * 0.8) {
            for (const [key, data] of store.entries()) {
                if (now > data.resetTime) {
                    store.delete(key);
                }
            }
        }

        // 2. Memory protection: Fail-Closed Trade-off
        // Under a severe volumetric attack, if the Map is completely full of
        // ACTIVE items, discard to protect NodeJS Process Memory.
        if (!store.has(email) && store.size >= maxEntries) {
            return res.status(429).json({
                success: false,
                data: null,
                error: 'Sistemas con alta demanda, por favor inténtalo de nuevo más tarde.'
            });
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

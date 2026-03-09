import { authConfig } from '../utils/authConfig.js';

const baseCookieOptions = {
    httpOnly: true,
    secure: authConfig.cookies.secure,
    sameSite: authConfig.cookies.sameSite,
    path: authConfig.cookies.path,
    domain: authConfig.cookies.domain
};

const clearCookieOptions = {
    secure: authConfig.cookies.secure,
    sameSite: authConfig.cookies.sameSite,
    path: authConfig.cookies.path,
    domain: authConfig.cookies.domain
};

export const authCookies = {
    setSessionCookies(res, accessToken, refreshToken) {
        res.cookie(authConfig.cookies.accessTokenName, accessToken, {
            ...baseCookieOptions,
            maxAge: authConfig.token.accessMaxAgeMs
        });

        res.cookie(authConfig.cookies.refreshTokenName, refreshToken, {
            ...baseCookieOptions,
            maxAge: authConfig.token.refreshMaxAgeMs
        });
    },
    clearSessionCookies(res) {
        res.clearCookie(authConfig.cookies.accessTokenName, clearCookieOptions);
        res.clearCookie(authConfig.cookies.refreshTokenName, clearCookieOptions);
    },
    setCsrfCookie(res, token) {
        res.cookie(authConfig.cookies.csrfTokenName, token, {
            httpOnly: false,
            secure: authConfig.cookies.secure,
            sameSite: authConfig.cookies.sameSite,
            path: authConfig.cookies.path,
            domain: authConfig.cookies.domain
        });
    }
};

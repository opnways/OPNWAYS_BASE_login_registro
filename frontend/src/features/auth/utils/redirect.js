import { authConfig } from '../config/authConfig';

export const isExternalUrl = (target) => {
    try {
        const url = new URL(target, window.location.origin);
        return url.origin !== window.location.origin;
    } catch {
        return false;
    }
};

export const redirectTo = (navigate, target, options = {}) => {
    if (!target) return;

    if (/^(javascript|data|vbscript):/i.test(target)) {
        console.warn('Blocked malicious redirect:', target);
        navigate('/', options);
        return;
    }

    if (isExternalUrl(target)) {
        const safeExternalUrls = [
            authConfig.redirects.loginSuccess,
            authConfig.redirects.logout,
            authConfig.redirects.publicDefault
        ];

        if (safeExternalUrls.includes(target)) {
            window.location.assign(target);
            return;
        }

        console.warn('Blocked arbitrary external redirect to:', target);
        navigate('/', options);
        return;
    }

    navigate(target, options);
};

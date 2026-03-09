const env = import.meta.env;

export const authConfig = {
    appName: env.VITE_APP_NAME || 'Auth Starter',
    apiUrl: env.VITE_API_URL || 'http://localhost:3000/api',
    redirects: {
        loginSuccess: env.VITE_AUTH_LOGIN_REDIRECT || '/dashboard',
        logout: env.VITE_AUTH_LOGOUT_REDIRECT || '/login',
        authenticatedDefault: env.VITE_DEFAULT_AUTHENTICATED_ROUTE || '/dashboard',
        publicDefault: env.VITE_DEFAULT_PUBLIC_ROUTE || '/login'
    }
};

export const authRoutes = {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password'
};

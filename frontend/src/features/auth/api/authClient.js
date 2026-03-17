import axios from 'axios';
import { authConfig } from '../config/authConfig';

const api = axios.create({
    baseURL: authConfig.apiUrl,
    withCredentials: true
});

// Interceptor para manejar errores 401 y evitar que se muestren en consola
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            // Manejar el error 401 sin loguearlo
            return Promise.resolve({ data: null });
        }
        return Promise.reject(error);
    }
);

// Interceptor para leer la cookie csrf_token expuesta y adjuntarla como Header
api.interceptors.request.use((config) => {
    const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
    if (match) {
        config.headers['X-CSRF-Token'] = match[1];
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const authClient = {
    async login(email, password) {
        const { data } = await api.post('/auth/login', { email, password });
        return data;
    },
    async register(email, password) {
        const { data } = await api.post('/auth/register', { email, password });
        return data;
    },
    async logout() {
        const { data } = await api.post('/auth/logout');
        return data;
    },
    async getMe() {
        const { data } = await api.get('/auth/me');
        return data;
    },
    async refresh() {
        const { data } = await api.post('/auth/refresh');
        return data;
    },
    async forgotPassword(email) {
        const { data } = await api.post('/auth/forgot', { email });
        return data;
    },
    async resetPassword(token, password) {
        const { data } = await api.post('/auth/reset', { token, password });
        return data;
    },
    async getCsrf() {
        const { data } = await api.get('/auth/csrf');
        return data;
    }
};

export default api;

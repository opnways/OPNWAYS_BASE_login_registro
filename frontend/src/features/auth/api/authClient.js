import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    withCredentials: true
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
    }
};

export default api;

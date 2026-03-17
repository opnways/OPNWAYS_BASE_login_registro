import { createContext, useContext, useState, useEffect } from 'react';
import { authClient } from '../api/authClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initSession = async () => {
            try {
                // Recuperar la cookie transparente del token CSRF (state mutate protection) al montar la app
                await authClient.getCsrf();
            } catch (err) {
                console.warn('Fallo al recuperar token CSRF:', err);
            }
            await checkSession();
        };
        initSession();
    }, []);

    const checkSession = async () => {
        try {
            const response = await authClient.getMe();
            if (response && response.success) {
                setUser(response.data);
            }
        } catch (err) {
            // Check if error is specifically an auth error (401/403) before refreshing
            const status = err.response?.status || err.status;
            if (status === 401 || status === 403 || err.message?.includes('401') || err.message?.includes('403')) {
                try {
                    const refreshResponse = await authClient.refresh();
                    if (refreshResponse && refreshResponse.success) {
                        const retryMe = await authClient.getMe();
                        if (retryMe && retryMe.success) setUser(retryMe.data);
                    }
                } catch (refreshErr) {
                    setUser(null); // Truly unauthenticated
                }
            } else {
                // If network error, 500, etc, keep previous state (which is null initially) 
                // but do not overwrite to null if they had a session, or alternatively just log the error
                console.warn('Non-auth error during checkSession:', err);
            }
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await authClient.login(email, password);
        if (response.success) {
            setUser(response.data.user);
        }
        return response;
    };

    const logout = async () => {
        await authClient.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkSession }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

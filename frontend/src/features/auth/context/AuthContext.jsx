import { createContext, useContext, useState, useEffect } from 'react';
import { authClient } from '../api/authClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const response = await authClient.getMe();
            if (response.success) {
                setUser(response.data);
            }
        } catch (err) {
            // If unauthorized, try to refresh
            try {
                const refreshResponse = await authClient.refresh();
                if (refreshResponse.success) {
                    const retryMe = await authClient.getMe();
                    if (retryMe.success) setUser(retryMe.data);
                }
            } catch (refreshErr) {
                setUser(null);
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

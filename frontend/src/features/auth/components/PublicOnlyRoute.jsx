import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authConfig } from '../config/authConfig';

export function PublicOnlyRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (user) {
        return <Navigate to={authConfig.redirects.authenticatedDefault} replace />;
    }

    return <Outlet />;
}

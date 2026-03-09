import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authConfig } from '../config/authConfig';
import { redirectTo } from '../utils/redirect';

export default function LogoutPage() {
    const [searchParams] = useSearchParams();
    const returnTo = searchParams.get('returnTo');
    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const runLogout = async () => {
            try {
                await logout();
            } finally {
                redirectTo(navigate, returnTo || authConfig.redirects.logout, { replace: true });
            }
        };

        runLogout();
    }, [logout, navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
    );
}

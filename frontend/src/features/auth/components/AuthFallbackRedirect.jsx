import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authConfig } from '../config/authConfig';
import { redirectTo } from '../utils/redirect';

export default function AuthFallbackRedirect() {
    const navigate = useNavigate();

    useEffect(() => {
        redirectTo(navigate, authConfig.redirects.publicDefault, { replace: true });
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
    );
}

import { useState } from 'react';
import { authClient } from '../api/authClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) return setError('Invalid token');

        setError('');
        setLoading(true);
        try {
            const res = await authClient.resetPassword(token, password);
            if (res.success) {
                setMessage('Password updated! Redirecting to login...');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(res.error || 'Failed to reset password');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl mb-4 text-white">
                    <Lock size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Nueva contraseña</h2>
                <p className="text-slate-500 mt-2">Ingresa tu nueva clave de acceso</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                        {error}
                    </div>
                )}
                {message && (
                    <div className="p-3 bg-green-50 border border-green-100 text-green-600 text-sm rounded-lg flex items-center gap-2">
                        <CheckCircle size={18} />
                        {message}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nueva contraseña</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="password"
                            required
                            minLength={8}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                            placeholder="Mínimo 8 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Restablecer contraseña'}
                </button>
            </form>
        </div>
    );
}

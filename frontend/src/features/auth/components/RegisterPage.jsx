import { useEffect, useState } from 'react';
import { authClient } from '../api/authClient';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, Loader2 } from 'lucide-react';
import { authConfig, authRoutes } from '../config/authConfig';
import { redirectTo } from '../utils/redirect';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();


    useEffect(() => {
        if (!authLoading && user) {
            redirectTo(navigate, authConfig.redirects.loginSuccess, { replace: true });
        }
    }, [authLoading, navigate, user]);

    const passwordRequirements = [
        { label: '8+ caracteres', regex: /.{8,}/ },
        { label: 'Una mayúscula', regex: /[A-Z]/ },
        { label: 'Un número', regex: /[0-9]/ },
        { label: 'Carácter especial', regex: /[^A-Za-z0-9]/ }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            return setError('Las contraseñas no coinciden');
        }

        const missingRequirements = passwordRequirements.filter(req => !req.regex.test(password));
        if (missingRequirements.length > 0) {
            return setError(`La contraseña debe cumplir todos los requisitos.`);
        }

        setLoading(true);
        try {
            const res = await authClient.register(email, password);
            if (res.success) {
                navigate(authRoutes.login, { state: { message: 'Cuenta creada con éxito! Por favor, inicia sesión.' } });
            } else {
                setError(res.error || 'No se pudo crear la cuenta');
            }
        } catch (err) {
            const backendError = err.response?.data?.error || err.message;
            setError(backendError || 'Ha ocurrido un error. Por favor, inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl mb-4 text-white">
                    <UserPlus size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Crea tu cuenta</h2>
                <p className="text-slate-500 mt-2">Únete a nosotros en un solo paso</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="email"
                            required
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                            placeholder="correo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="password"
                            required
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                            placeholder="Mínimo 8 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {passwordRequirements.map((req, i) => {
                            const isMet = req.regex.test(password);
                            return (
                                <div key={i} className={`flex items-center gap-1.5 text-[11px] ${isMet ? 'text-green-600' : 'text-slate-400'}`}>
                                    <div className={`w-1 h-1 rounded-full ${isMet ? 'bg-green-600' : 'bg-slate-300'}`} />
                                    {req.label}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confirmar Contraseña</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="password"
                            required
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                            placeholder="Repite tu contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Registrarse'}
                </button>
            </form>

            <p className="text-center mt-8 text-sm text-slate-600">
                ¿Ya tienes cuenta?{' '}
                <Link to={authRoutes.login} className="font-semibold text-slate-900 hover:underline">
                    Inicia sesión
                </Link>
            </p>
        </div>
    );
}

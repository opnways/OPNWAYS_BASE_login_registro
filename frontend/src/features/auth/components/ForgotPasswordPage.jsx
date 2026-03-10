import { useState } from 'react';
import { authClient } from '../api/authClient';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { authRoutes } from '../config/authConfig';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await authClient.forgotPassword(email);
            setMessage(res.data.message);
        } catch (err) {
            setMessage('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl mb-4 text-white">
                    <KeyRound size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Recuperar cuenta</h2>
                <p className="text-slate-500 mt-2">Te enviaremos un enlace para restablecer tu contraseña</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {message && (
                    <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 text-sm rounded-lg">
                        {message}
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
                            placeholder="tuemail@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar enlace'}
                </button>
            </form>

            <div className="text-center mt-8">
                <Link to={authRoutes.login} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
                    <ArrowLeft size={16} />
                    Volver al inicio de sesión
                </Link>
            </div>
        </div>
    );
}

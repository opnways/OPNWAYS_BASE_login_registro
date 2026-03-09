import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';
import { PublicOnlyRoute } from './features/auth/components/PublicOnlyRoute';
import LoginPage from './features/auth/components/LoginPage';
import RegisterPage from './features/auth/components/RegisterPage';
import ForgotPasswordPage from './features/auth/components/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/components/ResetPasswordPage';
import { useAuth } from './features/auth/context/AuthContext';
import { LogOut, User, ShieldCheck } from 'lucide-react';
import { authConfig, authRoutes } from './features/auth/config/authConfig';

function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate(authConfig.redirects.logout);
    };
    return (
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ShieldCheck className="text-green-400" />
                            Sesión Segura
                        </h1>
                        <p className="text-slate-400 mt-1">Has accedido correctamente al área protegida</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Cerrar sesión"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            <div className="p-8">
                <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                        <User size={32} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">{user?.email}</h3>
                        <p className="text-sm text-slate-500">ID: {user?.id}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado de sesión</span>
                        <p className="text-sm font-medium text-slate-900 mt-1">Activa (Cookie httpOnly)</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Última conexión</span>
                        <p className="text-sm font-medium text-slate-900 mt-1">{new Date().toLocaleTimeString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50">
                    <Routes>
                        <Route element={<PublicOnlyRoute />}>
                            <Route path={authRoutes.login} element={<LoginPage />} />
                            <Route path={authRoutes.register} element={<RegisterPage />} />
                        </Route>

                        <Route path={authRoutes.forgotPassword} element={<ForgotPasswordPage />} />
                        <Route path={authRoutes.resetPassword} element={<ResetPasswordPage />} />

                        <Route element={<ProtectedRoute />}>
                            <Route path={authConfig.redirects.authenticatedDefault} element={<Dashboard />} />
                        </Route>

                        <Route path="*" element={<Navigate to={authConfig.redirects.publicDefault} replace />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;

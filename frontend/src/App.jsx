import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import LoginPage from './features/auth/components/LoginPage';
import RegisterPage from './features/auth/components/RegisterPage';
import ForgotPasswordPage from './features/auth/components/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/components/ResetPasswordPage';
import LogoutPage from './features/auth/components/LogoutPage';
import AuthFallbackRedirect from './features/auth/components/AuthFallbackRedirect';
import { authRoutes } from './features/auth/config/authConfig';

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50">
                    <Routes>
                        <Route path={authRoutes.login} element={<LoginPage />} />
                        <Route path={authRoutes.register} element={<RegisterPage />} />
                        <Route path={authRoutes.forgotPassword} element={<ForgotPasswordPage />} />
                        <Route path={authRoutes.resetPassword} element={<ResetPasswordPage />} />
                        <Route path={authRoutes.logout} element={<LogoutPage />} />

                        <Route path="*" element={<AuthFallbackRedirect />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;

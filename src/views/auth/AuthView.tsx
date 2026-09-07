import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Truck,
  DollarSign,
  KeyRound,
  Send,
  Sparkles,
  Info,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { authService } from '../../services/auth';
import { storage } from '../../services/storage';
import { User, PasswordResetToken } from '../../types';

interface AuthViewProps {
  onLoginSuccess: (user: User) => void;
  initialExpiredNotice?: boolean;
}

type AuthScreen = 'login' | 'register' | 'forgot_password' | 'reset_password' | 'pending_approval';

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  initialExpiredNotice = false,
}) => {
  const [screen, setScreen] = useState<AuthScreen>('login');

  // Form States - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(
    initialExpiredNotice ? 'Sua sessão expirou. Entre novamente.' : null
  );

  // Form States - Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regAgreeTerms, setRegAgreeTerms] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Form States - Forgot Password & Recovery
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [simulatedToken, setSimulatedToken] = useState<PasswordResetToken | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form States - Reset Password
  const [resetTokenStr, setResetTokenStr] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Registration feedback state
  const [registeredPendingUser, setRegisteredPendingUser] = useState<User | null>(null);

  // Autofill remembered email
  useEffect(() => {
    const saved = authService.getRememberedEmail();
    if (saved) {
      setLoginEmail(saved);
      setForgotEmail(saved);
    }
  }, []);

  // Cooldown countdown for resend email
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Phone mask helper
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) {
      setRegPhone(raw);
    } else if (raw.length <= 7) {
      setRegPhone(`(${raw.slice(0, 2)}) ${raw.slice(2)}`);
    } else {
      setRegPhone(`(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`);
    }
  };

  // Password rules validation
  const getPasswordStrength = (pwd: string) => {
    const hasMin = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNum = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

    let score = 0;
    if (hasMin) score++;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasNum) score++;
    if (hasSpecial) score++;

    let level: 'Fraca' | 'Média' | 'Forte' = 'Fraca';
    let color = 'bg-rose-500';
    let width = 'w-1/4';

    if (score >= 4) {
      level = 'Forte';
      color = 'bg-emerald-500';
      width = 'w-full';
    } else if (score >= 2) {
      level = 'Média';
      color = 'bg-amber-500';
      width = 'w-2/3';
    }

    return {
      hasMin,
      hasUpper,
      hasLower,
      hasNum,
      hasSpecial,
      score,
      level,
      color,
      width,
    };
  };

  const regPwdAnalysis = getPasswordStrength(regPassword);
  const resetPwdAnalysis = getPasswordStrength(newPassword);

  // Quick fill helper for demonstration/test accounts
  const handleQuickLogin = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setLoginError(null);
  };

  // Handler: Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim()) {
      setLoginError('Informe seu e-mail.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Digite sua senha.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await authService.login(loginEmail, loginPassword, rememberMe);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setLoginError(res.error || 'E-mail ou senha incorretos.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Falha ao conectar com o serviço de autenticação.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handler: Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim()) {
      setRegError('Informe seu nome completo.');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('Informe seu e-mail.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(regPassword)) {
      setRegError('A senha deve conter ao menos uma letra maiúscula.');
      return;
    }
    if (!/[a-z]/.test(regPassword)) {
      setRegError('A senha deve conter ao menos uma letra minúscula.');
      return;
    }
    if (!/[0-9]/.test(regPassword)) {
      setRegError('A senha deve conter ao menos um número.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('As senhas não coincidem.');
      return;
    }
    if (!regAgreeTerms) {
      setRegError('É necessário aceitar os termos de uso e política de privacidade.');
      return;
    }

    setRegLoading(true);
    try {
      const res = await authService.registerUser({
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
      });

      if (res.success && res.user) {
        if (res.pendingApproval) {
          setRegisteredPendingUser(res.user);
          setScreen('pending_approval');
        } else {
          // Automatic login if approved immediately
          const loginRes = await authService.login(regEmail, regPassword, true);
          if (loginRes.success && loginRes.user) {
            onLoginSuccess(loginRes.user);
          } else {
            setScreen('login');
            setLoginError('Conta criada! Digite sua senha para entrar.');
          }
        }
      } else {
        setRegError(res.error || 'Falha ao realizar cadastro.');
      }
    } catch (err: any) {
      setRegError(err?.message || 'Erro inesperado ao registrar.');
    } finally {
      setRegLoading(false);
    }
  };

  // Handler: Forgot Password Request
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    const res = await authService.requestPasswordReset(forgotEmail);
    setForgotLoading(false);
    setForgotSubmitted(true);
    setResendCooldown(45);
    setSimulatedToken(null);
  };

  // Open reset password screen with token
  const handleOpenResetWithToken = (token: PasswordResetToken) => {
    setResetTokenStr(token.token);
    setNewPassword('');
    setConfirmNewPassword('');
    setResetSuccess(false);

    // Validate token immediately
    const val = authService.validateResetToken(token.token);
    if (!val.valid) {
      setResetError(val.error || 'Este link expirou ou já foi utilizado.');
    } else {
      setResetError(null);
    }
    setScreen('reset_password');
  };

  // Handler: Reset Password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword.length < 8) {
      setResetError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setResetError('A senha deve conter ao menos uma letra maiúscula.');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setResetError('A senha deve conter ao menos uma letra minúscula.');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setResetError('A senha deve conter ao menos um número.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('As senhas não coincidem.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await authService.resetPassword(resetTokenStr, newPassword);
      if (res.success) {
        setResetSuccess(true);
      } else {
        setResetError(res.error || 'Não foi possível redefinir sua senha.');
      }
    } catch (err: any) {
      setResetError(err?.message || 'Erro ao redefinir a senha.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col lg:flex-row antialiased font-sans text-slate-800 selection:bg-sky-500 selection:text-white">
      {/* ============================================================ */}
      {/* LEFT: INSTITUTIONAL BRANDING (SPLIT SCREEN DESKTOP & TABLET) */}
      {/* ============================================================ */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 min-h-[380px] lg:min-h-screen relative flex-col justify-between p-6 sm:p-10 lg:p-16 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 text-white overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Subtle geometric & droplet illumination background */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-500 blur-3xl" />
          <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-blue-600 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-sky-700 blur-3xl" />
        </div>

        {/* Top Header Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain brightness-0 invert scale-125 origin-left" />
            
          </div>
        </div>

        {/* Center Institutional Message */}
        <div className="relative z-10 my-8 lg:my-0 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Sistema Integrado de Distribuição
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white mb-4">
            Gestão inteligente de vendas, entregas e financeiro.
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
            Controle de ponta a ponta para a distribuição de galões de 20L, comodatos de vasilhames,
            comissões automatizadas e fechamento diário do caixa.
          </p>

          {/* Value pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-200">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <Truck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Rotas e romaneios por motorista</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Controle rigoroso de vasilhames</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <DollarSign className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Comissões e DRE em tempo real</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Auditoria e controle por perfil</span>
            </div>
          </div>
        </div>

        {/* Bottom Institutional Info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-800/60">
          <span>Imperatriz - MA</span>
          <span>© 2026 Água Cristal Sul</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT: AUTH CARDS (LOGIN, CADASTRO, RECUPERAÇÃO, REDEFINIÇÃO) */}
      {/* ============================================================ */}
      <div className="w-full md:w-7/12 lg:w-1/2 min-h-screen flex items-center justify-center p-4 sm:p-8 lg:p-16 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo Header (Shown on phone only: < md) */}
          <div className="md:hidden flex items-center gap-3 mb-5 pb-3 border-b border-slate-200">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain scale-125 origin-left" />
            
          </div>
          {/* ======================================================== */}
          {/* SCREEN 1: LOGIN */}
          {/* ======================================================== */}
          {screen === 'login' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-7 sm:p-9 space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Bem-vindo de volta
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Entre na sua conta para acessar o sistema.
                </p>
              </div>

              {/* Alert Message */}
              {loginError && (
                <div
                  id="login-error-banner"
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{loginError}</div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="login-email">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="seuemail@empresa.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-900"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700" htmlFor="login-password">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setScreen('forgot_password');
                        setForgotSubmitted(false);
                      }}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                    />
                    <span>Lembrar meu acesso</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-md shadow-sky-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loginLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <span>ENTRAR</span>
                  )}
                </button>
              </form>

              {/* Bottom Register Switch */}
              <div className="pt-2 text-center border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Ainda não possui acesso?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('register');
                      setRegError(null);
                    }}
                    className="font-bold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                  >
                    Criar conta
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 2: REGISTRATION (CRIAR CONTA) */}
          {/* ======================================================== */}
          {screen === 'register' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-7 sm:p-9 space-y-6">
              <div>
                <button
                  type="button"
                  onClick={() => setScreen('login')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para o Login
                </button>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Criar sua conta
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Cadastre seus dados para acessar o Gestão Água Cristal Sul.
                </p>
              </div>

              {regError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{regError}</div>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      autoComplete="name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Digite seu nome completo"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      autoComplete="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="seu.email@empresa.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(99) 99999-9999"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Senha *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Crie uma senha forte"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      aria-label={showRegPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {regPassword.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Força da senha:</span>
                        <span className="font-bold text-slate-700">{regPwdAnalysis.level}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${regPwdAnalysis.color} ${regPwdAnalysis.width} transition-all duration-300`}
                        />
                      </div>
                      {/* Checkmarks */}
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                        <span
                          className={`flex items-center gap-1 ${
                            regPwdAnalysis.hasMin ? 'text-emerald-600 font-medium' : 'text-slate-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Mínimo 8 caracteres
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            regPwdAnalysis.hasUpper ? 'text-emerald-600 font-medium' : 'text-slate-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Letra maiúscula
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            regPwdAnalysis.hasLower ? 'text-emerald-600 font-medium' : 'text-slate-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Letra minúscula
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            regPwdAnalysis.hasNum ? 'text-emerald-600 font-medium' : 'text-slate-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Pelo menos um número
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      aria-label={showRegConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {regConfirmPassword && regPassword !== regConfirmPassword && (
                    <span className="text-[11px] text-rose-500 mt-1 block">
                      As senhas não coincidem.
                    </span>
                  )}
                </div>

                {/* Terms of Service Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={regAgreeTerms}
                      onChange={(e) => setRegAgreeTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                    />
                    <span>
                      Li e concordo com os termos de uso e política de privacidade do Gestão Água Cristal Sul.
                    </span>
                  </label>
                </div>

                {/* Policy Notice */}
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-[11px] flex items-start gap-2">
                  <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    Novos cadastros são criados inicialmente com perfil <strong>Operador</strong>
                    {storage.getSettings().require_admin_approval_for_new_users !== false
                      ? ' e aguardam aprovação de um Administrador.'
                      : '.'}
                  </span>
                </div>

                {/* Submit Register Button */}
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-md shadow-sky-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {regLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Criando conta...</span>
                    </>
                  ) : (
                    <span>CRIAR CONTA</span>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Já possui uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => setScreen('login')}
                    className="font-bold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                  >
                    Entrar
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 3: FORGOT PASSWORD (RECUPERAÇÃO) */}
          {/* ======================================================== */}
          {screen === 'forgot_password' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-7 sm:p-9 space-y-6">
              <div>
                <button
                  type="button"
                  onClick={() => setScreen('login')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para o Login
                </button>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Recuperar senha
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Informe o e-mail cadastrado para receber as instruções de recuperação.
                </p>
              </div>

              {!forgotSubmitted ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="forgot-email">
                      E-mail cadastrado
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="seuemail@empresa.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-md shadow-sky-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {forgotLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Enviando instruções...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>ENVIAR INSTRUÇÕES</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                  <div className="space-y-5 animate-in fade-in">
                  {/* Generic safe confirmation message */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Instruções enviadas!
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Se existir uma conta vinculada ao e-mail <strong>{forgotEmail}</strong>, você receberá
                      as instruções para redefinir sua senha.
                    </p>
                  </div>

                  {/* Resend button */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={resendCooldown > 0}
                      onClick={handleForgotSubmit}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:text-slate-400 cursor-pointer"
                    >
                      {resendCooldown > 0
                        ? `Reenviar em ${resendCooldown}s`
                        : 'Não recebeu? Reenviar e-mail'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setScreen('login')}
                      className="text-xs font-bold text-slate-700 hover:underline cursor-pointer"
                    >
                      Voltar ao Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 4: RESET PASSWORD (NOVA SENHA) */}
          {/* ======================================================== */}
          {screen === 'reset_password' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-7 sm:p-9 space-y-6">
              <div>
                <button
                  type="button"
                  onClick={() => setScreen('login')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para o Login
                </button>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Criar nova senha
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Defina uma nova senha segura para o seu usuário.
                </p>
              </div>

              {resetSuccess ? (
                <div className="space-y-5 animate-in fade-in">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h3 className="font-bold text-sm text-emerald-800">
                      Senha alterada com sucesso!
                    </h3>
                    <p className="text-xs text-emerald-700">
                      Você já pode acessar o sistema utilizando suas novas credenciais.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('login');
                      setLoginPassword('');
                    }}
                    className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    IR PARA O LOGIN
                  </button>
                </div>
              ) : (
                <>
                  {resetError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1 font-semibold">{resetError}</div>
                      </div>
                      {resetError.includes('expirou') && (
                        <button
                          type="button"
                          onClick={() => {
                            setScreen('forgot_password');
                            setForgotSubmitted(false);
                            setResetError(null);
                          }}
                          className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                        >
                          SOLICITAR NOVO LINK
                        </button>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nova Senha *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Digite a nova senha"
                          className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Strength indicator */}
                      {newPassword.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Força da senha:</span>
                            <span className="font-bold text-slate-700">{resetPwdAnalysis.level}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${resetPwdAnalysis.color} ${resetPwdAnalysis.width} transition-all duration-300`}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                            <span
                              className={`flex items-center gap-1 ${
                                resetPwdAnalysis.hasMin ? 'text-emerald-600 font-medium' : 'text-slate-400'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Mínimo 8 caracteres
                            </span>
                            <span
                              className={`flex items-center gap-1 ${
                                resetPwdAnalysis.hasUpper ? 'text-emerald-600 font-medium' : 'text-slate-400'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Letra maiúscula
                            </span>
                            <span
                              className={`flex items-center gap-1 ${
                                resetPwdAnalysis.hasLower ? 'text-emerald-600 font-medium' : 'text-slate-400'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Letra minúscula
                            </span>
                            <span
                              className={`flex items-center gap-1 ${
                                resetPwdAnalysis.hasNum ? 'text-emerald-600 font-medium' : 'text-slate-400'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Pelo menos um número
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirmar Nova Senha *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                          className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          aria-label={showConfirmNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-md shadow-sky-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {resetLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <span>SALVAR NOVA SENHA</span>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 5: PENDING APPROVAL CONFIRMATION */}
          {/* ======================================================== */}
          {screen === 'pending_approval' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-7 sm:p-9 space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow-inner">
                <Clock className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Cadastro realizado com sucesso!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  Seu acesso foi registrado e está{' '}
                  <strong className="text-amber-700 font-bold">
                    aguardando aprovação do administrador
                  </strong>
                  .
                </p>
              </div>

              {registeredPendingUser && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nome:</span>
                    <span className="font-bold text-slate-800">{registeredPendingUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">E-mail:</span>
                    <span className="font-bold text-slate-800">{registeredPendingUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Perfil Inicial:</span>
                    <span className="font-bold text-sky-700">{registeredPendingUser.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                      Aguardando Aprovação
                    </span>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500">
                Assim que o Administrador aprovar seu perfil nas Configurações do sistema, você
                poderá acessar diretamente com seu e-mail e senha.
              </p>

              <button
                type="button"
                onClick={() => setScreen('login')}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                VOLTAR PARA O LOGIN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

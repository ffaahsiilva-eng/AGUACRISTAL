import { User, UserRole, UserStatus, UserSession, PasswordResetToken } from '../types';
import { storage } from './storage';
import { generateSalt, hashPassword, verifyPassword, generateSecureToken } from '../utils/crypto';

const SESSION_KEY = 'aguacristal_session_v2';
const REMEMBERED_EMAIL_KEY = 'aguacristal_remembered_email_v2';
const RESET_TOKENS_KEY = 'aguacristal_reset_tokens_v2';
const LOGIN_ATTEMPTS_KEY = 'aguacristal_login_attempts_v2';

interface LoginAttemptRecord {
  count: number;
  lastAttempt: number;
}

class AuthService {
  /**
   * Check and return the active session if valid
   */
  public getSession(): { session: UserSession | null; expired: boolean; user: User | null } {
    let sessionData = sessionStorage.getItem(SESSION_KEY);
    let fromLocalStorage = false;

    if (!sessionData) {
      sessionData = localStorage.getItem(SESSION_KEY);
      fromLocalStorage = true;
    }

    if (!sessionData) {
      return { session: null, expired: false, user: null };
    }

    try {
      const session: UserSession = JSON.parse(sessionData);

      // Check expiration
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return { session: null, expired: true, user: null };
      }

      // Check user in database
      const users = storage.getUsers();
      const user = users.find((u) => u.id === session.userId);

      if (!user) {
        this.clearSession();
        return { session: null, expired: false, user: null };
      }

      // Check if user is active
      const status = user.status || 'Ativo';
      if (status === 'Inativo' || status === 'Bloqueado' || status === 'Pendente') {
        this.clearSession();
        return { session: null, expired: false, user: null };
      }

      // Keep current user updated in storage
      storage.setCurrentUser(user);

      return { session, expired: false, user };
    } catch (e) {
      this.clearSession();
      return { session: null, expired: false, user: null };
    }
  }

  /**
   * Save session to localStorage or sessionStorage
   */
  public saveSession(session: UserSession): void {
    if (session.rememberMe) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(REMEMBERED_EMAIL_KEY, session.userEmail);
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  }

  /**
   * Clear active session
   */
  public clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  /**
   * Get remembered email for login autofill
   */
  public getRememberedEmail(): string {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
  }

  /**
   * Rate limiting for login attempts
   */
  private checkRateLimit(email: string): { allowed: boolean; waitSeconds?: number } {
    try {
      const attemptsStr = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
      const attemptsMap: Record<string, LoginAttemptRecord> = attemptsStr ? JSON.parse(attemptsStr) : {};
      const key = email.toLowerCase().trim();
      const record = attemptsMap[key];

      if (record) {
        const timeDiff = Date.now() - record.lastAttempt;
        // If 5 or more failed attempts in the last 30 seconds, block
        if (record.count >= 5 && timeDiff < 30000) {
          const waitSeconds = Math.ceil((30000 - timeDiff) / 1000);
          return { allowed: false, waitSeconds };
        }
        // If more than 30 seconds passed, reset counter
        if (timeDiff >= 30000) {
          delete attemptsMap[key];
          localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attemptsMap));
        }
      }
      return { allowed: true };
    } catch (e) {
      return { allowed: true };
    }
  }

  private recordFailedAttempt(email: string): void {
    try {
      const attemptsStr = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
      const attemptsMap: Record<string, LoginAttemptRecord> = attemptsStr ? JSON.parse(attemptsStr) : {};
      const key = email.toLowerCase().trim();
      const current = attemptsMap[key] || { count: 0, lastAttempt: Date.now() };

      attemptsMap[key] = {
        count: current.count + 1,
        lastAttempt: Date.now(),
      };
      localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attemptsMap));
    } catch (e) {
      console.warn('Failed to record attempt', e);
    }
  }

  private clearFailedAttempts(email: string): void {
    try {
      const attemptsStr = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
      if (attemptsStr) {
        const attemptsMap: Record<string, LoginAttemptRecord> = JSON.parse(attemptsStr);
        delete attemptsMap[email.toLowerCase().trim()];
        localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attemptsMap));
      }
    } catch (e) {
      console.warn('Failed to clear attempts', e);
    }
  }

  /**
   * Authenticate user with email and password
   */
  public async login(
    emailRaw: string,
    passwordAttempt: string,
    rememberMe: boolean = false
  ): Promise<{
    success: boolean;
    error?: string;
    user?: User;
    session?: UserSession;
  }> {
    const email = emailRaw.toLowerCase().trim();

    // 1. Basic validation
    if (!email) {
      return { success: false, error: 'Informe seu e-mail.' };
    }
    if (!passwordAttempt) {
      return { success: false, error: 'Digite sua senha.' };
    }

    // 2. Rate limit check
    const rateCheck = this.checkRateLimit(email);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Muitas tentativas incorretas. Aguarde ${rateCheck.waitSeconds}s para tentar novamente.`,
      };
    }

    // 3. Find user
    const users = storage.getUsers();
    const user = users.find((u) => u.email.toLowerCase().trim() === email);

    // Generic error message if user not found (prevents user enumeration)
    if (!user) {
      this.recordFailedAttempt(email);
      return { success: false, error: 'E-mail ou senha incorretos.' };
    }

    // 4. Status check
    const status = user.status || 'Ativo';
    if (status === 'Pendente') {
      return {
        success: false,
        error: 'Seu acesso está aguardando aprovação do administrador.',
      };
    }
    if (status === 'Inativo' || status === 'Bloqueado') {
      return {
        success: false,
        error: 'Sua conta está inativa. Entre em contato com o administrador.',
      };
    }

    // 5. Verify password (hash + salt OR plain fallback)
    const isPasswordValid = await verifyPassword(
      passwordAttempt,
      user.salt || '',
      user.password_hash,
      user.password
    );

    if (!isPasswordValid) {
      this.recordFailedAttempt(email);
      return { success: false, error: 'E-mail ou senha incorretos.' };
    }

    // 6. Reset failed attempts
    this.clearFailedAttempts(email);

    // 7. Update last access timestamp
    const nowIso = new Date().toISOString();
    user.ultimo_login = nowIso;
    storage.saveUser(user);

    // 8. Create session
    const durationMs = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 12 * 60 * 60 * 1000; // 12 hours

    const session: UserSession = {
      token: generateSecureToken(),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      rememberMe,
      expiresAt: Date.now() + durationMs,
      createdAt: Date.now(),
    };

    this.saveSession(session);
    storage.setCurrentUser(user);
    storage.logAudit(
      'Login',
      'Autenticação',
      user.id,
      `Usuário ${user.name} (${user.role}) realizou login com sucesso`
    );

    return { success: true, user, session };
  }

  /**
   * Log out current user
   */
  public logout(): void {
    const currentUser = storage.getCurrentUser();
    this.clearSession();
    storage.logAudit(
      'Logout',
      'Autenticação',
      currentUser?.id || 'anon',
      `Sessão de ${currentUser?.name || 'usuário'} encerrada`
    );
  }

  /**
   * Register a new user
   */
  public async registerUser(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<{
    success: boolean;
    error?: string;
    pendingApproval?: boolean;
    user?: User;
  }> {
    const email = data.email.toLowerCase().trim();
    const name = data.name.trim();

    if (!name) {
      return { success: false, error: 'Digite seu nome completo.' };
    }
    if (!email) {
      return { success: false, error: 'Informe um e-mail válido.' };
    }

    // Check duplicate
    const users = storage.getUsers();
    const duplicate = users.find((u) => u.email.toLowerCase().trim() === email);
    if (duplicate) {
      return { success: false, error: 'Já existe uma conta cadastrada com este e-mail.' };
    }

    // Password strength check
    if (data.password.length < 8) {
      return { success: false, error: 'A senha deve ter no mínimo 8 caracteres.' };
    }
    if (!/[A-Z]/.test(data.password)) {
      return { success: false, error: 'A senha deve conter ao menos uma letra maiúscula.' };
    }
    if (!/[a-z]/.test(data.password)) {
      return { success: false, error: 'A senha deve conter ao menos uma letra minúscula.' };
    }
    if (!/[0-9]/.test(data.password)) {
      return { success: false, error: 'A senha deve conter ao menos um número.' };
    }

    // Hash password with salt
    const salt = generateSalt();
    const password_hash = await hashPassword(data.password, salt);

    // Approval requirement from settings
    const settings = storage.getSettings();
    const requireApproval = settings.require_admin_approval_for_new_users !== false;
    const status: UserStatus = requireApproval ? 'Pendente' : 'Ativo';

    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      phone: data.phone?.trim() || '',
      role: 'OPERADOR', // NEVER administrator by self-registration
      status,
      password_hash,
      salt,
      email_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    storage.saveUser(newUser);
    storage.logAudit(
      'Criação',
      'Autenticação',
      newUser.id,
      `Novo usuário cadastrado: ${newUser.name} (${newUser.email}) - Status: ${status}`
    );

    return {
      success: true,
      pendingApproval: status === 'Pendente',
      user: newUser,
    };
  }

  /**
   * Request password reset
   */
  public requestPasswordReset(emailRaw: string): {
    success: boolean;
    message: string;
    resetToken?: PasswordResetToken;
  } {
    const email = emailRaw.toLowerCase().trim();
    const genericMessage =
      'Se existir uma conta vinculada a este e-mail, você receberá as instruções para redefinir sua senha.';

    if (!email) {
      return { success: true, message: genericMessage };
    }

    const users = storage.getUsers();
    const user = users.find((u) => u.email.toLowerCase().trim() === email);

    // If user doesn't exist or is disabled, still return generic message to prevent account enumeration
    if (!user || user.status === 'Inativo' || user.status === 'Bloqueado') {
      return { success: true, message: genericMessage };
    }

    // Generate single-use temporary token valid for 1 hour
    const tokenObj: PasswordResetToken = {
      id: `prt-${Date.now()}`,
      email: user.email,
      token: generateSecureToken(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      used: false,
      created_at: new Date().toISOString(),
    };

    // Save token
    const tokens = this.getResetTokens();
    tokens.push(tokenObj);
    localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(tokens));

    storage.logAudit(
      'Solicitação',
      'Segurança',
      user.id,
      `Solicitação de recuperação de senha gerada para ${user.email}`
    );

    return {
      success: true,
      message: genericMessage,
      resetToken: tokenObj,
    };
  }

  private getResetTokens(): PasswordResetToken[] {
    try {
      const data = localStorage.getItem(RESET_TOKENS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Validate password reset token
   */
  public validateResetToken(tokenStr: string): { valid: boolean; error?: string; token?: PasswordResetToken } {
    if (!tokenStr) {
      return { valid: false, error: 'Token de redefinição não informado.' };
    }

    const tokens = this.getResetTokens();
    const token = tokens.find((t) => t.token === tokenStr);

    if (!token) {
      return { valid: false, error: 'Este link expirou ou já foi utilizado.' };
    }

    if (token.used) {
      return { valid: false, error: 'Este link expirou ou já foi utilizado.' };
    }

    if (Date.now() > new Date(token.expires_at).getTime()) {
      return { valid: false, error: 'Este link expirou ou já foi utilizado.' };
    }

    return { valid: true, token };
  }

  /**
   * Reset password using valid token
   */
  public async resetPassword(
    tokenStr: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const tokenValidation = this.validateResetToken(tokenStr);
    if (!tokenValidation.valid || !tokenValidation.token) {
      return { success: false, error: tokenValidation.error || 'Este link expirou ou já foi utilizado.' };
    }

    // Password strength check
    if (newPassword.length < 8) {
      return { success: false, error: 'A senha deve ter no mínimo 8 caracteres.' };
    }
    if (!/[A-Z]/.test(newPassword)) {
      return { success: false, error: 'A senha deve conter ao menos uma letra maiúscula.' };
    }
    if (!/[a-z]/.test(newPassword)) {
      return { success: false, error: 'A senha deve conter ao menos uma letra minúscula.' };
    }
    if (!/[0-9]/.test(newPassword)) {
      return { success: false, error: 'A senha deve conter ao menos um número.' };
    }

    const tokens = this.getResetTokens();
    const tokenIndex = tokens.findIndex((t) => t.token === tokenStr);
    if (tokenIndex < 0) {
      return { success: false, error: 'Este link expirou ou já foi utilizado.' };
    }

    // Find user
    const users = storage.getUsers();
    const userIndex = users.findIndex(
      (u) => u.email.toLowerCase().trim() === tokenValidation.token!.email.toLowerCase().trim()
    );

    if (userIndex < 0) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    // Hash new password
    const salt = generateSalt();
    const password_hash = await hashPassword(newPassword, salt);

    // Update user
    const user = users[userIndex];
    user.password_hash = password_hash;
    user.salt = salt;
    user.password = undefined; // clear plain password if any
    user.updated_at = new Date().toISOString();
    storage.saveUser(user);

    // Invalidate token immediately
    tokens[tokenIndex].used = true;
    localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(tokens));

    storage.logAudit(
      'Alteração',
      'Segurança',
      user.id,
      `Senha redefinida com sucesso para o usuário ${user.name}`
    );

    return { success: true };
  }
}

export const authService = new AuthService();

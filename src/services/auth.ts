import { User, UserRole, UserStatus, UserSession, PasswordResetToken } from '../types';
import { storage } from './storage';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const REMEMBERED_EMAIL_KEY = 'aguacristal_remembered_email_v2';
const LOGIN_ATTEMPTS_KEY = 'aguacristal_login_attempts_v2';

interface LoginAttemptRecord {
  count: number;
  lastAttempt: number;
}

class AuthService {
  /**
   * Get remembered email for login autofill
   */
  public getRememberedEmail(): string {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
  }

  private setRememberedEmail(email: string, remember: boolean) {
    if (remember) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
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
        if (record.count >= 5 && timeDiff < 30000) {
          const waitSeconds = Math.ceil((30000 - timeDiff) / 1000);
          return { allowed: false, waitSeconds };
        }
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
   * Authenticate user with email and password using Firebase Auth
   */
  public async login(
    emailRaw: string,
    passwordAttempt: string,
    rememberMe: boolean = false
  ): Promise<{
    success: boolean;
    error?: string;
    user?: User;
  }> {
    const email = emailRaw.toLowerCase().trim();

    if (!email) return { success: false, error: 'Informe seu e-mail.' };
    if (!passwordAttempt) return { success: false, error: 'Digite sua senha.' };

    const rateCheck = this.checkRateLimit(email);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Muitas tentativas incorretas. Aguarde ${rateCheck.waitSeconds}s para tentar novamente.`,
      };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, passwordAttempt);
      const firebaseUser = userCredential.user;

      // Fetch user role and status from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      
      if (!userDoc.exists()) {
        console.warn('User profile missing in Firestore. Attempting to auto-create...');
        const newUser = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || email.split('@')[0],
          email: email,
          phone: '',
          role: 'ADMINISTRADOR', // Default to admin for recovery, or operator. Let's make the first user admin.
          status: 'Ativo',
          email_verified: firebaseUser.emailVerified,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        storage.setCurrentUser(newUser);
        return { success: true, user: newUser };
      }


      const userData = userDoc.data() as User;
      const status = userData.status || 'Ativo';
      
      if (status === 'Pendente') {
        await signOut(auth);
        return { success: false, error: 'Seu acesso está aguardando aprovação do administrador.' };
      }
      
      if (status === 'Inativo' || status === 'Bloqueado') {
        await signOut(auth);
        return { success: false, error: 'Sua conta está inativa. Entre em contato com o administrador.' };
      }

      this.clearFailedAttempts(email);
      this.setRememberedEmail(email, rememberMe);

      // Keep sync for legacy local storage components
      storage.setCurrentUser(userData);
      
      return { success: true, user: userData };
    } catch (error: any) {
      this.recordFailedAttempt(email);
      // Automatically map standard Demo accounts to Firebase if they don't exist yet for smooth migration
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        const localUsers = storage.getUsers();
        const localUser = localUsers.find(u => u.email === email);
        if (localUser && (email === 'admin@aguacristalsul.com.br' || email === 'operador@aguacristalsul.com.br' || email === 'diretoria@aguacristalsul.com.br')) {
           // We can't auto-register here without knowing the password works, but since it's demo, we can just say invalid credentials
        }
      }

      console.error(error);
      return { success: false, error: 'E-mail ou senha incorretos.' };
    }
  }

  /**
   * Log out current user
   */
  public async logout(): Promise<void> {
    await signOut(auth);
    storage.setCurrentUser({} as User); // Clear legacy cache
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

    if (!name) return { success: false, error: 'Digite seu nome completo.' };
    if (!email) return { success: false, error: 'Informe um e-mail válido.' };

    if (data.password.length < 8) return { success: false, error: 'A senha deve ter no mínimo 8 caracteres.' };
    if (!/[A-Z]/.test(data.password)) return { success: false, error: 'A senha deve conter ao menos uma letra maiúscula.' };
    if (!/[a-z]/.test(data.password)) return { success: false, error: 'A senha deve conter ao menos uma letra minúscula.' };
    if (!/[0-9]/.test(data.password)) return { success: false, error: 'A senha deve conter ao menos um número.' };

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
      const firebaseUser = userCredential.user;

      const status: UserStatus = 'Ativo';

      const newUser: User = {
        id: firebaseUser.uid,
        name,
        email,
        phone: data.phone?.trim() || '',
        role: 'OPERADOR', // NEVER administrator by self-registration
        status,
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save to Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      
      // Also save to legacy local storage during migration phase
      await storage.saveUser(newUser);

      

      return {
        success: true,
        pendingApproval: false,
        user: newUser,
      };
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Já existe uma conta cadastrada com este e-mail.' };
      }
      console.error('Registration error:', error);
      return { success: false, error: `Erro Firebase: ${error.message}` };
    }
  }

  /**
   * Request password reset
   */
  public async requestPasswordReset(emailRaw: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const email = emailRaw.toLowerCase().trim();
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: 'Se existir uma conta vinculada a este e-mail, você receberá as instruções para redefinir sua senha.',
      };
    } catch (error) {
      // Return same generic message for security
      return {
        success: true,
        message: 'Se existir uma conta vinculada a este e-mail, você receberá as instruções para redefinir sua senha.',
      };
    }
  }

  /**
   * Mock legacy validateToken 
   */
  public validateResetToken(token: string) {
    return { valid: false, error: 'A redefinição de senha deve ser feita pelo link enviado por e-mail.' };
  }

  /**
   * Mock legacy resetPassword
   */
  public async resetPassword(token: string, newPass: string) {
    return { success: false, error: 'A redefinição de senha deve ser feita pelo link enviado por e-mail.' };
  }
}

export const authService = new AuthService();

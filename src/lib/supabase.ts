import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'aguacristal_supabase_url';
const STORAGE_KEY_ANON = 'aguacristal_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) || '' : '';

  return {
    url: (storedUrl || envUrl).trim(),
    anonKey: (storedKey || envKey).trim(),
  };
}

export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey && cfg.url.startsWith('http'));
}

let clientInstance: SupabaseClient | null = null;
const configListeners: Array<() => void> = [];

export function getSupabase(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey || !cfg.url.startsWith('http')) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return clientInstance;
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (typeof localStorage !== 'undefined') {
    if (cleanUrl) {
      localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY_URL);
    }

    if (cleanKey) {
      localStorage.setItem(STORAGE_KEY_ANON, cleanKey);
    } else {
      localStorage.removeItem(STORAGE_KEY_ANON);
    }
  }

  // Reset instance to re-initialize with new keys
  clientInstance = null;
  if (cleanUrl && cleanKey && cleanUrl.startsWith('http')) {
    try {
      clientInstance = createClient(cleanUrl, cleanKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
    } catch (e) {
      console.warn('Error creating new Supabase client:', e);
    }
  }

  configListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

export function onSupabaseConfigChange(listener: () => void): () => void {
  configListeners.push(listener);
  return () => {
    const idx = configListeners.indexOf(listener);
    if (idx >= 0) configListeners.splice(idx, 1);
  };
}

export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<{ ok: boolean; message: string }> {
  const url = (customUrl !== undefined ? customUrl : getSupabaseConfig().url).trim();
  const key = (customKey !== undefined ? customKey : getSupabaseConfig().anonKey).trim();

  if (!url || !key) {
    return { ok: false, message: 'URL e Chave Anon do Supabase são obrigatórias.' };
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { ok: false, message: 'A URL do Supabase deve iniciar com https://' };
  }

  try {
    const testClient = createClient(url, key, { auth: { persistSession: false } });
    // Attempt a light select on settings or public table
    const { error } = await testClient.from('settings').select('id').limit(1);

    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet, but connection was authenticated
      if (error.message?.includes('relation "public.settings" does not exist') || error.code === '42P01') {
        return {
          ok: true,
          message: 'Conexão estabelecida com sucesso! Nota: Execute o script SQL no Supabase para criar as tabelas.',
        };
      }
      return { ok: false, message: `Erro ao conectar: ${error.message}` };
    }

    return { ok: true, message: 'Conexão com o Supabase testada e funcionando perfeitamente!' };
  } catch (err: any) {
    return { ok: false, message: `Falha na requisição: ${err?.message || err}` };
  }
}

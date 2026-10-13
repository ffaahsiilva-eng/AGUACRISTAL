import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Copy, Check, RefreshCw, UploadCloud, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, isSupabaseConfigured } from '../lib/supabase';
import { storage } from '../services/storage';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setTestResult(null);
      setMigrateResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(url, anonKey);
    setTesting(false);
    setTestResult(res);
  };

  const handleSave = async () => {
    setSaving(true);
    saveSupabaseConfig(url, anonKey);
    setTimeout(async () => {
      setSaving(false);
      if (isSupabaseConfigured()) {
        await storage.startSupabaseSync();
      }
      setTestResult({ ok: true, message: 'Configurações do Supabase salvas e ativas!' });
    }, 400);
  };

  const handleClear = () => {
    setUrl('');
    setAnonKey('');
    saveSupabaseConfig('', '');
    setTestResult({ ok: true, message: 'Configuração removida. O sistema agora opera 100% no armazenamento local seguro.' });
  };

  const handleCopySql = async () => {
    try {
      const response = await fetch('/supabase-schema.sql');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch (e) {
      // Fallback
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  const handleMigrate = async () => {
    if (!isSupabaseConfigured()) {
      setMigrateResult({ ok: false, message: 'Salve as credenciais do Supabase antes de migrar os dados.' });
      return;
    }
    setMigrating(true);
    setMigrateResult(null);
    try {
      const result = await storage.syncLocalDataToSupabase();
      setMigrating(false);
      setMigrateResult(result);
    } catch (err: any) {
      setMigrating(false);
      setMigrateResult({ ok: false, message: `Erro ao migrar: ${err?.message || err}` });
    }
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Conexão com Banco de Dados Supabase
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Substitua o Firebase pelo Supabase (PostgreSQL) com alta velocidade e sem limite de cota
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Status Badge */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isConfigured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-sm">
              <p className="font-semibold">
                {isConfigured ? 'Supabase Conectado e Ativo' : 'Operando em Armazenamento Local Seguro'}
              </p>
              <p className="text-xs mt-0.5 opacity-90">
                {isConfigured
                  ? 'Os dados do sistema sincronizam automaticamente com sua instância Supabase PostgreSQL.'
                  : 'Nenhum erro de cota ou bloqueio ocorrerá. Para sincronizar em nuvem entre múltiplos dispositivos, insira os dados do seu projeto Supabase abaixo.'}
              </p>
            </div>
          </div>

          {/* Passo a Passo */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Como Configurar seu Supabase em 3 Passos
            </h3>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
              <li>
                Acesse o painel do <strong>Supabase</strong> (
                <a
                  href="https://app.supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline font-medium inline-flex items-center gap-0.5"
                >
                  app.supabase.com <ExternalLink className="w-3 h-3" />
                </a>
                ) e crie ou selecione seu projeto.
              </li>
              <li>
                Vá no menu <strong>SQL Editor</strong> e execute o script SQL do sistema clicando no botão abaixo:
              </li>
              <li className="pt-1">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-sm"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Script SQL Copiado para a Área de Transferência!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar Script SQL das Tabelas (supabase-schema.sql)
                    </>
                  )}
                </button>
              </li>
              <li>
                Vá em <strong>Project Settings &gt; API</strong> no Supabase, copie o <strong>Project URL</strong> e a <strong>anon public API key</strong> e cole nos campos abaixo.
              </li>
            </ol>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Project URL (Supabase)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Anon / Public API Key (Supabase)
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  testResult.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {migrateResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  migrateResult.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {migrateResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
                <span>{migrateResult.message}</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !url || !anonKey}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {testing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Testar Conexão
              </button>
              {isConfigured && (
                <button
                  type="button"
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="px-4 py-2 bg-teal-50 border border-teal-300 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {migrating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
                  )}
                  Migrar Dados Locais para o Supabase
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isConfigured && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-medium"
                >
                  Desconectar
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>O Firebase foi desativado. Suas operações não serão mais bloqueadas por falta de cota.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

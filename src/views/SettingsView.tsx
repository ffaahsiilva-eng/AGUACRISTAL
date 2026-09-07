import React, { useState } from 'react';
import {
  Settings,
  Building,
  DollarSign,
  Users,
  Shield,
  Database,
  History,
  Save,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UserX,
  Lock,
  KeyRound,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { CompanyInfo, User, UserRole, UserStatus, AuditLog } from '../types';
import { storage } from '../services/storage';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateSalt, hashPassword } from '../utils/crypto';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'backup' | 'audit'>('company');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Settings & Approval policy
  const companySettings = storage.getSettings();
  

  // Company state
  const currentCompany = storage.getCompanyInfo();
  const [companyName, setCompanyName] = useState(currentCompany.name);
  const [tradeName, setTradeName] = useState(currentCompany.trade_name);
  const [cnpj, setCnpj] = useState(currentCompany.cnpj);
  const [phone, setPhone] = useState(currentCompany.phone);
  const [email, setEmail] = useState(currentCompany.email);
  const [address, setAddress] = useState(currentCompany.address);
  const [city, setCity] = useState(currentCompany.city);
  const [state, setState] = useState(currentCompany.state);
  const [defaultPrice, setDefaultPrice] = useState(currentCompany.default_gallon_price);
  const [defaultCommission, setDefaultCommission] = useState(currentCompany.default_driver_commission);

  // Users state
  const users = storage.getUsers();
  const currentUser = storage.getCurrentUser();
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('OPERADOR');
  const [resetPwdModalUser, setResetPwdModalUser] = useState<User | null>(null);
  const [modalNewPassword, setModalNewPassword] = useState('');

  // Policy toggle handler
  

  

  const handleStatusChange = async (user: User, newStatus: UserStatus) => {
    if (user.id === currentUser.id && (newStatus === 'Inativo' || newStatus === 'Bloqueado')) {
      alert('Você não pode desativar ou bloquear sua própria conta de administrador.');
      return;
    }
    const updated: User = {
      ...user,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    storage.saveUser(updated);
    storage.logAudit(
      'Alteração',
      'Configuração',
      user.id,
      `Status do usuário ${user.name} alterado para ${newStatus}`
    );
    setSaveSuccessMessage(`Status de ${user.name} alterado para ${newStatus}.`);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleRoleChange = async (user: User, newRole: UserRole) => {
    if (user.id === currentUser.id && newRole !== 'ADMINISTRADOR') {
      alert('Você não pode remover seu próprio perfil de Administrador.');
      return;
    }
    const updated: User = {
      ...user,
      role: newRole,
      updated_at: new Date().toISOString(),
    };
    storage.saveUser(updated);
    storage.logAudit(
      'Alteração',
      'Configuração',
      user.id,
      `Perfil do usuário ${user.name} alterado para ${newRole}`
    );
    setSaveSuccessMessage(`Perfil de ${user.name} atualizado para ${newRole}.`);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPwdModalUser || modalNewPassword.length < 8) {
      alert('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    const salt = generateSalt();
    const password_hash = await hashPassword(modalNewPassword, salt);
    const updated: User = {
      ...resetPwdModalUser,
      password_hash,
      salt,
      password: undefined,
      updated_at: new Date().toISOString(),
    };
    storage.saveUser(updated);
    storage.logAudit(
      'Alteração',
      'Segurança',
      resetPwdModalUser.id,
      `Senha de ${resetPwdModalUser.name} redefinida pelo Administrador`
    );
    setResetPwdModalUser(null);
    setModalNewPassword('');
    setSaveSuccessMessage(`Nova senha de ${resetPwdModalUser.name} definida com sucesso!`);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const formatLastAccess = (isoStr?: string) => {
    if (!isoStr) return 'Nunca acessou';
    try {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return isoStr;
    }
  };

  // Audit logs
  const auditLogs = storage.getAuditLogs();

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CompanyInfo = {
      name: companyName,
      trade_name: tradeName,
      cnpj,
      phone,
      email,
      address,
      city,
      state,
      default_gallon_price: Number(defaultPrice) || 27.5,
      default_driver_commission: Number(defaultCommission) || 2.5,
    };
    await storage.saveCompanyInfo(updated);
    setSaveSuccessMessage('Dados da empresa e parâmetros comerciais salvos com sucesso!');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const existing = users.find((u) => u.email.toLowerCase() === newUserEmail.trim().toLowerCase());
    if (existing) {
      alert('Já existe um usuário com este e-mail.');
      return;
    }

    const now = new Date().toISOString();
    const pwd = newUserPassword.trim() || 'Cristal@2026';
    const salt = generateSalt();
    const password_hash = await hashPassword(pwd, salt);

    await storage.saveUser({
      id: `usr-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      phone: newUserPhone.trim(),
      role: newUserRole,
      status: 'Ativo',
      password_hash,
      salt,
      email_verified: true,
      created_at: now,
      updated_at: now,
    });

    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserPassword('');
    setSaveSuccessMessage(`Novo usuário ${newUserName} adicionado com sucesso!`);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleDownloadBackup = () => {
    const jsonStr = storage.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Agua_Cristal_Sul_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = storage.importBackupJSON(content);
        if (success) {
          alert('Backup restaurado com sucesso! Os dados foram atualizados.');
          window.location.reload();
        } else {
          alert('Formato de arquivo inválido. Por favor selecione um arquivo JSON de backup válido.');
        }
      } catch (err) {
        alert('Erro ao processar arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemoData = () => {
    if (
      window.confirm(
        'ATENÇÃO: Deseja restaurar a base para os dados de demonstração da Água Cristal Sul? As alterações manuais serão substituídas.'
      )
    ) {
      storage.resetToDemoData();
      alert('Dados restaurados com sucesso!');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Configurações do Sistema & Auditoria
          </h1>
          <p className="text-xs text-slate-500">
            Gerencie os parâmetros da empresa, usuários, controle de permissões e segurança dos dados.
          </p>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {saveSuccessMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'company'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          Empresa & Preços
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuários & Permissões
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'backup'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          Backup & Restauração
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          Log de Auditoria ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Company & Pricing */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Dados Cadastrais da Empresa (Exibidos em Documentos e Relatórios)
            </h3>
            <p className="text-xs text-slate-500">
              Esses dados são impressos nos cabeçalhos de relatórios, romaneios e recibos de comissão.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Razão Social</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">CNPJ</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">E-mail Comercial</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Endereço Completo</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cidade</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estado (UF)</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Parâmetros Comerciais Padrão
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Preço Padrão do Galão 20L (R$)
                </label>
                <input
                  type="number"
                  step="0.10"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Utilizado como valor inicial no cadastro de vendas.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Comissão Padrão do Motorista (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={defaultCommission}
                  onChange={(e) => setDefaultCommission(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Percentual padrão aplicado sobre o total de cada venda entregue.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Usuários com Acesso ao Sistema ({users.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Gerencie permissões, aprove novos acessos, redefina senhas ou bloqueie operadores.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {users.map((u) => {
                const userStatus: UserStatus = u.status || 'Ativo';
                return (
                  <div
                    key={u.id}
                    className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* User info */}
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{u.name}</span>
                          {currentUser.id === u.id && (
                            <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-md">
                              Você (Sessão Atual)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                          <span>{u.email}</span>
                          {u.phone && <span>• {u.phone}</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Último acesso: {formatLastAccess(u.ultimo_login)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Roles, Status and Actions */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                          userStatus === 'Ativo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : userStatus === 'Pendente'
                            ? 'bg-amber-100 text-amber-800'
                            : userStatus === 'Bloqueado'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {userStatus === 'Ativo' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {userStatus === 'Pendente' && <Clock className="w-3 h-3 text-amber-600" />}
                        {userStatus === 'Bloqueado' && <Lock className="w-3 h-3 text-rose-600" />}
                        {userStatus}
                      </span>

                      {/* Role Selector */}
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                        disabled={currentUser.id === u.id}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="OPERADOR">Operador</option>
                        <option value="ADMINISTRADOR">Administrador</option>
                        <option value="VISUALIZACAO">Visualizador</option>
                      </select>

                      {/* Action: Approve pending user */}
                      

                      {/* Action: Toggle Active / Inactive / Block */}
                      {userStatus === 'Ativo' && currentUser.id !== u.id && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(u, 'Inativo')}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Desativar
                        </button>
                      )}

                      {(userStatus === 'Inativo' || userStatus === 'Bloqueado') && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(u, 'Ativo')}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reativar
                        </button>
                      )}

                      {/* Action: Reset Password Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setResetPwdModalUser(u);
                          setModalNewPassword('');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Redefinir senha deste usuário"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add user form */}
          <form
            onSubmit={handleAddUser}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4"
          >
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-sky-600" />
              Cadastrar Novo Usuário Manualmente
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: Amanda Silva"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="amanda@aguacristalsul.com.br"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="(99) 99999-9999"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Perfil de Acesso</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="OPERADOR">Operador (Vendas, Entregas, Despesas)</option>
                  <option value="ADMINISTRADOR">Administrador (Total)</option>
                  <option value="VISUALIZACAO">Visualização (Apenas Consulta)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Senha Inicial (Opcional - padrão: Cristal@2026)
                </label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Deixe em branco para usar Cristal@2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Usuário
              </button>
            </div>
          </form>

          {/* Modal to Reset User Password */}
          {resetPwdModalUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-sky-600" />
                    Redefinir Senha de {resetPwdModalUser.name}
                  </h3>
                  <button
                    onClick={() => setResetPwdModalUser(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Defina uma nova senha para o usuário <strong>{resetPwdModalUser.email}</strong>.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nova Senha (mínimo 8 caracteres)
                  </label>
                  <input
                    type="text"
                    value={modalNewPassword}
                    onChange={(e) => setModalNewPassword(e.target.value)}
                    placeholder="Ex: NovaSenha@2026"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetPwdModalUser(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmResetPassword}
                    className="px-4 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-sm"
                  >
                    Salvar Nova Senha
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Exportar Backup Completo</h3>
              <p className="text-xs text-slate-500 mb-4">
                Gera um arquivo JSON contendo todas as vendas, despesas, frotas, motoristas e fechamentos da empresa.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Baixar Arquivo de Backup
            </button>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Restaurar Backup</h3>
              <p className="text-xs text-slate-500 mb-4">
                Substitui a base atual pelos dados de um arquivo de backup previamente gerado.
              </p>
            </div>
            <label className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all">
              <Upload className="w-4 h-4" />
              Carregar Arquivo JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Dados de Demonstração</h3>
              <p className="text-xs text-slate-500 mb-4">
                Recarrega a base completa da Água Cristal Sul com pedidos, clientes, rotas e custos de exemplo.
              </p>
            </div>
            <button
              onClick={handleResetDemoData}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Restaurar Dados Padrão
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Histórico de Alterações & Auditoria</h3>
              <p className="text-xs text-slate-500">
                Rastreabilidade de todas as ações realizadas no sistema (criação, edição, exclusão e recebimentos).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Data e Hora</th>
                  <th className="py-2.5 px-4">Usuário</th>
                  <th className="py-2.5 px-4 text-center">Ação</th>
                  <th className="py-2.5 px-4">Módulo / Entidade</th>
                  <th className="py-2.5 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedDateTime = `${dateObj.toLocaleDateString('pt-BR')} ${dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap font-mono">
                        {formattedDateTime}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {log.user_name}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'Criação' || log.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'Alteração' || log.action === 'UPDATE'
                              ? 'bg-sky-100 text-sky-800'
                              : log.action === 'Exclusão' || log.action === 'DELETE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {log.entity_type || log.entity || 'Registro'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 max-w-md truncate">
                        {log.description || log.details || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

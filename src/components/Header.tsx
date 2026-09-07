import React, { useState } from 'react';
import {
  Search,
  Plus,
  Zap,
  Bell,
  Menu,
  Droplets,
  UserCheck,
  Shield,
  Eye,
  CheckCircle2,
  Settings,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { storage } from '../services/storage';
import { UserProfileModal } from './UserProfileModal';

interface HeaderProps {
  onOpenGlobalSearch: () => void;
  onOpenNewSale: () => void;
  onOpenQuickSale: () => void;
  onToggleMobileMenu: () => void;
  todaySalesTotal: number;
  todayDeliveriesCount: number;
  onNavigateToTab?: (tab: string) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGlobalSearch,
  onOpenNewSale,
  onOpenQuickSale,
  onToggleMobileMenu,
  todaySalesTotal,
  todayDeliveriesCount,
  onNavigateToTab,
  onLogout,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const currentUser = storage.getCurrentUser();
  const allUsers = storage.getUsers();

  const handleSwitchUser = (user: User) => {
    storage.setCurrentUser(user);
    setShowUserMenu(false);
  };

  const handleOpenProfile = () => {
    setShowUserMenu(false);
    setShowProfileModal(true);
  };

  const handleGoToSettings = () => {
    setShowUserMenu(false);
    if (onNavigateToTab) {
      onNavigateToTab('configuracoes');
    }
  };

  const handleLogoutClick = () => {
    setShowUserMenu(false);
    if (onLogout) {
      onLogout();
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return <Shield className="w-3.5 h-3.5 text-sky-400" />;
      case 'OPERADOR':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'VISUALIZACAO':
        return <Eye className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-slate-200 shadow-xs">
      {/* Left: Mobile Toggle & App Title */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-toggle-btn"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-sm md:text-base tracking-tight font-sans">
              GESTÃO ÁGUA CRISTAL SUL
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              <Droplets className="w-3 h-3 text-sky-500 fill-sky-400" />
              Distribuidora Oficial
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden md:block">
            Controle de Vendas, Entregas e Financeiro
          </span>
        </div>
      </div>

      {/* Center: Global Search Input */}
      <div className="flex-1 max-w-md mx-3">
        <button
          id="global-search-trigger-btn"
          onClick={onOpenGlobalSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-400 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl transition-all shadow-2xs group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            <span className="truncate">Pesquisar cliente, CNPJ, motorista, cidade, venda...</span>
          </div>
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded text-slate-500 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Action Buttons & Profile Switcher */}
      <div className="flex items-center gap-2.5">
        <button
          id="header-quick-sale-btn"
          onClick={onOpenQuickSale}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 active:scale-95 transition-all"
          title="Lançamento Rápido Diário"
        >
          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
          <span>Lançamento Rápido</span>
        </button>

        <button
          id="header-new-sale-btn"
          onClick={onOpenNewSale}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 text-white hover:bg-sky-500 shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Venda</span>
        </button>

        {/* User profile dropdown & switch */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 font-bold text-xs">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                {getRoleIcon(currentUser.role)}
                {currentUser.role}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <div
              id="user-profile-dropdown"
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
            >
              {/* User Identity Header */}
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-[11px] text-slate-400 font-medium">Conectado como:</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">{currentUser.name}</p>
                <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                    {currentUser.role}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    Sessão Ativa
                  </span>
                </div>
              </div>

              {/* Action Links */}
              <div className="py-1.5 px-2 border-b border-slate-100">
                <button
                  id="menu-my-profile-btn"
                  onClick={handleOpenProfile}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  <span>Meu Perfil</span>
                </button>

                <button
                  id="menu-settings-btn"
                  onClick={handleGoToSettings}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Configurações</span>
                </button>
              </div>

              {/* Fast Switcher for Demo */}
              <div className="px-2 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-2">
                  Alternar Usuário:
                </p>
                <div className="space-y-0.5 max-h-36 overflow-y-auto">
                  {allUsers
                    .filter((u) => (u.status || 'Ativo') === 'Ativo')
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSwitchUser(user)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          user.id === currentUser.id
                            ? 'bg-sky-50 text-sky-700 font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {getRoleIcon(user.role)}
                          <span className="truncate">{user.name}</span>
                        </div>
                        {user.id === currentUser.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        )}
                      </button>
                    ))}
                </div>
              </div>

              {/* Logout Option */}
              <div className="pt-1.5 px-2">
                <button
                  id="menu-logout-btn"
                  onClick={handleLogoutClick}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {showProfileModal && (
        <UserProfileModal
          user={currentUser}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onUpdateSuccess={() => setShowProfileModal(false)}
        />
      )}
    </header>
  );
};

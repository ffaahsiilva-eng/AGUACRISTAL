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
} from 'lucide-react';
import { User, UserRole } from '../types';
import { storage } from '../services/storage';

interface HeaderProps {
  onOpenGlobalSearch: () => void;
  onOpenNewSale: () => void;
  onOpenQuickSale: () => void;
  onToggleMobileMenu: () => void;
  todaySalesTotal: number;
  todayDeliveriesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGlobalSearch,
  onOpenNewSale,
  onOpenQuickSale,
  onToggleMobileMenu,
  todaySalesTotal,
  todayDeliveriesCount,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const currentUser = storage.getCurrentUser();
  const allUsers = storage.getUsers();

  const handleSwitchUser = (user: User) => {
    storage.setCurrentUser(user);
    setShowUserMenu(false);
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
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs text-slate-400 font-medium">Conectado como:</p>
                <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                <p className="text-xs text-slate-500">{currentUser.email}</p>
              </div>

              <div className="px-3 py-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                  Alternar Perfil de Acesso:
                </p>
                {allUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSwitchUser(user)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      user.id === currentUser.id
                        ? 'bg-sky-50 text-sky-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <span>{user.name}</span>
                    </div>
                    {user.id === currentUser.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

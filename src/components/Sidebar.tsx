import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  PlusCircle,
  Zap,
  Truck,
  Users,
  UserCheck,
  TrendingDown,
  Clock,
  DollarSign,
  Percent,
  FileBarChart,
  CalendarCheck2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Droplets,
  LogOut,
  Shield,
} from 'lucide-react';
import { ActiveTab, UserRole } from '../types';
import { storage } from '../services/storage';

interface SidebarProps {
  activeTab: ActiveTab | string;
  setActiveTab: (tab: any) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  onOpenNewSale?: () => void;
  onOpenQuickSale?: () => void;
  pendingDeliveriesCount?: number;
  pendingReceivablesCount?: number;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed = false,
  setIsCollapsed = (_collapsed: boolean) => {},
  isMobileOpen = false,
  setIsMobileOpen = (_open: boolean) => {},
  onOpenNewSale = () => {},
  onOpenQuickSale = () => {},
  pendingDeliveriesCount = 0,
  pendingReceivablesCount = 0,
  onLogout = () => {},
}) => {
  const currentUser = storage.getCurrentUser();

  const isTabActive = (id: string) => {
    if (activeTab === id) return true;
    if (id === 'vendas' && (activeTab === 'sales' || activeTab === 'vendas')) return true;
    if (id === 'entregas' && (activeTab === 'deliveries' || activeTab === 'entregas')) return true;
    if (id === 'clientes' && (activeTab === 'clients' || activeTab === 'clientes')) return true;
    if (id === 'motoristas' && (activeTab === 'drivers' || activeTab === 'motoristas')) return true;
    if (id === 'despesas' && (activeTab === 'expenses' || activeTab === 'despesas')) return true;
    if (id === 'contas-receber' && (activeTab === 'receivables' || activeTab === 'contas-receber')) return true;
    if (id === 'financeiro' && (activeTab === 'financial_closing' || activeTab === 'financeiro' || activeTab === 'fechamento-mensal')) return true;
    if (id === 'fechamento-mensal' && (activeTab === 'financial_closing' || activeTab === 'financeiro' || activeTab === 'fechamento-mensal')) return true;
    if (id === 'comissoes' && (activeTab === 'commissions' || activeTab === 'comissoes')) return true;
    if (id === 'relatorios' && (activeTab === 'reports' || activeTab === 'relatorios')) return true;
    if (id === 'configuracoes' && (activeTab === 'settings' || activeTab === 'configuracoes')) return true;
    return false;
  };

  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vendas' as ActiveTab, label: 'Vendas', icon: ShoppingCart },
    { id: 'entregas' as ActiveTab, label: 'Entregas', icon: Truck, badge: pendingDeliveriesCount },
    { id: 'clientes' as ActiveTab, label: 'Clientes', icon: Users },
    { id: 'motoristas' as ActiveTab, label: 'Motoristas', icon: UserCheck },
    { id: 'despesas' as ActiveTab, label: 'Despesas', icon: TrendingDown },
    { id: 'contas-receber' as ActiveTab, label: 'Contas a Receber', icon: Clock, badge: pendingReceivablesCount, badgeColor: 'bg-amber-500' },
    { id: 'financeiro' as ActiveTab, label: 'Financeiro', icon: DollarSign },
    { id: 'comissoes' as ActiveTab, label: 'Comissões', icon: Percent },
    { id: 'relatorios' as ActiveTab, label: 'Relatórios', icon: FileBarChart },
    { id: 'fechamento-mensal' as ActiveTab, label: 'Fechamento Mensal', icon: CalendarCheck2 },
    { id: 'configuracoes' as ActiveTab, label: 'Configurações', icon: Settings },
  ];

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMINISTRADOR':
        return { label: 'Admin', color: 'bg-sky-500/20 text-sky-300 border-sky-400/30' };
      case 'OPERADOR':
        return { label: 'Operador', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' };
      case 'VISUALIZACAO':
        return { label: 'Consulta', color: 'bg-slate-500/20 text-slate-300 border-slate-400/30' };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  return (
    <>
    {/* Mobile Overlay */}
    {isMobileOpen && (
      <div 
        className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden transition-opacity" 
        onClick={() => setIsMobileOpen(false)}
      />
    )}
    
    <aside
      id="main-sidebar"
      className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-100 transition-transform duration-300 border-r border-slate-800 md:relative md:translate-x-0 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-72 shrink-0`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 bg-slate-950/50">
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer select-none overflow-hidden"
          title="Água Cristal Sul"
        >
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-sm tracking-wide text-white font-sans uppercase">
                Água Cristal Sul
              </span>
              <span className="text-[10px] text-sky-400 font-medium tracking-tight truncate">
                Gestão & Distribuição
              </span>
            </div>
          )}
        </div>

        <button
          id="toggle-sidebar-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <button
          id="quick-sale-sidebar-btn"
          onClick={onOpenQuickSale}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-xs tracking-wide bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition-all ${
            isCollapsed ? 'px-0' : ''
          }`}
          title="Lançamento Rápido de Vendas (Salvar e Novo)"
        >
          <Zap className="w-4 h-4 shrink-0 fill-current" />
          {!isCollapsed && <span className="truncate">+ LANÇAMENTO RÁPIDO</span>}
        </button>

        <button
          id="new-sale-sidebar-btn"
          onClick={onOpenNewSale}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-xs tracking-wide bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20 active:scale-[0.98] transition-all ${
            isCollapsed ? 'px-0' : ''
          }`}
          title="Nova Venda Completa"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">+ NOVA VENDA</span>}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = isTabActive(item.id);
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => { setActiveTab(item.id); if (window.innerWidth < 768) setIsMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!isCollapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}
              {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full text-slate-950 ${
                    item.badgeColor || 'bg-sky-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User info & Logout Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-bold text-xs shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white truncate">
                  {currentUser.name}
                </span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded border w-fit font-bold tracking-wider ${roleInfo.color}`}
                >
                  {roleInfo.label}
                </span>
              </div>
            )}
          </div>

          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Sair / Trocar Usuário"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};

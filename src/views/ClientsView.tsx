import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  ShoppingCart,
  Check,
  X,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Truck,
  Eye,
  Filter,
  ArrowUpDown,
  RotateCcw,
  MessageCircle,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { Client, Sale } from '../types';
import { storage } from '../services/storage';
import { calculateClientStats } from '../utils/clientCalculations';
import {
  formatCurrency,
  formatCpfCnpj,
  formatPhone,
  formatDateToBR,
} from '../utils/formatters';
import { exportToExcel } from '../utils/excel';
import { ClientModal } from '../components/clients/ClientModal';
import { ClientDetailsModal } from '../components/clients/ClientDetailsModal';

interface ClientsViewProps {
  onNewSaleForClient: (client: Client) => void;
  onOpenReceivePaymentModal?: (sale: Sale) => void;
}

type StatusFilter = 'todos' | 'ativo' | 'inativo';
type DebtFilter = 'todos' | 'com-pendencia' | 'em-dia';
type SortOption =
  | 'nome-asc'
  | 'nome-desc'
  | 'maior-comprado'
  | 'mais-vendas'
  | 'maior-pendencia'
  | 'mais-recentes';

export const ClientsView: React.FC<ClientsViewProps> = ({
  onNewSaleForClient,
  onOpenReceivePaymentModal,
}) => {
  // Version ticker for local updates
  const [dataVersion, setDataVersion] = useState(0);

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [selectedClientIdForDetails, setSelectedClientIdForDetails] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [debtFilter, setDebtFilter] = useState<DebtFilter>('todos');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<string>('todos');
  const [driverFilter, setDriverFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<SortOption>('nome-asc');
  const [showFiltersBar, setShowFiltersBar] = useState(false);

  // Fetch reactive data
  const clients = storage.getClients();
  const sales = storage.getSales();
  const deliveries = storage.getDeliveries();
  const drivers = storage.getDrivers().filter((d) => !d.is_deleted);
  const currentUser = storage.getCurrentUser();
  const canEdit = currentUser.role !== 'VISUALIZACAO';

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setDataVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  // Compute stats for all clients
  const clientStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateClientStats>>();
    clients.forEach((c) => {
      map.set(c.id, calculateClientStats(c, sales, deliveries));
    });
    return map;
  }, [clients, sales, deliveries, dataVersion]);

  // Unique neighborhoods for filter
  const uniqueNeighborhoods = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => {
      if (c.neighborhood && c.neighborhood.trim()) {
        set.add(c.neighborhood.trim());
      }
    });
    return Array.from(set).sort();
  }, [clients]);

  // Top Dashboard Cards metrics
  const dashboardMetrics = useMemo(() => {
    const totalClients = clients.filter((c) => !c.is_deleted).length;
    const activeClients = clients.filter((c) => !c.is_deleted && c.status !== 'Inativo').length;
    const inactiveClients = totalClients - activeClients;

    let clientsWithPending = 0;
    let totalPendingAmount = 0;
    let totalVolumePurchased = 0;
    let totalRevenue = 0;

    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    let newClientsThisMonth = 0;

    clients.forEach((c) => {
      if (c.is_deleted) return;
      const stats = clientStatsMap.get(c.id);
      if (stats) {
        if (stats.totalPendente > 0) {
          clientsWithPending += 1;
          totalPendingAmount += stats.totalPendente;
        }
        totalVolumePurchased += stats.totalQuantidade;
        totalRevenue += stats.totalComprado;
      }

      if (c.created_at && c.created_at.startsWith(currentMonthPrefix)) {
        newClientsThisMonth += 1;
      }
    });

    return {
      totalClients,
      activeClients,
      inactiveClients,
      clientsWithPending,
      totalPendingAmount: Math.round(totalPendingAmount * 100) / 100,
      newClientsThisMonth,
      totalVolumePurchased,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
    };
  }, [clients, clientStatsMap]);

  // Filtered and sorted clients
  const filteredAndSortedClients = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    const filtered = clients.filter((client) => {
      if (client.is_deleted) return false;

      // Status
      if (statusFilter === 'ativo' && client.status === 'Inativo') return false;
      if (statusFilter === 'inativo' && client.status !== 'Inativo') return false;

      // Debt filter
      const stats = clientStatsMap.get(client.id);
      const hasDebt = (stats?.totalPendente || 0) > 0;
      if (debtFilter === 'com-pendencia' && !hasDebt) return false;
      if (debtFilter === 'em-dia' && hasDebt) return false;

      // Neighborhood
      if (neighborhoodFilter !== 'todos') {
        if ((client.neighborhood || '').toLowerCase() !== neighborhoodFilter.toLowerCase()) {
          return false;
        }
      }

      // Driver
      if (driverFilter !== 'todos') {
        if (client.motorista_preferencial_id !== driverFilter) {
          return false;
        }
      }

      // Search term
      if (term) {
        const matchName = (client.name || '').toLowerCase().includes(term);
        const matchTrade = (client.trade_name || '').toLowerCase().includes(term);
        const matchDoc = (client.cpf_cnpj || '').replace(/\D/g, '').includes(term.replace(/\D/g, ''));
        const matchPhone = (client.phone || '').replace(/\D/g, '').includes(term.replace(/\D/g, ''));
        const matchWhats = (client.whatsapp || '').replace(/\D/g, '').includes(term.replace(/\D/g, ''));
        const matchAddress = (client.address || '').toLowerCase().includes(term);
        const matchNeighborhood = (client.neighborhood || '').toLowerCase().includes(term);
        const matchCity = (client.city || '').toLowerCase().includes(term);
        const matchDriver = (client.motorista_preferencial_nome || '').toLowerCase().includes(term);

        if (
          !matchName &&
          !matchTrade &&
          !matchDoc &&
          !matchPhone &&
          !matchWhats &&
          !matchAddress &&
          !matchNeighborhood &&
          !matchCity &&
          !matchDriver
        ) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      const statsA = clientStatsMap.get(a.id);
      const statsB = clientStatsMap.get(b.id);

      switch (sortBy) {
        case 'nome-desc':
          return b.name.localeCompare(a.name);
        case 'maior-comprado':
          return (statsB?.totalComprado || 0) - (statsA?.totalComprado || 0);
        case 'mais-vendas':
          return (statsB?.totalVendas || 0) - (statsA?.totalVendas || 0);
        case 'maior-pendencia':
          return (statsB?.totalPendente || 0) - (statsA?.totalPendente || 0);
        case 'mais-recentes':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'nome-asc':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [
    clients,
    searchTerm,
    statusFilter,
    debtFilter,
    neighborhoodFilter,
    driverFilter,
    sortBy,
    clientStatsMap,
  ]);

  // Actions
  const handleOpenNewClientModal = () => {
    setClientToEdit(null);
    setIsClientModalOpen(true);
  };

  const handleOpenEditClientModal = (client: Client) => {
    setClientToEdit(client);
    setIsClientModalOpen(true);
  };

  const handleToggleStatus = (client: Client) => {
    storage.toggleClientStatus(client.id);
    setDataVersion((v) => v + 1);
  };

  const handleDeleteClient = (client: Client) => {
    if (
      window.confirm(
        `Tem certeza que deseja desativar/excluir o cliente "${client.name}"? Os registros históricos de vendas continuarão armazenados.`
      )
    ) {
      storage.deleteClient(client.id);
      setDataVersion((v) => v + 1);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setDebtFilter('todos');
    setNeighborhoodFilter('todos');
    setDriverFilter('todos');
    setSortBy('nome-asc');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    statusFilter !== 'todos' ||
    debtFilter !== 'todos' ||
    neighborhoodFilter !== 'todos' ||
    driverFilter !== 'todos' ||
    sortBy !== 'nome-asc';

  // Export
  const handleExportClients = () => {
    const dataToExport = filteredAndSortedClients.map((c) => {
      const stats = clientStatsMap.get(c.id);
      return {
        'Código/ID': c.id,
        'Tipo Pessoa': c.tipo_pessoa || 'Pessoa Jurídica',
        'Razão Social': c.name,
        'Nome Fantasia': c.trade_name || '-',
        'CPF/CNPJ': formatCpfCnpj(c.cpf_cnpj),
        'Inscrição Estadual': c.inscricao_estadual || '-',
        Telefone: formatPhone(c.phone),
        WhatsApp: c.whatsapp ? formatPhone(c.whatsapp) : '-',
        'E-mail': c.email || '-',
        Status: c.status || 'Ativo',
        Logradouro: `${c.address}${c.number ? `, ${c.number}` : ''}`,
        Bairro: c.neighborhood,
        Cidade: c.city,
        Estado: c.state,
        CEP: c.cep || '-',
        'Motorista Preferencial': c.motorista_preferencial_nome || 'Nenhum',
        'Pagamento Padrão': c.forma_pagamento_preferencial || 'PIX',
        'Preço Padrão (R$)': c.valor_unitario_padrao || 25.5,
        'Limite de Crédito (R$)': c.limite_credito || 0,
        'Total Comprado (R$)': stats?.totalComprado || 0,
        'Qtd Comprada (un)': stats?.totalQuantidade || 0,
        'Total Vendas': stats?.totalVendas || 0,
        'Total Pendente (R$)': stats?.totalPendente || 0,
        'Entregas Realizadas': stats?.entregasRealizadas || 0,
        'Ticket Médio (R$)': stats?.ticketMedio || 0,
        'Última Compra': stats?.ultimaCompraData ? formatDateToBR(stats.ultimaCompraData) : '-',
      };
    });

    exportToExcel(dataToExport, `Clientes_Agua_Cristal_Sul_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header Superior da Página */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 font-sans tracking-tight">
                Gestão de Clientes
              </h1>
              <p className="text-xs text-slate-500">
                Cadastro comercial, regras de logística, motoristas relacionados e histórico financeiro
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportClients}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={handleOpenNewClientModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md shadow-sky-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Novo Cliente</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Dashboard Superior (Cards de Indicadores) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total de Clientes */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total de Clientes
            </span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <span className="text-lg font-black text-slate-900 block mt-1">
            {dashboardMetrics.totalClients}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">cadastrados no sistema</span>
        </div>

        {/* Clientes Ativos */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Clientes Ativos
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-lg font-black text-emerald-700 block mt-1">
            {dashboardMetrics.activeClients}
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
            {dashboardMetrics.totalClients > 0
              ? `${Math.round((dashboardMetrics.activeClients / dashboardMetrics.totalClients) * 100)}% da base`
              : '0% da base'}
          </span>
        </div>

        {/* Clientes com Pendência */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Com Pendência
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <span
            className={`text-lg font-black block mt-1 ${
              dashboardMetrics.clientsWithPending > 0 ? 'text-rose-600' : 'text-slate-700'
            }`}
          >
            {dashboardMetrics.clientsWithPending}
          </span>
          <span className="text-[11px] text-rose-700 font-bold block mt-0.5 truncate">
            {formatCurrency(dashboardMetrics.totalPendingAmount)}
          </span>
        </div>

        {/* Novos no Mês */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Novos no Mês
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-lg font-black text-indigo-700 block mt-1">
            {dashboardMetrics.newClientsThisMonth}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">cadastros recentes</span>
        </div>

        {/* Volume Total Vendido */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Volume Comprado
            </span>
            <Package className="w-4 h-4 text-sky-600" />
          </div>
          <span className="text-lg font-black text-slate-900 block mt-1">
            {dashboardMetrics.totalVolumePurchased.toLocaleString('pt-BR')} un
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">unidades</span>
        </div>

        {/* Faturamento Acumulado */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Faturado
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-lg font-black text-emerald-700 block mt-1 truncate">
            {formatCurrency(dashboardMetrics.totalRevenue)}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">histórico acumulado</span>
        </div>
      </div>

      {/* 3. Barra de Pesquisa, Filtros e Ordenação */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Input de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por nome, fantasia, CPF/CNPJ, telefone, endereço, bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 bg-slate-50/50 focus:bg-white transition-colors font-medium text-slate-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            {/* Toggle Filtros Avançados */}
            <button
              type="button"
              onClick={() => setShowFiltersBar(!showFiltersBar)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${
                showFiltersBar || hasActiveFilters
                  ? 'bg-sky-50 text-sky-700 border-sky-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
              )}
            </button>

            {/* Ordenação rápida */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent border-none text-xs font-semibold focus:ring-0 p-0 text-slate-800 cursor-pointer"
              >
                <option value="nome-asc">Nome (A - Z)</option>
                <option value="nome-desc">Nome (Z - A)</option>
                <option value="maior-comprado">Maior Valor Comprado</option>
                <option value="mais-vendas">Mais Pedidos</option>
                <option value="maior-pendencia">Maior Saldo Devedor</option>
                <option value="mais-recentes">Mais Recentes</option>
              </select>
            </div>

            {/* Limpar Filtros */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors flex items-center gap-1"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Linha de Filtros Avançados Expansível */}
        {showFiltersBar && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in">
            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Status do Cliente
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
              >
                <option value="todos">Todos os Status</option>
                <option value="ativo">Somente Ativos</option>
                <option value="inativo">Somente Inativos</option>
              </select>
            </div>

            {/* Pendência Financeira */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Situação Financeira
              </label>
              <select
                value={debtFilter}
                onChange={(e) => setDebtFilter(e.target.value as DebtFilter)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
              >
                <option value="todos">Todas as Situações</option>
                <option value="com-pendencia">Com Pendência (Saldo Devedor)</option>
                <option value="em-dia">Sem Pendência (Em Dia)</option>
              </select>
            </div>

            {/* Bairro */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Bairro</label>
              <select
                value={neighborhoodFilter}
                onChange={(e) => setNeighborhoodFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
              >
                <option value="todos">Todos os Bairros</option>
                {uniqueNeighborhoods.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Motorista Preferencial */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Motorista Preferencial
              </label>
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
              >
                <option value="todos">Todos os Motoristas</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Resumo da listagem */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Exibindo <strong>{filteredAndSortedClients.length}</strong> de{' '}
            <strong>{dashboardMetrics.totalClients}</strong> clientes cadastrados
          </span>
          {hasActiveFilters && (
            <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              Filtros ativos
            </span>
          )}
        </div>
      </div>

      {/* 4. Tabela de Clientes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredAndSortedClients.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">Nenhum cliente encontrado</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente alterar os termos da busca ou redefinir os filtros aplicados.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 text-xs text-sky-600 font-bold hover:underline"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-3">Documento</th>
                  <th className="py-3 px-3">Contato</th>
                  <th className="py-3 px-3">Endereço / Bairro</th>
                  <th className="py-3 px-3">Motorista</th>
                  <th className="py-3 px-3 text-right">Total Comprado</th>
                  <th className="py-3 px-3 text-center">Qtd</th>
                  <th className="py-3 px-3 text-right">Saldo Devedor</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedClients.map((client) => {
                  const stats = clientStatsMap.get(client.id);
                  const totalComprado = stats?.totalComprado || 0;
                  const totalQtd = stats?.totalQuantidade || 0;
                  const saldoDevedor = stats?.totalPendente || 0;

                  const initials = (client.name || 'C')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0].toUpperCase())
                    .join('');

                  const rawPhone = client.whatsapp || client.phone;
                  const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, '') : '';
                  const whatsUrl = cleanPhone
                    ? `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`}`
                    : null;

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-sky-50/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedClientIdForDetails(client.id)}
                    >
                      {/* Coluna 1: Cliente */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors block truncate max-w-[200px] sm:max-w-xs">
                              {client.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                              {client.trade_name && (
                                <span className="truncate max-w-[150px]">
                                  {client.trade_name}
                                </span>
                              )}
                              {client.trade_name && <span>•</span>}
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-semibold">
                                {client.tipo_pessoa === 'Pessoa Física' ? 'PF' : 'PJ'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Coluna 2: Documento */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {client.cpf_cnpj && client.cpf_cnpj !== '0'
                          ? formatCpfCnpj(client.cpf_cnpj)
                          : '-'}
                      </td>

                      {/* Coluna 3: Contato */}
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          {client.phone && (
                            <div className="text-slate-700 font-medium">
                              {formatPhone(client.phone)}
                            </div>
                          )}
                          {client.whatsapp && whatsUrl ? (
                            <a
                              href={whatsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>{formatPhone(client.whatsapp)}</span>
                            </a>
                          ) : null}
                          {!client.phone && !client.whatsapp && (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* Coluna 4: Endereço / Bairro */}
                      <td className="py-3 px-3">
                        <div className="min-w-0 max-w-[190px]">
                          <span className="block font-medium text-slate-800 truncate">
                            {client.address}
                            {client.number ? `, ${client.number}` : ''}
                          </span>
                          <span className="block text-[11px] text-slate-500 truncate">
                            {client.neighborhood} • {client.city}
                          </span>
                        </div>
                      </td>

                      {/* Coluna 5: Motorista */}
                      <td className="py-3 px-3">
                        {client.motorista_preferencial_nome ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            <Truck className="w-3 h-3 text-slate-500" />
                            {client.motorista_preferencial_nome}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">A definir</span>
                        )}
                      </td>

                      {/* Coluna 6: Total Comprado */}
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {formatCurrency(totalComprado)}
                      </td>

                      {/* Coluna 7: Quantidade */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-[11px]">
                          {totalQtd} un
                        </span>
                      </td>

                      {/* Coluna 8: Saldo Devedor */}
                      <td className="py-3 px-3 text-right">
                        {saldoDevedor > 0 ? (
                          <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                            {formatCurrency(saldoDevedor)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            Em dia
                          </span>
                        )}
                      </td>

                      {/* Coluna 9: Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            client.status === 'Inativo'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {client.status || 'Ativo'}
                        </span>
                      </td>

                      {/* Coluna 10: Ações */}
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {/* Ver Detalhes */}
                          <button
                            type="button"
                            onClick={() => setSelectedClientIdForDetails(client.id)}
                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Ver Detalhes do Cliente"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* + Venda */}
                          <button
                            type="button"
                            onClick={() => onNewSaleForClient(client)}
                            className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Nova Venda para este Cliente"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <>
                              {/* Editar */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditClientModal(client)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Editar Cliente"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle Ativo/Inativo */}
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(client)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  client.status === 'Inativo'
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-amber-600 hover:bg-amber-50'
                                }`}
                                title={
                                  client.status === 'Inativo'
                                    ? 'Ativar Cliente'
                                    : 'Desativar Cliente'
                                }
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>

                              {/* Excluir (Administrador) */}
                              {currentUser.role === 'ADMINISTRADOR' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClient(client)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Excluir Cliente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição de Cliente */}
      {isClientModalOpen && (
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => {
            setIsClientModalOpen(false);
            setClientToEdit(null);
          }}
          clientToEdit={clientToEdit}
          onSaved={(savedClient, andOpenSale) => {
            setDataVersion((v) => v + 1);
            if (andOpenSale) {
              onNewSaleForClient(savedClient);
            }
          }}
        />
      )}

      {/* Modal de Detalhes Completos do Cliente (com 6 abas) */}
      {selectedClientIdForDetails && (
        <ClientDetailsModal
          isOpen={!!selectedClientIdForDetails}
          onClose={() => setSelectedClientIdForDetails(null)}
          clientId={selectedClientIdForDetails}
          onEditClient={(c) => {
            setSelectedClientIdForDetails(null);
            handleOpenEditClientModal(c);
          }}
          onNewSaleForClient={(c) => {
            setSelectedClientIdForDetails(null);
            onNewSaleForClient(c);
          }}
          onOpenReceivePayment={(sale) => {
            onOpenReceivePaymentModal?.(sale);
          }}
          onClientUpdated={() => {
            setDataVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
};

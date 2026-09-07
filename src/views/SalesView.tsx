import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Zap,
  Download,
  Search,
  Filter,
  Eye,
  Edit2,
  Copy,
  Truck,
  DollarSign,
  Printer,
  Ban,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Droplets,
  Calendar,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Sale, PaymentMethod, PaymentStatus, SaleStatus, DeliveryStatus } from '../types';
import { storage } from '../services/storage';
import { formatCurrency, formatDate, formatNumber, getTodayDateString } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';
import { ConfirmModal } from '../components/ConfirmModal';
import { PrintReportView } from '../components/PrintReportView';
import { SaleDetailsModal } from '../components/sales/SaleDetailsModal';
import { SaleReceiptModal } from '../components/sales/SaleReceiptModal';

interface SalesViewProps {
  onOpenNewSale: () => void;
  onOpenQuickSale: () => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (sale: Sale) => void;
  onOpenReceivePayment: (sale: Sale) => void;
  onOpenImportExcel?: () => void;
  onPrintSaleReceipt?: (sale: Sale) => void;
}

type PeriodPreset = 'all' | 'today' | 'week' | 'month';

export const SalesView: React.FC<SalesViewProps> = ({
  onOpenNewSale,
  onOpenQuickSale,
  onEditSale,
  onDeleteSale,
  onOpenReceivePayment,
  onOpenImportExcel,
  onPrintSaleReceipt,
}) => {
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState('');
  const [selectedSaleStatus, setSelectedSaleStatus] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Modals & action states
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);

  // Confirm modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    isDestructive: false,
    onConfirm: async () => {},
  });

  // Action toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Storage reactive update ticker
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setDataVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  // Live storage data
  const sales = storage.getSales();
  const drivers = storage.getDrivers();
  const clients = storage.getClients();
  const currentUser = storage.getCurrentUser();
  const canEdit = currentUser?.role !== 'VISUALIZACAO';

  const todayStr = getTodayDateString();
  const currentMonthPrefix = todayStr.substring(0, 7);

  // Handle Preset changes
  const handlePeriodPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      const firstDayStr = firstDay.toISOString().split('T')[0];
      setStartDate(firstDayStr);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDayMonth = `${currentMonthPrefix}-01`;
      setStartDate(firstDayMonth);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setPeriodPreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedDriver('');
    setSelectedPaymentMethod('');
    setSelectedPaymentStatus('');
    setSelectedDeliveryStatus('');
    setSelectedSaleStatus('');
    setSelectedCity('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    periodPreset !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(selectedDriver) ||
    Boolean(selectedPaymentMethod) ||
    Boolean(selectedPaymentStatus) ||
    Boolean(selectedDeliveryStatus) ||
    Boolean(selectedSaleStatus) ||
    Boolean(selectedCity);

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (!s || s.is_deleted) return false;
      const sDate = s.sale_date || '';
      if (startDate && sDate < startDate) return false;
      if (endDate && sDate > endDate) return false;
      if (selectedDriver && s.driver_id !== selectedDriver && s.driver_name !== selectedDriver) return false;
      if (selectedPaymentMethod && s.payment_method !== selectedPaymentMethod) return false;
      if (selectedPaymentStatus && s.payment_status !== selectedPaymentStatus) return false;
      if (selectedDeliveryStatus) {
        const dStat = s.delivery_status || 'Aguardando';
        if (dStat !== selectedDeliveryStatus) return false;
      }
      if (selectedSaleStatus) {
        const sStat = s.sale_status || 'Confirmada';
        if (sStat !== selectedSaleStatus) return false;
      }
      const sCity = s.city || '';
      if (selectedCity && !sCity.toLowerCase().includes(selectedCity.toLowerCase())) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches =
          (s.code || '').toLowerCase().includes(term) ||
          (s.client_name || '').toLowerCase().includes(term) ||
          (s.client_document || '').toLowerCase().includes(term) ||
          (s.city || '').toLowerCase().includes(term) ||
          (s.driver_name || '').toLowerCase().includes(term) ||
          (s.vehicle_name && s.vehicle_name.toLowerCase().includes(term)) ||
          (s.address || '').toLowerCase().includes(term) ||
          (s.phone && s.phone.toLowerCase().includes(term));
        if (!matches) return false;
      }
      return true;
    });
  }, [
    sales,
    startDate,
    endDate,
    selectedDriver,
    selectedPaymentMethod,
    selectedPaymentStatus,
    selectedDeliveryStatus,
    selectedSaleStatus,
    selectedCity,
    searchTerm,
    dataVersion,
  ]);

  // ==========================================
  // CARDS SUPERIORES EXATOS (COM DADOS REAIS)
  // ==========================================
  // 1. Vendas Hoje: soma das vendas com data de hoje e não canceladas
  const validGlobalSales = sales.filter((s) => s && !s.is_deleted && s.sale_status !== 'Cancelada');

  const vendasHojeTotal = validGlobalSales
    .filter((s) => (s.sale_date || '') === todayStr)
    .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

  // 2. Vendas do Mês: soma das vendas no mês atual e não canceladas
  const vendasMesTotal = validGlobalSales
    .filter((s) => s.sale_date && s.sale_date.startsWith(currentMonthPrefix))
    .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

  // 3. Quantidade Vendida: soma da quantidade de galões/produtos vendidos no conjunto filtrado
  const quantidadeVendidaTotal = filteredSales
    .filter((s) => s.sale_status !== 'Cancelada')
    .reduce((acc, curr) => acc + (curr.quantity || 0), 0);

  // 4. Vendas Registradas: total de vendas registradas
  const vendasRegistradasTotal = filteredSales.length;

  // 5. A Receber: soma do saldo pendente de vendas ativas com pending_amount > 0
  const aReceberTotal = validGlobalSales
    .filter((s) => (s.pending_amount || 0) > 0)
    .reduce((acc, curr) => acc + (curr.pending_amount || 0), 0);

  // Pagination logic
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredSales.length);
  const currentSales = filteredSales.slice(startIndex, endIndex);

  // Unique cities for filter dropdown
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => {
      if (s?.city && s.city.trim()) set.add(s.city.trim());
    });
    return Array.from(set).sort();
  }, [sales, dataVersion]);

  // Actions
  const handleDuplicate = (sale: Sale) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Duplicar Venda',
      message: `Deseja duplicar a venda ${sale.code} do cliente ${sale.client_name}? Uma nova venda com data de hoje será gerada com os mesmos itens e valores.`,
      confirmText: 'Sim, Duplicar',
      isDestructive: false,
      onConfirm: async () => {
        const duplicated = await storage.duplicateSale(sale.id);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        if (duplicated) {
          showToast(`Venda duplicada com sucesso! Novo pedido: ${duplicated.code}`);
        }
      },
    });
  };

  const handleGenerateDelivery = (sale: Sale) => {
    const existing = storage.getDeliveries().find((d) => d.sale_id === sale.id);
    if (existing) {
      showToast(`A venda ${sale.code} já possui a entrega vinculada ${existing.code} (${existing.status}).`);
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Gerar Ordem de Entrega',
      message: `Deseja gerar a ordem de entrega para a venda ${sale.code} (${sale.client_name} - ${sale.quantity} un)? A venda será atualizada para "Em entrega".`,
      confirmText: 'Gerar Entrega',
      isDestructive: false,
      onConfirm: async () => {
        const delivery = await storage.generateDeliveryForSale(sale);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        showToast(`Ordem de entrega ${delivery.code} gerada com sucesso!`);
      },
    });
  };

  const handleCancelSale = async (sale: Sale) => {
    if (sale.sale_status === 'Cancelada') {
      showToast(`A venda ${sale.code} já se encontra cancelada.`);
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Cancelar Venda',
      message: `Atenção: Ao cancelar a venda ${sale.code}, o status será marcado como "Cancelada", a ordem de entrega vinculada será cancelada e o saldo a receber será zerado. Deseja prosseguir?`,
      confirmText: 'Sim, Cancelar Venda',
      isDestructive: true,
      onConfirm: async () => {
        const cancelled = await storage.cancelSale(sale.id);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        if (cancelled) {
          showToast(`Venda ${sale.code} cancelada com sucesso.`);
          if (viewingSale?.id === sale.id) {
            setViewingSale(cancelled);
          }
        }
      },
    });
  };

  const handlePrintIndividualReceipt = (sale: Sale) => {
    if (onPrintSaleReceipt) {
      onPrintSaleReceipt(sale);
    } else {
      setReceiptSale(sale);
    }
  };

  const handleExportXLSX = () => {
    exportToExcel(
      filteredSales.map((s) => ({
        'Nº Venda': s.code,
        Data: formatDate(s.sale_date),
        Cliente: s.client_name,
        'CPF/CNPJ': s.client_document || '',
        Telefone: s.phone || '',
        Endereço: `${s.address || ''}${s.number ? ', Nº ' + s.number : ''}${s.neighborhood ? ' - ' + s.neighborhood : ''}`,
        Cidade: s.city,
        Motorista: s.driver_name,
        Veículo: s.vehicle_name || '',
        Quantidade: s.quantity,
        'Valor Unitário': s.unit_price,
        'Total (R$)': s.total_amount,
        'Forma Pagamento': s.payment_method,
        'Status Pagamento': s.payment_status,
        'Status Entrega': s.delivery_status || 'Aguardando',
        'Status Venda': s.sale_status || 'Confirmada',
        'Valor Pago': s.amount_paid,
        'Saldo a Receber': s.pending_amount,
        'Minha Comissão (R$)': s.commission_amount,
        Observação: s.observation || '',
      })),
      `Vendas_Agua_Cristal_Sul_${todayStr}`
    );
    showToast('Planilha de vendas exportada com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-3 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-emerald-700 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans tracking-tight">
            Gestão de Vendas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Módulo oficial de registro, faturamento e acompanhamento de pedidos da Água Cristal Sul.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenImportExcel && (
            <button
              onClick={onOpenImportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Importar
            </button>
          )}

          <button
            onClick={() => setIsPrintReportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Imprimir Listagem de Vendas"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Imprimir
          </button>

          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Exportar dados para Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Exportar
          </button>

          {canEdit && (
            <>
              <button
                onClick={onOpenQuickSale}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                title="Lançamento Rápido em balcão ou rota"
              >
                <Zap className="w-4 h-4 fill-current" />
                Lançamento Rápido
              </button>

              <button
                onClick={onOpenNewSale}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                + Nova Venda
              </button>
            </>
          )}
        </div>
      </div>

      {/* ==================================================
          CARDS SUPERIORES SOLICITADOS
          - VENDAS HOJE
          - VENDAS DO MÊS
          - QUANTIDADE VENDIDA
          - VENDAS REGISTRADAS
          - A RECEBER
         ================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* VENDAS HOJE */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-sky-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Vendas Hoje
            </span>
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          </div>
          <p className="text-xl font-black text-sky-900 mt-1.5">
            {formatCurrency(vendasHojeTotal)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {validGlobalSales.filter((s) => s.sale_date === todayStr).length} pedidos hoje
          </span>
        </div>

        {/* VENDAS DO MÊS */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Vendas do Mês
            </span>
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          </div>
          <p className="text-xl font-black text-indigo-950 mt-1.5">
            {formatCurrency(vendasMesTotal)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {validGlobalSales.filter((s) => s.sale_date.startsWith(currentMonthPrefix)).length} pedidos no mês
          </span>
        </div>

        {/* QUANTIDADE VENDIDA */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Quantidade Vendida
            </span>
            <Droplets className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1.5">
            {formatNumber(quantidadeVendidaTotal)}{' '}
            <span className="text-xs font-normal text-slate-500">un</span>
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {filteredSales.length > 0
              ? `Média: ${(quantidadeVendidaTotal / filteredSales.length).toFixed(1)} un/pedido`
              : 'Nenhum pedido'}
          </span>
        </div>

        {/* VENDAS REGISTRADAS */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Vendas Registradas
            </span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1.5">
            {formatNumber(vendasRegistradasTotal)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {filteredSales.length !== sales.length
              ? `${filteredSales.length} de ${sales.length} no filtro`
              : 'Total no sistema'}
          </span>
        </div>

        {/* A RECEBER */}
        <div className="p-4 bg-white rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              A Receber
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <p className="text-xl font-black text-amber-800 mt-1.5">
            {formatCurrency(aReceberTotal)}
          </p>
          <span className="text-[11px] text-amber-700 mt-0.5 block">
            {validGlobalSales.filter((s) => s.pending_amount > 0).length} títulos pendentes
          </span>
        </div>
      </div>

      {/* Filters & Search Panel */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        {/* Search Bar + Quick Period Presets */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por Nº venda, cliente, CNPJ/CPF, telefone, motorista, veículo ou endereço..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 text-xs">
            <button
              onClick={() => handlePeriodPreset('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                periodPreset === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => handlePeriodPreset('today')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                periodPreset === 'today'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => handlePeriodPreset('week')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                periodPreset === 'week'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => handlePeriodPreset('month')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                periodPreset === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Este Mês
            </button>
          </div>
        </div>

        {/* Detailed Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">De:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset('all');
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Até:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset('all');
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Motorista:</label>
            <select
              value={selectedDriver}
              onChange={(e) => {
                setSelectedDriver(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">Todos</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pagamento:</label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => {
                setSelectedPaymentStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">Todas Situações</option>
              <option value="Pago">Pago (Verde)</option>
              <option value="Pendente">Pendente (Amarelo)</option>
              <option value="Parcial">Parcial (Azul)</option>
              <option value="Vencido">Vencido (Vermelho)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Entrega:</label>
            <select
              value={selectedDeliveryStatus}
              onChange={(e) => {
                setSelectedDeliveryStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">Todas Entregas</option>
              <option value="Aguardando">Aguardando</option>
              <option value="Saiu para entrega">Saiu para entrega</option>
              <option value="Entregue">Entregue</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Forma Pgto:</label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => {
                setSelectedPaymentMethod(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">Todas as Formas</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="PIX Empresa">PIX Empresa</option>
              <option value="Boleto">Boleto</option>
              <option value="Transferência">Transferência</option>
              <option value="Cartão">Cartão</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cidade:</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">Todas as Cidades</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter status summary and reset button */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Filtro ativo: <strong>{filteredSales.length}</strong> vendas encontradas.
            </span>
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-sky-700 hover:text-sky-900 font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* ==================================================
          TABELA DE VENDAS COM AS COLUNAS SOLICITADAS
          - Nº Venda
          - Data
          - Cliente
          - Cidade
          - Motorista
          - Quantidade
          - Valor Unitário
          - Total
          - Forma de Pagamento
          - Pagamento
          - Entrega
          - Ações
         ================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          
          {/* Mobile Cards (hidden on desktop) */}
          <div className="md:hidden divide-y divide-slate-100">
            {currentSales.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <Droplets className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                Nenhuma venda encontrada com os filtros selecionados.
              </div>
            ) : (
              currentSales.map((sale) => {
                const deliveryStatus = sale.delivery_status || 'Aguardando';
                const isCancelled = sale.sale_status === 'Cancelada';
                return (
                  <div key={"mob-"+sale.id} className={`p-4 ${isCancelled ? 'opacity-60 bg-slate-50' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sky-800 font-mono tracking-tight text-sm">{sale.code}</span>
                        {sale.sale_status && sale.sale_status !== 'Confirmada' && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-block ${sale.sale_status === 'Cancelada' ? 'bg-rose-100 text-rose-800' : sale.sale_status === 'Concluída' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                            {sale.sale_status}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{formatDate(sale.sale_date)}</div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="font-bold text-slate-900 truncate">{sale.client_name}</div>
                      <div className="text-[11px] text-slate-500">{sale.client_city || 'Sem cidade'}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-3 text-xs">
                      <div>
                        <span className="block text-[10px] text-slate-400 font-semibold uppercase">Quantidade</span>
                        <span className="font-medium text-slate-700">{sale.quantity} unid.</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-semibold uppercase">Valor</span>
                        <span className="font-medium text-emerald-700">{formatCurrency(sale.total_amount)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-semibold uppercase">Motorista</span>
                        <span className="font-medium text-slate-700 truncate block">{sale.driver_name || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-semibold uppercase">Pagamento</span>
                        <span className={`font-bold ${sale.payment_status === 'Pago' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {sale.payment_status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                       <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ${
                          deliveryStatus === 'Entregue'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : deliveryStatus === 'Em Rota'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {deliveryStatus === 'Entregue' ? <CheckCircle2 className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                          {deliveryStatus}
                        </span>
                        
                        <div className="flex gap-2">
                          <button onClick={() => onPrintSale(sale)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 bg-white">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => { if (!isCancelled) onEditSale(sale); }} disabled={isCancelled} className="p-1.5 rounded-lg border border-slate-200 text-sky-600 bg-white">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <table className="hidden md:table w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wide">
              <tr>
                <th className="py-3 px-3.5 whitespace-nowrap">Nº Venda</th>
                <th className="py-3 px-3 whitespace-nowrap">Data</th>
                <th className="py-3 px-3.5 min-w-[180px]">Cliente</th>
                <th className="py-3 px-3 whitespace-nowrap">Cidade</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Motorista</th>
                <th className="py-3 px-2.5 text-center whitespace-nowrap">Quantidade</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Valor Unitário</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Total</th>
                <th className="py-3 px-3 whitespace-nowrap">Forma de Pagamento</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Pagamento</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Entrega</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">

              {currentSales.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-14 text-center text-slate-400">
                    <Droplets className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                currentSales.map((sale) => {
                  const deliveryStatus = sale.delivery_status || 'Aguardando';
                  const isCancelled = sale.sale_status === 'Cancelada';

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCancelled ? 'opacity-60 bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Nº Venda */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-extrabold text-sky-800 font-mono tracking-tight block">
                          {sale.code}
                        </span>
                        {sale.sale_status && sale.sale_status !== 'Confirmada' && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 inline-block ${
                              sale.sale_status === 'Cancelada'
                                ? 'bg-rose-100 text-rose-800'
                                : sale.sale_status === 'Concluída'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sale.sale_status}
                          </span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDate(sale.sale_date)}
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-slate-900 block truncate max-w-[220px]" title={sale.client_name}>
                          {sale.client_name}
                        </span>
                        {sale.client_document && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Doc: {sale.client_document}
                          </span>
                        )}
                        {sale.address && (
                          <span
                            className="text-[10px] text-slate-500 block truncate max-w-[220px]"
                            title={`${sale.address}${sale.neighborhood ? ', ' + sale.neighborhood : ''}`}
                          >
                            {sale.address}
                          </span>
                        )}
                      </td>

                      {/* Cidade */}
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                          {sale.city || 'Balneário Camboriú'}
                        </span>
                      </td>

                      {/* Motorista */}
                      <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">
                        <span className="font-medium text-slate-900 block">
                          {sale.driver_name || 'A definir'}
                        </span>
                        {sale.vehicle_name && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[140px]" title={sale.vehicle_name}>
                            {sale.vehicle_name}
                          </span>
                        )}
                      </td>

                      {/* Quantidade */}
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                          {sale.quantity} <span className="text-[10px] font-normal text-slate-500">un</span>
                        </span>
                      </td>

                      {/* Valor Unitário */}
                      <td className="py-3 px-3 text-right text-slate-600 whitespace-nowrap font-medium">
                        {formatCurrency(sale.unit_price)}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <span className="font-black text-slate-900 block">
                          {formatCurrency(sale.total_amount)}
                        </span>
                        {sale.pending_amount > 0 && !isCancelled && (
                          <span className="text-[10px] text-amber-700 font-semibold block">
                            A receber: {formatCurrency(sale.pending_amount)}
                          </span>
                        )}
                      </td>

                      {/* Forma de Pagamento */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-[11px] bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded border border-slate-200">
                          {sale.payment_method}
                        </span>
                      </td>

                      {/* Pagamento */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            sale.payment_status === 'Pago'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : sale.payment_status === 'Pendente'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : sale.payment_status === 'Parcial'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {sale.payment_status === 'Pago' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {sale.payment_status}
                        </span>
                      </td>

                      {/* Entrega */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            deliveryStatus === 'Entregue'
                              ? 'bg-emerald-100 text-emerald-800'
                              : deliveryStatus === 'Saiu para entrega'
                              ? 'bg-blue-100 text-blue-800'
                              : deliveryStatus === 'Cancelada'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Truck className="w-3 h-3" />
                          {deliveryStatus}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Visualizar */}
                          <button
                            onClick={() => setViewingSale(sale)}
                            className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar Detalhes Completos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Imprimir Comprovante Individual */}
                          <button
                            onClick={() => handlePrintIndividualReceipt(sale)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Imprimir Comprovante / Recibo"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <>
                              {/* Registrar Pagamento (se houver saldo pendente) */}
                              {sale.pending_amount > 0 && !isCancelled && (
                                <button
                                  onClick={() => onOpenReceivePayment(sale)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="Registrar Pagamento / Recebimento"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Gerar Entrega */}
                              {!isCancelled && deliveryStatus === 'Aguardando' && (
                                <button
                                  onClick={() => handleGenerateDelivery(sale)}
                                  className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="Gerar / Despachar Entrega"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Duplicar */}
                              <button
                                onClick={() => handleDuplicate(sale)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Duplicar Venda"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {/* Editar */}
                              <button
                                onClick={() => onEditSale(sale)}
                                className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar Venda"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Cancelar (se não cancelada) */}
                              {!isCancelled && (
                                <button
                                  onClick={() => handleCancelSale(sale)}
                                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Cancelar Venda"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Excluir */}
                              <button
                                onClick={() => onDeleteSale(sale)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir Registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ==================================================
            PAGINAÇÃO COMPLETA (10, 25, 50, 100)
           ================================================== */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Mostrando <strong>{filteredSales.length === 0 ? 0 : startIndex + 1}</strong> a{' '}
              <strong>{endIndex}</strong> de <strong>{filteredSales.length}</strong> vendas registradas
            </span>

            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-[11px] text-slate-500">Exibir:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden"
              >
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Primeira Página"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Página Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-3 py-1 font-bold text-slate-800">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Próxima Página"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Última Página"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes da Venda (Visualizar) */}
      <SaleDetailsModal
        isOpen={Boolean(viewingSale)}
        onClose={() => setViewingSale(null)}
        sale={viewingSale}
        onEdit={(s) => onEditSale(s)}
        onDuplicate={(s) => handleDuplicate(s)}
        onOpenReceivePayment={(s) => onOpenReceivePayment(s)}
        onGenerateDelivery={(s) => handleGenerateDelivery(s)}
        onCancelSale={(s) => handleCancelSale(s)}
        onPrintReceipt={(s) => handlePrintIndividualReceipt(s)}
      />

      {/* Modal de Impressão de Comprovante Individual */}
      <SaleReceiptModal
        isOpen={Boolean(receiptSale)}
        onClose={() => setReceiptSale(null)}
        sale={receiptSale}
      />

      {/* Modal de Impressão da Listagem de Vendas */}
      <PrintReportView
        isOpen={isPrintReportOpen}
        onClose={() => setIsPrintReportOpen(false)}
        title="Relatório Geral de Vendas de Água"
        periodText={`Filtro: ${
          startDate || endDate
            ? `Período de ${startDate ? formatDate(startDate) : 'Início'} até ${endDate ? formatDate(endDate) : 'Hoje'}`
            : 'Todas as Vendas Registradas'
        } • Emissão: ${new Date().toLocaleDateString('pt-BR')}`}
        summaryCards={[
          { label: 'Total de Vendas', value: formatCurrency(vendasMesTotal), color: 'text-sky-900' },
          { label: 'Quantidade Vendida', value: `${formatNumber(quantidadeVendidaTotal)} un` },
          { label: 'Vendas no Relatório', value: `${filteredSales.length} pedidos` },
          { label: 'Total a Receber', value: formatCurrency(aReceberTotal), color: 'text-amber-800' },
        ]}
        columns={[
          { header: 'Nº Venda', key: 'code' },
          { header: 'Data', key: 'dateFormatted' },
          { header: 'Cliente', key: 'client_name' },
          { header: 'Cidade', key: 'city' },
          { header: 'Motorista', key: 'driver_name' },
          { header: 'Qtd', key: 'quantity', align: 'center' },
          { header: 'Unitário', key: 'unitFormatted', align: 'right' },
          { header: 'Total', key: 'totalFormatted', align: 'right' },
          { header: 'Forma Pgto', key: 'payment_method' },
          { header: 'Situação', key: 'payment_status', align: 'center' },
        ]}
        rows={filteredSales.map((s) => ({
          ...s,
          dateFormatted: formatDate(s.sale_date),
          unitFormatted: formatCurrency(s.unit_price),
          totalFormatted: formatCurrency(s.total_amount),
        }))}
        footerTotals={[
          {
            label: 'Volume Total em Vendas:',
            value: formatCurrency(filteredSales.reduce((acc, curr) => acc + curr.total_amount, 0)),
          },
          {
            label: 'Total de Unidades Entregues:',
            value: `${formatNumber(quantidadeVendidaTotal)} galões`,
          },
        ]}
      />

      {/* Modal Genérico de Confirmação */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        isDestructive={confirmConfig.isDestructive}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

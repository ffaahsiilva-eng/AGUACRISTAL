import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Truck,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Zap,
  Calendar,
  Filter,
  UserCheck,
  CreditCard,
  Droplets,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Award,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Sale, Expense, Delivery, PaymentMethod, PaymentStatus } from '../types';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getTodayDateString,
  getCurrentMonthString,
} from '../utils/formatters';
import { exportToExcel } from '../utils/excel';

interface DashboardViewProps {
  onOpenNewSale: () => void;
  onOpenQuickSale: () => void;
  onOpenNewExpense: () => void;
  onNavigateToDeliveries: () => void;
  onNavigateToReceivables: () => void;
  onNavigateToCommissions: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewSale,
  onOpenQuickSale,
  onOpenNewExpense,
  onNavigateToDeliveries,
  onNavigateToReceivables,
  onNavigateToCommissions,
}) => {
  const [periodPreset, setPeriodPreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const sales = storage.getSales();
  const expenses = storage.getExpenses();
  const deliveries = storage.getDeliveries();
  const drivers = storage.getDrivers();

  // Handle Preset changes
  const handlePresetChange = (preset: 'all' | 'today' | 'week' | 'month' | 'custom') => {
    setPeriodPreset(preset);
    const today = new Date();
    const todayStr = getTodayDateString();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(today.setDate(diff));
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(getTodayDateString());
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(getTodayDateString());
    }
  };

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.is_deleted) return false;
      if (startDate && s.sale_date < startDate) return false;
      if (endDate && s.sale_date > endDate) return false;
      if (driverFilter && s.driver_id !== driverFilter && s.driver_name !== driverFilter) return false;
      if (paymentMethodFilter && s.payment_method !== paymentMethodFilter) return false;
      if (paymentStatusFilter && s.payment_status !== paymentStatusFilter) return false;
      if (cityFilter && !s.city.toLowerCase().includes(cityFilter.toLowerCase())) return false;
      return true;
    });
  }, [sales, startDate, endDate, driverFilter, paymentMethodFilter, paymentStatusFilter, cityFilter]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.is_deleted) return false;
      if (startDate && e.expense_date < startDate) return false;
      if (endDate && e.expense_date > endDate) return false;
      if (driverFilter && e.driver_id !== driverFilter) return false;
      return true;
    });
  }, [expenses, startDate, endDate, driverFilter]);

  // Filtered deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (d.is_deleted) return false;
      if (startDate && d.delivery_date < startDate) return false;
      if (endDate && d.delivery_date > endDate) return false;
      if (driverFilter && d.driver_id !== driverFilter) return false;
      return true;
    });
  }, [deliveries, startDate, endDate, driverFilter]);

  // Calculations
  const todayStr = getTodayDateString();
  const salesToday = sales.filter((s) => !s.is_deleted && s.sale_date === todayStr);
  const totalSalesToday = salesToday.reduce((acc, curr) => acc + curr.total_amount, 0);

  const totalPeriodSales = filteredSales.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalQuantitySold = filteredSales.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalReceived = filteredSales.reduce((acc, curr) => acc + curr.amount_paid, 0);
  const totalReceivable = filteredSales.reduce((acc, curr) => acc + curr.pending_amount, 0);
  const totalCommission = filteredSales.reduce((acc, curr) => acc + curr.commission_amount, 0);

  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalPeriodSales - totalExpenses;

  const deliveriesPending = filteredDeliveries.filter((d) => d.status === 'Aguardando' || d.status === 'Saiu para entrega').length;
  const deliveriesFinished = filteredDeliveries.filter((d) => d.status === 'Entregue').length;

  // Chart data 1: Sales by payment method
  const salesByPaymentMethod = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach((s) => {
      map[s.payment_method] = (map[s.payment_method] || 0) + s.total_amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredSales]);

  // Chart data 2: Expenses by category
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category_name] = (map[e.category_name] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  // Chart data 3: Driver Performance (volume & total)
  const driverPerformance = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; total: number; count: number }> = {};
    filteredSales.forEach((s) => {
      const dName = s.driver_name || 'Não atribuído';
      if (!map[dName]) {
        map[dName] = { name: dName, quantity: 0, total: 0, count: 0 };
      }
      map[dName].quantity += s.quantity;
      map[dName].total += s.total_amount;
      map[dName].count += 1;
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity);
  }, [filteredSales]);

  // Export Dashboard Summary
  const handleExportDashboard = () => {
    exportToExcel(
      filteredSales.map((s) => ({
        Código: s.code,
        Data: formatDate(s.sale_date),
        Cliente: s.client_name,
        Cidade: s.city,
        Motorista: s.driver_name,
        Quantidade: s.quantity,
        'Valor Unitário': s.unit_price,
        'Valor Total': s.total_amount,
        'Forma Pagamento': s.payment_method,
        Status: s.payment_status,
      })),
      `Resumo_Vendas_Agua_Cristal_Sul_${startDate}_a_${endDate}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-sky-900 via-sky-800 to-blue-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-500/30 text-sky-200 border border-sky-400/30 uppercase tracking-wider">
              Painel Principal
            </span>
            <span className="text-xs text-sky-200 font-medium">Hoje: {formatDate(todayStr)}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-1 font-sans tracking-tight">
            ÁGUA CRISTAL SUL
          </h1>
          <p className="text-xs sm:text-sm text-sky-100/80">
            Controle integrado de vendas, entregas, motoristas e fechamento financeiro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenQuickSale}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            + Lançamento Rápido
          </button>
          <button
            onClick={onOpenNewSale}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-sky-500 text-slate-950 hover:bg-sky-400 active:scale-95 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Nova Venda
          </button>
          <button
            onClick={onOpenNewExpense}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-95 transition-all cursor-pointer"
          >
            <TrendingDown className="w-4 h-4 text-rose-400" />
            + Despesa
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => handlePresetChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                periodPreset === 'all'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => handlePresetChange('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                periodPreset === 'today'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => handlePresetChange('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                periodPreset === 'week'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => handlePresetChange('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                periodPreset === 'month'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => handlePresetChange('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                periodPreset === 'custom'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Personalizado
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Exportar XLSX
            </button>
          </div>
        </div>

        {/* Filters inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">De:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Até:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Motorista:</label>
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white"
            >
              <option value="">Todos os Motoristas</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pagamento:</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white"
            >
              <option value="">Todas as Formas</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="PIX Empresa">PIX Empresa</option>
              <option value="Boleto">Boleto</option>
              <option value="Transferência">Transferência</option>
              <option value="Cartão">Cartão</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Situação:</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white"
            >
              <option value="">Todas as Situações</option>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
              <option value="Parcial">Parcial</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Cidade:</label>
            <input
              type="text"
              placeholder="Ex: Camboriú"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Vendas Período */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-sky-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vendas no Período
            </span>
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">
            {formatCurrency(totalPeriodSales)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>Hoje: {formatCurrency(totalSalesToday)}</span>
            <span className="font-bold text-sky-700">{filteredSales.length} pedidos</span>
          </div>
        </div>

        {/* Card 2: Quantidade Vendida (Galões) */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Galões / Unidades
            </span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">
            {formatNumber(totalQuantitySold)} <span className="text-xs font-semibold text-slate-500">un</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Média: {filteredSales.length > 0 ? (totalQuantitySold / filteredSales.length).toFixed(1) : 0} un/pedido
          </p>
        </div>

        {/* Card 3: Total Recebido */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Recebido (Caixa)
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700 mt-2">
            {formatCurrency(totalReceived)}
          </p>
          <p className="mt-2 text-xs text-emerald-600 font-semibold">
            {totalPeriodSales > 0 ? `${((totalReceived / totalPeriodSales) * 100).toFixed(1)}% liquidado` : '0%'}
          </p>
        </div>

        {/* Card 4: Contas a Receber (Pendente) */}
        <div
          onClick={onNavigateToReceivables}
          className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs hover:bg-amber-50/40 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              A Receber (Pendente)
            </span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-800 mt-2">
            {formatCurrency(totalReceivable)}
          </p>
          <p className="mt-2 text-xs text-amber-700 font-bold underline">
            Ver Contas a Receber →
          </p>
        </div>

        {/* Card 5: Despesas Operacionais */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total de Despesas
            </span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-rose-600 mt-2">
            {formatCurrency(totalExpenses)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {filteredExpenses.length} lançamentos de custos
          </p>
        </div>

        {/* Card 6: Lucro Líquido Estimado */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Resultado Líquido
            </span>
            <div className={`p-2 rounded-xl ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-xl font-black mt-2 ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatCurrency(netProfit)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Margem Líquida: {totalPeriodSales > 0 ? `${((netProfit / totalPeriodSales) * 100).toFixed(1)}%` : '0%'}
          </p>
        </div>

        {/* Card 7: Comissões dos Motoristas */}
        <div
          onClick={onNavigateToCommissions}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:bg-slate-50 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Comissões Motoristas
            </span>
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-indigo-900 mt-2">
            {formatCurrency(totalCommission)}
          </p>
          <p className="mt-2 text-xs text-indigo-700 font-bold underline">
            Ver Relatório de Comissões →
          </p>
        </div>

        {/* Card 8: Entregas Status */}
        <div
          onClick={onNavigateToDeliveries}
          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:bg-slate-50 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Entregas do Período
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div>
              <span className="text-xs text-amber-700 font-bold block">
                {deliveriesPending} Pendentes
              </span>
              <span className="text-xs text-emerald-700 font-bold block">
                {deliveriesFinished} Entregues
              </span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 underline">
            Abrir Rota de Entregas →
          </p>
        </div>
      </div>

      {/* Interactive Charts & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Sales by Payment Method */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-600" />
              Vendas por Forma de Pagamento
            </h3>
          </div>

          <div className="space-y-3">
            {salesByPaymentMethod.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhuma venda encontrada no filtro</p>
            ) : (
              salesByPaymentMethod.map(([method, amount]) => {
                const percent = totalPeriodSales > 0 ? (amount / totalPeriodSales) * 100 : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{method}</span>
                      <span className="text-slate-900 font-bold">
                        {formatCurrency(amount)} ({percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart 2: Expenses by Category */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              Despesas por Categoria
            </h3>
          </div>

          <div className="space-y-3">
            {expensesByCategory.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhuma despesa no período</p>
            ) : (
              expensesByCategory.slice(0, 6).map(([cat, amt]) => {
                const percent = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700 truncate max-w-[150px]">{cat}</span>
                      <span className="text-rose-600 font-bold">
                        {formatCurrency(amt)} ({percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart 3: Driver Performance */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              Desempenho por Motorista
            </h3>
          </div>

          <div className="space-y-3">
            {driverPerformance.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhuma venda atribuída a motoristas</p>
            ) : (
              driverPerformance.map((item) => (
                <div key={item.name} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{item.name}</span>
                    <span className="text-[11px] text-slate-500">{item.count} viagens / pedidos</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-sky-900 block">{item.quantity} un</span>
                    <span className="text-[11px] font-semibold text-slate-500">{formatCurrency(item.total)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales List */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Últimas Vendas Cadastradas</h3>
            <p className="text-xs text-slate-500">Exibindo as vendas mais recentes do sistema</p>
          </div>
          <button
            onClick={onOpenNewSale}
            className="text-xs font-bold text-sky-600 hover:text-sky-800"
          >
            + Adicionar Venda
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Cidade</th>
                <th className="py-2.5 px-3">Motorista</th>
                <th className="py-2.5 px-3 text-center">Quantidade</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3">Pagamento</th>
                <th className="py-2.5 px-3 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.slice(0, 6).map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-sky-700">{sale.code}</td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{formatDate(sale.sale_date)}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{sale.client_name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{sale.city}</td>
                  <td className="py-2.5 px-3 text-slate-600">{sale.driver_name || 'A definir'}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-800">{sale.quantity} un</td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{sale.payment_method}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        sale.payment_status === 'Pago'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sale.payment_status === 'Pendente'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sale.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

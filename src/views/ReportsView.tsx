import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Filter,
  BarChart3,
  Users,
  MapPin,
  CreditCard,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { storage } from '../services/storage';
import { formatCurrency, formatDate, formatNumber, getTodayDateString } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';

interface ReportsViewProps {
  onOpenPrintModal: (reportConfig: any) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onOpenPrintModal }) => {
  const [reportType, setReportType] = useState<
    'sales_daily' | 'driver_performance' | 'city_ranking' | 'payment_methods' | 'pending_receivables'
  >('sales_daily');

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(getTodayDateString());

  const sales = storage.getSales();
  const drivers = storage.getDrivers();

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.is_deleted) return false;
      if (startDate && s.sale_date < startDate) return false;
      if (endDate && s.sale_date > endDate) return false;
      return true;
    });
  }, [sales, startDate, endDate]);

  // Report 1: Sales Daily
  const dailyReport = useMemo(() => {
    const map: Record<string, { date: string; count: number; quantity: number; total: number }> = {};
    filteredSales.forEach((s) => {
      if (!map[s.sale_date]) {
        map[s.sale_date] = { date: s.sale_date, count: 0, quantity: 0, total: 0 };
      }
      map[s.sale_date].count += 1;
      map[s.sale_date].quantity += s.quantity;
      map[s.sale_date].total += s.total_amount;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredSales]);

  // Report 2: Driver Performance
  const driverReport = useMemo(() => {
    const map: Record<string, { driver: string; count: number; quantity: number; total: number; commission: number }> = {};
    filteredSales.forEach((s) => {
      const d = s.driver_name || 'A definir';
      if (!map[d]) {
        map[d] = { driver: d, count: 0, quantity: 0, total: 0, commission: 0 };
      }
      map[d].count += 1;
      map[d].quantity += s.quantity;
      map[d].total += s.total_amount;
      map[d].commission += s.commission_amount;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  // Report 3: City Ranking
  const cityReport = useMemo(() => {
    const map: Record<string, { city: string; count: number; quantity: number; total: number }> = {};
    filteredSales.forEach((s) => {
      const c = s.city || 'Outras';
      if (!map[c]) {
        map[c] = { city: c, count: 0, quantity: 0, total: 0 };
      }
      map[c].count += 1;
      map[c].quantity += s.quantity;
      map[c].total += s.total_amount;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  // Report 4: Payment Methods
  const paymentReport = useMemo(() => {
    const map: Record<string, { method: string; count: number; total: number }> = {};
    filteredSales.forEach((s) => {
      const m = s.payment_method;
      if (!map[m]) {
        map[m] = { method: m, count: 0, total: 0 };
      }
      map[m].count += 1;
      map[m].total += s.total_amount;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  // Report 5: Pending Receivables
  const pendingReport = useMemo(() => {
    return filteredSales
      .filter((s) => s.pending_amount > 0)
      .map((s) => ({
        code: s.code,
        date: formatDate(s.sale_date),
        dueDate: s.due_date ? formatDate(s.due_date) : 'À vista',
        client: s.client_name,
        city: s.city,
        total: formatCurrency(s.total_amount),
        paid: formatCurrency(s.amount_paid),
        pending: formatCurrency(s.pending_amount),
        status: s.payment_status,
      }));
  }, [filteredSales]);

  // Totals
  const totalAmount = filteredSales.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalQuantity = filteredSales.reduce((acc, curr) => acc + curr.quantity, 0);

  // Handle Export
  const handleExport = () => {
    if (reportType === 'sales_daily') {
      exportToExcel(
        dailyReport.map((r) => ({
          Data: formatDate(r.date),
          Pedidos: r.count,
          'Galões Vendidos': r.quantity,
          'Valor Total': r.total,
        })),
        `Relatorio_Vendas_Diarias_${startDate}_${endDate}`
      );
    } else if (reportType === 'driver_performance') {
      exportToExcel(
        driverReport.map((r) => ({
          Motorista: r.driver,
          'Nº Pedidos': r.count,
          'Galões Entregues': r.quantity,
          'Faturamento Vendas': r.total,
          'Comissão Total': r.commission,
        })),
        `Relatorio_Desempenho_Motoristas_${startDate}_${endDate}`
      );
    } else if (reportType === 'city_ranking') {
      exportToExcel(
        cityReport.map((r) => ({
          Cidade: r.city,
          Pedidos: r.count,
          Galões: r.quantity,
          Faturamento: r.total,
        })),
        `Relatorio_Vendas_Por_Cidade_${startDate}_${endDate}`
      );
    } else if (reportType === 'payment_methods') {
      exportToExcel(
        paymentReport.map((r) => ({
          'Forma de Pagamento': r.method,
          Transações: r.count,
          'Volume Financeiro': r.total,
        })),
        `Relatorio_Formas_Pagamento_${startDate}_${endDate}`
      );
    } else {
      exportToExcel(pendingReport, `Relatorio_Contas_Receber_${startDate}_${endDate}`);
    }
  };

  // Handle Print via PrintReportView
  const handlePrint = () => {
    let title = '';
    let columns: any[] = [];
    let rows: any[] = [];
    let summaryCards = [
      { label: 'Total Faturamento', value: formatCurrency(totalAmount) },
      { label: 'Galões Comercializados', value: `${formatNumber(totalQuantity)} un` },
      { label: 'Total de Pedidos', value: `${filteredSales.length}` },
    ];

    if (reportType === 'sales_daily') {
      title = 'Relatório de Vendas Diárias';
      columns = [
        { header: 'Data', key: 'dateFormatted' },
        { header: 'Qtd Pedidos', key: 'count', align: 'center' },
        { header: 'Galões Vendidos', key: 'quantity', align: 'center' },
        { header: 'Faturamento Total', key: 'totalFormatted', align: 'right' },
      ];
      rows = dailyReport.map((r) => ({
        ...r,
        dateFormatted: formatDate(r.date),
        totalFormatted: formatCurrency(r.total),
      }));
    } else if (reportType === 'driver_performance') {
      title = 'Relatório de Desempenho por Motorista';
      columns = [
        { header: 'Motorista', key: 'driver' },
        { header: 'Pedidos', key: 'count', align: 'center' },
        { header: 'Galões', key: 'quantity', align: 'center' },
        { header: 'Total Vendas', key: 'totalFormatted', align: 'right' },
        { header: 'Comissão', key: 'commFormatted', align: 'right' },
      ];
      rows = driverReport.map((r) => ({
        ...r,
        totalFormatted: formatCurrency(r.total),
        commFormatted: formatCurrency(r.commission),
      }));
    } else if (reportType === 'city_ranking') {
      title = 'Relatório de Vendas por Cidade / Região';
      columns = [
        { header: 'Cidade', key: 'city' },
        { header: 'Pedidos', key: 'count', align: 'center' },
        { header: 'Galões', key: 'quantity', align: 'center' },
        { header: 'Faturamento', key: 'totalFormatted', align: 'right' },
      ];
      rows = cityReport.map((r) => ({
        ...r,
        totalFormatted: formatCurrency(r.total),
      }));
    } else if (reportType === 'payment_methods') {
      title = 'Relatório por Forma de Pagamento';
      columns = [
        { header: 'Forma de Pagamento', key: 'method' },
        { header: 'Transações', key: 'count', align: 'center' },
        { header: 'Volume Total', key: 'totalFormatted', align: 'right' },
      ];
      rows = paymentReport.map((r) => ({
        ...r,
        totalFormatted: formatCurrency(r.total),
      }));
    } else {
      title = 'Relatório de Contas a Receber / Pendências';
      columns = [
        { header: 'Venda', key: 'code' },
        { header: 'Data', key: 'date' },
        { header: 'Vencimento', key: 'dueDate' },
        { header: 'Cliente', key: 'client' },
        { header: 'Total', key: 'total', align: 'right' },
        { header: 'Saldo Restante', key: 'pending', align: 'right' },
        { header: 'Status', key: 'status', align: 'center' },
      ];
      rows = pendingReport;
    }

    onOpenPrintModal({
      title,
      periodText: `${formatDate(startDate)} até ${formatDate(endDate)}`,
      summaryCards,
      columns,
      rows,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Central de Relatórios Estatísticos
          </h1>
          <p className="text-xs text-slate-500">
            Gere relatórios gerenciais, visualize rankings e imprima documentos com papel timbrado oficial.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar XLSX
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório (PDF)
          </button>
        </div>
      </div>

      {/* Report Types Navigator */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setReportType('sales_daily')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            reportType === 'sales_daily'
              ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className={`w-5 h-5 mb-1.5 ${reportType === 'sales_daily' ? 'text-sky-600' : 'text-slate-400'}`} />
          <span className="text-xs font-bold text-slate-900 block">Vendas Diárias</span>
          <span className="text-[11px] text-slate-500">Evolução dia a dia</span>
        </button>

        <button
          onClick={() => setReportType('driver_performance')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            reportType === 'driver_performance'
              ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Truck className={`w-5 h-5 mb-1.5 ${reportType === 'driver_performance' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span className="text-xs font-bold text-slate-900 block">Por Motorista</span>
          <span className="text-[11px] text-slate-500">Volume e comissões</span>
        </button>

        <button
          onClick={() => setReportType('city_ranking')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            reportType === 'city_ranking'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <MapPin className={`w-5 h-5 mb-1.5 ${reportType === 'city_ranking' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="text-xs font-bold text-slate-900 block">Por Cidade</span>
          <span className="text-[11px] text-slate-500">Região e rotas</span>
        </button>

        <button
          onClick={() => setReportType('payment_methods')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            reportType === 'payment_methods'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CreditCard className={`w-5 h-5 mb-1.5 ${reportType === 'payment_methods' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className="text-xs font-bold text-slate-900 block">Pagamentos</span>
          <span className="text-[11px] text-slate-500">PIX, Dinheiro, Cartão</span>
        </button>

        <button
          onClick={() => setReportType('pending_receivables')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            reportType === 'pending_receivables'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertCircle className={`w-5 h-5 mb-1.5 ${reportType === 'pending_receivables' ? 'text-amber-600' : 'text-slate-400'}`} />
          <span className="text-xs font-bold text-slate-900 block">Inadimplência</span>
          <span className="text-[11px] text-slate-500">Contas em aberto</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Período De:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Até:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Total Filtrado</span>
            <span className="font-black text-slate-900 text-sm">{formatCurrency(totalAmount)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Galões</span>
            <span className="font-bold text-slate-800 text-sm">{formatNumber(totalQuantity)} un</span>
          </div>
        </div>
      </div>

      {/* Report Table Display */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {reportType === 'sales_daily' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4 text-center">Nº de Pedidos</th>
                  <th className="py-3 px-4 text-center">Galões Vendidos</th>
                  <th className="py-3 px-4 text-right">Faturamento Total</th>
                  <th className="py-3 px-4 text-right">Média por Pedido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyReport.map((r) => (
                  <tr key={r.date} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{formatDate(r.date)}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{r.count}</td>
                    <td className="py-3 px-4 text-center font-bold text-sky-800">{r.quantity} un</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatCurrency(r.total)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatCurrency(r.total / r.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'driver_performance' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Motorista</th>
                  <th className="py-3 px-4 text-center">Entregas / Pedidos</th>
                  <th className="py-3 px-4 text-center">Galões Entregues</th>
                  <th className="py-3 px-4 text-right">Volume Total Vendido</th>
                  <th className="py-3 px-4 text-right">Comissão Calculada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {driverReport.map((r) => (
                  <tr key={r.driver} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.driver}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{r.count}</td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-800">{r.quantity} un</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(r.total)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-indigo-700">
                      {formatCurrency(r.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'city_ranking' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Cidade / Região</th>
                  <th className="py-3 px-4 text-center">Nº de Vendas</th>
                  <th className="py-3 px-4 text-center">Galões Entregues</th>
                  <th className="py-3 px-4 text-right">Faturamento Total</th>
                  <th className="py-3 px-4 text-right">% do Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cityReport.map((r) => (
                  <tr key={r.city} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.city}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{r.count}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-800">{r.quantity} un</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatCurrency(r.total)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-medium">
                      {totalAmount > 0 ? `${((r.total / totalAmount) * 100).toFixed(1)}%` : '0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'payment_methods' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Forma de Pagamento</th>
                  <th className="py-3 px-4 text-center">Total de Transações</th>
                  <th className="py-3 px-4 text-right">Volume Financeiro</th>
                  <th className="py-3 px-4 text-right">% de Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentReport.map((r) => (
                  <tr key={r.method} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.method}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{r.count}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatCurrency(r.total)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-medium">
                      {totalAmount > 0 ? `${((r.total / totalAmount) * 100).toFixed(1)}%` : '0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'pending_receivables' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Data Venda</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Cidade</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-right">Já Recebido</th>
                  <th className="py-3 px-4 text-right">Saldo Devedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingReport.map((r: any) => (
                  <tr key={r.code} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-sky-700">{r.code}</td>
                    <td className="py-3 px-4 text-slate-600">{r.date}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{r.dueDate}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.client}</td>
                    <td className="py-3 px-4 text-slate-600">{r.city}</td>
                    <td className="py-3 px-4 text-right font-medium">{r.total}</td>
                    <td className="py-3 px-4 text-right text-emerald-700">{r.paid}</td>
                    <td className="py-3 px-4 text-right font-black text-amber-800">{r.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  Award,
  Calendar,
  Printer,
  Download,
  UserCheck,
  TrendingUp,
  Droplets,
  DollarSign,
  Search,
} from 'lucide-react';
import { storage } from '../services/storage';
import { formatCurrency, formatDate, formatNumber, getTodayDateString } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';

interface CommissionsViewProps {
  onPrintCommissionStatement: (driverName: string, items: any[], totals: any) => void;
}

export const CommissionsView: React.FC<CommissionsViewProps> = ({
  onPrintCommissionStatement,
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(getTodayDateString());

  const drivers = storage.getDrivers();
  const sales = storage.getSales();

  // Filter sales with driver commission
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.is_deleted) return false;
      if (startDate && s.sale_date < startDate) return false;
      if (endDate && s.sale_date > endDate) return false;
      if (selectedDriverId && s.driver_id !== selectedDriverId && s.driver_name !== selectedDriverId) return false;
      return true;
    });
  }, [sales, selectedDriverId, startDate, endDate]);

  // Aggregate by driver
  const driverSummaries = useMemo(() => {
    const map: Record<
      string,
      {
        id: string;
        name: string;
        salesCount: number;
        gallonsCount: number;
        totalSalesAmount: number;
        totalCommission: number;
        defaultRate: number;
      }
    > = {};

    drivers.forEach((d) => {
      map[d.id] = {
        id: d.id,
        name: d.name,
        salesCount: 0,
        gallonsCount: 0,
        totalSalesAmount: 0,
        totalCommission: 0,
        defaultRate: d.commission_rate_default || 2.5,
      };
    });

    filteredSales.forEach((s) => {
      const dId = s.driver_id || 'unassigned';
      if (!map[dId]) {
        map[dId] = {
          id: dId,
          name: s.driver_name || 'Não atribuído',
          salesCount: 0,
          gallonsCount: 0,
          totalSalesAmount: 0,
          totalCommission: 0,
          defaultRate: s.commission_rate || 2.5,
        };
      }
      map[dId].salesCount += 1;
      map[dId].gallonsCount += s.quantity;
      map[dId].totalSalesAmount += s.total_amount;
      map[dId].totalCommission += s.commission_amount;
    });

    return Object.values(map).filter(
      (item) => !selectedDriverId || item.id === selectedDriverId || item.name === selectedDriverId
    );
  }, [drivers, filteredSales, selectedDriverId]);

  const grandTotalSales = driverSummaries.reduce((acc, curr) => acc + curr.totalSalesAmount, 0);
  const grandTotalGallons = driverSummaries.reduce((acc, curr) => acc + curr.gallonsCount, 0);
  const grandTotalCommission = driverSummaries.reduce((acc, curr) => acc + curr.totalCommission, 0);

  const handleExport = () => {
    exportToExcel(
      filteredSales.map((s) => ({
        Data: formatDate(s.sale_date),
        Venda: s.code,
        Motorista: s.driver_name,
        Cliente: s.client_name,
        Cidade: s.city,
        Quantidade: s.quantity,
        'Valor Total': s.total_amount,
        'Comissão (%)': `${s.commission_rate}%`,
        'Valor Comissão': s.commission_amount,
      })),
      `Comissoes_Motoristas_${startDate}_a_${endDate}`
    );
  };

  const handlePrint = (summaryItem: any) => {
    const driverSales = filteredSales.filter(
      (s) => s.driver_id === summaryItem.id || s.driver_name === summaryItem.name
    );
    onPrintCommissionStatement(summaryItem.name, driverSales, summaryItem);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Comissões dos Motoristas
          </h1>
          <p className="text-xs text-slate-500">
            Cálculo automático de comissões por volume de entregas e percentual sobre as vendas.
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
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
            Total de Comissões a Pagar
          </span>
          <p className="text-2xl font-black text-indigo-950 mt-1">
            {formatCurrency(grandTotalCommission)}
          </p>
          <span className="text-xs text-indigo-700 mt-1 block">
            Período selecionado
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Galões Entregues pela Equipe
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatNumber(grandTotalGallons)} <span className="text-xs font-normal text-slate-500">un</span>
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            Total de {filteredSales.length} pedidos
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Volume de Vendas da Equipe
          </span>
          <p className="text-2xl font-black text-sky-900 mt-1">
            {formatCurrency(grandTotalSales)}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            Base para cálculo de comissões
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Motorista:</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
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
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Data Inicial:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Data Final:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Driver Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {driverSummaries.map((summary) => (
          <div
            key={summary.id}
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {summary.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{summary.name}</h3>
                    <span className="text-[11px] text-slate-500">
                      Taxa: {summary.defaultRate}% sobre vendas
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pedidos Entregues:</span>
                  <span className="font-bold text-slate-800">{summary.salesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Galões Vendidos:</span>
                  <span className="font-bold text-slate-800">{summary.gallonsCount} un</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total em Vendas:</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(summary.totalSalesAmount)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100 text-sm">
                  <span className="font-bold text-indigo-900">Comissão Calculada:</span>
                  <span className="font-black text-indigo-700">
                    {formatCurrency(summary.totalCommission)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePrint(summary)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Extrato / Recibo
            </button>
          </div>
        ))}
      </div>

      {/* Detailed Commission Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900">
            Detalhamento de Vendas & Comissões
          </h3>
          <span className="text-xs text-slate-500">{filteredSales.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Motorista</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Cidade</th>
                <th className="py-2.5 px-3 text-center">Galões</th>
                <th className="py-2.5 px-3 text-right">Valor Venda</th>
                <th className="py-2.5 px-3 text-center">% Comis.</th>
                <th className="py-2.5 px-3 text-right">Valor Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 whitespace-nowrap">{formatDate(s.sale_date)}</td>
                  <td className="py-2.5 px-3 font-bold text-sky-700">{s.code}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{s.driver_name}</td>
                  <td className="py-2.5 px-3">{s.client_name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{s.city}</td>
                  <td className="py-2.5 px-3 text-center font-bold">{s.quantity}</td>
                  <td className="py-2.5 px-3 text-right font-medium">
                    {formatCurrency(s.total_amount)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                    {s.commission_rate}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-indigo-700">
                    {formatCurrency(s.commission_amount)}
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

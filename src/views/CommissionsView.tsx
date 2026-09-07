import React, { useState, useMemo } from 'react';
import {
  Award,
  Calendar,
  Printer,
  Download,
  TrendingUp,
  Droplets,
  DollarSign,
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
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(getTodayDateString());

  const sales = storage.getSales();
  const settings = storage.getSettings();

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.is_deleted) return false;
      if (startDate && s.sale_date < startDate) return false;
      if (endDate && s.sale_date > endDate) return false;
      return true;
    });
  }, [sales, startDate, endDate]);

  // Global aggregate
  const summary = useMemo(() => {
    let salesCount = 0;
    let gallonsCount = 0;
    let totalSalesAmount = 0;
    let totalCommission = 0;

    filteredSales.forEach((s) => {
      salesCount += 1;
      gallonsCount += s.quantity;
      totalSalesAmount += s.total_amount;
      totalCommission += s.commission_amount;
    });

    return {
      salesCount,
      gallonsCount,
      totalSalesAmount,
      totalCommission,
      defaultRate: settings.default_commission_rate || 2.5
    };
  }, [filteredSales, settings.default_commission_rate]);

  const handleExport = () => {
    exportToExcel(
      filteredSales.map((s) => ({
        Data: formatDate(s.sale_date),
        Venda: s.code,
        Cliente: s.client_name,
        Cidade: s.city,
        Quantidade: s.quantity,
        'Valor Total': s.total_amount,
        'Comissão (%)': `${s.commission_rate}%`,
        'Valor Comissão': s.commission_amount,
      })),
      `Minhas_Comissoes_${startDate}_a_${endDate}`
    );
  };

  const handlePrint = () => {
    onPrintCommissionStatement('Usuário Logado', filteredSales, summary);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Minhas Comissões
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

      {/* Date Filter & Summary Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-4 items-end mb-6">
          <div className="flex-1 w-full flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Data Inicial:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Data Final:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Big Summary Card */}
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-2xl p-6 border border-indigo-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/20">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-indigo-900 tracking-wide uppercase">Total de Comissões</h2>
                  <p className="text-[11px] font-semibold text-indigo-600">Referente ao período selecionado</p>
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-indigo-900 tracking-tight">
                {formatCurrency(summary.totalCommission)}
              </p>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="bg-white/80 p-4 rounded-xl border border-indigo-100 shadow-xs">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> Total Vendido</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(summary.totalSalesAmount)}</p>
              </div>
              <div className="bg-white/80 p-4 rounded-xl border border-indigo-100 shadow-xs">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-sky-500" /> Galões</p>
                <p className="text-lg font-bold text-slate-800">{summary.gallonsCount} un</p>
              </div>
            </div>

            <div className="shrink-0 flex items-center">
              <button
                onClick={handlePrint}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20"
              >
                <Printer className="w-4 h-4" />
                Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
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
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Data</th>
                <th className="py-3 px-4 whitespace-nowrap">Código</th>
                <th className="py-3 px-4 min-w-[200px]">Cliente</th>
                <th className="py-3 px-4 whitespace-nowrap">Cidade</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Qtd (un)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Valor Total</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhuma venda com comissão encontrada no período.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {formatDate(s.sale_date)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {s.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 truncate max-w-[200px]" title={s.client_name}>
                        {s.client_name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.city}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-sky-800">
                      {s.quantity}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700">
                      {formatCurrency(s.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-indigo-700">
                          {formatCurrency(s.commission_amount)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          ({s.commission_rate}%)
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredSales.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right font-bold text-slate-600">
                    TOTAIS:
                  </td>
                  <td className="py-3 px-4 text-center font-black text-sky-800">
                    {summary.gallonsCount}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-800">
                    {formatCurrency(summary.totalSalesAmount)}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-indigo-800">
                    {formatCurrency(summary.totalCommission)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

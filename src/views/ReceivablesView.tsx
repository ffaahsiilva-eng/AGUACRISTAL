import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Printer,
  Calendar,
  CreditCard,
  History,
} from 'lucide-react';
import { Sale } from '../types';
import { storage } from '../services/storage';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';

interface ReceivablesViewProps {
  onOpenReceivePaymentModal: (sale: Sale) => void;
  onPrintReceivablesReport: () => void;
}

export const ReceivablesView: React.FC<ReceivablesViewProps> = ({
  onOpenReceivePaymentModal,
  onPrintReceivablesReport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pendente' | 'Parcial' | 'Vencido'>('all');

  const sales = storage.getSales();
  const todayStr = getTodayDateString();
  const currentUser = storage.getCurrentUser();
  const canEdit = currentUser.role !== 'VISUALIZACAO';

  // Only consider sales that have pending amount or are not completely paid
  const pendingSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.is_deleted) return false;
      if (s.pending_amount <= 0 && s.payment_status === 'Pago') return false;

      // Check if overdue
      const isOverdue = s.due_date && s.due_date < todayStr;
      const effectiveStatus = isOverdue ? 'Vencido' : s.payment_status;

      if (statusFilter !== 'all') {
        if (statusFilter === 'Vencido' && !isOverdue) return false;
        if (statusFilter !== 'Vencido' && effectiveStatus !== statusFilter) return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          s.code.toLowerCase().includes(term) ||
          s.client_name.toLowerCase().includes(term) ||
          s.city.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [sales, statusFilter, searchTerm, todayStr]);

  // Statistics
  const totalReceivable = pendingSales.reduce((acc, curr) => acc + curr.pending_amount, 0);
  const totalOriginal = pendingSales.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalAlreadyPaid = pendingSales.reduce((acc, curr) => acc + curr.amount_paid, 0);

  const overdueSales = pendingSales.filter((s) => s.due_date && s.due_date < todayStr);
  const overdueTotal = overdueSales.reduce((acc, curr) => acc + curr.pending_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Contas a Receber (Cobranças & Pendências)
          </h1>
          <p className="text-xs text-slate-500">
            Acompanhe pedidos a prazo, boletos, cheques e pagamentos parciais em aberto.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onPrintReceivablesReport}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Imprimir Relatório de Cobrança
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Total Pendente a Receber
            </span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">
            {formatCurrency(totalReceivable)}
          </p>
          <span className="text-xs text-amber-700 mt-1 block">
            {pendingSales.length} títulos em aberto
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Títulos Vencidos
            </span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">
            {formatCurrency(overdueTotal)}
          </p>
          <span className="text-xs text-rose-600 mt-1 block">
            {overdueSales.length} faturas em atraso
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Já Amortizado nestes Títulos
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {formatCurrency(totalAlreadyPaid)}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Total original da fatura: {formatCurrency(totalOriginal)}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({sales.filter((s) => !s.is_deleted && s.pending_amount > 0).length})
            </button>
            <button
              onClick={() => setStatusFilter('Pendente')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'Pendente'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setStatusFilter('Parcial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'Parcial'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Parciais
            </button>
            <button
              onClick={() => setStatusFilter('Vencido')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'Vencido'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vencidos ({overdueSales.length})
            </button>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por cliente, código ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          
          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredReceivables.length === 0 ? (
              <div className="py-12 text-center text-slate-400">Nenhuma conta encontrada com os filtros selecionados.</div>
            ) : (
              filteredReceivables.map((rec) => (
                <div key={"mob-"+rec.id} className="p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-extrabold text-sky-800 tracking-tight text-sm">{rec.code}</span>
                      <span className="text-[11px] text-slate-400 block">{formatDate(rec.sale_date)}</span>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${rec.payment_status === 'Pago' ? 'bg-emerald-100 text-emerald-800' : rec.payment_status === 'Vencido' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                      {rec.payment_status}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="font-bold text-slate-900 truncate">{rec.client_name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">Total</span>
                      <span className="font-medium text-slate-700">{formatCurrency(rec.total_amount)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-semibold uppercase">A Receber</span>
                      <span className="font-bold text-amber-600">{formatCurrency(Math.max(0, rec.total_amount - (rec.amount_paid || 0)))}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <button 
                      onClick={() => onReceivePayment(rec)} 
                      disabled={rec.payment_status === 'Pago'}
                      className="w-full p-2.5 rounded-lg font-bold text-xs bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 transition-colors"
                    >
                      Registrar Pagamento
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <table className="hidden md:table w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wide">
              <tr>
                <th className="py-3 px-3 whitespace-nowrap">Nº Venda</th>
                <th className="py-3 px-3 whitespace-nowrap">Data da Venda</th>
                <th className="py-3 px-3 min-w-[200px]">Cliente</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Valor Total</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Valor Pago</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Saldo Devedor</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">

              {pendingSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Nenhuma conta em aberto encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                pendingSales.map((sale) => {
                  const isOverdue = sale.due_date && sale.due_date < todayStr;
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-sky-700">{sale.code}</td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDate(sale.sale_date)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-medium">
                        <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                          {sale.due_date ? formatDate(sale.due_date) : 'À vista'}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] text-rose-500 block font-semibold">
                            Vencido!
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{sale.client_name}</span>
                        {sale.phone && <span className="text-[10px] text-slate-400">{sale.phone}</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{sale.city}</td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-800">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700 font-medium">
                        {formatCurrency(sale.amount_paid)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-amber-800">
                        {formatCurrency(sale.pending_amount)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-800'
                              : sale.payment_status === 'Parcial'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isOverdue ? 'Vencido' : sale.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {canEdit && (
                          <button
                            onClick={() => onOpenReceivePaymentModal(sale)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs active:scale-95 transition-all"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Receber
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

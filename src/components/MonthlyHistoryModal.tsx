import React, { useState, useMemo } from 'react';
import {
  History,
  Download,
  Calendar,
  X,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Clock,
  Printer,
  Archive,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { MonthlyClosingRecord } from '../types';
import { storage } from '../services/storage';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';

interface MonthlyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMonthForDRE?: (month: string) => void;
}

export const MonthlyHistoryModal: React.FC<MonthlyHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectMonthForDRE,
}) => {
  const [selectedRecord, setSelectedRecord] = useState<MonthlyClosingRecord | null>(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'sales' | 'expenses'>('summary');
  const [reopeningRecord, setReopeningRecord] = useState<MonthlyClosingRecord | null>(null);
  const [isReopeningAll, setIsReopeningAll] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [, setVersion] = useState(0);

  React.useEffect(() => {
    const unsub = storage.subscribe(() => {
      setVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const history = storage.getMonthlyClosingHistory();
  const closingState = storage.getMonthlyClosingState();
  const closedMonthsSet = new Set(closingState.closed_months || []);

  const filteredHistory = history.filter((item) => {
    if (filterMonth && item.month !== filterMonth) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.month_label.toLowerCase().includes(q) ||
        item.month.includes(q) ||
        (item.closed_by && item.closed_by.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const currentRecord = selectedRecord
    ? history.find((h) => h.id === selectedRecord.id || h.month === selectedRecord.month) || selectedRecord
    : filteredHistory[0] || null;

  const handleExecuteReopen = async (record: MonthlyClosingRecord) => {
    setIsProcessing(true);
    try {
      const updated = await storage.reopenMonthlyClosing(record.month);
      setFeedbackMessage(
        `Fechamento de ${record.month_label} retornado com sucesso! Todas as vendas, entregas e despesas foram reativadas no painel.`
      );
      setReopeningRecord(null);
      if (updated) {
        setSelectedRecord(updated);
      }
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err) {
      console.error('Erro ao retornar fechamento:', err);
      alert('Ocorreu um erro ao processar o retorno do fechamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteReopenAll = async () => {
    setIsProcessing(true);
    try {
      const count = await storage.reopenAllMonthlyClosings();
      setFeedbackMessage(
        `Todos os fechamentos (${count}) foram retornados com sucesso! Todos os registros voltaram ao painel ativo.`
      );
      setIsReopeningAll(false);
      const hist = storage.getMonthlyClosingHistory();
      if (hist.length > 0) {
        setSelectedRecord(hist[0]);
      }
      setTimeout(() => setFeedbackMessage(null), 6000);
    } catch (err) {
      console.error('Erro ao retornar todos os fechamentos:', err);
      alert('Ocorreu um erro ao retornar todos os fechamentos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRecord = async (record: MonthlyClosingRecord) => {
    if (
      !window.confirm(
        `Deseja realmente remover o registro de fechamento de ${record.month_label} do histórico permanente? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    await storage.deleteMonthlyClosingRecord(record.id);
    if (selectedRecord?.id === record.id) {
      setSelectedRecord(null);
    }
  };

  const handleExportSingleMonth = (record: MonthlyClosingRecord) => {
    const salesData = (record.sales_snapshot || []).map((s) => ({
      Mês: record.month_label,
      Código: s.code,
      Data: formatDate(s.sale_date),
      Cliente: s.client_name,
      Cidade: s.city,
      Motorista: s.driver_name,
      Quantidade_cx: s.quantity,
      Valor_Unitario: s.unit_price,
      Valor_Total: s.total_amount,
      Valor_Pago: s.amount_paid,
      Pendente: s.pending_amount,
      Pagamento: s.payment_method,
      Status: s.payment_status,
    }));

    exportToExcel(
      salesData.length > 0
        ? salesData
        : [{ Mensagem: 'Sem vendas gravadas no snapshot deste fechamento' }],
      `Historico_Vendas_${record.month}`
    );
  };

  const handleExportAllHistory = () => {
    const summaryData = history.map((h) => ({
      Mês: h.month_label,
      Ano_Mes: h.month,
      Data_Fechamento: formatDate(h.closed_at.split('T')[0]),
      Responsavel: h.closed_by,
      Receita_Bruta: h.gross_revenue,
      Total_Recebido: h.total_received,
      Total_A_Receber: h.total_receivable,
      Caixas_Vendidas: h.total_boxes,
      Total_Despesas: h.total_expenses,
      Resultado_Liquido: h.net_result,
      Margem_Lucro_Perc: h.profit_margin.toFixed(1) + '%',
      Qtd_Vendas: h.sales_count,
      Qtd_Despesas: h.expenses_count,
      Observacoes: h.notes || '',
    }));

    exportToExcel(summaryData, 'Historico_Completo_Fechamentos_Mensais');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30">
              <History className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/30 text-sky-300 px-2.5 py-0.5 rounded-full">
                  Arquivo Permanente
                </span>
                <span className="text-xs text-slate-400">
                  {history.length} mês(es) arquivado(s)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-0.5 tracking-tight font-sans">
                Histórico de Fechamentos Mensais
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.some((h) => !h.is_reopened) && (
              <button
                onClick={() => setIsReopeningAll(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Retornar todos os fechamentos arquivados para o painel ativo"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Retornar Todos</span>
                <span className="sm:hidden">Retornar</span>
              </button>
            )}

            <button
              onClick={handleExportAllHistory}
              disabled={history.length === 0}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40"
              title="Baixar resumo de todos os meses em Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Baixar Todos (.XLSX)
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedbackMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="p-1 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content layout: Left list / Right detail */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left panel: Months list */}
          <div className="md:col-span-5 border-r border-slate-200 flex flex-col bg-slate-50/60 overflow-hidden">
            {/* Filter controls */}
            <div className="p-3 border-b border-slate-200 bg-white space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por mês ou responsável..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Months list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <Archive className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Nenhum mês arquivado</p>
                  <p className="text-[11px] text-slate-400">
                    O histórico está vazio e todas as vendas, despesas e entregas estão ativas no painel principal.
                  </p>
                </div>
              ) : (
                filteredHistory.map((rec) => {
                  const isSelected = currentRecord?.id === rec.id || currentRecord?.month === rec.month;
                  const isClosed = closedMonthsSet.has(rec.month);
                  return (
                    <div
                      key={rec.id}
                      onClick={() => setSelectedRecord(rec)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50 border-sky-300 shadow-sm ring-1 ring-sky-300'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-sm text-slate-900">
                          {rec.month_label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {rec.is_reopened ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              Retornado
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                              Fechado
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {rec.month}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Receita</span>
                          <span className="font-bold text-sky-700">{formatCurrency(rec.gross_revenue)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Resultado</span>
                          <span className={`font-bold ${rec.net_result >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {formatCurrency(rec.net_result)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                        <span className="text-slate-500 font-medium">
                          {rec.sales_count} vendas • {formatNumber(rec.total_boxes)} cx
                        </span>
                        {rec.is_reopened ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 rounded-lg border border-emerald-300/60 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Já Retornado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReopeningRecord(rec);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black text-amber-950 bg-amber-300 hover:bg-amber-400 rounded-lg shadow-2xs transition-all cursor-pointer"
                            title="Retornar este fechamento para o painel ativo"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-900" />
                            Retornar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Details of selected month */}
          <div className="md:col-span-7 flex flex-col bg-white overflow-hidden min-h-0">
            {currentRecord ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Detail Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                        Fechamento Mensal
                      </span>
                      {currentRecord.is_reopened ? (
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Retornado / Reaberto
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                          Fechado
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mt-1">
                      {currentRecord.month_label}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Fechado em: {formatDate(currentRecord.closed_at.split('T')[0])} por {currentRecord.closed_by}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!currentRecord.is_reopened ? (
                      <button
                        onClick={() => setReopeningRecord(currentRecord)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition-all cursor-pointer"
                        title="Retornar este fechamento e reativar vendas no painel"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-950" />
                        Retornar Fechamento
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300/60 rounded-xl shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Já Retornado ao Painel
                      </span>
                    )}

                    <button
                      onClick={() => handleExportSingleMonth(currentRecord)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      Baixar (.XLSX)
                    </button>

                    {onSelectMonthForDRE && (
                      <button
                        onClick={() => {
                          onSelectMonthForDRE(currentRecord.month);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Ver DRE
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteRecord(currentRecord)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Excluir este registro do arquivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {currentRecord.is_reopened && (
                  <div className="mx-4 sm:mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 shrink-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Fechamento já retornado:</strong> As {currentRecord.sales_count} vendas e movimentações deste mês já estão reativadas e disponíveis no sistema.
                      </span>
                    </div>
                  </div>
                )}

                {/* Subtabs for Detail */}
                <div className="px-5 border-b border-slate-200 flex items-center gap-4 text-xs font-bold shrink-0">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`py-2.5 border-b-2 transition-colors ${
                      activeTab === 'summary'
                        ? 'border-sky-600 text-sky-700 font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Resumo Consolidado
                  </button>
                  <button
                    onClick={() => setActiveTab('sales')}
                    className={`py-2.5 border-b-2 transition-colors ${
                      activeTab === 'sales'
                        ? 'border-sky-600 text-sky-700 font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Vendas ({currentRecord.sales_snapshot?.length || currentRecord.sales_count})
                  </button>
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className={`py-2.5 border-b-2 transition-colors ${
                      activeTab === 'expenses'
                        ? 'border-sky-600 text-sky-700 font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Despesas ({currentRecord.expenses_snapshot?.length || currentRecord.expenses_count})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {activeTab === 'summary' && (
                    <div className="space-y-4">
                      {/* Metric cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100">
                          <span className="text-[10px] font-bold text-sky-600 uppercase block">Receita Bruta</span>
                          <span className="text-base font-black text-sky-900 block mt-1">
                            {formatCurrency(currentRecord.gross_revenue)}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Volume Vendido</span>
                          <span className="text-base font-black text-slate-900 block mt-1">
                            {formatNumber(currentRecord.total_boxes)} cx
                          </span>
                        </div>
                        <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                          <span className="text-[10px] font-bold text-rose-600 uppercase block">Total Despesas</span>
                          <span className="text-base font-black text-rose-700 block mt-1">
                            {formatCurrency(currentRecord.total_expenses)}
                          </span>
                        </div>
                        <div className={`p-3 rounded-2xl border ${currentRecord.net_result >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                          <span className="text-[10px] font-bold uppercase block text-slate-600">Lucro Líquido</span>
                          <span className={`text-base font-black block mt-1 ${currentRecord.net_result >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {formatCurrency(currentRecord.net_result)}
                          </span>
                        </div>
                      </div>

                      {/* Detail card */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Total Recebido no Mês:</span>
                          <span className="font-bold text-slate-800">{formatCurrency(currentRecord.total_received)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Total Pendente (A Receber):</span>
                          <span className="font-bold text-slate-800">{formatCurrency(currentRecord.total_receivable)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500">Margem de Lucro:</span>
                          <span className="font-bold text-slate-800">{currentRecord.profit_margin.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Total de Pedidos / Vendas:</span>
                          <span className="font-bold text-slate-800">{currentRecord.sales_count}</span>
                        </div>
                      </div>

                      {currentRecord.notes && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                          <span className="font-bold text-amber-900 block mb-0.5">Observações:</span>
                          <p className="text-amber-800">{currentRecord.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'sales' && (
                    <div className="space-y-2 text-xs">
                      {(!currentRecord.sales_snapshot || currentRecord.sales_snapshot.length === 0) ? (
                        <p className="text-slate-400 py-6 text-center">Nenhuma venda individual registrada no snapshot deste mês.</p>
                      ) : (
                        currentRecord.sales_snapshot.map((s) => (
                          <div
                            key={s.id}
                            className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{s.code}</span>
                                <span className="text-[10px] text-slate-500">{formatDate(s.sale_date)}</span>
                              </div>
                              <span className="text-slate-700 block text-[11px]">{s.client_name} • {s.city}</span>
                              <span className="text-slate-400 text-[10px]">{s.quantity} cx • Motorista: {s.driver_name || 'N/A'}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-slate-900 block">{formatCurrency(s.total_amount)}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.payment_status === 'Pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {s.payment_status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'expenses' && (
                    <div className="space-y-2 text-xs">
                      {(!currentRecord.expenses_snapshot || currentRecord.expenses_snapshot.length === 0) ? (
                        <p className="text-slate-400 py-6 text-center">Nenhuma despesa individual registrada no snapshot deste mês.</p>
                      ) : (
                        currentRecord.expenses_snapshot.map((e) => (
                          <div
                            key={e.id}
                            className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{e.code || 'DESP'}</span>
                                <span className="text-[10px] text-slate-500">{formatDate(e.expense_date)}</span>
                              </div>
                              <span className="text-slate-700 block text-[11px]">{e.description}</span>
                              <span className="text-slate-400 text-[10px]">{e.category_name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-rose-600 block">{formatCurrency(e.amount)}</span>
                              <span className="text-[10px] text-slate-500">{e.payment_method}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                <FileText className="w-12 h-12 text-slate-200" />
                <p className="text-sm font-bold text-slate-600">
                  {history.length === 0 ? 'Nenhum fechamento registrado no histórico' : 'Selecione um mês na lista'}
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  {history.length === 0
                    ? 'Todos os meses e lançamentos estão ativos no sistema. Nenhum período está fechado ou arquivado.'
                    : 'Clique em qualquer fechamento mensal à esquerda para visualizar o resumo, todas as vendas e despesas arquivadas.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Single Reopen */}
      {reopeningRecord && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-800">
                <RotateCcw className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900 font-sans">
                  Retornar Fechamento
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {reopeningRecord.month_label} ({reopeningRecord.month})
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-2">
              <p className="font-bold text-amber-900">
                Esta ação reverterá o fechamento deste mês:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>{reopeningRecord.sales_count} vendas</strong> ({formatCurrency(reopeningRecord.gross_revenue)}) voltarão imediatamente para as listagens ativas e dashboard.
                </li>
                <li>
                  <strong>{reopeningRecord.expenses_count} despesas</strong> ({formatCurrency(reopeningRecord.total_expenses)}) serão reativadas no módulo financeiro.
                </li>
                <li>
                  O mês será marcado como <strong>reaberto</strong> para permitir novos lançamentos e edições.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setReopeningRecord(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleExecuteReopen(reopeningRecord)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-xl shadow-md shadow-amber-400/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Retornando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Confirmar e Retornar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reopen All */}
      {isReopeningAll && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-800">
                <RotateCcw className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900 font-sans">
                  Retornar Todos os Fechamentos
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Reabertura geral de todos os meses arquivados
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-2">
              <p className="font-bold text-amber-900">
                Deseja retornar todos os meses arquivados?
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Todas as vendas arquivadas em snapshots serão restauradas nas tabelas de vendas ativas e sincronizadas no banco.
                </li>
                <li>
                  Todas as despesas arquivadas voltarão às listagens de custos operacionais.
                </li>
                <li>
                  Todos os meses ficarão ativos para consulta e novos lançamentos no sistema.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsReopeningAll(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteReopenAll}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-black text-amber-950 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-xl shadow-md shadow-amber-400/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Confirmar e Retornar Todos
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

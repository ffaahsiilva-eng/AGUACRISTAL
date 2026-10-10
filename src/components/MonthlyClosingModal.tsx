import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingDown,
  ShoppingBag,
  ArrowRight,
  ShieldAlert,
  Loader2,
  X,
  Archive,
} from 'lucide-react';
import { storage } from '../services/storage';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';

interface MonthlyClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClosedSuccess?: () => void;
  targetMonth?: string; // e.g. "2026-10"
  targetMonthLabel?: string; // e.g. "Outubro de 2026"
  isManualTrigger?: boolean;
}

export const MonthlyClosingModal: React.FC<MonthlyClosingModalProps> = ({
  isOpen,
  onClose,
  onClosedSuccess,
  targetMonth,
  targetMonthLabel,
  isManualTrigger = false,
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'prompt' | 'confirm_close'>('prompt');

  const sales = storage.getSales();
  const expenses = storage.getExpenses();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const availableMonths = React.useMemo(() => {
    const map = new Map<string, { salesCount: number; totalGross: number; boxes: number; expensesCount: number; totalExp: number }>();

    sales.forEach((s) => {
      const m = (s.sale_date || '').slice(0, 7);
      if (m) {
        const cur = map.get(m) || { salesCount: 0, totalGross: 0, boxes: 0, expensesCount: 0, totalExp: 0 };
        cur.salesCount += 1;
        cur.totalGross += (s.total_amount || 0);
        cur.boxes += (s.quantity || 0);
        map.set(m, cur);
      }
    });

    expenses.forEach((e) => {
      const m = (e.expense_date || '').slice(0, 7);
      if (m) {
        const cur = map.get(m) || { salesCount: 0, totalGross: 0, boxes: 0, expensesCount: 0, totalExp: 0 };
        cur.expensesCount += 1;
        cur.totalExp += (e.amount || 0);
        map.set(m, cur);
      }
    });

    if (targetMonth && !map.has(targetMonth)) {
      map.set(targetMonth, { salesCount: 0, totalGross: 0, boxes: 0, expensesCount: 0, totalExp: 0 });
    }

    return Array.from(map.entries())
      .map(([m, data]) => {
        const [year, mon] = m.split('-');
        const label = `${monthNames[parseInt(mon, 10) - 1] || mon} de ${year}`;
        return {
          month: m,
          label,
          ...data,
        };
      })
      .sort((a, b) => {
        if (b.salesCount !== a.salesCount) return b.salesCount - a.salesCount;
        return a.month.localeCompare(b.month);
      });
  }, [sales, expenses, targetMonth]);

  const [activeMonth, setActiveMonth] = useState(() => {
    const targetWithSales = availableMonths.find((m) => m.month === targetMonth && m.salesCount > 0);
    if (targetWithSales) return targetWithSales.month;
    const firstWithSales = availableMonths.find((m) => m.salesCount > 0);
    if (firstWithSales) return firstWithSales.month;
    return targetMonth || '2026-09';
  });

  const [cutoffDate, setCutoffDate] = useState(() => {
    if (activeMonth && activeMonth.includes('-')) {
      const [y, m] = activeMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      return `${activeMonth}-${String(lastDay).padStart(2, '0')}`;
    }
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (isOpen) {
      const chosen = targetMonth || (availableMonths.length > 0 ? availableMonths[0].month : '2026-10');
      setActiveMonth(chosen);
      if (chosen.includes('-')) {
        const [y, m] = chosen.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        setCutoffDate(`${chosen}-${String(lastDay).padStart(2, '0')}`);
      }
    }
  }, [isOpen, targetMonth]);

  if (!isOpen) return null;

  const [activeYear, activeMon] = (activeMonth || '2026-09').split('-');
  const activeMonthLabel = `${monthNames[parseInt(activeMon, 10) - 1] || activeMon} de ${activeYear}`;

  // Movements in active month
  const isCutoffInMonth = !!(cutoffDate && cutoffDate.startsWith(activeMonth));
  const monthSales = sales.filter(
    (s) =>
      !s.is_deleted &&
      s.sale_date.startsWith(activeMonth) &&
      (isCutoffInMonth ? s.sale_date <= cutoffDate : true)
  );
  const monthExpenses = expenses.filter(
    (e) =>
      !e.is_deleted &&
      e.expense_date.startsWith(activeMonth) &&
      (isCutoffInMonth ? e.expense_date <= cutoffDate : true)
  );

  const totalGross = monthSales.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  const totalBoxes = monthSales.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalExp = monthExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const netResult = totalGross - totalExp;

  const handlePostpone = () => {
    storage.postponeMonthlyClosing();
    onClose();
  };

  const handleExecuteClosing = async () => {
    setIsSubmitting(true);
    try {
      await storage.executeMonthlyClosing(activeMonth, cutoffDate, notes);
      setIsSubmitting(false);
      if (onClosedSuccess) {
        onClosedSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Erro ao fechar mês:', err);
      setIsSubmitting(false);
      alert('Ocorreu um erro ao processar o fechamento mensal.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden transition-all my-auto">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 sm:p-5 text-slate-950 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-slate-900 transition-colors"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 sm:gap-3 mb-1.5">
            <span className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-950/15 backdrop-blur-xs text-slate-950 shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <div className="min-w-0 pr-6">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-black/15 px-2.5 py-0.5 rounded-full inline-block">
                FECHAR O MÊS
              </span>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight mt-0.5 truncate">
                FECHAR O MÊS
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-sm font-semibold opacity-95 mt-1 leading-snug">
            Chegou o período de fechamento mensal ({activeMonthLabel}). Você pode fechar o mês agora ou continuar lançando.
          </p>
        </div>

        {/* Content Body - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {step === 'prompt' ? (
            <>
              {/* Month Selector dropdown */}
              <div className="p-3.5 sm:p-4 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800">
                    Selecione o mês para fechar e esvaziar do painel:
                  </label>
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                    {monthSales.length} vendas ativas
                  </span>
                </div>
                <select
                  value={activeMonth}
                  onChange={(e) => {
                    const newM = e.target.value;
                    setActiveMonth(newM);
                    const [y, m] = newM.split('-').map(Number);
                    const lastDay = new Date(y, m, 0).getDate();
                    setCutoffDate(`${newM}-${String(lastDay).padStart(2, '0')}`);
                  }}
                  className="w-full px-3 py-2.5 text-xs font-black bg-white border border-slate-300 rounded-xl shadow-xs text-slate-900 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {availableMonths.map((m) => (
                    <option key={m.month} value={m.month}>
                      {m.label} ({m.salesCount} vendas • {formatCurrency(m.totalGross)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-600">
                  Todas as vendas, despesas e entregas deste mês serão arquivadas com segurança no histórico e esvaziadas do painel ativo.
                </p>
              </div>

              {/* Summary of what will be closed & zeroed */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950 text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Como funciona esta etapa:
                </div>
                <p className="text-amber-900 leading-relaxed text-[11px] sm:text-xs">
                  Ao escolher <strong>&quot;FECHAR O MÊS&quot;</strong>, todos os valores de vendas, entregas e despesas apurados até o dia selecionado serão <strong>zerados do painel ativo</strong> e arquivados com segurança no <strong>Histórico Mensal</strong>.
                </p>
                <p className="text-amber-900 leading-relaxed text-[11px] sm:text-xs font-semibold">
                  Caso precise rever lançamentos depois, você pode <strong>Retornar o Fechamento</strong> a qualquer momento pelo Histórico, restaurando todas as vendas e despesas de volta ao sistema ativo!
                </p>
                <p className="text-amber-900/90 text-[10px] sm:text-[11px]">
                  Caso escolha <strong>&quot;Continuar Lançando&quot;</strong>, este aviso será exibido diariamente até você confirmar o fechamento. Após fechar, a janela só voltará a aparecer no dia 2 do próximo mês!
                </p>
              </div>

              {/* Data snapshot preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">Vendas</span>
                  <span className="text-xs sm:text-sm font-black text-sky-700 block mt-0.5 truncate">{formatCurrency(totalGross)}</span>
                  <span className="text-[10px] text-slate-400 block">{monthSales.length} pedidos</span>
                </div>
                <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">Volume</span>
                  <span className="text-xs sm:text-sm font-black text-slate-800 block mt-0.5 truncate">{formatNumber(totalBoxes)} cx</span>
                  <span className="text-[10px] text-slate-400 block">Entregues</span>
                </div>
                <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">Despesas</span>
                  <span className="text-xs sm:text-sm font-black text-rose-600 block mt-0.5 truncate">{formatCurrency(totalExp)}</span>
                  <span className="text-[10px] text-slate-400 block">{monthExpenses.length} lançam.</span>
                </div>
                <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">Resultado</span>
                  <span className={`text-xs sm:text-sm font-black block mt-0.5 truncate ${netResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatCurrency(netResult)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{netResult >= 0 ? 'Lucro' : 'Prejuízo'}</span>
                </div>
              </div>

              {/* Date selection for cutoff */}
              <div className="p-3.5 sm:p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Data de corte do fechamento:
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <input
                    type="date"
                    value={cutoffDate}
                    onChange={(e) => setCutoffDate(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl shadow-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-500">
                    Todas as movimentações até este dia serão fechadas e zeradas.
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Confirmation Step */}
              <div className="p-3.5 sm:p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-black text-rose-900 text-xs sm:text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  Confirmação de Fechamento e Zeramento
                </div>
                <p className="text-rose-800 leading-relaxed text-[11px] sm:text-xs">
                  Você está prestes a fechar o mês <strong>{activeMonthLabel}</strong> até a data <strong>{formatDate(cutoffDate)}</strong>.
                </p>
                <ul className="list-disc list-inside text-rose-900 space-y-1 pl-1 text-[11px] sm:text-xs">
                  <li><strong>{monthSales.length} vendas</strong> ({formatCurrency(totalGross)}) serão zeradas do painel ativo.</li>
                  <li><strong>{monthExpenses.length} despesas</strong> ({formatCurrency(totalExp)}) serão zeradas.</li>
                  <li>Todos os registros ficarão salvos e disponíveis no <strong>Ícone de Histórico</strong> para baixar em Excel ou filtrar quando desejar.</li>
                  <li>Este aviso só retornará automaticamente no <strong>dia 2 do próximo mês</strong>.</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações do Fechamento (opcional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Fechamento regular de vendas e despesas realizado sem pendências."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        {/* Pinned Action Buttons Footer - Always visible and never cut off */}
        <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200/90">
          {step === 'prompt' ? (
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handlePostpone}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4 text-slate-500" />
                Continuar Lançando (Lembrar depois)
              </button>

              <button
                type="button"
                onClick={() => setStep('confirm_close')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 active:scale-95 shadow-md shadow-amber-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                FECHAR O MÊS
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('prompt')}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-all cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleExecuteClosing}
                disabled={isSubmitting}
                className="px-5 sm:px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 active:scale-95 shadow-md shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    FECHAR O MÊS AGORA
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

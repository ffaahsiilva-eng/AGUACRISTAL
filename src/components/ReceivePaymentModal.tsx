import React, { useState } from 'react';
import { X, DollarSign, Check, AlertCircle } from 'lucide-react';
import { Sale, PaymentMethod } from '../types';
import { storage } from '../services/storage';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';

interface ReceivePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onPaymentRecorded: () => void;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  isOpen,
  onClose,
  sale,
  onPaymentRecorded,
}) => {
  const [payDate, setPayDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState<number | string>(sale ? sale.pending_amount : '');
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [observation, setObservation] = useState('');

  // Update default amount when sale changes
  React.useEffect(() => {
    if (sale) {
      setAmount(sale.pending_amount);
      setPayDate(getTodayDateString());
      setObservation('');
    }
  }, [sale]);

  
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !sale) return null;

  const numAmount = Number(amount) || 0;
  const remainingAfterPayment = Math.max(0, Math.round((sale.pending_amount - numAmount) * 100) / 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (numAmount <= 0) {
      alert('Informe um valor de pagamento maior que zero.');
      return;
    }

    if (numAmount > sale.pending_amount + 0.01) {
      alert(`O valor não pode ser maior que o saldo restante de ${formatCurrency(sale.pending_amount)}.`);
      return;
    }

    const currentUser = storage.getCurrentUser();
    storage.addPayment({
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sale_id: sale.id,
      date: payDate,
      amount: numAmount,
      payment_method: method,
      observation: observation || 'Recebimento de conta pendente',
      registered_by: currentUser.name,
      created_at: new Date().toISOString(),
    });

    onPaymentRecorded();
    onClose();
  };

  return (
    <div
      id="receive-payment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="receive-payment-modal-box"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-50 border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Registrar Recebimento
              </h2>
              <p className="text-xs text-slate-500">
                Venda {sale.code} • {sale.client_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-emerald-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Sale details summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Data da Venda:</span>
              <span className="font-semibold text-slate-800">{formatDate(sale.sale_date)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Valor Total da Venda:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(sale.total_amount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Já Recebido:</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(sale.amount_paid)}</span>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-amber-800 font-bold">Saldo Pendente Atual:</span>
              <span className="font-black text-amber-700">{formatCurrency(sale.pending_amount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data do Recebimento *
              </label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Forma de Recebimento *
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                required
              >
                <option value="PIX">PIX</option>
                <option value="PIX Empresa">PIX Empresa</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão">Cartão</option>
                <option value="Boleto">Boleto</option>
                <option value="Transferência">Transferência</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Valor a Receber Agora (R$) *
              </label>
              <button
                type="button"
                onClick={() => setAmount(sale.pending_amount)}
                className="text-[11px] font-bold text-sky-600 hover:text-sky-800"
              >
                Preencher Total Pendente
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={sale.pending_amount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base font-black text-emerald-700 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Real-time Status Preview */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">
              Saldo Restante após este pagamento:
            </span>
            <span className="text-sm font-black text-emerald-900">
              {formatCurrency(remainingAfterPayment)}
            </span>
          </div>
          {remainingAfterPayment <= 0 ? (
            <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              A venda será automaticamente marcada como <strong>PAGO</strong>.
            </p>
          ) : (
            <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Pagamento parcial: a venda permanecerá como <strong>PARCIAL</strong> com saldo restante.
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observação
            </label>
            <textarea
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: Comprovante de transferência bancária nº 8829"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              Confirmar Recebimento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React from 'react';
import {
  X,
  Printer,
  Edit2,
  Copy,
  Truck,
  DollarSign,
  Ban,
  User,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Sale } from '../../types';
import { storage } from '../../services/storage';
import { formatCurrency, formatDate, formatDateTime, formatPhone, formatCpfCnpj } from '../../utils/formatters';

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onEdit: (sale: Sale) => void;
  onDuplicate: (sale: Sale) => void;
  onOpenReceivePayment: (sale: Sale) => void;
  onGenerateDelivery: (sale: Sale) => void;
  onCancelSale: (sale: Sale) => void;
  onPrintReceipt: (sale: Sale) => void;
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  isOpen,
  onClose,
  sale,
  onEdit,
  onDuplicate,
  onOpenReceivePayment,
  onGenerateDelivery,
  onCancelSale,
  onPrintReceipt,
}) => {
  if (!isOpen || !sale) return null;

  const currentUser = storage.getCurrentUser();
  const canEdit = currentUser.role !== 'VISUALIZACAO';

  // Fetch linked payments
  const allPayments = storage.getPayments();
  const linkedPayments = allPayments.filter((p) => p.sale_id === sale.id);

  // Fetch linked deliveries
  const allDeliveries = storage.getDeliveries();
  const linkedDelivery = allDeliveries.find((d) => d.sale_id === sale.id);

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Pago
          </span>
        );
      case 'Pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pendente
          </span>
        );
      case 'Parcial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <DollarSign className="w-3.5 h-3.5 text-sky-600" />
            Parcial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Vencido
          </span>
        );
    }
  };

  const getDeliveryStatusBadge = (status?: string) => {
    const s = status || linkedDelivery?.status || 'Aguardando';
    switch (s) {
      case 'Entregue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Entregue
          </span>
        );
      case 'Saiu para entrega':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            Em Rota
          </span>
        );
      case 'Cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <Ban className="w-3.5 h-3.5 text-rose-600" />
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Aguardando
          </span>
        );
    }
  };

  const getSaleStatusBadge = (status?: string) => {
    const s = status || 'Confirmada';
    switch (s) {
      case 'Concluída':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Concluída
          </span>
        );
      case 'Em entrega':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            Em entrega
          </span>
        );
      case 'Cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <Ban className="w-3.5 h-3.5 text-rose-600" />
            Cancelada
          </span>
        );
      case 'Aberta':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Aberta
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
            Confirmada
          </span>
        );
    }
  };

  return (
    <div
      id="sale-details-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="sale-details-modal-box"
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-900 via-sky-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-700/50 rounded-xl border border-sky-500/30">
              <FileText className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Venda Nº {sale.code}</h2>
                {getSaleStatusBadge(sale.sale_status)}
              </div>
              <p className="text-xs text-sky-200 flex items-center gap-2 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                Registrada em {formatDate(sale.sale_date)} • Atualizada em {formatDateTime(sale.updated_at)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar Detalhes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Quick Badges & Financial Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Situação Pagamento</span>
              <div className="mt-1">{getPaymentStatusBadge(sale.payment_status)}</div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Forma: <strong>{sale.payment_method}</strong>
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Status da Entrega</span>
              <div className="mt-1">{getDeliveryStatusBadge(sale.delivery_status)}</div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {linkedDelivery ? `Cód: ${linkedDelivery.code}` : 'Integrada'}
              </span>
            </div>

            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
              <span className="text-[10px] font-bold text-sky-700 uppercase block">Valor Total</span>
              <p className="text-base font-black text-sky-900 mt-0.5">{formatCurrency(sale.total_amount)}</p>
              <span className="text-[11px] text-sky-600 block">{sale.quantity} unidades</span>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                sale.pending_amount > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase block">
                {sale.pending_amount > 0 ? 'Saldo a Receber' : 'Totalmente Quitado'}
              </span>
              <p className="text-base font-black mt-0.5">
                {sale.pending_amount > 0 ? formatCurrency(sale.pending_amount) : 'R$ 0,00'}
              </p>
              <span className="text-[11px] opacity-80 block">
                Pago: {formatCurrency(sale.amount_paid)}
              </span>
            </div>
          </div>

          {/* Section: Cliente & Endereço */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100 text-slate-800 font-bold">
              <User className="w-4 h-4 text-sky-600" />
              <span>Dados do Cliente & Local de Entrega</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cliente</span>
                <span className="text-sm font-bold text-slate-900 block">{sale.client_name}</span>
                {sale.client_document && (
                  <span className="text-slate-600 block mt-0.5">
                    CPF/CNPJ: {formatCpfCnpj(sale.client_document)}
                  </span>
                )}
                {sale.phone && (
                  <span className="text-slate-600 flex items-center gap-1 mt-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    {formatPhone(sale.phone)}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Endereço de Entrega</span>
                <div className="flex items-start gap-1.5 mt-0.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-slate-800">
                    <p className="font-semibold">
                      {sale.address}
                      {sale.number ? `, Nº ${sale.number}` : ''}
                      {sale.complement ? ` (${sale.complement})` : ''}
                    </p>
                    <p className="text-slate-500">
                      {sale.neighborhood ? `${sale.neighborhood} • ` : ''}
                      {sale.city} - {sale.state || 'SC'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Itens, Logística & Faturamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Logística */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100 text-slate-800 font-bold">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Logística & Transporte</span>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Motorista Responsável</span>
                  <span className="text-xs font-bold text-slate-800 block">
                    {sale.driver_name || 'A definir'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Veículo de Entrega</span>
                  <span className="text-xs text-slate-700 block">
                    {sale.vehicle_name || 'Veículo Padrão da Rota'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Previsão de Comissão</span>
                  <span className="text-xs font-semibold text-indigo-700 block">
                    {formatCurrency(sale.commission_amount)} ({sale.commission_rate}% sobre a venda)
                  </span>
                </div>
              </div>
            </div>

            {/* Faturamento */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100 text-slate-800 font-bold">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Detalhamento Comercial</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-50">
                  <span className="text-slate-500">Galões de Água 20L:</span>
                  <span className="font-bold text-slate-900">{sale.quantity} unidades</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-50">
                  <span className="text-slate-500">Valor Unitário:</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(sale.unit_price)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-50">
                  <span className="text-slate-500">Data de Vencimento:</span>
                  <span className="font-semibold text-slate-900">
                    {sale.due_date ? formatDate(sale.due_date) : 'À vista'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 font-bold">
                  <span className="text-slate-900">Total Geral:</span>
                  <span className="text-sm font-black text-sky-900">{formatCurrency(sale.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Histórico de Pagamentos Vinculados */}
          {linkedPayments.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block mb-2">
                Histórico de Pagamentos Vinculados ({linkedPayments.length})
              </span>
              <div className="divide-y divide-slate-200 text-[11px]">
                {linkedPayments.map((p) => (
                  <div key={p.id} className="py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">{formatDate(p.date)}</span>
                      <span className="text-slate-500 ml-2">({p.payment_method})</span>
                      {p.observation && <span className="text-slate-400 ml-2 italic">- {p.observation}</span>}
                    </div>
                    <span className="font-bold text-emerald-700">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Observação */}
          {sale.observation && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
              <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">
                Observações do Pedido
              </span>
              <p className="text-xs text-amber-950 whitespace-pre-wrap">{sale.observation}</p>
            </div>
          )}
        </div>

        {/* Modal Footer / Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintReceipt(sale)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              Imprimir Recibo
            </button>

            {canEdit && (
              <button
                onClick={() => onDuplicate(sale)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Criar nova venda com os mesmos dados"
              >
                <Copy className="w-4 h-4 text-slate-600" />
                Duplicar
              </button>
            )}

            {canEdit && sale.sale_status !== 'Cancelada' && (
              <button
                onClick={() => onCancelSale(sale)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-all cursor-pointer"
              >
                <Ban className="w-4 h-4 text-rose-600" />
                Cancelar Venda
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && sale.pending_amount > 0 && sale.sale_status !== 'Cancelada' && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReceivePayment(sale);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all cursor-pointer shadow-sm shadow-emerald-600/20"
              >
                <DollarSign className="w-4 h-4" />
                Registrar Pagamento
              </button>
            )}

            {canEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(sale);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-all cursor-pointer shadow-sm shadow-sky-600/20"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

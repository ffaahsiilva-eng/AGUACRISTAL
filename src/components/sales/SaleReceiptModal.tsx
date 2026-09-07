import React from 'react';
import { X, Printer, Droplets, CheckCircle, Clock } from 'lucide-react';
import { Sale } from '../../types';
import { storage } from '../../services/storage';
import { formatCurrency, formatDate, formatDateTime, formatPhone, formatCpfCnpj } from '../../utils/formatters';

interface SaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  if (!isOpen || !sale) return null;

  const settings = storage.getSettings();
  const currentUser = storage.getCurrentUser();
  const emissionDate = formatDateTime(new Date().toISOString());

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="sale-receipt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
    >
      <div
        id="sale-receipt-container"
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[95vh]"
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-sky-400" />
            <span className="text-sm font-bold">Comprovante de Venda & Entrega</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div className="p-8 overflow-y-auto bg-white font-sans text-slate-900 printable-area">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Droplets className="w-6 h-6 text-sky-600 fill-sky-500" />
              <h1 className="text-xl font-black tracking-wider uppercase text-slate-900">
                {settings.company_name || 'Água Cristal Sul'}
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              CNPJ: {settings.cnpj || '12.345.678/0001-90'} • IE: 258.963.147
            </p>
            <p className="text-xs text-slate-600">
              {settings.address || 'Av. Brasil, 1500 - Centro, Balneário Camboriú - SC'}
            </p>
            <p className="text-xs text-slate-600">
              Telefone / Pedidos: {settings.phone || '(47) 3367-0000'}
            </p>
          </div>

          {/* Title & Identification */}
          <div className="py-3 border-b border-dashed border-slate-300 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Documento</span>
              <span className="font-extrabold text-slate-900 text-sm">COMPROVANTE Nº {sale.code}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Data da Venda</span>
              <span className="font-bold text-slate-800">{formatDate(sale.sale_date)}</span>
            </div>
          </div>

          {/* Client Details */}
          <div className="py-3 border-b border-dashed border-slate-300 text-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Dados do Destinatário / Cliente
            </span>
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-bold text-slate-900">{sale.client_name}</span>
            </div>
            {sale.client_document && (
              <div className="flex justify-between">
                <span className="text-slate-500">CPF/CNPJ:</span>
                <span className="font-mono text-slate-800">{formatCpfCnpj(sale.client_document)}</span>
              </div>
            )}
            {sale.phone && (
              <div className="flex justify-between">
                <span className="text-slate-500">Telefone:</span>
                <span className="text-slate-800">{formatPhone(sale.phone)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Endereço:</span>
              <span className="text-slate-900 font-medium text-right max-w-xs">
                {sale.address}
                {sale.number ? `, Nº ${sale.number}` : ''}
                {sale.complement ? ` - ${sale.complement}` : ''}
                {sale.neighborhood ? ` - ${sale.neighborhood}` : ''}, {sale.city} - {sale.state || 'SC'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-4 border-b border-slate-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-1 text-left">Item / Descrição</th>
                  <th className="py-1 text-center">Qtd</th>
                  <th className="py-1 text-right">Unitário</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 text-left">
                    <span className="font-bold text-slate-900 block">Água Mineral Galão 20 Litros</span>
                    <span className="text-[10px] text-slate-500 block">Retornável • Cristal Sul</span>
                  </td>
                  <td className="py-2 text-center font-bold text-slate-800">{sale.quantity} un</td>
                  <td className="py-2 text-right text-slate-700">{formatCurrency(sale.unit_price)}</td>
                  <td className="py-2 text-right font-black text-slate-900">{formatCurrency(sale.total_amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals & Payment Summary */}
          <div className="py-3 border-b-2 border-slate-900 text-xs space-y-1.5">
            <div className="flex justify-between font-bold text-sm">
              <span>VALOR TOTAL DA VENDA:</span>
              <span className="text-slate-950 font-black">{formatCurrency(sale.total_amount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Forma de Pagamento:</span>
              <span className="font-semibold text-slate-900">{sale.payment_method}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Situação do Pagamento:</span>
              <span
                className={`font-bold ${
                  sale.payment_status === 'Pago' ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {sale.payment_status}
                {sale.payment_status === 'Pago' ? ' (Quitado)' : ` (Venc: ${sale.due_date ? formatDate(sale.due_date) : 'A combinar'})`}
              </span>
            </div>
            {sale.pending_amount > 0 && (
              <div className="flex justify-between text-rose-700 font-bold">
                <span>Saldo Devedor / A Cobrar:</span>
                <span>{formatCurrency(sale.pending_amount)}</span>
              </div>
            )}
          </div>

          {/* Logistics & Driver */}
          <div className="py-3 border-b border-dashed border-slate-300 text-[11px] text-slate-600 flex justify-between">
            <div>
              <span>Motorista Entregador: <strong>{sale.driver_name || 'Equipe Padrão'}</strong></span>
              {sale.vehicle_name && <span className="block text-slate-500 mt-0.5">Veículo: {sale.vehicle_name}</span>}
            </div>
            <div className="text-right">
              <span>Status Venda: <strong>{sale.sale_status || 'Confirmada'}</strong></span>
            </div>
          </div>

          {/* Observation */}
          {sale.observation && (
            <div className="py-2 border-b border-dashed border-slate-300 text-[11px] text-slate-600">
              <span className="font-bold">Observações:</span> {sale.observation}
            </div>
          )}

          {/* Canhoto de Recebimento do Cliente */}
          <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-400">
            <p className="text-[10px] text-slate-500 text-center uppercase tracking-wide">
              DECLARO TER RECEBIDO OS PRODUTOS ACIMA DESCRITOS EM PERFEITAS CONDIÇÕES.
            </p>
            <div className="mt-12 pt-2 border-t border-slate-800 text-center text-xs">
              <p className="font-bold text-slate-900">{sale.client_name}</p>
              <p className="text-[10px] text-slate-500">Assinatura do Recebedor • Data: ____/____/________</p>
            </div>
          </div>

          {/* Emission metadata */}
          <div className="mt-6 text-[10px] text-slate-400 text-center">
            Emitido em: {emissionDate} por {currentUser.name} • Sistema de Gestão Água Cristal Sul
          </div>
        </div>
      </div>
    </div>
  );
};

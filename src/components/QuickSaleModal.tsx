import React, { useState, useEffect, useRef } from 'react';
import { X, Zap, Plus, Check, Calculator, Sparkles } from 'lucide-react';
import { Sale, PaymentMethod } from '../types';
import { storage } from '../services/storage';
import { formatCurrency, getTodayDateString } from '../utils/formatters';

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleAdded?: (sale: Sale) => void;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  isOpen,
  onClose,
  onSaleAdded,
}) => {
  const clients = storage.getClients();
  const drivers = storage.getDrivers();
  const settings = storage.getSettings();

  const [date, setDate] = useState(getTodayDateString());
  const [clientInput, setClientInput] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [city, setCity] = useState('Balneário Camboriú');
  const [driverId, setDriverId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [quantity, setQuantity] = useState<number | string>(50);
  const [unitPrice, setUnitPrice] = useState<number | string>(settings.default_unit_price || 27.5);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [countSaved, setCountSaved] = useState(0);
  const [recentSavedName, setRecentSavedName] = useState('');

  const clientInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      resetFields();
      setCountSaved(0);
      setRecentSavedName('');
      setTimeout(() => clientInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const resetFields = () => {
    setClientInput('');
    setSelectedClientId('');
    setQuantity(50);
    setUnitPrice(settings.default_unit_price || 27.5);
    setPaymentMethod('PIX');
    if (drivers.length > 0 && !driverId) {
      setDriverId(drivers[0].id);
      setDriverName(drivers[0].name);
    }
    setTimeout(() => clientInputRef.current?.focus(), 50);
  };

  const handleDriverChange = (id: string) => {
    setDriverId(id);
    const d = drivers.find((drv) => drv.id === id);
    setDriverName(d ? d.name : '');
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const cl = clients.find((c) => c.id === clientId);
    if (cl) {
      setClientInput(cl.name);
      if (cl.city) setCity(cl.city);
      if (cl.motorista_preferencial_id) {
        setDriverId(cl.motorista_preferencial_id);
        const d = drivers.find((drv) => drv.id === cl.motorista_preferencial_id);
        setDriverName(d ? d.name : (cl.motorista_preferencial_nome || ''));
      }
      if (cl.valor_unitario_padrao && cl.valor_unitario_padrao > 0) {
        setUnitPrice(cl.valor_unitario_padrao);
      }
      if (cl.forma_pagamento_preferencial) {
        setPaymentMethod(cl.forma_pagamento_preferencial);
      }
    }
  };

  const numQuantity = Math.max(0, Number(quantity) || 0);
  const numUnitPrice = Math.max(0, Number(unitPrice) || 0);
  const totalAmount = Math.round(numQuantity * numUnitPrice * 100) / 100;

  const saveCurrent = async () => {
    if (!clientInput.trim()) {
      alert('Por favor, informe o nome do cliente.');
      clientInputRef.current?.focus();
      return null;
    }
    if (numQuantity <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return null;
    }

    const matchedClient = selectedClientId ? clients.find((c) => c.id === selectedClientId) : undefined;

    const saved = await storage.saveSale(
      {
        sale_date: date,
        client_id: selectedClientId || undefined,
        client_name: clientInput.trim(),
        client_document: matchedClient?.cpf_cnpj || '',
        phone: matchedClient?.phone || matchedClient?.whatsapp || '',
        address: matchedClient?.address || 'Endereço Balcão/Entrega',
        number: matchedClient?.number || '',
        neighborhood: matchedClient?.neighborhood || '',
        city: city.trim() || matchedClient?.city || 'Imperatriz-MA',
        state: matchedClient?.state || 'MA',
        driver_id: driverId || undefined,
        driver_name: driverName || (drivers[0] ? drivers[0].name : 'A definir'),
        quantity: numQuantity,
        unit_price: numUnitPrice,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: 'Pago',
        sale_status: 'Confirmada',
        amount_paid: totalAmount,
        pending_amount: 0,
        observation: 'Lançamento Rápido Diário',
      },
      true
    );

    setCountSaved((prev) => prev + 1);
    setRecentSavedName(saved.client_name);
    if (onSaleAdded) onSaleAdded(saved);
    return saved;
  };

  const handleSaveAndNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = await saveCurrent();
    if (s) {
      resetFields();
    }
  };

  const handleSaveAndClose = async () => {
    const s = await saveCurrent();
    if (s) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="quick-sale-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="quick-sale-modal-box"
        className="w-[calc(100%-24px)] md:w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-950/20 text-slate-950">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-wide font-sans">
                LANÇAMENTO RÁPIDO DE VENDAS
              </h2>
              <p className="text-xs font-semibold text-slate-900/80">
                Alimente várias vendas diárias sucessivas com &quot;Salvar e Novo&quot;
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-950/70 hover:text-slate-950 hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success notification banner when multiple sales added in a row */}
        {countSaved > 0 && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-semibold animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              {countSaved} {countSaved === 1 ? 'venda cadastrada' : 'vendas cadastradas'} nesta sessão! Última: &quot;{recentSavedName}&quot;
            </span>
            <span className="text-[11px] bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-900 font-bold">
              Pronto para o próximo
            </span>
          </div>
        )}

        {/* Quick Form */}
        <form onSubmit={handleSaveAndNew} className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Data *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cidade *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Balneário Camboriú"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Cliente *
              </label>
              <select
                onChange={(e) => handleClientSelect(e.target.value)}
                className="text-[11px] text-sky-700 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5"
                value={selectedClientId}
              >
                <option value="">Buscar em cadastrados...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              ref={clientInputRef}
              type="text"
              value={clientInput}
              onChange={(e) => setClientInput(e.target.value)}
              placeholder="Digite o nome ou selecione ao lado"
              className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motorista
              </label>
              <select
                value={driverId}
                onChange={(e) => handleDriverChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white font-medium"
              >
                <option value="">A definir</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quantidade *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Valor Unitário (R$) *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.10"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Forma de Pagamento *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(['PIX', 'PIX Empresa', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência'] as PaymentMethod[]).map(
                (method) => (
                  <button
                    type="button"
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                      paymentMethod === method
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {method}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Live Automatic Total */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-600" />
              <span className="text-xs text-amber-900 font-medium">
                {numQuantity} un × {formatCurrency(numUnitPrice)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
                Total Calculado
              </span>
              <span className="text-lg font-black text-amber-950">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          </div>
          {/* Action Buttons: SALVAR E NOVO & Finalizar */}
          <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              type="submit"
              id="btn-save-and-new"
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              SALVAR E NOVO
            </button>

            <button
              type="button"
              id="btn-save-and-close"
              onClick={handleSaveAndClose}
              className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Salvar e Fechar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

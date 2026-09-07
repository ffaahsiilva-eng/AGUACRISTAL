import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Calculator, Check, Truck, AlertCircle } from 'lucide-react';
import { Sale, Client, Driver, Vehicle, PaymentMethod, PaymentStatus, SaleStatus } from '../types';
import { storage } from '../services/storage';
import { formatCurrency, getTodayDateString, formatCpfCnpj, formatPhone } from '../utils/formatters';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleToEdit?: Sale | null;
  onSaved: (sale: Sale) => void;
}

export const SaleModal: React.FC<SaleModalProps> = ({
  isOpen,
  onClose,
  saleToEdit,
  onSaved,
}) => {
  const clients = storage.getClients();
  const drivers = storage.getDrivers();
  const vehicles = storage.getVehicles();
  const settings = storage.getSettings();

  const [saleDate, setSaleDate] = useState(getTodayDateString());
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientDocument, setClientDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Balneário Camboriú');
  const [state, setState] = useState('SC');

  const [driverId, setDriverId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [saleStatus, setSaleStatus] = useState<SaleStatus>('Confirmada');

  const [quantity, setQuantity] = useState<number | string>(50);
  const [unitPrice, setUnitPrice] = useState<number | string>(settings.default_unit_price || 27.5);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pago');
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [amountPaid, setAmountPaid] = useState<number | string>('');
  const [commissionRate, setCommissionRate] = useState<number | string>(settings.default_commission_rate || 2.5);
  const [observation, setObservation] = useState('');
  const [createDelivery, setCreateDelivery] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset or populate form
  useEffect(() => {
    if (saleToEdit) {
      setSaleDate(saleToEdit.sale_date);
      setSelectedClientId(saleToEdit.client_id || '');
      setClientName(saleToEdit.client_name);
      setClientDocument(saleToEdit.client_document || '');
      setPhone(saleToEdit.phone || '');
      setAddress(saleToEdit.address || '');
      setNumber(saleToEdit.number || '');
      setComplement(saleToEdit.complement || '');
      setNeighborhood(saleToEdit.neighborhood || '');
      setCity(saleToEdit.city || 'Balneário Camboriú');
      setState(saleToEdit.state || 'SC');
      setDriverId(saleToEdit.driver_id || '');
      setDriverName(saleToEdit.driver_name || '');
      setVehicleId(saleToEdit.vehicle_id || '');
      setVehicleName(saleToEdit.vehicle_name || '');
      setSaleStatus(saleToEdit.sale_status || 'Confirmada');
      setQuantity(saleToEdit.quantity);
      setUnitPrice(saleToEdit.unit_price);
      setPaymentMethod(saleToEdit.payment_method);
      setPaymentStatus(saleToEdit.payment_status);
      setDueDate(saleToEdit.due_date || saleToEdit.sale_date);
      setAmountPaid(saleToEdit.amount_paid);
      setCommissionRate(saleToEdit.commission_rate);
      setObservation(saleToEdit.observation || '');
      setCreateDelivery(false); // already has delivery or editing
    } else {
      setSaleDate(getTodayDateString());
      setSelectedClientId('');
      setClientName('');
      setClientDocument('');
      setPhone('');
      setAddress('');
      setNumber('');
      setComplement('');
      setNeighborhood('');
      setCity('Imperatriz-MA');
      setState('MA');
      const firstDriver = drivers[0];
      setDriverId(firstDriver ? firstDriver.id : '');
      setDriverName(firstDriver ? firstDriver.name : '');
      const firstVehicle = vehicles[0];
      setVehicleId(firstVehicle ? firstVehicle.id : '');
      setVehicleName(firstVehicle ? `${firstVehicle.model} (${firstVehicle.plate})` : '');
      setSaleStatus('Confirmada');
      setQuantity(50);
      setUnitPrice(settings.default_unit_price || 27.5);
      setPaymentMethod('PIX');
      setPaymentStatus('Pago');
      setDueDate(getTodayDateString());
      setAmountPaid('');
      setCommissionRate(settings.default_commission_rate || 2.5);
      setObservation('');
      setCreateDelivery(true);
    }
    setErrors({});
  }, [saleToEdit, isOpen]);

  // Handle client selection
  const handleClientSelect = (cId: string) => {
    setSelectedClientId(cId);
    if (!cId) return;
    const client = clients.find((c) => c.id === cId);
    if (client) {
      setClientName(client.name);
      setClientDocument(client.cpf_cnpj);
      setPhone(client.phone || client.whatsapp || '');
      setAddress(client.address || '');
      setNumber(client.number || '');
      setComplement(client.complement || '');
      setNeighborhood(client.neighborhood || '');
      setCity(client.city || 'Imperatriz-MA');
      setState(client.state || 'MA');

      // Auto-fill commercial and driver preferences if configured
      if (client.valor_unitario_padrao !== undefined && client.valor_unitario_padrao > 0) {
        setUnitPrice(client.valor_unitario_padrao);
      }
      if (client.forma_pagamento_preferencial) {
        setPaymentMethod(client.forma_pagamento_preferencial);
      }
      if (client.motorista_preferencial_id) {
        setDriverId(client.motorista_preferencial_id);
        const matchedDriver = drivers.find((d) => d.id === client.motorista_preferencial_id);
        setDriverName(matchedDriver ? matchedDriver.name : (client.motorista_preferencial_nome || ''));
      }
    }
  };

  const handleDriverSelect = (dId: string) => {
    setDriverId(dId);
    const driver = drivers.find((d) => d.id === dId);
    setDriverName(driver ? driver.name : '');
  };

  const handleVehicleSelect = (vId: string) => {
    setVehicleId(vId);
    const v = vehicles.find((veh) => veh.id === vId);
    setVehicleName(v ? `${v.model} (${v.plate})` : '');
  };

  // Automatic calculations
  const numQuantity = Math.max(0, Number(quantity) || 0);
  const numUnitPrice = Math.max(0, Number(unitPrice) || 0);
  const totalAmount = Math.round(numQuantity * numUnitPrice * 100) / 100;
  const numCommissionRate = Number(commissionRate) || 0;
  const commissionAmount = Math.round(totalAmount * (numCommissionRate / 100) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!clientName.trim()) {
      newErrors.clientName = 'Nome do cliente é obrigatório.';
    }
    if (numQuantity <= 0) {
      newErrors.quantity = 'Quantidade deve ser maior que zero.';
    }
    if (numUnitPrice <= 0) {
      newErrors.unitPrice = 'Valor unitário deve ser maior que zero.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const saved = await storage.saveSale(
      {
        id: saleToEdit?.id,
        code: saleToEdit?.code,
        sale_date: saleDate,
        client_id: selectedClientId || undefined,
        client_name: clientName.trim(),
        client_document: clientDocument.trim(),
        phone: phone.trim(),
        address: address.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
        driver_id: driverId || undefined,
        driver_name: driverName || 'A definir',
        vehicle_id: vehicleId || undefined,
        vehicle_name: vehicleName || undefined,
        quantity: numQuantity,
        unit_price: numUnitPrice,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        sale_status: saleStatus,
        due_date: dueDate || saleDate,
        amount_paid:
          paymentStatus === 'Pago'
            ? totalAmount
            : paymentStatus === 'Pendente'
            ? 0
            : Number(amountPaid) || 0,
        pending_amount:
          paymentStatus === 'Pago'
            ? 0
            : paymentStatus === 'Pendente'
            ? totalAmount
            : Math.max(0, totalAmount - (Number(amountPaid) || 0)),
        commission_rate: numCommissionRate,
        commission_amount: commissionAmount,
        observation: observation.trim(),
      },
      createDelivery
    );

    onSaved(saved);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="sale-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="sale-modal-box"
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-sky-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {saleToEdit ? `Editar Venda ${saleToEdit.code}` : 'Nova Venda'}
              </h2>
              <p className="text-xs text-slate-500">
                Preencha os dados da venda. Os cálculos e comissões são automáticos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Data & Cliente */}
          <div>
            <h3 className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-3">
              1. Identificação da Venda & Cliente
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data da Venda *
                </label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cliente Cadastrado (Opcional - preenche automático)
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                >
                  <option value="">-- Selecione ou digite abaixo --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.city ? `(${c.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome / Razão Social *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Supermercado Cristal Mar"
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden ${
                    errors.clientName ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                  }`}
                  required
                />
                {errors.clientName && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.clientName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CPF / CNPJ
                </label>
                <input
                  type="text"
                  value={clientDocument}
                  onChange={(e) => setClientDocument(formatCpfCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(47) 99999-9999"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cidade *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Balneário Camboriú"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Centro"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av. Brasil"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="1420"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Loja 01"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Quantidade, Valores & Motorista */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-3">
              2. Itens, Valores & Motorista
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motorista
                </label>
                <select
                  value={driverId}
                  onChange={(e) => handleDriverSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                >
                  <option value="">A definir</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Veículo
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => handleVehicleSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                >
                  <option value="">Nenhum / Padrão</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model} ({v.plate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantidade *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden ${
                    errors.quantity ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Unitário (R$) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.05"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Comissão (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Live Calculation Banner */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-sky-600 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 font-medium block">
                    Cálculo Automático: {numQuantity} un × {formatCurrency(numUnitPrice)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Comissão prevista ({numCommissionRate}%): {formatCurrency(commissionAmount)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wide">
                  VALOR TOTAL DA VENDA
                </span>
                <span className="text-xl font-black text-sky-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Pagamento & Entrega */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-3">
              3. Forma & Situação de Pagamento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Forma de Pagamento *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="PIX Empresa">PIX Empresa</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Situação do Pagamento *
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                >
                  <option value="Pago">Pago (Verde)</option>
                  <option value="Pendente">Pendente (Amarelo)</option>
                  <option value="Parcial">Parcial</option>
                  <option value="Vencido">Vencido (Vermelho)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status da Venda *
                </label>
                <select
                  value={saleStatus}
                  onChange={(e) => setSaleStatus(e.target.value as SaleStatus)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                >
                  <option value="Aberta">Aberta</option>
                  <option value="Confirmada">Confirmada</option>
                  <option value="Em entrega">Em entrega</option>
                  <option value="Concluída">Concluída</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vencimento
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            {paymentStatus === 'Parcial' && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Valor Pago Inicialmente (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={`Ex: ${(totalAmount / 2).toFixed(2)}`}
                  className="w-full sm:w-64 px-3 py-2 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                />
                <span className="text-[11px] text-amber-700 block mt-1">
                  Saldo restante a receber: {formatCurrency(Math.max(0, totalAmount - (Number(amountPaid) || 0)))}
                </span>
              </div>
            )}

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observação
              </label>
              <textarea
                rows={2}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Entregar pela manhã, deixar canhoto assinado..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            {!saleToEdit && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="createDeliveryCheck"
                  checked={createDelivery}
                  onChange={(e) => setCreateDelivery(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                />
                <label htmlFor="createDeliveryCheck" className="text-xs text-slate-700 font-medium cursor-pointer flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-slate-500" />
                  Gerar entrega automaticamente para a rota de entregas
                </label>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-95 rounded-xl shadow-md shadow-sky-600/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{saleToEdit ? 'Salvar Alterações' : 'Concluir Venda'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

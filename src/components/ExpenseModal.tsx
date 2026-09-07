import React, { useState, useEffect } from 'react';
import { X, TrendingDown, Fuel, Check, Calculator, Upload } from 'lucide-react';
import { Expense, PaymentMethod } from '../types';
import { storage } from '../services/storage';
import { formatCurrency, getTodayDateString } from '../utils/formatters';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: Expense | null;
  onSaved: (expense: Expense) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
  onSaved,
}) => {
  const categories = storage.getCategories();
  const drivers = storage.getDrivers();
  const vehicles = storage.getVehicles();
  const sales = storage.getSales();

  const [isFuel, setIsFuel] = useState(false);
  const [expenseDate, setExpenseDate] = useState(getTodayDateString());
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('cat-1');
  const [categoryName, setCategoryName] = useState('Combustível');
  const [amount, setAmount] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cartão');
  const [driverId, setDriverId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [saleId, setSaleId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [receiptAttachment, setReceiptAttachment] = useState<string | undefined>(undefined);
  const [observation, setObservation] = useState('');

  // Fuel specific fields
  const [fuelLiters, setFuelLiters] = useState<number | string>('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<number | string>('5.99');
  const [fuelOdometer, setFuelOdometer] = useState<number | string>('');
  const [gasStation, setGasStation] = useState('');

  useEffect(() => {
    if (expenseToEdit) {
      setIsFuel(expenseToEdit.is_fuel || expenseToEdit.category_name.toLowerCase().includes('combust'));
      setExpenseDate(expenseToEdit.expense_date);
      setDescription(expenseToEdit.description);
      setCategoryId(expenseToEdit.category_id);
      setCategoryName(expenseToEdit.category_name);
      setAmount(expenseToEdit.amount);
      setPaymentMethod(expenseToEdit.payment_method);
      setDriverId(expenseToEdit.driver_id || '');
      setDriverName(expenseToEdit.driver_name || '');
      setVehicleId(expenseToEdit.vehicle_id || '');
      setVehicleName(expenseToEdit.vehicle_name || '');
      setSaleId(expenseToEdit.sale_id || '');
      setSupplier(expenseToEdit.supplier || '');
      setDocNumber(expenseToEdit.doc_number || '');
      setReceiptAttachment(expenseToEdit.receipt_attachment);
      setObservation(expenseToEdit.observation || '');
      setFuelLiters(expenseToEdit.fuel_liters || '');
      setFuelPricePerLiter(expenseToEdit.fuel_price_per_liter || '5.99');
      setFuelOdometer(expenseToEdit.fuel_odometer || '');
      setGasStation(expenseToEdit.gas_station || expenseToEdit.supplier || '');
    } else {
      setIsFuel(false);
      setExpenseDate(getTodayDateString());
      setDescription('');
      const defaultCat = categories[0] || { id: 'cat-18', name: 'Outros' };
      setCategoryId(defaultCat.id);
      setCategoryName(defaultCat.name);
      setAmount('');
      setPaymentMethod('Cartão');
      setDriverId('');
      setDriverName('');
      setVehicleId('');
      setVehicleName('');
      setSaleId('');
      setSupplier('');
      setDocNumber('');
      setReceiptAttachment(undefined);
      setObservation('');
      setFuelLiters('');
      setFuelPricePerLiter('5.99');
      setFuelOdometer('');
      setGasStation('');
    }
  }, [expenseToEdit, isOpen]);

  // Handle Fuel toggle or Category change
  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      setCategoryName(cat.name);
      if (cat.name.toLowerCase().includes('combust')) {
        setIsFuel(true);
      }
    }
  };

  const handleDriverChange = (dId: string) => {
    setDriverId(dId);
    const d = drivers.find((drv) => drv.id === dId);
    setDriverName(d ? d.name : '');
  };

  const handleVehicleChange = (vId: string) => {
    setVehicleId(vId);
    const v = vehicles.find((veh) => veh.id === vId);
    setVehicleName(v ? `${v.model} (${v.plate})` : '');
  };

  // Live calculation for fuel: Litros × Preço/Litro
  const numLiters = Number(fuelLiters) || 0;
  const numPriceLiter = Number(fuelPricePerLiter) || 0;
  const computedFuelTotal = Math.round(numLiters * numPriceLiter * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalAmount = Number(amount) || 0;
    if (isFuel) {
      finalAmount = computedFuelTotal;
    }

    if (finalAmount <= 0) {
      alert('O valor da despesa deve ser maior que zero.');
      return;
    }

    const saved = storage.saveExpense({
      id: expenseToEdit?.id,
      code: expenseToEdit?.code,
      expense_date: expenseDate,
      description: isFuel
        ? description || `Abastecimento Combustível ${numLiters}L`
        : description || 'Despesa Operacional',
      category_id: categoryId,
      category_name: categoryName,
      amount: finalAmount,
      payment_method: paymentMethod,
      driver_id: driverId || undefined,
      driver_name: driverName || undefined,
      vehicle_id: vehicleId || undefined,
      vehicle_name: vehicleName || undefined,
      sale_id: saleId || undefined,
      supplier: isFuel ? gasStation || supplier : supplier,
      doc_number: docNumber,
      receipt_attachment: receiptAttachment,
      is_fuel: isFuel,
      fuel_liters: isFuel ? numLiters : undefined,
      fuel_price_per_liter: isFuel ? numPriceLiter : undefined,
      fuel_odometer: isFuel ? Number(fuelOdometer) || undefined : undefined,
      gas_station: isFuel ? gasStation || supplier : undefined,
      observation,
    });

    onSaved(saved);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="expense-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="expense-modal-box"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-rose-50 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/20">
              {isFuel ? <Fuel className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {expenseToEdit ? `Editar Despesa ${expenseToEdit.code}` : 'Nova Despesa / Gasto'}
              </h2>
              <p className="text-xs text-slate-500">
                Controle de custos operacionais, manutenção, salários e abastecimentos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-rose-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Quick Fuel Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <Fuel className={`w-5 h-5 ${isFuel ? 'text-amber-600' : 'text-slate-400'}`} />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Controle Especial de Combustível / Abastecimento
                </span>
                <span className="text-[11px] text-slate-500">
                  Calcula automaticamente: Litros × Preço por Litro e registra odômetro/veículo
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isFuel}
                onChange={(e) => {
                  setIsFuel(e.target.checked);
                  if (e.target.checked) {
                    const fuelCat = categories.find((c) => c.name.toLowerCase().includes('combust'));
                    if (fuelCat) {
                      setCategoryId(fuelCat.id);
                      setCategoryName(fuelCat.name);
                    }
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data *
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoria da Despesa *
              </label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição do Gasto *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isFuel ? 'Ex: Abastecimento Diesel S10' : 'Ex: Compra de peças para o caminhão'}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-medium"
              required
            />
          </div>

          {/* FUEL SPECIAL FIELDS */}
          {isFuel ? (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-amber-600" />
                Dados do Abastecimento
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Litros Abastecidos *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    placeholder="Ex: 80.5"
                    className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Valor por Litro (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={fuelPricePerLiter}
                    onChange={(e) => setFuelPricePerLiter(e.target.value)}
                    placeholder="Ex: 5.99"
                    className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Km / Odômetro Atual
                  </label>
                  <input
                    type="number"
                    value={fuelOdometer}
                    onChange={(e) => setFuelOdometer(e.target.value)}
                    placeholder="Ex: 64250"
                    className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Posto de Combustível
                  </label>
                  <input
                    type="text"
                    value={gasStation}
                    onChange={(e) => setGasStation(e.target.value)}
                    placeholder="Ex: Posto Petrobras Mar Azul"
                    className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white border border-amber-300 rounded-lg">
                  <div>
                    <span className="text-[11px] text-amber-800 font-medium block">
                      Cálculo: {numLiters}L × {formatCurrency(numPriceLiter)}
                    </span>
                    <span className="text-xs font-bold text-amber-950 uppercase">
                      Total Abastecimento
                    </span>
                  </div>
                  <span className="text-base font-black text-rose-600">
                    {formatCurrency(computedFuelTotal)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Total (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 350.00"
                className="w-full sm:w-64 px-3.5 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
          )}

          {/* Relations & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Forma de Pagamento *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 bg-white"
                required
              >
                <option value="Dinheiro">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="PIX Empresa">PIX Empresa</option>
                <option value="Cartão">Cartão</option>
                <option value="Boleto">Boleto</option>
                <option value="Transferência">Transferência</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motorista Relacionado
              </label>
              <select
                value={driverId}
                onChange={(e) => handleDriverChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 bg-white"
              >
                <option value="">Nenhum / Não aplicável</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Veículo Relacionado
              </label>
              <select
                value={vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 bg-white"
              >
                <option value="">Nenhum / Não aplicável</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.model} ({v.plate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fornecedor / Estabelecimento
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ex: Centro Automotivo Vale Sul"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nº Documento / Nota / Cupom Fiscal
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="Ex: NFC-e 88291 ou OS 4192"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observação
            </label>
            <textarea
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: Manutenção preventiva periódica, óleo trocado..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-600/20 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{expenseToEdit ? 'Salvar Alterações' : 'Cadastrar Despesa'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

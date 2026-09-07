import React, { useState, useEffect } from 'react';
import { X, Truck, CheckCircle2, Clock, Check, AlertCircle } from 'lucide-react';
import { Delivery, DeliveryStatus } from '../types';
import { storage } from '../services/storage';
import { formatDate } from '../utils/formatters';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery?: Delivery | null;
  onSaved: (del: Delivery) => void;
}

export const DeliveryModal: React.FC<DeliveryModalProps> = ({
  isOpen,
  onClose,
  delivery,
  onSaved,
}) => {
  const drivers = storage.getDrivers();
  const vehicles = storage.getVehicles();

  const [status, setStatus] = useState<DeliveryStatus>('Aguardando');
  const [driverId, setDriverId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [observation, setObservation] = useState('');

  useEffect(() => {
    if (delivery) {
      setStatus(delivery.status);
      setDriverId(delivery.driver_id || '');
      setDriverName(delivery.driver_name || '');
      setVehicleId(delivery.vehicle_id || '');
      setVehicleName(delivery.vehicle_name || '');
      setDepartureTime(delivery.departure_time || '');
      setDeliveryTime(delivery.delivery_time || '');
      setObservation(delivery.observation || '');
    }
  }, [delivery]);

  if (!isOpen || !delivery) return null;

  const handleStatusChange = (newStatus: DeliveryStatus) => {
    setStatus(newStatus);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (newStatus === 'Saiu para entrega' && !departureTime) {
      setDepartureTime(timeStr);
    }
    if (newStatus === 'Entregue' && !deliveryTime) {
      setDeliveryTime(timeStr);
    }
  };

  const handleDriverChange = (id: string) => {
    setDriverId(id);
    const d = drivers.find((drv) => drv.id === id);
    setDriverName(d ? d.name : '');
  };

  const handleVehicleChange = (id: string) => {
    setVehicleId(id);
    const v = vehicles.find((veh) => veh.id === id);
    setVehicleName(v ? `${v.model} (${v.plate})` : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await storage.saveDelivery({
      ...delivery,
      status,
      driver_id: driverId || undefined,
      driver_name: driverName || 'A definir',
      vehicle_id: vehicleId || undefined,
      vehicle_name: vehicleName || undefined,
      departure_time: departureTime || undefined,
      delivery_time: deliveryTime || undefined,
      observation,
    });
    onSaved(updated);
    onClose();
  };

  return (
    <div
      id="delivery-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="delivery-modal-box"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-50 border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Entrega {delivery.code}
              </h2>
              <p className="text-xs text-slate-500">
                Venda vinculada: {delivery.sale_code || 'Venda'} • Data: {formatDate(delivery.delivery_date)}
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
          {/* Destination info */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-800">{delivery.client_name}</span>
              <span className="text-xs font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                {delivery.quantity} Unidades
              </span>
            </div>
            <p className="text-xs text-slate-600">{delivery.address} - {delivery.city}</p>
          </div>

          {/* Quick Status Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Status da Entrega *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['Aguardando', 'Saiu para entrega', 'Entregue', 'Cancelada', 'Devolvida'] as DeliveryStatus[]).map(
                (s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center border ${
                      status === s
                        ? s === 'Entregue'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : s === 'Saiu para entrega'
                          ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                          : s === 'Aguardando'
                          ? 'bg-amber-500 text-slate-950 border-amber-600'
                          : 'bg-rose-600 text-white border-rose-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {s === 'Entregue' && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                    {s}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Driver & Vehicle Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motorista
              </label>
              <select
                value={driverId}
                onChange={(e) => handleDriverChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
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
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">A definir</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.model} ({v.plate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Horário de Saída
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Horário de Entrega (Conclusão)
              </label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observação da Entrega
            </label>
            <textarea
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: Canhoto assinado pelo Sr. Marcos, portão lateral..."
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
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20"
            >
              <Check className="w-4 h-4" />
              Salvar Entrega
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

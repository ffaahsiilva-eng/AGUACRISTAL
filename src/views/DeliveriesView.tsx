import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  Navigation,
  Printer,
  Edit2,
  Trash2,
  Search,
  Filter,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Delivery, DeliveryStatus } from '../types';
import { storage } from '../services/storage';
import { formatDate, getTodayDateString } from '../utils/formatters';

interface DeliveriesViewProps {
  onOpenDeliveryModal: (delivery: Delivery) => void;
  onPrintRoute: (deliveries: Delivery[]) => void;
  onDeleteDelivery: (delivery: Delivery) => void;
}

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({
  onOpenDeliveryModal,
  onPrintRoute,
  onDeleteDelivery,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const deliveries = storage.getDeliveries();
  const drivers = storage.getDrivers();
  const currentUser = storage.getCurrentUser();
  const canEdit = currentUser.role !== 'VISUALIZACAO';

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (d.is_deleted) return false;
      if (selectedStatus !== 'all' && d.status !== selectedStatus) return false;
      if (selectedDriver && d.driver_id !== selectedDriver && d.driver_name !== selectedDriver) return false;
      if (selectedDate && d.delivery_date !== selectedDate) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          d.code.toLowerCase().includes(term) ||
          d.client_name.toLowerCase().includes(term) ||
          d.address.toLowerCase().includes(term) ||
          d.city.toLowerCase().includes(term) ||
          d.driver_name.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [deliveries, selectedStatus, selectedDriver, selectedDate, searchTerm]);

  // Statistics
  const totalCount = deliveries.filter((d) => !d.is_deleted).length;
  const waitingCount = deliveries.filter((d) => !d.is_deleted && d.status === 'Aguardando').length;
  const onTheWayCount = deliveries.filter((d) => !d.is_deleted && d.status === 'Saiu para entrega').length;
  const deliveredCount = deliveries.filter((d) => !d.is_deleted && d.status === 'Entregue').length;

  const handleQuickMarkDelivered = async (d: Delivery) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    await storage.saveDelivery({
      ...d,
      status: 'Entregue',
      delivery_time: timeStr,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Controle de Entregas & Logística
          </h1>
          <p className="text-xs text-slate-500">
            Acompanhe pedidos aguardando, saídas para entrega e romaneios de motoristas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onPrintRoute(filteredDeliveries)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            Imprimir Romaneio / Rota
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedStatus('all')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedStatus === 'all'
              ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20'
              : 'bg-white border-slate-200 hover:border-sky-200'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total de Entregas
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
        </div>

        <div
          onClick={() => setSelectedStatus('Aguardando')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedStatus === 'Aguardando'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Aguardando Saída
          </span>
          <p className="text-2xl font-black text-amber-800 mt-1">{waitingCount}</p>
        </div>

        <div
          onClick={() => setSelectedStatus('Saiu para entrega')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedStatus === 'Saiu para entrega'
              ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20'
              : 'bg-white border-slate-200 hover:border-sky-200'
          }`}
        >
          <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
            Em Trânsito / Na Rota
          </span>
          <p className="text-2xl font-black text-sky-700 mt-1">{onTheWayCount}</p>
        </div>

        <div
          onClick={() => setSelectedStatus('Entregue')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedStatus === 'Entregue'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
            Entregues Concluídas
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{deliveredCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por cliente, endereço, código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
            >
              <option value="">Todos os Motoristas</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Data</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Endereço de Entrega</th>
                <th className="py-3 px-3">Motorista</th>
                <th className="py-3 px-3 text-center">Galões</th>
                <th className="py-3 px-3 text-center">Horários</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Nenhuma entrega encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-emerald-700 whitespace-nowrap">
                      {del.code}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatDate(del.delivery_date)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{del.client_name}</span>
                      {del.sale_code && (
                        <span className="text-[10px] text-slate-400">Venda: {del.sale_code}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-800 font-medium block">{del.address}</span>
                      <span className="text-[11px] text-slate-500">{del.city}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700">
                      {del.driver_name}
                      {del.vehicle_name && (
                        <span className="text-[10px] text-slate-400 block">{del.vehicle_name}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-sky-800">
                      {del.quantity} un
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap text-[11px] text-slate-500">
                      {del.departure_time && <div>Saída: {del.departure_time}</div>}
                      {del.delivery_time && <div>Entregue: {del.delivery_time}</div>}
                      {!del.departure_time && !del.delivery_time && '-'}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          del.status === 'Entregue'
                            ? 'bg-emerald-100 text-emerald-800'
                            : del.status === 'Saiu para entrega'
                            ? 'bg-sky-100 text-sky-800'
                            : del.status === 'Aguardando'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {del.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {canEdit && del.status !== 'Entregue' && (
                          <button
                            onClick={() => handleQuickMarkDelivered(del)}
                            className="px-2 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 shadow-xs"
                            title="Marcar como Entregue Agora"
                          >
                            <Check className="w-3 h-3" />
                            Entregue
                          </button>
                        )}

                        <button
                          onClick={() => onOpenDeliveryModal(del)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="Detalhes / Alterar Status"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => onDeleteDelivery(del)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            title="Excluir Entrega"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

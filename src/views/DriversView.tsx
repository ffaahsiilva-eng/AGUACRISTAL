import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Truck,
  Award,
  Calendar,
  X,
  Check,
} from 'lucide-react';
import { Driver } from '../types';
import { storage } from '../services/storage';
import { formatCurrency, formatDate, formatPhone, formatCpfCnpj } from '../utils/formatters';

interface DriversViewProps {
  onSelectDriverHistory: (driver: Driver) => void;
}

export const DriversView: React.FC<DriversViewProps> = ({ onSelectDriverHistory }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [cnh, setCnh] = useState('');
  const [cnhCategory, setCnhCategory] = useState('B');
  
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [observation, setObservation] = useState('');

  const drivers = storage.getDrivers();
  const sales = storage.getSales();
  const currentUser = storage.getCurrentUser();
  const canEdit = currentUser.role !== 'VISUALIZACAO';

  const handleOpenModal = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      setName(driver.name);
      setCpf(driver.cpf || '');
      setPhone(driver.phone || '');
      setCnh(driver.cnh || '');
      setCnhCategory(driver.cnh_category || 'B');
       
      setStatus(driver.status);
      setObservation(driver.observation || '');
    } else {
      setEditingDriver(null);
      setName('');
      setCpf('');
      setPhone('');
      setCnh('');
      setCnhCategory('B');
      
      setStatus('Ativo');
      setObservation('');
    }
    setIsModalOpen(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nome do motorista é obrigatório.');
      return;
    }

    const now = new Date().toISOString();
    await storage.saveDriver({
      id: editingDriver ? editingDriver.id : `drv-${Date.now()}`,
      name: name.trim(),
      cpf: cpf.trim(),
      phone: phone.trim(),
      cnh: cnh.trim(),
      cnh_category: cnhCategory,
      
      status,
      observation,
      created_at: editingDriver?.created_at || now,
      updated_at: now,
    });

    setIsModalOpen(false);
  };

  const handleDeleteDriver = (d: Driver) => {
    if (window.confirm(`Deseja realmente desativar o motorista "${d.name}"?`)) {
      storage.deleteDriver(d.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Motoristas & Entregadores
          </h1>
          <p className="text-xs text-slate-500">
            Cadastre a equipe de entregas, e acompanhe o desempenho.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            + Novo Motorista
          </button>
        )}
      </div>

      {/* Drivers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {drivers.map((driver) => {
          const driverSales = sales.filter((s) => !s.is_deleted && s.driver_id === driver.id);
          const totalSoldQuantity = driverSales.reduce((acc, curr) => acc + curr.quantity, 0);
          const totalSoldAmount = driverSales.reduce((acc, curr) => acc + curr.total_amount, 0);
          

          return (
            <div
              key={driver.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-sky-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black text-sm">
                      {driver.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {driver.name}
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        CNH: {driver.cnh || 'Não inf.'} (Cat. {driver.cnh_category})
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      driver.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {driver.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Telefone:</span>
                    <span className="font-medium text-slate-800">{driver.phone || 'Não informado'}</span>
                  </div>
                  
                </div>

                {/* Performance Metrics */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Galões</span>
                    <span className="text-xs font-black text-slate-800">{totalSoldQuantity} un</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Vendas</span>
                    <span className="text-xs font-black text-slate-800">{formatCurrency(totalSoldAmount)}</span>
                  </div>
                  
                </div>
              </div>

              {/* Action buttons */}
              {canEdit && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenModal(driver)}
                    className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteDriver(driver)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Driver Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-sky-50 border-b border-sky-100">
              <h2 className="text-base font-bold text-slate-900">
                {editingDriver ? 'Editar Motorista' : 'Novo Motorista'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silveira"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CPF</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(47) 99999-9999"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CNH</label>
                  <input
                    type="text"
                    value={cnh}
                    onChange={(e) => setCnh(e.target.value)}
                    placeholder="000000000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={cnhCategory}
                    onChange={(e) => setCnhCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>

                
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Ativo' | 'Inativo')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl"
                >
                  <Check className="w-4 h-4" />
                  Salvar Motorista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

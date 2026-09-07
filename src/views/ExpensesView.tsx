import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  Plus,
  Fuel,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Expense } from '../types';
import { storage } from '../services/storage';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';

interface ExpensesViewProps {
  onOpenNewExpense: (isFuel?: boolean) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onOpenNewExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'fuel' | 'operational'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const expenses = storage.getExpenses();
  const categories = storage.getCategories();
  const drivers = storage.getDrivers();
  const vehicles = storage.getVehicles();
  const currentUser = storage.getCurrentUser();
  const canEdit = currentUser.role !== 'VISUALIZACAO';

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.is_deleted) return false;
      if (activeTab === 'fuel' && !e.is_fuel) return false;
      if (activeTab === 'operational' && e.is_fuel) return false;

      if (startDate && e.expense_date < startDate) return false;
      if (endDate && e.expense_date > endDate) return false;
      if (selectedCategory && e.category_id !== selectedCategory) return false;
      
      if (selectedVehicle && e.vehicle_id !== selectedVehicle) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          e.code.toLowerCase().includes(term) ||
          e.description.toLowerCase().includes(term) ||
          e.category_name.toLowerCase().includes(term) ||
          (e.supplier && e.supplier.toLowerCase().includes(term)) ||
          (e.driver_name && e.driver_name.toLowerCase().includes(term));
        if (!match) return false;
      }
      return true;
    });
  }, [
    expenses,
    activeTab,
    startDate,
    endDate,
    selectedCategory,
    selectedDriver,
    selectedVehicle,
    searchTerm,
  ]);

  // Statistics
  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const fuelExpenses = expenses.filter((e) => !e.is_deleted && e.is_fuel);
  const totalFuelAmount = fuelExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalLiters = fuelExpenses.reduce((acc, curr) => acc + (curr.fuel_liters || 0), 0);

  const handleExport = () => {
    exportToExcel(
      filteredExpenses.map((e) => ({
        Código: e.code,
        Data: formatDate(e.expense_date),
        Descrição: e.description,
        Categoria: e.category_name,
        Valor: e.amount,
        'Forma Pagamento': e.payment_method,
        
        Veículo: e.vehicle_name || '-',
        Fornecedor: e.supplier || '-',
        'Nº Documento': e.doc_number || '-',
        Combustível: e.is_fuel ? 'Sim' : 'Não',
        Litros: e.fuel_liters || '-',
        'Preço/Litro': e.fuel_price_per_liter || '-',
        Km: e.fuel_odometer || '-',
        Observação: e.observation || '-',
      })),
      'Despesas_Agua_Cristal_Sul'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Minhas Despesas
          </h1>
          <p className="text-xs text-slate-500">
            Controle das minhas despesas do dia a dia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar XLSX
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => onOpenNewExpense(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md shadow-amber-400/20 active:scale-95 transition-all cursor-pointer"
              >
                <Fuel className="w-4 h-4" />
                + Abastecimento
              </button>

              <button
                onClick={() => onOpenNewExpense(false)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                + Nova Despesa
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
            Total de Despesas
          </span>
          <p className="text-2xl font-black text-rose-600 mt-1">{formatCurrency(totalExpenses)}</p>
          <span className="text-xs text-slate-400 mt-1 block">
            {filteredExpenses.length} lançamentos
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Gastos com Combustível
          </span>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {formatCurrency(totalFuelAmount)}
          </p>
          <span className="text-xs text-amber-700 mt-1 block">
            Total de {formatNumber(totalLiters)} Litros
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Preço Médio Litro Diesel/Gasolina
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {totalLiters > 0 ? formatCurrency(totalFuelAmount / totalLiters) : 'R$ 0,00'}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Média de abastecimento</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Outros Custos & Manutenção
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(Math.max(0, totalExpenses - totalFuelAmount))}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Manutenções, peças, outros</span>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas as Despesas
            </button>
            <button
              onClick={() => setActiveTab('fuel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'fuel'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Apenas Combustível ({fuelExpenses.length})
            </button>
            <button
              onClick={() => setActiveTab('operational')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'operational'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Demais Despesas Operacionais
            </button>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar despesa, fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">De:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Até:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Categoria:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Veículo:</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
            >
              <option value="">Todos</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.model} ({v.plate})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      
      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          
          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredExpenses.length === 0 ? (
              <div className="py-12 text-center text-slate-400">Nenhuma despesa encontrada com os filtros selecionados.</div>
            ) : (
              filteredExpenses.map((exp) => (
                <div key={"mob-"+exp.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-rose-600 text-[10px] uppercase bg-rose-50 px-2 py-0.5 rounded">{exp.code}</span>
                    <span className="font-bold text-rose-600">{formatCurrency(exp.amount)}</span>
                  </div>
                  <div className="mb-2">
                    <div className="font-bold text-slate-900">{exp.description}</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {formatDate(exp.expense_date)} • {exp.category_name}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {exp.payment_method}
                      </span>
                      {exp.receipt_attachment && (
                        <button
                          onClick={() => window.open(exp.receipt_attachment, '_blank')}
                          className="flex items-center gap-1 text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded border border-sky-100"
                        >
                          Ver Nota
                        </button>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <button onClick={() => onEditExpense(exp)} className="p-1.5 text-sky-600 bg-sky-50 rounded-lg border border-sky-100">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDeleteExpense(exp)} className="p-1.5 text-rose-600 bg-rose-50 rounded-lg border border-rose-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <table className="hidden md:table w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wide">
              <tr>
                <th className="py-3 px-3 whitespace-nowrap text-center">Cód.</th>
                <th className="py-3 px-3 whitespace-nowrap">Data</th>
                <th className="py-3 px-3 min-w-[200px]">Descrição</th>
                <th className="py-3 px-3 min-w-[120px]">Categoria</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Valor</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Pgto</th>
                <th className="py-3 px-3 min-w-[150px]">Fornecedor</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Anexo</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Nenhuma despesa encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-rose-600 text-center whitespace-nowrap">
                      {exp.code}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatDate(exp.expense_date)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{exp.description}</span>
                      {exp.is_fuel && exp.fuel_liters && (
                        <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                          {exp.fuel_liters}L a {formatCurrency(exp.fuel_price_per_liter || 0)}/L • Km {exp.fuel_odometer || '-'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                        {exp.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-rose-600">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 font-medium">{exp.payment_method}</td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {exp.supplier && <span className="block font-medium text-slate-700">{exp.supplier}</span>}
                      {exp.doc_number && <span>Doc: {exp.doc_number}</span>}
                      {!exp.supplier && !exp.doc_number && '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {exp.receipt_attachment ? (
                        <button
                          onClick={() => window.open(exp.receipt_attachment, '_blank')}
                          className="inline-flex items-center justify-center p-1.5 text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors"
                          title="Ver Comprovante/Nota"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {canEdit && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onEditExpense(exp)}
                            className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg"
                            title="Editar Despesa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteExpense(exp)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            title="Excluir Despesa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
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

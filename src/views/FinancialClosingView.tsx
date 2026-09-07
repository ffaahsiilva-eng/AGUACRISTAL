import React, { useState, useMemo } from 'react';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Printer,
  Download,
  Calendar,
  Fuel,
  Wrench,
  Award,
  Users,
  CheckCircle2,
  Droplets,
} from 'lucide-react';
import { storage } from '../services/storage';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';
import { exportToExcel } from '../utils/excel';

interface FinancialClosingViewProps {
  onPrintClosingReport: (monthText: string, dreData: any, summary: any) => void;
}

export const FinancialClosingView: React.FC<FinancialClosingViewProps> = ({
  onPrintClosingReport,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const sales = storage.getSales();
  const expenses = storage.getExpenses();

  // Filter for selected month
  const monthSales = useMemo(() => {
    return sales.filter((s) => !s.is_deleted && s.sale_date.startsWith(selectedMonth));
  }, [sales, selectedMonth]);

  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => !e.is_deleted && e.expense_date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Calculations
  const grossRevenue = monthSales.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalReceived = monthSales.reduce((acc, curr) => acc + curr.amount_paid, 0);
  const totalReceivable = monthSales.reduce((acc, curr) => acc + curr.pending_amount, 0);
  const totalQuantity = monthSales.reduce((acc, curr) => acc + curr.quantity, 0);

  // Expense breakdown
  const fuelExpenses = monthExpenses
    .filter((e) => e.is_fuel || e.category_name.toLowerCase().includes('combust'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const maintenanceExpenses = monthExpenses
    .filter((e) => e.category_name.toLowerCase().includes('manuten') || e.category_name.toLowerCase().includes('peça') || e.category_name.toLowerCase().includes('veíc'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const salariesExpenses = monthExpenses
    .filter((e) => e.category_name.toLowerCase().includes('salár') || e.category_name.toLowerCase().includes('pessoal') || e.category_name.toLowerCase().includes('pró-labore'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const commissionsExpenses = monthSales.reduce((acc, curr) => acc + curr.commission_amount, 0);

  const otherExpenses = monthExpenses
    .filter(
      (e) =>
        !e.is_fuel &&
        !e.category_name.toLowerCase().includes('combust') &&
        !e.category_name.toLowerCase().includes('manuten') &&
        !e.category_name.toLowerCase().includes('peça') &&
        !e.category_name.toLowerCase().includes('veíc') &&
        !e.category_name.toLowerCase().includes('salár') &&
        !e.category_name.toLowerCase().includes('pessoal')
    )
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalDeductions =
    fuelExpenses + maintenanceExpenses + salariesExpenses + commissionsExpenses + otherExpenses;

  const netResult = grossRevenue - totalDeductions;
  const profitMargin = grossRevenue > 0 ? (netResult / grossRevenue) * 100 : 0;
  const averagePricePerGallon = totalQuantity > 0 ? grossRevenue / totalQuantity : 0;
  const fuelCostPerGallon = totalQuantity > 0 ? fuelExpenses / totalQuantity : 0;

  // Month label
  const [year, month] = selectedMonth.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthLabel = `${monthNames[parseInt(month, 10) - 1]} de ${year}`;

  const handleExport = () => {
    exportToExcel(
      [
        { Linha: '1. RECEITA OPERACIONAL BRUTA (Vendas)', Valor: grossRevenue },
        { Linha: '(-) Despesas com Combustível', Valor: -fuelExpenses },
        { Linha: '(-) Manutenção de Veículos e Peças', Valor: -maintenanceExpenses },
        { Linha: '(-) Salários e Pessoal', Valor: -salariesExpenses },
        { Linha: '(-) Comissões dos Motoristas', Valor: -commissionsExpenses },
        { Linha: '(-) Demais Despesas Operacionais', Valor: -otherExpenses },
        { Linha: '(=) RESULTADO LÍQUIDO DO MÊS', Valor: netResult },
        { Linha: 'Margem Líquida (%)', Valor: `${profitMargin.toFixed(1)}%` },
        { Linha: 'Total de Galões Vendidos', Valor: totalQuantity },
      ],
      `Fechamento_Mensal_DRE_${selectedMonth}`
    );
  };

  const handlePrint = () => {
    onPrintClosingReport(
      monthLabel,
      {
        grossRevenue,
        fuelExpenses,
        maintenanceExpenses,
        salariesExpenses,
        commissionsExpenses,
        otherExpenses,
        totalDeductions,
        netResult,
      },
      {
        profitMargin,
        totalQuantity,
        averagePricePerGallon,
        fuelCostPerGallon,
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Fechamento Mensal & Resultados
          </h1>
          <p className="text-xs text-slate-500">
            Demonstrativo financeiro completo, apuração de receitas, custos e lucro líquido.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-800"
          />

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar XLSX
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Fechamento (DRE)
          </button>
        </div>
      </div>

      {/* Top Banner with Big Result */}
      <div
        className={`p-6 rounded-2xl text-white shadow-lg ${
          netResult >= 0
            ? 'bg-gradient-to-r from-emerald-800 to-teal-900'
            : 'bg-gradient-to-r from-rose-900 to-red-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase opacity-80">
              Resultado Líquido Apurado • {monthLabel}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black mt-1 font-sans">
              {formatCurrency(netResult)}
            </h2>
            <p className="text-xs sm:text-sm mt-1 opacity-90">
              {netResult >= 0 ? 'Lucro Líquido Operacional Positivo' : 'Prejuízo Operacional no Período'} • Margem Líquida: {profitMargin.toFixed(1)}%
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-6 text-xs">
            <div>
              <span className="opacity-75 block text-[11px]">Receita Bruta</span>
              <span className="text-sm font-bold block">{formatCurrency(grossRevenue)}</span>
            </div>
            <div>
              <span className="opacity-75 block text-[11px]">Total Deduções</span>
              <span className="text-sm font-bold block">{formatCurrency(totalDeductions)}</span>
            </div>
            <div>
              <span className="opacity-75 block text-[11px]">Galões Vendidos</span>
              <span className="text-sm font-bold block">{formatNumber(totalQuantity)} un</span>
            </div>
          </div>
        </div>
      </div>

      {/* DRE Table & Detailed Deductions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DRE Structure */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Demonstrativo de Resultado do Exercício (DRE)
            </h3>
            <span className="text-xs font-semibold text-slate-500">{monthLabel}</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {/* 1. Receita */}
            <div className="p-4 flex items-center justify-between bg-sky-50/40">
              <div>
                <span className="font-extrabold text-slate-900 block text-sm">
                  1. RECEITA BRUTA DE VENDAS
                </span>
                <span className="text-slate-500 text-[11px]">
                  {monthSales.length} pedidos • {totalQuantity} galões comercializados
                </span>
              </div>
              <span className="font-black text-sky-900 text-base">
                {formatCurrency(grossRevenue)}
              </span>
            </div>

            {/* 2. Deduções e Custos */}
            <div className="p-3.5 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Fuel className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">(-) Despesas com Combustível</span>
                  <span className="text-slate-400 block text-[11px]">
                    Abastecimentos da frota de entregas
                  </span>
                </div>
              </div>
              <span className="font-bold text-rose-600">
                - {formatCurrency(fuelExpenses)}
              </span>
            </div>

            <div className="p-3.5 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Wrench className="w-4 h-4 text-slate-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">(-) Manutenção de Veículos & Peças</span>
                  <span className="text-slate-400 block text-[11px]">
                    Oficinas, pneus, revisões mecânicas
                  </span>
                </div>
              </div>
              <span className="font-bold text-rose-600">
                - {formatCurrency(maintenanceExpenses)}
              </span>
            </div>

            <div className="p-3.5 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">(-) Comissões dos Motoristas</span>
                  <span className="text-slate-400 block text-[11px]">
                    Comissões variáveis calculadas sobre vendas
                  </span>
                </div>
              </div>
              <span className="font-bold text-indigo-700">
                - {formatCurrency(commissionsExpenses)}
              </span>
            </div>

            <div className="p-3.5 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-slate-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">(-) Salários & Despesas com Pessoal</span>
                  <span className="text-slate-400 block text-[11px]">
                    Folha de pagamento e encargos
                  </span>
                </div>
              </div>
              <span className="font-bold text-rose-600">
                - {formatCurrency(salariesExpenses)}
              </span>
            </div>

            <div className="p-3.5 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-slate-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">(-) Demais Despesas Operacionais</span>
                  <span className="text-slate-400 block text-[11px]">
                    Água, luz, telefone, internet, taxas e outros
                  </span>
                </div>
              </div>
              <span className="font-bold text-rose-600">
                - {formatCurrency(otherExpenses)}
              </span>
            </div>

            {/* Total Custos */}
            <div className="p-4 flex items-center justify-between bg-rose-50/30">
              <span className="font-bold text-rose-800">
                TOTAL DE CUSTOS & DEDUÇÕES DO MÊS
              </span>
              <span className="font-black text-rose-700 text-sm">
                - {formatCurrency(totalDeductions)}
              </span>
            </div>

            {/* Resultado Final */}
            <div className={`p-4 flex items-center justify-between ${netResult >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <div>
                <span className="font-black text-slate-900 block text-sm">
                  (=) RESULTADO LÍQUIDO DO EXERCÍCIO
                </span>
                <span className="text-slate-500 text-[11px]">
                  Margem de Rentabilidade: {profitMargin.toFixed(1)}%
                </span>
              </div>
              <span
                className={`font-black text-lg ${
                  netResult >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {formatCurrency(netResult)}
              </span>
            </div>
          </div>
        </div>

        {/* Indicators & Analysis */}
        <div className="space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Indicadores de Desempenho
            </h4>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">Preço Médio por Galão</span>
                <span className="text-base font-black text-slate-900">
                  {formatCurrency(averagePricePerGallon)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">Custo de Combustível por Galão</span>
                <span className="text-base font-black text-amber-800">
                  {formatCurrency(fuelCostPerGallon)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">Lucro Líquido Médio por Galão</span>
                <span className="text-base font-black text-emerald-700">
                  {totalQuantity > 0 ? formatCurrency(netResult / totalQuantity) : 'R$ 0,00'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block text-[11px]">Taxa de Inadimplência / A Receber</span>
                <span className="text-base font-black text-slate-900">
                  {grossRevenue > 0 ? `${((totalReceivable / grossRevenue) * 100).toFixed(1)}%` : '0%'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {formatCurrency(totalReceivable)} ainda pendente no mês
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

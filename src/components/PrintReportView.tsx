import React from 'react';
import { X, Printer, Droplets, Download } from 'lucide-react';
import { storage } from '../services/storage';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

interface PrintReportViewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  periodText: string;
  summaryCards: { label: string; value: string; color?: string }[];
  columns: { header: string; key: string; align?: 'left' | 'center' | 'right' }[];
  rows: Record<string, unknown>[];
  footerTotals?: { label: string; value: string }[];
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  isOpen,
  onClose,
  title,
  periodText,
  summaryCards,
  columns,
  rows,
  footerTotals,
}) => {
  if (!isOpen) return null;

  const settings = storage.getSettings();
  const generationDate = formatDateTime(new Date().toISOString());

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="print-report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
    >
      <div
        id="print-report-container"
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[95vh]"
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-sky-400" />
            <span className="text-sm font-bold">Visualização para Impressão / Salvar PDF</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar em PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900 print:p-0">
          {/* Header with Água Cristal Sul Logo & Details */}
          <div className="flex items-start justify-between border-b-2 border-sky-600 pb-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/30">
                <Droplets className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase font-sans">
                  {settings.company_name}
                </h1>
                <p className="text-xs font-semibold text-sky-700">{settings.trade_name}</p>
                <p className="text-[11px] text-slate-500">
                  CNPJ: {settings.cnpj} • Tel: {settings.phone}
                </p>
                <p className="text-[11px] text-slate-500">
                  {settings.address} - {settings.city}/{settings.state}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Relatório Gerencial
              </span>
              <h2 className="text-base font-extrabold text-slate-800">{title}</h2>
              <p className="text-xs font-bold text-sky-700 mt-0.5">Período: {periodText}</p>
              <p className="text-[10px] text-slate-400 mt-1">Gerado em: {generationDate}</p>
            </div>
          </div>

          {/* Financial Summary Cards */}
          {summaryCards.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Resumo Financeiro & Operacional
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {summaryCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 print:bg-slate-100"
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      {card.label}
                    </span>
                    <span className="text-sm font-black text-slate-900 mt-0.5 block">
                      {card.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className={`py-2.5 px-3 ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    {columns.map((col, cIdx) => (
                      <td
                        key={cIdx}
                        className={`py-2 px-3 ${
                          col.align === 'right'
                            ? 'text-right font-medium'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {String(row[col.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Totals */}
          {footerTotals && footerTotals.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
              {footerTotals.map((tot, idx) => (
                <div key={idx} className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    {tot.label}
                  </span>
                  <span className="text-sm font-black text-slate-900">{tot.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Signatures & Certification */}
          <div className="pt-8 mt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
            <div>
              <p>Relatório emitido pelo Sistema de Gestão Água Cristal Sul.</p>
              <p className="text-[10px]">Documento de controle interno e prestação de contas.</p>
            </div>
            <div className="text-center w-64 border-t border-slate-400 pt-1">
              <span className="font-semibold text-slate-700">Responsável / Administração</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

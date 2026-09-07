import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, Upload, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { parseExcelOrCsv, ParsedSaleRow } from '../utils/excel';
import { storage } from '../services/storage';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (count: number) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedSaleRow[]>([]);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await parseExcelOrCsv(selectedFile);
      if (result.rows.length === 0) {
        setErrorMessage('Nenhuma linha de dados encontrada no arquivo.');
        setLoading(false);
        return;
      }
      setParsedRows(result.rows);
      setStep('preview');
    } catch (err) {
      console.error(err);
      setErrorMessage('Falha ao processar o arquivo. Verifique se é uma planilha Excel (.xlsx, .xls) ou .csv válida.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    let imported = 0;
    
    for (const row of parsedRows) {
      if (row.isValid) {
        await storage.saveSale(
          {
            client_name: row.client_name,
            client_document: row.client_document,
            sale_date: row.sale_date,
            address: row.address,
            neighborhood: row.neighborhood,
            city: row.city,
            driver_name: row.driver_name,
            quantity: row.quantity,
            unit_price: row.unit_price,
            total_amount: row.total_amount,
            payment_method: row.payment_method,
            payment_status: row.payment_status,
            observation: 'Importado de planilha Excel/CSV',
          },
          true
        );
        imported++;
      }
    }

    onImportComplete(imported);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setStep('upload');
    setErrorMessage('');
    onClose();
  };

  const validRowsCount = parsedRows.filter((r) => r.isValid).length;
  const totalImportSum = parsedRows
    .filter((r) => r.isValid)
    .reduce((acc, curr) => acc + curr.total_amount, 0);

  return (
    <div
      id="excel-import-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={handleClose}
    >
      <div
        id="excel-import-modal-box"
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-50 border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Importar Planilha de Vendas (Excel / CSV)
              </h2>
              <p className="text-xs text-slate-500">
                Substitua ou migre suas planilhas antigas automaticamente com conferência prévia.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-emerald-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' ? (
            <div className="space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-10 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30 flex flex-col items-center justify-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Clique para selecionar ou arraste sua planilha aqui
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou arquivo separado por vírgulas (.csv)
                </p>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-emerald-700">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processando e reconhecendo colunas da planilha...
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Column recognition guidelines */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <span className="font-bold text-slate-800 block">
                  Colunas reconhecidas automaticamente pelo sistema:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>NOME / CLIENTE</strong>
                  </div>
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>DATA</strong> (DD/MM/AAAA)
                  </div>
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>ENDEREÇO</strong>
                  </div>
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>BAIRRO</strong>
                  </div>
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>CNPJ / CPF</strong>
                  </div>
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>MOTORISTA</strong>
                  </div>
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>CIDADE</strong>
                  </div>
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>QUANTIDADE</strong>
                  </div>
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>VALOR UNITÁRIO</strong>
                  </div>
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>TOTAL</strong>
                  </div>
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>FORMA PAGAMENTO</strong>
                  </div>
                  <div className="p-1.5 bg-white border border-slate-200 rounded">
                    <strong>STATUS</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Conference Table */
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    Tela de Conferência Pré-Importação
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Arquivo: <strong>{file?.name}</strong> • {validRowsCount} linhas válidas prontas para importar.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                    Total a ser importado
                  </span>
                  <span className="text-sm font-black text-emerald-950">
                    {formatCurrency(totalImportSum)}
                  </span>
                </div>
              </div>

              {/* Table preview */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Cliente</th>
                      <th className="py-2 px-3">Cidade</th>
                      <th className="py-2 px-3">Motorista</th>
                      <th className="py-2 px-3 text-center">Qtd</th>
                      <th className="py-2 px-3 text-right">Unitário</th>
                      <th className="py-2 px-3 text-right">Total</th>
                      <th className="py-2 px-3">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 ${
                          !row.isValid ? 'bg-rose-50/50 text-rose-800' : ''
                        }`}
                      >
                        <td className="py-2 px-3 whitespace-nowrap">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              <Check className="w-3 h-3" /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                              Inválido
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">{formatDate(row.sale_date)}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{row.client_name}</td>
                        <td className="py-2 px-3">{row.city}</td>
                        <td className="py-2 px-3">{row.driver_name}</td>
                        <td className="py-2 px-3 text-center font-bold">{row.quantity}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(row.unit_price)}</td>
                        <td className="py-2 px-3 text-right font-black text-slate-900">
                          {formatCurrency(row.total_amount)}
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {row.payment_method}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          {step === 'preview' ? (
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
            >
              ← Escolher outro arquivo
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Cancelar
            </button>

            {step === 'preview' && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={validRowsCount === 0}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                Confirmar Importação de {validRowsCount} Vendas
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

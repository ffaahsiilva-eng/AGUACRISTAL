import * as XLSX from 'xlsx';
import { Sale, PaymentMethod, PaymentStatus } from '../types';
import { getTodayDateString } from './formatters';

export function exportToExcel(data: Record<string, unknown>[], fileName: string, sheetName = 'Dados') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function exportToCSV(data: Record<string, unknown>[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface ParsedSaleRow {
  client_name: string;
  sale_date: string;
  client_document: string;
  address: string;
  neighborhood: string;
  city: string;
  driver_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  isValid: boolean;
  errorMessage?: string;
}

export async function parseExcelOrCsv(file: File): Promise<{ rows: ParsedSaleRow[]; totalCount: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsedRows: ParsedSaleRow[] = rawJson.map((row) => {
          // Normalize column names by removing accents and making lowercase
          const normalized: Record<string, unknown> = {};
          Object.keys(row).forEach((key) => {
            const cleanKey = key
              .trim()
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');
            normalized[cleanKey] = row[key];
          });

          // Helper to find value from possible aliases
          const findVal = (possibleKeys: string[]): unknown => {
            for (const k of possibleKeys) {
              if (normalized[k] !== undefined && normalized[k] !== '') {
                return normalized[k];
              }
            }
            return '';
          };

          const client_name = String(findVal(['nome', 'cliente', 'razao social', 'nome / razao social', 'empresa'])).trim();
          let sale_date = String(findVal(['data', 'data da venda', 'data venda'])).trim();
          
          // Format date if needed
          if (sale_date) {
            try {
              if (sale_date.includes('/')) {
                const parts = sale_date.split('/');
                if (parts.length === 3) {
                  sale_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              } else if (typeof normalized['data'] === 'object' && normalized['data'] instanceof Date) {
                sale_date = normalized['data'].toISOString().split('T')[0];
              }
            } catch {
              sale_date = getTodayDateString();
            }
          } else {
            sale_date = getTodayDateString();
          }

          const client_document = String(findVal(['cnpj', 'cpf', 'cnpj/cpf', 'cpf/cnpj', 'documento'])).trim();
          const address = String(findVal(['endereco', 'rua', 'logradouro'])).trim();
          const neighborhood = String(findVal(['bairro', 'bairros'])).trim();
          const city = String(findVal(['cidade', 'municipio'])).trim() || 'Balneário Camboriú';
          const driver_name = String(findVal(['motorista', 'entregador'])).trim() || 'A definir';

          const rawQty = findVal(['quantidade', 'qtd', 'volume', 'unidades']);
          const quantity = Math.max(1, Number(String(rawQty).replace(',', '.')) || 1);

          const rawUnitPrice = findVal(['valor unitario', 'unitario', 'valor unit', 'preco unitario', 'preco']);
          let unit_price = Number(String(rawUnitPrice).replace('R$', '').replace(/\s/g, '').replace(',', '.')) || 27.5;
          if (unit_price <= 0) unit_price = 27.5;

          const total_amount = Math.round(quantity * unit_price * 100) / 100;

          const rawPayment = String(findVal(['forma de pagamento', 'pagamento', 'forma pagamento'])).trim().toLowerCase();
          let payment_method: PaymentMethod = 'PIX';
          if (rawPayment.includes('dinheiro')) payment_method = 'Dinheiro';
          else if (rawPayment.includes('pix empresa')) payment_method = 'PIX Empresa';
          else if (rawPayment.includes('pix')) payment_method = 'PIX';
          else if (rawPayment.includes('boleto')) payment_method = 'Boleto';
          else if (rawPayment.includes('transf')) payment_method = 'Transferência';
          else if (rawPayment.includes('cart')) payment_method = 'Cartão';
          else payment_method = 'Outro';

          const rawStatus = String(findVal(['status', 'situacao', 'situacao do pagamento'])).trim().toLowerCase();
          let payment_status: PaymentStatus = 'Pago';
          if (rawStatus.includes('pend') || payment_method === 'Boleto') payment_status = 'Pendente';
          else if (rawStatus.includes('parc')) payment_status = 'Parcial';
          else if (rawStatus.includes('venc')) payment_status = 'Vencido';
          else payment_status = 'Pago';

          const isValid = client_name.length > 0 && quantity > 0;
          const errorMessage = !client_name ? 'Nome do cliente obrigatório' : undefined;

          return {
            client_name: client_name || 'Cliente Sem Nome',
            sale_date,
            client_document,
            address,
            neighborhood,
            city,
            driver_name,
            quantity,
            unit_price,
            total_amount,
            payment_method,
            payment_status,
            isValid,
            errorMessage,
          };
        });

        resolve({ rows: parsedRows, totalCount: parsedRows.length });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

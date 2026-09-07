// Format Brazilian Currency: R$ 1.375,00
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format numbers (e.g. 2.050 unidades)
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('pt-BR').format(value);
}

// Format date to DD/MM/YYYY
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

export const formatDateToBR = formatDate;

// Format date and time DD/MM/YYYY HH:mm
export function formatDateTime(dateTimeString: string | undefined | null): string {
  if (!dateTimeString) return '-';
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return dateTimeString;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTimeString;
  }
}

// Format document (CPF or CNPJ)
export function formatCpfCnpj(value: string | undefined | null): string {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

// Format phone number
export function formatPhone(value: string | undefined | null): string {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return value;
}

// Helper to get today's date in YYYY-MM-DD
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get current month in YYYY-MM
export function getCurrentMonthString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Helper for date range filters
export function getDateRange(filter: string, customStart?: string, customEnd?: string): { start: string; end: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (filter) {
    case 'hoje': {
      const s = toStr(today);
      return { start: s, end: s };
    }
    case 'ontem': {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const s = toStr(yesterday);
      return { start: s, end: s };
    }
    case '7dias': {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { start: toStr(start), end: toStr(today) };
    }
    case 'este_mes': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: toStr(start), end: toStr(end) };
    }
    case 'mes_anterior': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toStr(start), end: toStr(end) };
    }
    case 'este_ano': {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      return { start: toStr(start), end: toStr(end) };
    }
    case 'personalizado': {
      return {
        start: customStart || toStr(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: customEnd || toStr(today),
      };
    }
    default: {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: toStr(start), end: toStr(end) };
    }
  }
}

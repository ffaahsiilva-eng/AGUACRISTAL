export function formatCurrencyInput(value: string): string {
  const onlyDigits = value.replace(/\D/g, '');
  if (!onlyDigits) return '';
  const numValue = parseInt(onlyDigits, 10) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

export function parseCurrencyInput(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0;
}

export function formatInitialCurrency(value: number): string {
  if (isNaN(value)) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

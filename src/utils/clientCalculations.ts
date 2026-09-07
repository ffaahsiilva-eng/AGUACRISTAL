import { Client, Sale, Delivery, PaymentRecord } from '../types';

export interface ClientStats {
  totalComprado: number;
  totalVendas: number;
  totalQuantidade: number;
  totalPago: number;
  totalPendente: number;
  totalVencido: number;
  entregasRealizadas: number;
  totalEntregas: number;
  ticketMedio: number;
  ultimaCompraData: string | null;
  ultimaEntrega: Delivery | null;
  motoristaMaisUtilizado: { name: string; count: number } | null;
  limiteCredito: number;
  limiteUtilizado: number;
  limiteDisponivel: number;
  temPendencia: boolean;
}

export function getClientSales(client: Client, sales: Sale[]): Sale[] {
  const cName = (client.name || '').trim().toLowerCase();
  const cTrade = (client.trade_name || '').trim().toLowerCase();

  return sales.filter((s) => {
    if (s.is_deleted) return false;
    if (s.client_id && s.client_id === client.id) return true;
    const saleClient = (s.client_name || '').trim().toLowerCase();
    if (saleClient && (saleClient === cName || (cTrade && saleClient === cTrade))) return true;
    return false;
  });
}

export function getClientDeliveries(client: Client, deliveries: Delivery[], clientSales: Sale[]): Delivery[] {
  const saleIds = new Set(clientSales.map((s) => s.id));
  const cName = (client.name || '').trim().toLowerCase();
  const cTrade = (client.trade_name || '').trim().toLowerCase();

  return deliveries.filter((d) => {
    if (d.is_deleted) return false;
    if (d.sale_id && saleIds.has(d.sale_id)) return true;
    const dClient = (d.client_name || '').trim().toLowerCase();
    if (dClient && (dClient === cName || (cTrade && dClient === cTrade))) return true;
    return false;
  });
}

export function calculateClientStats(
  client: Client,
  allSales: Sale[],
  allDeliveries: Delivery[],
  _payments?: PaymentRecord[]
): ClientStats {
  const clientSales = getClientSales(client, allSales);
  const clientDeliveries = getClientDeliveries(client, allDeliveries, clientSales);

  const todayStr = new Date().toISOString().split('T')[0];

  let totalComprado = 0;
  let totalQuantidade = 0;
  let totalPago = 0;
  let totalPendente = 0;
  let totalVencido = 0;
  let latestSaleDate: string | null = null;

  clientSales.forEach((sale) => {
    totalComprado += Number(sale.total_amount) || 0;
    totalQuantidade += Number(sale.quantity) || 0;
    totalPago += Number(sale.amount_paid) || 0;

    const pend = Number(sale.pending_amount) || 0;
    totalPendente += pend;

    if (pend > 0) {
      if (sale.payment_status === 'Vencido' || (sale.due_date && sale.due_date < todayStr)) {
        totalVencido += pend;
      }
    }

    if (sale.sale_date) {
      if (!latestSaleDate || sale.sale_date > latestSaleDate) {
        latestSaleDate = sale.sale_date;
      }
    }
  });

  // Entregas
  const entregasRealizadas = clientDeliveries.filter((d) => d.status === 'Entregue').length;
  const totalEntregas = clientDeliveries.filter((d) => d.status !== 'Cancelada').length;

  // Última entrega
  let ultimaEntrega: Delivery | null = null;
  clientDeliveries.forEach((del) => {
    if (!del.delivery_date) return;
    if (!ultimaEntrega || del.delivery_date > (ultimaEntrega.delivery_date || '')) {
      ultimaEntrega = del;
    }
  });

  // Motorista mais frequente
  const driverCounts: Record<string, number> = {};
  clientDeliveries.forEach((d) => {
    if (d.status === 'Entregue' && d.driver_name && d.driver_name !== 'A definir') {
      driverCounts[d.driver_name] = (driverCounts[d.driver_name] || 0) + 1;
    }
  });
  // Se não houver entregas registradas, contar das vendas
  if (Object.keys(driverCounts).length === 0) {
    clientSales.forEach((s) => {
      if (s.driver_name && s.driver_name !== 'A definir') {
        driverCounts[s.driver_name] = (driverCounts[s.driver_name] || 0) + 1;
      }
    });
  }

  let mostFrequentDriver: { name: string; count: number } | null = null;
  Object.entries(driverCounts).forEach(([driverName, count]) => {
    if (!mostFrequentDriver || count > mostFrequentDriver.count) {
      mostFrequentDriver = { name: driverName, count };
    }
  });

  const totalVendas = clientSales.length;
  const ticketMedio = totalVendas > 0 ? Math.round((totalComprado / totalVendas) * 100) / 100 : 0;
  const limiteCredito = Number(client.limite_credito) || 0;
  const limiteUtilizado = Math.round(totalPendente * 100) / 100;
  const limiteDisponivel = Math.max(0, Math.round((limiteCredito - limiteUtilizado) * 100) / 100);

  return {
    totalComprado: Math.round(totalComprado * 100) / 100,
    totalVendas,
    totalQuantidade,
    totalPago: Math.round(totalPago * 100) / 100,
    totalPendente: Math.round(totalPendente * 100) / 100,
    totalVencido: Math.round(totalVencido * 100) / 100,
    entregasRealizadas,
    totalEntregas,
    ticketMedio,
    ultimaCompraData: latestSaleDate,
    ultimaEntrega,
    motoristaMaisUtilizado: mostFrequentDriver,
    limiteCredito,
    limiteUtilizado,
    limiteDisponivel,
    temPendencia: totalPendente > 0,
  };
}

export async function fetchAddressByCep(cep: string): Promise<{
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
} | null> {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return { erro: true };
    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
    };
  } catch {
    return null;
  }
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  ShoppingCart,
  Truck,
  Users,
  UserCheck,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { storage } from '../services/storage';
import { Sale, Delivery, Client, Driver } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSale: (sale: Sale) => void;
  onSelectDelivery: (delivery: Delivery) => void;
  onSelectClient: (client: Client) => void;
  onSelectDriver: (driver: Driver) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectSale,
  onSelectDelivery,
  onSelectClient,
  onSelectDriver,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // toggle is handled in parent or here
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const clean = query.trim().toLowerCase();

  const sales = storage.getSales();
  const deliveries = storage.getDeliveries();
  const clients = storage.getClients();
  const drivers = storage.getDrivers();

  const matchingSales = clean
    ? sales.filter(
        (s) =>
          s.code.toLowerCase().includes(clean) ||
          s.client_name.toLowerCase().includes(clean) ||
          s.client_document.includes(clean) ||
          s.city.toLowerCase().includes(clean) ||
          s.driver_name.toLowerCase().includes(clean)
      ).slice(0, 5)
    : [];

  const matchingDeliveries = clean
    ? deliveries.filter(
        (d) =>
          d.code.toLowerCase().includes(clean) ||
          (d.sale_code && d.sale_code.toLowerCase().includes(clean)) ||
          d.client_name.toLowerCase().includes(clean) ||
          d.city.toLowerCase().includes(clean) ||
          d.driver_name.toLowerCase().includes(clean)
      ).slice(0, 5)
    : [];

  const matchingClients = clean
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(clean) ||
          (c.trade_name && c.trade_name.toLowerCase().includes(clean)) ||
          c.cpf_cnpj.includes(clean) ||
          c.city.toLowerCase().includes(clean) ||
          c.phone.includes(clean)
      ).slice(0, 5)
    : [];

  const matchingDrivers = clean
    ? drivers.filter(
        (d) =>
          d.name.toLowerCase().includes(clean) ||
          d.cpf.includes(clean) ||
          d.phone.includes(clean)
      ).slice(0, 4)
    : [];

  const hasResults =
    matchingSales.length > 0 ||
    matchingDeliveries.length > 0 ||
    matchingClients.length > 0 ||
    matchingDrivers.length > 0;

  return (
    <div
      id="global-search-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="global-search-modal-container"
        className="w-[calc(100%-24px)] md:w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-sky-600 shrink-0" />
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, CNPJ, CPF, motorista, cidade, nº venda (#00125)..."
            className="w-full bg-transparent text-sm md:text-base font-medium text-slate-800 focus:outline-hidden placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-200/70 hover:bg-slate-200 rounded-md"
          >
            ESC
          </button>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!clean ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Busca Rápida Água Cristal Sul</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Digite o nome de um cliente, motorista, CNPJ, cidade ou código da venda (ex: V-00125 ou ENT-00125)
              </p>
            </div>
          ) : !hasResults ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-semibold text-slate-600">Nenhum resultado encontrado para &quot;{query}&quot;</p>
              <p className="text-xs text-slate-400 mt-1">
                Verifique a ortografia ou tente buscar apenas uma parte do nome ou número.
              </p>
            </div>
          ) : (
            <>
              {/* Sales results */}
              {matchingSales.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-sky-600" />
                    Vendas Encontradas ({matchingSales.length})
                  </h4>
                  <div className="space-y-1.5">
                    {matchingSales.map((sale) => (
                      <div
                        key={sale.id}
                        onClick={() => {
                          onSelectSale(sale);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50/70 border border-slate-100 hover:border-sky-200 cursor-pointer transition-colors group"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded">
                              {sale.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              {sale.client_name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            {formatDate(sale.sale_date)} • {sale.quantity} un • {sale.city} • Mot: {sale.driver_name || 'N/A'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-900 block">
                            {formatCurrency(sale.total_amount)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              sale.payment_status === 'Pago'
                                ? 'bg-emerald-100 text-emerald-700'
                                : sale.payment_status === 'Pendente'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {sale.payment_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliveries results */}
              {matchingDeliveries.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    Entregas ({matchingDeliveries.length})
                  </h4>
                  <div className="space-y-1.5">
                    {matchingDeliveries.map((del) => (
                      <div
                        key={del.id}
                        onClick={() => {
                          onSelectDelivery(del);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/70 border border-slate-100 hover:border-emerald-200 cursor-pointer transition-colors"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                              {del.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              {del.client_name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            {del.address} • {del.quantity} un • Motorista: {del.driver_name}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            del.status === 'Entregue'
                              ? 'bg-emerald-100 text-emerald-700'
                              : del.status === 'Saiu para entrega'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {del.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clients results */}
              {matchingClients.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    Clientes ({matchingClients.length})
                  </h4>
                  <div className="space-y-1.5">
                    {matchingClients.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => {
                          onSelectClient(client);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 cursor-pointer transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">
                            {client.name} {client.trade_name ? `(${client.trade_name})` : ''}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            CNPJ/CPF: {client.cpf_cnpj || 'Não informado'} • {client.city} - {client.state}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drivers results */}
              {matchingDrivers.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Motoristas ({matchingDrivers.length})
                  </h4>
                  <div className="space-y-1.5">
                    {matchingDrivers.map((driver) => (
                      <div
                        key={driver.id}
                        onClick={() => {
                          onSelectDriver(driver);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/70 border border-slate-100 hover:border-indigo-200 cursor-pointer transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">
                            {driver.name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Tel: {driver.phone} • CNH: {driver.cnh} (Cat. {driver.cnh_category})
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {driver.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

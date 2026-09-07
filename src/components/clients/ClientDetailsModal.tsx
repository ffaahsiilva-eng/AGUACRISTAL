import React, { useState, useMemo } from 'react';
import {
  X,
  User,
  Building2,
  Phone,
  MapPin,
  Truck,
  ShoppingCart,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  MessageCircle,
  CreditCard,
  FileText,
  Star,
  ShieldCheck,
  Send,
  ArrowUpRight,
  MoreVertical,
  Check,
} from 'lucide-react';
import { Client, Sale, Delivery, ClientAddress, PaymentMethod } from '../../types';
import { storage } from '../../services/storage';
import {
  calculateClientStats,
  getClientSales,
  getClientDeliveries,
} from '../../utils/clientCalculations';
import {
  formatCurrency,
  formatCpfCnpj,
  formatPhone,
  formatDateToBR,
  getTodayDateString,
} from '../../utils/formatters';
import { ClientAddressModal } from './ClientAddressModal';

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  onEditClient: (client: Client) => void;
  onNewSaleForClient: (client: Client) => void;
  onOpenReceivePayment?: (sale: Sale) => void;
  onNewDeliveryForClient?: (client: Client) => void;
  onClientUpdated?: () => void;
}

type TabType = 'visao-geral' | 'vendas' | 'entregas' | 'financeiro' | 'enderecos' | 'observacoes';

export const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({
  isOpen,
  onClose,
  clientId,
  onEditClient,
  onNewSaleForClient,
  onOpenReceivePayment,
  onNewDeliveryForClient,
  onClientUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('visao-geral');
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ClientAddress | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Quick Payment Modal state
  const [payingSale, setPayingSale] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentObs, setPaymentObs] = useState('');

  // Fetch reactive data from storage
  const clients = storage.getClients();
  const sales = storage.getSales();
  const deliveries = storage.getDeliveries();
  const currentUser = storage.getCurrentUser();
  const canEdit = currentUser.role !== 'VISUALIZACAO';

  const client = useMemo(() => {
    return clients.find((c) => c.id === clientId);
  }, [clients, clientId]);

  const stats = useMemo(() => {
    if (!client) return null;
    return calculateClientStats(client, sales, deliveries);
  }, [client, sales, deliveries]);

  const clientSales = useMemo(() => {
    if (!client) return [];
    return getClientSales(client, sales).sort(
      (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
    );
  }, [client, sales]);

  const clientDeliveries = useMemo(() => {
    if (!client) return [];
    return getClientDeliveries(client, deliveries, clientSales).sort(
      (a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime()
    );
  }, [client, deliveries, clientSales]);

  if (!isOpen || !client || !stats) return null;

  // Handle WhatsApp click
  const handleOpenWhatsApp = () => {
    const rawNumber = client.whatsapp || client.phone;
    if (!rawNumber) return;
    const clean = rawNumber.replace(/\D/g, '');
    const phoneWithDDI = clean.startsWith('55') ? clean : `55${clean}`;
    window.open(`https://wa.me/${phoneWithDDI}`, '_blank');
  };

  // Toggle status
  const handleToggleStatus = () => {
    storage.toggleClientStatus(client.id);
    setShowMoreActions(false);
    onClientUpdated?.();
  };

  // Delete client
  const handleDeleteClient = () => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir o cliente "${client.name}"? Os registros históricos de vendas e entregas serão preservados.`
      )
    ) {
      storage.deleteClient(client.id);
      setShowMoreActions(false);
      onClientUpdated?.();
      onClose();
    }
  };

  // Notes
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    storage.addClientNote(client.id, newNoteText.trim());
    setNewNoteText('');
    onClientUpdated?.();
  };

  // Addresses
  const handleSaveAddress = (addrData: Omit<ClientAddress, 'id'> | ClientAddress) => {
    if ('id' in addrData && addrData.id) {
      storage.updateClientAddress(client.id, addrData as ClientAddress);
    } else {
      storage.addClientAddress(client.id, addrData);
    }
    onClientUpdated?.();
  };

  const handleDeleteAddress = (addressId: string) => {
    if (window.confirm('Deseja remover este endereço adicional?')) {
      storage.deleteClientAddress(client.id, addressId);
      onClientUpdated?.();
    }
  };

  const handleSetDefaultAddress = (addressId: string) => {
    storage.setDefaultClientAddress(client.id, addressId);
    onClientUpdated?.();
  };

  // Quick Payment submission
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSale) return;
    const val = Number(paymentAmount) || 0;
    if (val <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }
    storage.addPayment({
      id: `pay-${Date.now()}`,
      sale_id: payingSale.id,
      date: getTodayDateString(),
      amount: val,
      payment_method: paymentMethod,
      observation: paymentObs.trim() || `Recebimento cliente ${client.name}`,
      registered_by: currentUser.name,
      created_at: new Date().toISOString(),
    });
    setPayingSale(null);
    setPaymentAmount('');
    setPaymentObs('');
    onClientUpdated?.();
  };

  const initials = (client.name || 'C')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Superior */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-4 border-b border-white/10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 text-white font-black text-base flex items-center justify-center shadow-md shrink-0 border border-white/20">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight truncate">
                  {client.name}
                </h2>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    client.status === 'Inativo'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {client.status || 'Ativo'}
                </span>
                {stats.temPendencia && (
                  <span
                    title={`${formatCurrency(stats.totalPendente)} pendente`}
                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                  >
                    PENDÊNCIA: {formatCurrency(stats.totalPendente)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-sky-200/80 mt-0.5 flex-wrap">
                {client.trade_name && <span>Fantasia: {client.trade_name}</span>}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {client.city}
                </span>
                {client.motorista_preferencial_nome && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Motorista: {client.motorista_preferencial_nome}
                    </span>
                  </>
                )}
                {(client.phone || client.whatsapp) && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {client.whatsapp || client.phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Top */}
          <div className="flex items-center gap-2 shrink-0">
            {client.whatsapp && (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                title="Abrir WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onNewSaleForClient(client);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Venda</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditClient(client);
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-colors flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}

            {/* Menu Mais Ações */}
            {canEdit && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="p-1.5 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg"
                  title="Mais ações"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMoreActions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 text-slate-800 text-xs z-20">
                    <button
                      type="button"
                      onClick={handleToggleStatus}
                      className="w-full text-left px-4 py-2 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-500" />
                      {client.status === 'Inativo' ? 'Ativar Cliente' : 'Desativar Cliente'}
                    </button>
                    {currentUser.role === 'ADMINISTRADOR' && (
                      <button
                        type="button"
                        onClick={handleDeleteClient}
                        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 border-t border-slate-100"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir Cliente
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 6 Cards Superiores de Resumo do Cliente */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Comprado
              </span>
              <span className="text-base font-black text-slate-900 block mt-0.5">
                {formatCurrency(stats.totalComprado)}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">acumulado histórico</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total de Compras
              </span>
              <span className="text-base font-black text-slate-900 block mt-0.5">
                {stats.totalVendas}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">pedidos realizados</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Qtd. Comprada
              </span>
              <span className="text-base font-black text-sky-700 block mt-0.5">
                {stats.totalQuantidade.toLocaleString('pt-BR')} un
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">galões 20L</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Entregas Realizadas
              </span>
              <span className="text-base font-black text-emerald-700 block mt-0.5">
                {stats.entregasRealizadas}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">status entregue</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Valor Pendente
              </span>
              <span
                className={`text-base font-black block mt-0.5 ${
                  stats.totalPendente > 0 ? 'text-rose-600' : 'text-slate-700'
                }`}
              >
                {formatCurrency(stats.totalPendente)}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">a receber</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Ticket Médio
              </span>
              <span className="text-base font-black text-indigo-700 block mt-0.5">
                {formatCurrency(stats.ticketMedio)}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">por venda</span>
            </div>
          </div>

          {/* Destaques Rápidos de Logística */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200/80">
            <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-lg border border-slate-200 text-xs">
              <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  Motorista Preferencial & Mais Utilizado
                </span>
                <span className="text-xs font-bold text-slate-800 truncate block">
                  Preferencial:{' '}
                  <strong className="text-slate-900">
                    {client.motorista_preferencial_nome || 'Nenhum fixado'}
                  </strong>
                  {stats.motoristaMaisUtilizado && (
                    <span className="text-indigo-600 font-semibold ml-1.5">
                      • Mais frequente: {stats.motoristaMaisUtilizado.name} ({stats.motoristaMaisUtilizado.count} entregas)
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-lg border border-slate-200 text-xs">
              <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  Última Entrega
                </span>
                <span className="text-xs font-bold text-slate-800 truncate block">
                  {stats.ultimaEntrega ? (
                    <>
                      {formatDateToBR(stats.ultimaEntrega.delivery_date)} •{' '}
                      {stats.ultimaEntrega.driver_name} • {stats.ultimaEntrega.quantity} galões (
                      <span className="text-emerald-700">{stats.ultimaEntrega.status}</span>)
                    </>
                  ) : (
                    <span className="text-slate-500 font-normal">Nenhuma entrega registrada ainda</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="px-6 bg-white border-b border-slate-200 flex overflow-x-auto no-scrollbar gap-2">
          {[
            { id: 'visao-geral', label: 'Visão Geral', icon: Building2 },
            { id: 'vendas', label: `Vendas (${clientSales.length})`, icon: ShoppingCart },
            { id: 'entregas', label: `Entregas (${clientDeliveries.length})`, icon: Truck },
            {
              id: 'financeiro',
              label: `Financeiro ${stats.temPendencia ? '• Pendência' : ''}`,
              icon: DollarSign,
              alert: stats.temPendencia,
            },
            {
              id: 'enderecos',
              label: `Endereços (${(client.enderecos_adicionais?.length || 0) + 1})`,
              icon: MapPin,
            },
            {
              id: 'observacoes',
              label: `Observações (${client.notas_internas?.length || 0})`,
              icon: FileText,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-sky-600 text-sky-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                } ${tab.alert && !isActive ? 'text-rose-600 font-black' : ''}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
          {/* ABA 1: VISÃO GERAL */}
          {activeTab === 'visao-geral' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dados Cadastrais & Contato */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-sky-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Dados Cadastrais & Contato
                    </h3>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Tipo de Pessoa</dt>
                      <dd className="font-bold text-slate-900">{client.tipo_pessoa || 'Pessoa Jurídica'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">CPF / CNPJ</dt>
                      <dd className="font-mono font-bold text-slate-900">
                        {formatCpfCnpj(client.cpf_cnpj)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Inscrição Estadual</dt>
                      <dd className="font-medium text-slate-900">
                        {client.inscricao_estadual || 'Não informada'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Status</dt>
                      <dd className="font-bold text-slate-900">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            client.status === 'Inativo'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {client.status || 'Ativo'}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Telefone</dt>
                      <dd className="font-medium text-slate-900">{formatPhone(client.phone)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">WhatsApp</dt>
                      <dd className="font-medium text-slate-900 flex items-center gap-1">
                        {client.whatsapp ? formatPhone(client.whatsapp) : '-'}
                        {client.whatsapp && (
                          <button
                            type="button"
                            onClick={handleOpenWhatsApp}
                            className="text-emerald-600 hover:text-emerald-700"
                            title="Conversar"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-400 font-medium text-[11px]">E-mail</dt>
                      <dd className="font-medium text-slate-900">{client.email || 'Não informado'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Endereço Principal */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Endereço Principal
                    </h3>
                  </div>
                  <div className="text-xs space-y-2">
                    <p className="font-bold text-slate-900 text-sm">
                      {client.address}
                      {client.number ? `, ${client.number}` : ''}
                      {client.complement ? ` - ${client.complement}` : ''}
                    </p>
                    <p className="text-slate-600 font-medium">
                      Bairro: <strong className="text-slate-900">{client.neighborhood}</strong> • Cidade:{' '}
                      <strong className="text-slate-900">{client.city}</strong> ({client.state || 'MA'})
                    </p>
                    {client.cep && (
                      <p className="text-slate-500 font-mono text-[11px]">CEP: {client.cep}</p>
                    )}
                    {client.referencia && (
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-[11px]">
                        <span className="font-bold block text-slate-500">Ponto de Referência:</span>
                        {client.referencia}
                      </div>
                    )}
                  </div>
                </div>

                {/* Condições Comerciais & Crédito */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Condições Comerciais
                    </h3>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Pagamento Padrão</dt>
                      <dd className="font-bold text-slate-900">
                        {client.forma_pagamento_preferencial || 'PIX'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Prazo Padrão</dt>
                      <dd className="font-bold text-slate-900">{client.prazo_pagamento || 'À vista'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Preço Unitário Padrão</dt>
                      <dd className="font-black text-slate-900 text-sm">
                        {formatCurrency(client.valor_unitario_padrao || 25.5)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Limite de Crédito</dt>
                      <dd className="font-bold text-slate-900">
                        {client.limite_credito ? formatCurrency(client.limite_credito) : 'Não definido'}
                      </dd>
                    </div>
                  </dl>

                  {/* Limite de Crédito visual */}
                  {client.limite_credito && client.limite_credito > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-xs">
                      <div className="flex justify-between text-[11px]">
                        <span>Utilizado: <strong>{formatCurrency(stats.limiteUtilizado)}</strong></span>
                        <span className="font-bold text-emerald-700">
                          Disponível: {formatCurrency(stats.limiteDisponivel)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            stats.limiteUtilizado > client.limite_credito
                              ? 'bg-rose-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((stats.limiteUtilizado / client.limite_credito) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Logística & Entregas */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Regras de Logística
                    </h3>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Motorista Preferencial</dt>
                      <dd className="font-bold text-slate-900">
                        {client.motorista_preferencial_nome || 'Nenhum definido'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Veículo Padrão</dt>
                      <dd className="font-medium text-slate-900">
                        {client.veiculo_preferencial_nome || 'Padrão da frota'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Dia Preferencial</dt>
                      <dd className="font-medium text-slate-900">
                        {client.dia_entrega_preferencial || 'Sob demanda'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium text-[11px]">Horário Preferencial</dt>
                      <dd className="font-medium text-slate-900">
                        {client.horario_entrega_preferencial || 'Horário comercial'}
                      </dd>
                    </div>
                    {client.observacao_entrega && (
                      <div className="col-span-2 p-2 bg-indigo-50/60 rounded-lg border border-indigo-100 text-indigo-900 text-[11px]">
                        <span className="font-bold block text-indigo-700">Instruções de Entrega:</span>
                        {client.observacao_entrega}
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Observações Internas */}
              {(client.observacoes_internas || client.observation) && (
                <div className="border border-slate-200 rounded-xl p-4 bg-amber-50/40">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    Observações Internas
                  </h4>
                  <p className="text-xs text-slate-700 whitespace-pre-line">
                    {client.observacoes_internas || client.observation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: VENDAS */}
          {activeTab === 'vendas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Histórico de Compras do Cliente</h3>
                  <p className="text-xs text-slate-500">
                    Todas as vendas associadas a este cadastro ({clientSales.length} vendas)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNewSaleForClient(client);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Venda
                </button>
              </div>

              {clientSales.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Nenhuma venda cadastrada para este cliente ainda.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3 text-center">Qtd (Galões)</th>
                        <th className="py-2.5 px-3 text-right">Unitário</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3">Pagamento</th>
                        <th className="py-2.5 px-3">Motorista</th>
                        <th className="py-2.5 px-3 text-center">Status Pagto</th>
                        <th className="py-2.5 px-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-700">
                            {sale.code}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {formatDateToBR(sale.sale_date)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                            {sale.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {formatCurrency(sale.unit_price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            {formatCurrency(sale.total_amount)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">
                              {sale.payment_method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            {sale.driver_name}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sale.payment_status === 'Pago'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : sale.payment_status === 'Vencido'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {sale.payment_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {sale.pending_amount > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayingSale(sale);
                                  setPaymentAmount(sale.pending_amount);
                                }}
                                className="text-[11px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200"
                              >
                                Baixar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: ENTREGAS */}
          {activeTab === 'entregas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Histórico de Entregas</h3>
                  <p className="text-xs text-slate-500">
                    Acompanhe as rotas, motoristas e horários de saída/entrega
                  </p>
                </div>
              </div>

              {clientDeliveries.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Nenhuma entrega registrada para este cliente ainda.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Motorista</th>
                        <th className="py-2.5 px-3">Veículo</th>
                        <th className="py-2.5 px-3 text-center">Qtd</th>
                        <th className="py-2.5 px-3">Endereço de Entrega</th>
                        <th className="py-2.5 px-3">Horários</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientDeliveries.map((del) => (
                        <tr key={del.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-700">
                            {del.code}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {formatDateToBR(del.delivery_date)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {del.driver_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {del.vehicle_name || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                            {del.quantity} un
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">
                            {del.address}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-500">
                            {del.departure_time && `Saída: ${del.departure_time}`}
                            {del.delivery_time && ` • Entregue: ${del.delivery_time}`}
                            {!del.departure_time && !del.delivery_time && '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                del.status === 'Entregue'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : del.status === 'Cancelada'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {del.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ABA 4: FINANCEIRO & CONTAS A RECEBER */}
          {activeTab === 'financeiro' && (
            <div className="space-y-6">
              {/* Cards Financeiros */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Faturado
                  </span>
                  <span className="text-base font-black text-slate-900 block mt-0.5">
                    {formatCurrency(stats.totalComprado)}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Recebido
                  </span>
                  <span className="text-base font-black text-emerald-600 block mt-0.5">
                    {formatCurrency(stats.totalPago)}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Pendente
                  </span>
                  <span
                    className={`text-base font-black block mt-0.5 ${
                      stats.totalPendente > 0 ? 'text-amber-600' : 'text-slate-700'
                    }`}
                  >
                    {formatCurrency(stats.totalPendente)}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Vencido
                  </span>
                  <span
                    className={`text-base font-black block mt-0.5 ${
                      stats.totalVencido > 0 ? 'text-rose-600' : 'text-slate-700'
                    }`}
                  >
                    {formatCurrency(stats.totalVencido)}
                  </span>
                </div>
              </div>

              {/* Tabela de Contas a Receber */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Contas a Receber deste Cliente
                  </h4>
                  {stats.totalPendente > 0 && (
                    <span className="text-xs text-rose-700 font-bold bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                      Saldo Devedor Total: {formatCurrency(stats.totalPendente)}
                    </span>
                  )}
                </div>

                {clientSales.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                    Nenhum título financeiro encontrado para este cliente.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Venda</th>
                          <th className="py-2.5 px-3">Data Venda</th>
                          <th className="py-2.5 px-3">Vencimento</th>
                          <th className="py-2.5 px-3 text-right">Valor Total</th>
                          <th className="py-2.5 px-3 text-right">Pago</th>
                          <th className="py-2.5 px-3 text-right">Saldo Devedor</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clientSales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-mono font-bold text-sky-700">
                              {sale.code}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {formatDateToBR(sale.sale_date)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {sale.due_date ? formatDateToBR(sale.due_date) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatCurrency(sale.total_amount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                              {formatCurrency(sale.amount_paid)}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-black ${
                                sale.pending_amount > 0 ? 'text-rose-600' : 'text-slate-400'
                              }`}
                            >
                              {formatCurrency(sale.pending_amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sale.payment_status === 'Pago'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : sale.payment_status === 'Vencido'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {sale.payment_status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {sale.pending_amount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPayingSale(sale);
                                    setPaymentAmount(sale.pending_amount);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-2xs"
                                >
                                  Registrar Pagamento
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">Liquidado</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 5: ENDEREÇOS MÚLTIPLOS */}
          {activeTab === 'enderecos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Locais de Entrega & Filiais</h3>
                  <p className="text-xs text-slate-500">
                    Cadastre múltiplos pontos de entrega para este cliente (filiais, galpões, depósitos)
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAddress(null);
                      setIsAddressModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Endereço
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Endereço Principal do Cadastro */}
                <div className="p-4 rounded-xl border-2 border-sky-300 bg-sky-50/40 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-sky-600 text-white px-2 py-0.5 rounded-full">
                      Endereço Principal
                    </span>
                    <Star className="w-4 h-4 text-sky-600 fill-sky-600" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Matriz / Ponto Principal</h4>
                  <p className="text-xs text-slate-700 mt-1 font-medium">
                    {client.address}
                    {client.number ? `, ${client.number}` : ''}
                    {client.complement ? ` - ${client.complement}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {client.neighborhood} • {client.city} ({client.state || 'MA'})
                  </p>
                  {client.referencia && (
                    <p className="text-[11px] text-slate-600 mt-2 bg-white/80 p-1.5 rounded border border-sky-100">
                      Ref: {client.referencia}
                    </p>
                  )}
                </div>

                {/* Endereços Adicionais */}
                {(client.enderecos_adicionais || []).map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-xl border bg-white shadow-2xs relative ${
                      addr.principal ? 'border-2 border-sky-400 bg-sky-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-900">{addr.nome_local}</span>
                      {addr.principal && (
                        <span className="text-[10px] font-black bg-sky-600 text-white px-2 py-0.5 rounded-full">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 mt-1 font-medium">
                      {addr.logradouro}
                      {addr.numero ? `, ${addr.numero}` : ''}
                      {addr.complemento ? ` - ${addr.complemento}` : ''}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {addr.bairro} • {addr.cidade} ({addr.estado})
                    </p>
                    {addr.referencia && (
                      <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                        Ref: {addr.referencia}
                      </p>
                    )}

                    {canEdit && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        {!addr.principal && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-[11px] font-bold text-sky-600 hover:text-sky-800"
                          >
                            Definir como Principal
                          </button>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAddress(addr);
                              setIsAddressModalOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-slate-800"
                            title="Editar endereço"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                            title="Excluir endereço"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 6: OBSERVAÇÕES & HISTÓRICO DE ANOTAÇÕES */}
          {activeTab === 'observacoes' && (
            <div className="space-y-6">
              {/* Formulário de Nova Anotação */}
              {canEdit && (
                <form
                  onSubmit={handleAddNote}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
                >
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Registrar Nova Observação Interna
                  </label>
                  <textarea
                    rows={2}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Ex: Cliente solicitou que as entregas sejam realizadas sempre antes das 10h da manhã."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newNoteText.trim()}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Registrar Anotação
                    </button>
                  </div>
                </form>
              )}

              {/* Lista do Histórico de Observações */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Histórico de Registros
                </h4>

                {(!client.notas_internas || client.notas_internas.length === 0) &&
                !client.observacoes_internas &&
                !client.observation ? (
                  <div className="py-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 text-xs">
                    Nenhuma anotação registrada ainda. Use o campo acima para adicionar anotações internas.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Nota principal se existir */}
                    {(client.observacoes_internas || client.observation) && (
                      <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 text-xs">
                        <div className="flex items-center justify-between text-[11px] text-amber-900 font-bold mb-1">
                          <span>Anotação Geral do Cadastro</span>
                          <span className="text-slate-500 font-normal">
                            Criado em: {formatDateToBR(client.created_at)}
                          </span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-line">
                          {client.observacoes_internas || client.observation}
                        </p>
                      </div>
                    )}

                    {(client.notas_internas || []).map((note) => (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
                          <span className="text-sky-700 font-bold">{note.usuario}</span>
                          <span>
                            {new Date(note.data).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(note.data).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-line">{note.observacao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal para Adicionar / Editar Endereço Adicional */}
        {isAddressModalOpen && (
          <ClientAddressModal
            isOpen={isAddressModalOpen}
            onClose={() => {
              setIsAddressModalOpen(false);
              setEditingAddress(null);
            }}
            addressToEdit={editingAddress}
            onSave={handleSaveAddress}
          />
        )}

        {/* Sub-modal Rápido para Registrar Pagamento */}
        {payingSale && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-5 py-3.5 bg-emerald-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  <h3 className="text-sm font-bold">Registrar Pagamento de Venda</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPayingSale(null)}
                  className="p-1 rounded text-white/80 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmPayment} className="p-5 space-y-4 text-slate-800 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900">
                    Venda: <span className="font-mono text-sky-700">{payingSale.code}</span>
                  </p>
                  <p className="text-slate-600">
                    Cliente: <strong>{client.name}</strong>
                  </p>
                  <p className="text-slate-600">
                    Valor da Venda: <strong>{formatCurrency(payingSale.total_amount)}</strong>
                  </p>
                  <p className="text-rose-700 font-bold">
                    Saldo Restante: {formatCurrency(payingSale.pending_amount)}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Valor a Receber (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={payingSale.pending_amount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PIX">PIX</option>
                    <option value="PIX Empresa">PIX Empresa</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Cartão">Cartão</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observação do Recebimento</label>
                  <input
                    type="text"
                    value={paymentObs}
                    onChange={(e) => setPaymentObs(e.target.value)}
                    placeholder="Ex: Comprovante enviado no WhatsApp"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPayingSale(null)}
                    className="px-3 py-1.5 font-bold text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Confirmar Recebimento
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

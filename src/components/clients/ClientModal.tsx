import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Building2,
  MapPin,
  Truck,
  CreditCard,
  FileText,
  AlertTriangle,
  Loader2,
  Check,
  Search,
} from 'lucide-react';
import { Client, PaymentMethod } from '../../types';
import { storage } from '../../services/storage';
import { fetchAddressByCep, calculateClientStats } from '../../utils/clientCalculations';
import { formatCurrency, formatCpfCnpj, formatPhone } from '../../utils/formatters';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
  onSaved: (client: Client, andOpenSale?: boolean) => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  clientToEdit,
  onSaved,
}) => {
  const drivers = storage.getDrivers().filter((d) => !d.is_deleted);
  const vehicles = storage.getVehicles().filter((v) => !v.is_deleted);
  const existingClients = storage.getClients().filter((c) => !c.is_deleted);
  const sales = storage.getSales();
  const deliveries = storage.getDeliveries();

  // 1. Dados Principais
  const [tipoPessoa, setTipoPessoa] = useState<'Pessoa Jurídica' | 'Pessoa Física'>('Pessoa Jurídica');
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  // 2. Endereço
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Imperatriz-MA');
  const [state, setState] = useState('MA');
  const [referencia, setReferencia] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepMessage, setCepMessage] = useState<string | null>(null);

  // 3. Entrega
  const [motoristaPreferencialId, setMotoristaPreferencialId] = useState('');
  const [veiculoPreferencialId, setVeiculoPreferencialId] = useState('');
  const [diaEntrega, setDiaEntrega] = useState('');
  const [horarioEntrega, setHorarioEntrega] = useState('');
  const [observacaoEntrega, setObservacaoEntrega] = useState('');

  // 4. Comercial
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>('PIX');
  const [prazoPagamento, setPrazoPagamento] = useState('À vista');
  const [valorUnitarioPadrao, setValorUnitarioPadrao] = useState<string | number>('25.50');
  const [limiteCredito, setLimiteCredito] = useState<string | number>('');

  // 5. Observações
  const [observacoesInternas, setObservacoesInternas] = useState('');

  // Validation & feedback state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Populate or reset form
  useEffect(() => {
    if (clientToEdit) {
      setTipoPessoa(clientToEdit.tipo_pessoa || (clientToEdit.cpf_cnpj?.length > 14 ? 'Pessoa Jurídica' : 'Pessoa Física'));
      setName(clientToEdit.name || '');
      setTradeName(clientToEdit.trade_name || '');
      setCpfCnpj(clientToEdit.cpf_cnpj || '');
      setInscricaoEstadual(clientToEdit.inscricao_estadual || '');
      setPhone(clientToEdit.phone || '');
      setWhatsapp(clientToEdit.whatsapp || '');
      setEmail(clientToEdit.email || '');
      setStatus((clientToEdit.status as 'Ativo' | 'Inativo') || 'Ativo');

      setCep(clientToEdit.cep || '');
      setAddress(clientToEdit.address || '');
      setNumber(clientToEdit.number || '');
      setComplement(clientToEdit.complement || '');
      setNeighborhood(clientToEdit.neighborhood || '');
      setCity(clientToEdit.city || 'Imperatriz-MA');
      setState(clientToEdit.state || 'MA');
      setReferencia(clientToEdit.referencia || '');

      setMotoristaPreferencialId(clientToEdit.motorista_preferencial_id || '');
      setVeiculoPreferencialId(clientToEdit.veiculo_preferencial_id || '');
      setDiaEntrega(clientToEdit.dia_entrega_preferencial || '');
      setHorarioEntrega(clientToEdit.horario_entrega_preferencial || '');
      setObservacaoEntrega(clientToEdit.observacao_entrega || '');

      setFormaPagamento(clientToEdit.forma_pagamento_preferencial || 'PIX');
      setPrazoPagamento(clientToEdit.prazo_pagamento || 'À vista');
      setValorUnitarioPadrao(
        clientToEdit.valor_unitario_padrao !== undefined
          ? clientToEdit.valor_unitario_padrao
          : '25.50'
      );
      setLimiteCredito(clientToEdit.limite_credito !== undefined ? clientToEdit.limite_credito : '');
      setObservacoesInternas(clientToEdit.observacoes_internas || clientToEdit.observation || '');
    } else {
      setTipoPessoa('Pessoa Jurídica');
      setName('');
      setTradeName('');
      setCpfCnpj('');
      setInscricaoEstadual('');
      setPhone('');
      setWhatsapp('');
      setEmail('');
      setStatus('Ativo');

      setCep('');
      setAddress('');
      setNumber('');
      setComplement('');
      setNeighborhood('');
      setCity('Imperatriz-MA');
      setState('MA');
      setReferencia('');

      setMotoristaPreferencialId(drivers[0]?.id || '');
      setVeiculoPreferencialId(vehicles[0]?.id || '');
      setDiaEntrega('');
      setHorarioEntrega('');
      setObservacaoEntrega('');

      setFormaPagamento('PIX');
      setPrazoPagamento('À vista');
      setValorUnitarioPadrao('25.50');
      setLimiteCredito('');
      setObservacoesInternas('');
    }
    setErrors({});
    setDuplicateWarning(null);
    setCepMessage(null);
  }, [clientToEdit, isOpen]);

  // Current client credit stats if editing
  const existingStats = useMemo(() => {
    if (!clientToEdit) return null;
    return calculateClientStats(clientToEdit, sales, deliveries);
  }, [clientToEdit, sales, deliveries]);

  // Duplicate checks
  useEffect(() => {
    if (!cpfCnpj.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const cleanDoc = cpfCnpj.replace(/\D/g, '');
    if (cleanDoc.length > 5) {
      const matchDoc = existingClients.find((c) => {
        if (clientToEdit && c.id === clientToEdit.id) return false;
        const cDoc = (c.cpf_cnpj || '').replace(/\D/g, '');
        return cDoc === cleanDoc;
      });
      if (matchDoc) {
        setDuplicateWarning(`Já existe um cliente cadastrado com este CPF/CNPJ: "${matchDoc.name}"`);
        return;
      }
    }

    // Name + phone warning
    if (name.trim().length > 3 && phone.trim().length > 6) {
      const matchNamePhone = existingClients.find((c) => {
        if (clientToEdit && c.id === clientToEdit.id) return false;
        const cleanP = phone.replace(/\D/g, '');
        const cPhone = (c.phone || '').replace(/\D/g, '');
        return c.name.toLowerCase().trim() === name.toLowerCase().trim() && cPhone === cleanP;
      });
      if (matchNamePhone) {
        setDuplicateWarning(`Atenção: Já existe um cliente com o mesmo nome e telefone: "${matchNamePhone.name}"`);
        return;
      }
    }

    setDuplicateWarning(null);
  }, [cpfCnpj, name, phone, clientToEdit, existingClients]);

  // CEP search
  const handleCepBlur = async () => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setIsSearchingCep(true);
    setCepMessage(null);
    try {
      const result = await fetchAddressByCep(clean);
      if (result) {
        if (result.erro) {
          setCepMessage('CEP não encontrado na base dos Correios. Preencha manualmente.');
        } else {
          if (result.logradouro) setAddress(result.logradouro);
          if (result.bairro) setNeighborhood(result.bairro);
          if (result.localidade) setCity(`${result.localidade}-${result.uf || 'MA'}`);
          if (result.uf) setState(result.uf);
          setCepMessage('Endereço localizado com sucesso via CEP!');
        }
      }
    } catch {
      setCepMessage('Não foi possível consultar o CEP. Preencha manualmente.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleSave = (andOpenSale = false) => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Nome ou Razão Social é obrigatório.';
    }
    if (!address.trim()) {
      newErrors.address = 'Endereço / Logradouro é obrigatório.';
    }
    if (!neighborhood.trim()) {
      newErrors.neighborhood = 'Bairro é obrigatório.';
    }
    if (!city.trim()) {
      newErrors.city = 'Cidade é obrigatória.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstField = Object.keys(newErrors)[0];
      const el = document.getElementById(`client-field-${firstField}`);
      if (el) el.focus();
      return;
    }

    // Resolve driver name
    const selectedDriver = drivers.find((d) => d.id === motoristaPreferencialId);
    const selectedVehicle = vehicles.find((v) => v.id === veiculoPreferencialId);

    const clientId = clientToEdit ? clientToEdit.id : `cli-${Date.now()}`;
    const now = new Date().toISOString();

    const clientPayload: Client = {
      id: clientId,
      tipo_pessoa: tipoPessoa,
      name: name.trim(),
      trade_name: tradeName.trim() || undefined,
      cpf_cnpj: cpfCnpj.trim() || '0',
      inscricao_estadual: inscricaoEstadual.trim() || undefined,
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || undefined,
      email: email.trim() || undefined,
      status,

      cep: cep.trim() || undefined,
      address: address.trim(),
      number: number.trim() || undefined,
      complement: complement.trim() || undefined,
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim() || 'MA',
      referencia: referencia.trim() || undefined,

      motorista_preferencial_id: motoristaPreferencialId || undefined,
      motorista_preferencial_nome: selectedDriver?.name || undefined,
      veiculo_preferencial_id: veiculoPreferencialId || undefined,
      veiculo_preferencial_nome: selectedVehicle ? `${selectedVehicle.model} (${selectedVehicle.plate})` : undefined,
      dia_entrega_preferencial: diaEntrega || undefined,
      horario_entrega_preferencial: horarioEntrega.trim() || undefined,
      observacao_entrega: observacaoEntrega.trim() || undefined,

      forma_pagamento_preferencial: formaPagamento,
      prazo_pagamento: prazoPagamento || 'À vista',
      valor_unitario_padrao: valorUnitarioPadrao !== '' ? Number(valorUnitarioPadrao) : undefined,
      limite_credito: limiteCredito !== '' ? Number(limiteCredito) : undefined,
      observacoes_internas: observacoesInternas.trim() || undefined,
      observation: observacoesInternas.trim() || undefined,

      enderecos_adicionais: clientToEdit?.enderecos_adicionais || [],
      notas_internas: clientToEdit?.notas_internas || [],
      created_at: clientToEdit?.created_at || now,
      updated_at: now,
    };

    const saved = storage.saveClient(clientPayload);
    onSaved(saved, andOpenSale);
    onClose();
  };

  if (!isOpen) return null;

  const numLimit = Number(limiteCredito) || 0;
  const usedCredit = existingStats?.limiteUtilizado || 0;
  const availableCredit = Math.max(0, numLimit - usedCredit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-700 via-sky-800 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <User className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <p className="text-xs text-sky-200">
                Cadastro de dados comerciais, endereço de entrega e regras de faturamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate warning banner */}
        {duplicateWarning && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs font-semibold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
          {/* SEÇÃO 1: DADOS PRINCIPAIS */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  1. Dados Principais
                </h3>
              </div>
              {/* Tipo de Pessoa Toggle */}
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setTipoPessoa('Pessoa Jurídica')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    tipoPessoa === 'Pessoa Jurídica'
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pessoa Jurídica
                </button>
                <button
                  type="button"
                  onClick={() => setTipoPessoa('Pessoa Física')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    tipoPessoa === 'Pessoa Física'
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pessoa Física
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-8">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome / Razão Social <span className="text-rose-500">*</span>
                </label>
                <input
                  id="client-field-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: SUPER MERCADO FC LTDA"
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 font-medium ${
                    errors.name ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                  }`}
                  required
                />
                {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="Ex: Super Mercado FC"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {tipoPessoa === 'Pessoa Jurídica' ? 'CNPJ' : 'CPF'}
                </label>
                <input
                  type="text"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  placeholder={tipoPessoa === 'Pessoa Jurídica' ? '00.000.000/0001-00' : '000.000.000-00'}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Inscrição Estadual (IE)
                </label>
                <input
                  type="text"
                  value={inscricaoEstadual}
                  onChange={(e) => setInscricaoEstadual(e.target.value)}
                  placeholder="Ex: 12.345.678-9 ou ISENTO"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Ativo' | 'Inativo')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white font-semibold"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telefone Principal
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(99) 3523-1122"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp (Mensagens/Cobrança)
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(99) 98111-2233"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail Comercial
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="compras@cliente.com.br"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: ENDEREÇO */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                2. Endereço de Entrega
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>CEP</span>
                  {isSearchingCep && (
                    <span className="text-[10px] text-sky-600 flex items-center gap-1 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    onBlur={handleCepBlur}
                    placeholder="65900-000"
                    maxLength={10}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono pr-8"
                  />
                  <button
                    type="button"
                    onClick={handleCepBlur}
                    title="Buscar CEP"
                    className="absolute right-2 top-2 text-slate-400 hover:text-sky-600"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
                {cepMessage && (
                  <p
                    className={`text-[10px] mt-1 ${
                      cepMessage.includes('sucesso') ? 'text-emerald-600 font-medium' : 'text-amber-700'
                    }`}
                  >
                    {cepMessage}
                  </p>
                )}
              </div>

              <div className="md:col-span-7">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Endereço / Logradouro <span className="text-rose-500">*</span>
                </label>
                <input
                  id="client-field-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: RUA GODOFREDO VIANA"
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                    errors.address ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                  }`}
                  required
                />
                {errors.address && <p className="text-[11px] text-rose-600 mt-1">{errors.address}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="245 ou S/N"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bairro <span className="text-rose-500">*</span>
                </label>
                <input
                  id="client-field-neighborhood"
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Bacuri, Centro, Nova Imperatriz"
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                    errors.neighborhood ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                  }`}
                  required
                />
                {errors.neighborhood && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.neighborhood}</p>
                )}
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cidade <span className="text-rose-500">*</span>
                </label>
                <input
                  id="client-field-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Imperatriz-MA ou João Lisboa"
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                    errors.city ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
                  }`}
                  required
                />
                {errors.city && <p className="text-[11px] text-rose-600 mt-1">{errors.city}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="MA"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-center uppercase"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Sala 1, Galpão A"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-12">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ponto de Referência
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ex: Próximo ao Mercado Central / Em frente ao Posto Alvorada"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: ENTREGA */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                3. Diretrizes de Entrega e Logística
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motorista Preferencial
                </label>
                <select
                  value={motoristaPreferencialId}
                  onChange={(e) => setMotoristaPreferencialId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="">Sem motorista fixo (definir na entrega)</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.phone ? `(${d.phone})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Será preenchido automaticamente ao abrir uma nova venda, podendo ser alterado.
                </p>
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Veículo Preferencial
                </label>
                <select
                  value={veiculoPreferencialId}
                  onChange={(e) => setVeiculoPreferencialId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="">Padrão da frota</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model} - Placa: {v.plate}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dia Preferencial de Entrega
                </label>
                <select
                  value={diaEntrega}
                  onChange={(e) => setDiaEntrega(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="">Qualquer dia</option>
                  <option value="Segunda-feira">Segunda-feira</option>
                  <option value="Terça-feira">Terça-feira</option>
                  <option value="Quarta-feira">Quarta-feira</option>
                  <option value="Quinta-feira">Quinta-feira</option>
                  <option value="Sexta-feira">Sexta-feira</option>
                  <option value="Sábado">Sábado</option>
                  <option value="Diário">Diário (Reposição constante)</option>
                  <option value="Sob Demanda">Sob Demanda (Cliente liga)</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Horário Preferencial
                </label>
                <input
                  type="text"
                  value={horarioEntrega}
                  onChange={(e) => setHorarioEntrega(e.target.value)}
                  placeholder="Ex: Antes das 10h / Pela manhã"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instruções Específicas de Entrega
                </label>
                <input
                  type="text"
                  value={observacaoEntrega}
                  onChange={(e) => setObservacaoEntrega(e.target.value)}
                  placeholder="Ex: Entregar sempre pela entrada lateral de carga"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: COMERCIAL & CRÉDITO */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                4. Condições Comerciais & Limite de Crédito
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Forma de Pagamento Padrão
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white font-medium"
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="PIX Empresa">PIX Empresa</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prazo Padrão de Pagamento
                </label>
                <select
                  value={prazoPagamento}
                  onChange={(e) => setPrazoPagamento(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white font-medium"
                >
                  <option value="À vista">À vista</option>
                  <option value="7 dias">7 dias</option>
                  <option value="15 dias">15 dias</option>
                  <option value="30 dias">30 dias</option>
                  <option value="Quizenal">Quinzenal</option>
                  <option value="Fechamento Mensal">Fechamento Mensal</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Preço Unitário Padrão (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={valorUnitarioPadrao}
                    onChange={(e) => setValorUnitarioPadrao(e.target.value)}
                    placeholder="25,50"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-bold text-slate-900"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Valor que virá pré-preenchido ao vender para este cliente.
                </p>
              </div>

              {/* Limite de Crédito */}
              <div className="md:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Limite de Crédito Concedido (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={limiteCredito}
                    onChange={(e) => setLimiteCredito(e.target.value)}
                    placeholder="Ex: 10000.00"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-medium"
                  />
                </div>
              </div>

              {/* Visualização de Crédito */}
              <div className="md:col-span-6 flex flex-col justify-end">
                {numLimit > 0 ? (
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Limite: {formatCurrency(numLimit)}</span>
                      <span className="text-amber-700">Utilizado: {formatCurrency(usedCredit)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${
                          usedCredit > numLimit ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((usedCredit / numLimit) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{Math.round((usedCredit / numLimit) * 100)}% tomado</span>
                      <span className="font-bold text-emerald-700">
                        Disponível: {formatCurrency(availableCredit)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                    Nenhum limite fixado. Vendas a prazo sujeitas a aprovação direta.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: OBSERVAÇÕES INTERNAS */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                5. Observações Internas
              </h3>
            </div>
            <textarea
              rows={3}
              value={observacoesInternas}
              onChange={(e) => setObservacoesInternas(e.target.value)}
              placeholder="Ex: Cliente compra normalmente às sextas-feiras. Contato com o Sr. Marcos do setor de compras."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[10px] text-slate-400">
              Campo de anotação restrito à equipe interna da Água Cristal Sul.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              Salvar e Nova Venda
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              Salvar Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

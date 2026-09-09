import React, { useState, useEffect } from 'react';
import { X, MapPin, Check, Search, Loader2 } from 'lucide-react';
import { ClientAddress } from '../../types';
import { fetchAddressByCep } from '../../utils/clientCalculations';

interface ClientAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  addressToEdit?: ClientAddress | null;
  onSave: (address: Omit<ClientAddress, 'id'> | ClientAddress) => void;
}

export const ClientAddressModal: React.FC<ClientAddressModalProps> = ({
  isOpen,
  onClose,
  addressToEdit,
  onSave,
}) => {
  const [nomeLocal, setNomeLocal] = useState('Filial 01');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('Imperatriz-MA');
  const [estado, setEstado] = useState('MA');
  const [referencia, setReferencia] = useState('');
  const [principal, setPrincipal] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (addressToEdit) {
      setNomeLocal(addressToEdit.nome_local || 'Filial 01');
      setCep(addressToEdit.cep || '');
      setLogradouro(addressToEdit.logradouro || '');
      setNumero(addressToEdit.numero || '');
      setComplemento(addressToEdit.complemento || '');
      setBairro(addressToEdit.bairro || '');
      setCidade(addressToEdit.cidade || 'Imperatriz-MA');
      setEstado(addressToEdit.estado || 'MA');
      setReferencia(addressToEdit.referencia || '');
      setPrincipal(!!addressToEdit.principal);
    } else {
      setNomeLocal('');
      setCep('');
      setLogradouro('');
      setNumero('');
      setComplemento('');
      setBairro('');
      setCidade('Imperatriz-MA');
      setEstado('MA');
      setReferencia('');
      setPrincipal(false);
    }
    setError('');
  }, [addressToEdit, isOpen]);

  const handleCepBlur = async () => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const res = await fetchAddressByCep(clean);
      if (res && !res.erro) {
        if (res.logradouro) setLogradouro(res.logradouro);
        if (res.bairro) setBairro(res.bairro);
        if (res.localidade) setCidade(`${res.localidade}-${res.uf || 'MA'}`);
        if (res.uf) setEstado(res.uf);
      }
    } catch {
      // ignore
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeLocal.trim()) {
      setError('Informe a identificação do local (ex: Filial 01, Depósito Central).');
      return;
    }
    if (!logradouro.trim()) {
      setError('Logradouro/Rua é obrigatório.');
      return;
    }
    if (!bairro.trim()) {
      setError('Bairro é obrigatório.');
      return;
    }
    if (!cidade.trim()) {
      setError('Cidade é obrigatória.');
      return;
    }

    if (addressToEdit) {
      onSave({
        ...addressToEdit,
        nome_local: nomeLocal.trim(),
        cep: cep.trim() || undefined,
        logradouro: logradouro.trim(),
        numero: numero.trim() || undefined,
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        estado: estado.trim() || 'MA',
        referencia: referencia.trim() || undefined,
        principal,
        updated_at: new Date().toISOString(),
      });
    } else {
      onSave({
        cliente_id: '',
        nome_local: nomeLocal.trim(),
        cep: cep.trim() || undefined,
        logradouro: logradouro.trim(),
        numero: numero.trim() || undefined,
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        estado: estado.trim() || 'MA',
        referencia: referencia.trim() || undefined,
        principal,
      });
    }
    onClose();
  };

  
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold">
              {addressToEdit ? 'Editar Endereço' : 'Adicionar Novo Endereço'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-slate-800">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Identificação do Local *
            </label>
            <input
              type="text"
              value={nomeLocal}
              onChange={(e) => setNomeLocal(e.target.value)}
              placeholder="Ex: Filial 01, Depósito Bacuri, Galpão de Carga"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>CEP</span>
                {isSearchingCep && <Loader2 className="w-3 h-3 animate-spin text-sky-600" />}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  onBlur={handleCepBlur}
                  placeholder="65900-000"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleCepBlur}
                  className="absolute right-2 top-2 text-slate-400 hover:text-sky-600"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="col-span-8">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Logradouro / Rua *
              </label>
              <input
                type="text"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                placeholder="Ex: Av. Bernardo Sayão"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Número
              </label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="1020 ou S/N"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bairro *
              </label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex: Bacuri"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cidade *
              </label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Imperatriz-MA"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div className="col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Complemento
              </label>
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Galpão 2"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estado
              </label>
              <input
                type="text"
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="MA"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 uppercase text-center"
              />
            </div>

            <div className="col-span-12">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ponto de Referência
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ex: Próximo à rotatória"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={principal}
                onChange={(e) => setPrincipal(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-slate-700">
                Definir este endereço como o principal para entregas
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar Endereço
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

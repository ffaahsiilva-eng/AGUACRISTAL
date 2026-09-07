export type UserRole = 'ADMINISTRADOR' | 'OPERADOR' | 'VISUALIZACAO';
export type UserStatus = 'Ativo' | 'Pendente' | 'Inativo' | 'Bloqueado';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
  avatarUrl?: string;
  password?: string;
  password_hash?: string;
  salt?: string;
  email_verified?: boolean;
  ultimo_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  token: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  rememberMe: boolean;
  expiresAt: number; // timestamp in ms
  createdAt: number;
}

export interface PasswordResetToken {
  id: string;
  email: string;
  token: string;
  expires_at: string; // ISO string
  used: boolean;
  created_at: string;
}

export type PaymentMethod = 
  | 'Dinheiro' 
  | 'PIX' 
  | 'PIX Empresa' 
  | 'Boleto' 
  | 'Transferência' 
  | 'Cartão' 
  | 'Outro';

export type PaymentStatus = 'Pago' | 'Pendente' | 'Parcial' | 'Vencido';

export type DeliveryStatus = 'Aguardando' | 'Saiu para entrega' | 'Entregue' | 'Cancelada' | 'Devolvida';

export type SaleStatus = 'Aberta' | 'Confirmada' | 'Em entrega' | 'Concluída' | 'Cancelada';

export interface ClientAddress {
  id: string;
  cliente_id: string;
  nome_local: string; // Ex: 'Principal', 'Filial 01', 'Depósito', 'Galpão'
  cep?: string;
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  referencia?: string;
  principal: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClientNote {
  id: string;
  cliente_id: string;
  data: string; // ISO string or format
  usuario: string;
  observacao: string;
}

export interface Client {
  id: string;
  tipo_pessoa?: 'Pessoa Física' | 'Pessoa Jurídica';
  name: string;
  trade_name?: string;
  cpf_cnpj: string;
  inscricao_estadual?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  address: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  referencia?: string;
  // Entrega
  motorista_preferencial_id?: string;
  motorista_preferencial_nome?: string;
  veiculo_preferencial_id?: string;
  veiculo_preferencial_nome?: string;
  dia_entrega_preferencial?: string;
  horario_entrega_preferencial?: string;
  observacao_entrega?: string;
  // Comercial
  forma_pagamento_preferencial?: PaymentMethod;
  prazo_pagamento?: string;
  valor_unitario_padrao?: number;
  limite_credito?: number;
  observacoes_internas?: string;
  // Endereços adicionais & notas
  enderecos_adicionais?: ClientAddress[];
  notas_internas?: ClientNote[];
  // Status
  status?: 'Ativo' | 'Inativo' | string;
  observation?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  cpf: string;
  cnh: string;
  cnh_category: string;
  cnh_expiry?: string;
  commission_rate_default?: number;
  status: 'Ativo' | 'Inativo';
  observation?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year?: number;
  status: 'Ativo' | 'Em Manutenção' | 'Inativo';
  observation?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Sale {
  id: string;
  code: string; // e.g. V-00125
  sale_date: string; // YYYY-MM-DD
  client_id?: string;
  client_name: string;
  client_document?: string;
  phone?: string;
  address: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state?: string;
  driver_id?: string;
  driver_name: string;
  vehicle_id?: string;
  vehicle_name?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  sale_status?: SaleStatus;
  due_date?: string; // YYYY-MM-DD
  delivery_status?: DeliveryStatus;
  amount_paid: number;
  pending_amount: number;
  commission_rate: number; // percentage, e.g. 2.5
  commission_amount: number;
  observation?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Delivery {
  id: string;
  code: string; // e.g. ENT-00125
  sale_id?: string;
  sale_code?: string;
  delivery_date: string; // YYYY-MM-DD
  client_name: string;
  address: string;
  city: string;
  quantity: number;
  driver_id?: string;
  driver_name: string;
  vehicle_id?: string;
  vehicle_name?: string;
  departure_time?: string; // HH:mm
  delivery_time?: string; // HH:mm
  status: DeliveryStatus;
  observation?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  is_system?: boolean;
}

export interface Expense {
  id: string;
  code: string; // e.g. DESP-0042
  expense_date: string; // YYYY-MM-DD
  description: string;
  category_id: string;
  category_name: string;
  amount: number;
  payment_method: PaymentMethod;
  driver_id?: string;
  driver_name?: string;
  vehicle_id?: string;
  vehicle_name?: string;
  sale_id?: string;
  supplier?: string;
  doc_number?: string;
  receipt_attachment?: string;
  // Fuel fields
  is_fuel?: boolean;
  fuel_liters?: number;
  fuel_price_per_liter?: number;
  fuel_odometer?: number;
  gas_station?: string;
  observation?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PaymentRecord {
  id: string;
  sale_id: string;
  date: string;
  amount: number;
  payment_method: PaymentMethod;
  observation?: string;
  registered_by: string;
  created_at: string;
}

export interface CompanySettings {
  company_name: string;
  trade_name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  default_commission_rate: number; // e.g. 2.5
  default_unit_price: number; // e.g. 27.50
  currency: string;
  require_admin_approval_for_new_users?: boolean; // Exigir aprovação do administrador por padrão
}

export interface CompanyInfo {
  name: string;
  trade_name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  default_gallon_price: number;
  default_driver_commission: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_name: string;
  user_id: string;
  action:
    | 'Criação'
    | 'Alteração'
    | 'Exclusão'
    | 'Pagamento'
    | 'Entrega'
    | 'Login'
    | 'Logout'
    | 'Aprovação'
    | 'Solicitação'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | string;
  entity_type: 'Venda' | 'Entrega' | 'Cliente' | 'Motorista' | 'Despesa' | 'Pagamento' | 'Configuração' | 'Sessão' | 'Segurança' | string;
  entity?: string;
  entity_id: string;
  description: string;
  details?: string;
  old_value?: string;
  new_value?: string;
}

export type ActiveTab = 
  | 'dashboard'
  | 'vendas'
  | 'entregas'
  | 'clientes'
  | 'motoristas'
  | 'despesas'
  | 'contas-receber'
  | 'financeiro'
  | 'comissoes'
  | 'relatorios'
  | 'fechamento-mensal'
  | 'configuracoes';

export type DateFilterType = 
  | 'hoje'
  | 'ontem'
  | '7dias'
  | 'este_mes'
  | 'mes_anterior'
  | 'este_ano'
  | 'personalizado';

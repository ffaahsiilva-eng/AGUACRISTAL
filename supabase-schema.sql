-- ==============================================================================
-- Água Cristal Sul - Script de Criação do Banco de Dados no Supabase (PostgreSQL)
-- Execute este script no SQL Editor do seu projeto Supabase (app.supabase.com)
-- ==============================================================================

-- 1. Habilitar extensões úteis
create extension if not exists "uuid-ossp";

-- 2. Tabela de Usuários do Sistema
create table if not exists public.users (
  id text primary key,
  name text not null,
  email text unique not null,
  phone text default '',
  role text not null default 'OPERADOR', -- 'ADMINISTRADOR', 'OPERADOR', 'VISUALIZACAO'
  status text not null default 'Ativo',  -- 'Ativo', 'Pendente', 'Inativo', 'Bloqueado'
  avatar_url text,
  email_verified boolean default false,
  ultimo_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Tabela de Clientes
create table if not exists public.clients (
  id text primary key,
  tipo_pessoa text default 'Pessoa Física',
  name text not null,
  trade_name text,
  cpf_cnpj text not null,
  inscricao_estadual text,
  phone text not null,
  whatsapp text,
  email text,
  cep text,
  address text not null,
  number text,
  complement text,
  neighborhood text,
  city text not null,
  state text not null default 'RS',
  referencia text,
  motorista_preferencial_id text,
  motorista_preferencial_nome text,
  veiculo_preferencial_id text,
  veiculo_preferencial_nome text,
  dia_entrega_preferencial text,
  horario_entrega_preferencial text,
  observacao_entrega text,
  forma_pagamento_preferencial text default 'PIX',
  prazo_pagamento text,
  valor_unitario_padrao numeric default 15.00,
  limite_credito numeric default 0,
  observacoes_internas text,
  enderecos_adicionais jsonb default '[]'::jsonb,
  notas_internas jsonb default '[]'::jsonb,
  status text default 'Ativo',
  observation text,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

-- 4. Tabela de Motoristas
create table if not exists public.drivers (
  id text primary key,
  name text not null,
  phone text not null,
  cpf text not null,
  cnh text not null,
  cnh_category text not null,
  cnh_expiry date,
  status text not null default 'Ativo',
  commission_rate_default numeric default 2.5,
  observation text,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

-- 5. Tabela de Veículos
create table if not exists public.vehicles (
  id text primary key,
  plate text not null,
  model text not null,
  brand text not null,
  year integer,
  capacity_gallons integer default 80,
  driver_id text,
  driver_name text,
  status text not null default 'Ativo',
  observation text,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

-- 6. Tabela de Vendas
create table if not exists public.sales (
  id text primary key,
  code text not null,
  sale_date date not null,
  client_id text,
  client_name text not null,
  client_document text,
  phone text,
  address text not null,
  number text,
  complement text,
  neighborhood text,
  city text not null,
  state text default 'RS',
  driver_id text,
  driver_name text not null,
  vehicle_id text,
  vehicle_name text,
  quantity integer not null default 1,
  unit_price numeric not null default 15.00,
  total_amount numeric not null default 15.00,
  payment_method text not null default 'PIX',
  payment_status text not null default 'Pago',
  sale_status text default 'Concluída',
  due_date date,
  delivery_status text default 'Entregue',
  amount_paid numeric not null default 15.00,
  pending_amount numeric not null default 0.00,
  commission_rate numeric not null default 2.5,
  commission_amount numeric not null default 0.38,
  observation text,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

-- 7. Tabela de Entregas
create table if not exists public.deliveries (
  id text primary key,
  code text not null,
  sale_id text,
  sale_code text,
  delivery_date date not null,
  client_name text not null,
  address text not null,
  city text not null,
  quantity integer not null default 1,
  driver_id text,
  driver_name text not null,
  vehicle_id text,
  vehicle_name text,
  departure_time text,
  delivery_time text,
  status text not null default 'Entregue',
  observation text,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

-- 8. Tabela de Categorias de Despesas
create table if not exists public.expense_categories (
  id text primary key,
  name text not null,
  is_system boolean default false
);

-- 9. Tabela de Despesas
create table if not exists public.expenses (
  id text primary key,
  code text not null,
  expense_date date not null,
  description text not null,
  category_id text not null,
  category_name text not null,
  amount numeric not null default 0.00,
  payment_method text not null default 'PIX',
  driver_id text,
  driver_name text,
  vehicle_id text,
  vehicle_name text,
  sale_id text,
  supplier text,
  doc_number text,
  receipt_attachment text,
  is_fuel boolean default false,
  fuel_liters numeric,
  fuel_price_per_liter numeric,
  fuel_odometer numeric,
  gas_station text,
  observation text,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

-- 10. Tabela de Pagamentos Registrados
create table if not exists public.payments (
  id text primary key,
  sale_id text not null,
  date date not null,
  amount numeric not null,
  payment_method text not null default 'PIX',
  observation text,
  registered_by text not null,
  created_at timestamptz default now()
);

-- 11. Tabela de Configurações Gerais e da Empresa
create table if not exists public.settings (
  id text primary key, -- 'company_info', 'company', 'deleted_records'
  data jsonb not null,
  updated_at timestamptz default now()
);

-- 12. Tabela de Fechamentos Mensais
create table if not exists public.monthly_closings (
  id text primary key,
  month text not null,
  month_label text not null,
  closed_at timestamptz not null default now(),
  closed_by text not null,
  closed_by_email text,
  gross_revenue numeric not null default 0,
  total_received numeric not null default 0,
  total_receivable numeric not null default 0,
  total_boxes integer not null default 0,
  total_expenses numeric not null default 0,
  net_result numeric not null default 0,
  profit_margin numeric not null default 0,
  sales_count integer not null default 0,
  expenses_count integer not null default 0,
  sales_snapshot jsonb default '[]'::jsonb,
  expenses_snapshot jsonb default '[]'::jsonb,
  deliveries_snapshot jsonb default '[]'::jsonb,
  notes text,
  is_reopened boolean default false,
  reopened_at timestamptz,
  reopened_by text
);

-- 13. Tabela de Auditoria / Logs
create table if not exists public.audit_logs (
  id text primary key,
  timestamp timestamptz default now(),
  user_id text,
  user_name text,
  action text not null,
  entity text not null,
  entity_id text,
  details text
);

-- 14. Índices para performance
create index if not exists idx_sales_date on public.sales(sale_date);
create index if not exists idx_sales_deleted on public.sales(is_deleted);
create index if not exists idx_deliveries_date on public.deliveries(delivery_date);
create index if not exists idx_expenses_date on public.expenses(expense_date);
create index if not exists idx_clients_name on public.clients(name);
create index if not exists idx_drivers_name on public.drivers(name);

-- 15. Habilitar Row Level Security (RLS) e políticas públicas/autenticadas
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.sales enable row level security;
alter table public.deliveries enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.payments enable row level security;
alter table public.settings enable row level security;
alter table public.monthly_closings enable row level security;
alter table public.audit_logs enable row level security;

-- Políticas de acesso irrestrito para anon e authenticated (sistema de gestão empresarial)
create policy "Allow all users full access to users" on public.users for all using (true) with check (true);
create policy "Allow all users full access to clients" on public.clients for all using (true) with check (true);
create policy "Allow all users full access to drivers" on public.drivers for all using (true) with check (true);
create policy "Allow all users full access to vehicles" on public.vehicles for all using (true) with check (true);
create policy "Allow all users full access to sales" on public.sales for all using (true) with check (true);
create policy "Allow all users full access to deliveries" on public.deliveries for all using (true) with check (true);
create policy "Allow all users full access to expense_categories" on public.expense_categories for all using (true) with check (true);
create policy "Allow all users full access to expenses" on public.expenses for all using (true) with check (true);
create policy "Allow all users full access to payments" on public.payments for all using (true) with check (true);
create policy "Allow all users full access to settings" on public.settings for all using (true) with check (true);
create policy "Allow all users full access to monthly_closings" on public.monthly_closings for all using (true) with check (true);
create policy "Allow all users full access to audit_logs" on public.audit_logs for all using (true) with check (true);

-- 16. Habilitar Realtime nas tabelas principais
alter publication supabase_realtime add table public.clients;
alter publication supabase_realtime add table public.drivers;
alter publication supabase_realtime add table public.sales;
alter publication supabase_realtime add table public.deliveries;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.settings;
alter publication supabase_realtime add table public.users;

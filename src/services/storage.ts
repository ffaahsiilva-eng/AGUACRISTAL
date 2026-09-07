import {
  User,
  Client,
  ClientAddress,
  ClientNote,
  Driver,
  Vehicle,
  Sale,
  Delivery,
  Expense,
  ExpenseCategory,
  PaymentRecord,
  CompanySettings,
  CompanyInfo,
  AuditLog,
  PaymentMethod,
  PaymentStatus,
} from '../types';
import {
  DEFAULT_SETTINGS as INITIAL_SETTINGS,
  DEFAULT_CATEGORIES as INITIAL_CATEGORIES,
  DEFAULT_USERS as INITIAL_USERS,
  generateInitialData as generateRealInitialData,
} from '../data/initialData';
import { getTodayDateString } from '../utils/formatters';

const STORAGE_KEYS = {
  USERS: 'aguacristal_users_v2',
  CLIENTS: 'aguacristal_clients_v2',
  DRIVERS: 'aguacristal_drivers_v2',
  VEHICLES: 'aguacristal_vehicles_v2',
  SALES: 'aguacristal_sales_v2',
  DELIVERIES: 'aguacristal_deliveries_v2',
  EXPENSES: 'aguacristal_expenses_v2',
  CATEGORIES: 'aguacristal_categories_v2',
  PAYMENTS: 'aguacristal_payments_v2',
  SETTINGS: 'aguacristal_settings_v2',
  AUDIT_LOGS: 'aguacristal_audit_logs_v2',
  CURRENT_USER: 'aguacristal_current_user_v2',
};

// Event listener mechanism to broadcast storage updates across components
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribeToStorage(callback: Listener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function notifyStorageChange(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error(e);
    }
  });
}

// Helpers for localStorage
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.warn(`Error reading ${key} from storage:`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
}

const DEFAULT_SETTINGS = INITIAL_SETTINGS;
const DEFAULT_CATEGORIES = INITIAL_CATEGORIES;
const DEFAULT_USERS = INITIAL_USERS;

function generateInitialData() {
  return generateRealInitialData();
}

// Storage API Class
class StorageService {
  constructor() {
    this.init();
  }

  public init() {
    const DATA_VERSION = "v_real_data_imperatriz_2026_08";
    const currentVersion = localStorage.getItem("acs_data_version");
    const existingSales = localStorage.getItem(STORAGE_KEYS.SALES);
    const hasOldGenericData =
      existingSales &&
      (existingSales.includes("Cristal Mar") ||
        existingSales.includes("Balneário Camboriú") ||
        existingSales.includes("SC") ||
        existingSales.includes("Marcos Silva"));

    if (!existingSales || currentVersion !== DATA_VERSION || hasOldGenericData) {
      const initial = generateInitialData();
      setItem(STORAGE_KEYS.USERS, initial.users);
      setItem(STORAGE_KEYS.CURRENT_USER, initial.currentUser);
      setItem(STORAGE_KEYS.SETTINGS, initial.settings);
      setItem(STORAGE_KEYS.CATEGORIES, initial.categories);
      setItem(STORAGE_KEYS.DRIVERS, initial.drivers);
      setItem(STORAGE_KEYS.VEHICLES, initial.vehicles);
      setItem(STORAGE_KEYS.CLIENTS, initial.clients);
      setItem(STORAGE_KEYS.SALES, initial.sales);
      setItem(STORAGE_KEYS.DELIVERIES, initial.deliveries);
      setItem(STORAGE_KEYS.EXPENSES, initial.expenses);
      setItem(STORAGE_KEYS.PAYMENTS, initial.payments);
      setItem(STORAGE_KEYS.AUDIT_LOGS, initial.auditLogs);
      localStorage.setItem("acs_data_version", DATA_VERSION);
    }
  }

  // Current User & Auth
  public getCurrentUser(): User {
    return getItem<User>(STORAGE_KEYS.CURRENT_USER, DEFAULT_USERS[0]);
  }

  public setCurrentUser(user: User): void {
    setItem(STORAGE_KEYS.CURRENT_USER, user);
    notifyStorageChange();
  }

  public getUsers(): User[] {
    return getItem<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  public saveUser(user: User): void {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = { ...user, updated_at: new Date().toISOString() };
    } else {
      users.push({ ...user, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    setItem(STORAGE_KEYS.USERS, users);
    this.logAudit('Alteração', 'Configuração', user.id, `Usuário ${user.name} atualizado`);
    notifyStorageChange();
  }

  // Settings
  public getSettings(): CompanySettings {
    return getItem<CompanySettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  public updateSettings(settings: CompanySettings): void {
    setItem(STORAGE_KEYS.SETTINGS, settings);
    this.logAudit('Alteração', 'Configuração', 'settings', 'Configurações gerais da empresa atualizadas');
    notifyStorageChange();
  }

  public saveSettings(settings: CompanySettings): void {
    this.updateSettings(settings);
  }

  // Categories
  public getCategories(): ExpenseCategory[] {
    return getItem<ExpenseCategory[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  }

  public saveCategory(category: ExpenseCategory): void {
    const cats = this.getCategories();
    const index = cats.findIndex((c) => c.id === category.id);
    if (index >= 0) {
      cats[index] = category;
    } else {
      cats.push(category);
    }
    setItem(STORAGE_KEYS.CATEGORIES, cats);
    notifyStorageChange();
  }

  public deleteCategory(id: string): void {
    const cats = this.getCategories().filter((c) => c.id !== id);
    setItem(STORAGE_KEYS.CATEGORIES, cats);
    notifyStorageChange();
  }

  // Clients
  public getClients(): Client[] {
    return getItem<Client[]>(STORAGE_KEYS.CLIENTS, []);
  }

  public getClientById(id: string): Client | undefined {
    return this.getClients().find((c) => c.id === id);
  }

  public saveClient(client: Client): Client {
    const clients = this.getClients();
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    const index = clients.findIndex((c) => c.id === client.id);
    if (index >= 0) {
      clients[index] = { ...client, updated_at: now };
      this.logAudit('Alteração', 'Cliente', client.id, `Cliente ${client.name} atualizado`);
    } else {
      client.created_at = now;
      client.updated_at = now;
      client.created_by = currentUser.name;
      clients.unshift(client);
      this.logAudit('Criação', 'Cliente', client.id, `Novo cliente cadastrado: ${client.name}`);
    }
    setItem(STORAGE_KEYS.CLIENTS, clients);
    notifyStorageChange();
    return client;
  }

  public toggleClientStatus(id: string): Client | undefined {
    const client = this.getClientById(id);
    if (!client) return undefined;
    const newStatus = client.status === 'Inativo' ? 'Ativo' : 'Inativo';
    const updated = this.saveClient({
      ...client,
      status: newStatus,
    });
    this.logAudit(
      'Alteração',
      'Cliente',
      id,
      `Status do cliente ${client.name} alterado para ${newStatus}`
    );
    return updated;
  }

  public addClientAddress(clientId: string, addressData: Omit<ClientAddress, 'id'>): Client | undefined {
    const client = this.getClientById(clientId);
    if (!client) return undefined;
    const now = new Date().toISOString();
    const newAddr: ClientAddress = {
      ...addressData,
      id: `addr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      cliente_id: clientId,
      created_at: now,
      updated_at: now,
    };
    const addresses = client.enderecos_adicionais || [];
    if (newAddr.principal) {
      addresses.forEach((a) => (a.principal = false));
    }
    const updated = this.saveClient({
      ...client,
      enderecos_adicionais: [...addresses, newAddr],
    });
    this.logAudit(
      'Alteração',
      'Cliente',
      clientId,
      `Novo endereço "${newAddr.nome_local}" adicionado para ${client.name}`
    );
    return updated;
  }

  public updateClientAddress(clientId: string, address: ClientAddress): Client | undefined {
    const client = this.getClientById(clientId);
    if (!client) return undefined;
    const addresses = [...(client.enderecos_adicionais || [])];
    const index = addresses.findIndex((a) => a.id === address.id);
    if (index >= 0) {
      if (address.principal) {
        addresses.forEach((a) => (a.principal = false));
      }
      addresses[index] = { ...address, updated_at: new Date().toISOString() };
      const updated = this.saveClient({
        ...client,
        enderecos_adicionais: addresses,
      });
      return updated;
    }
    return client;
  }

  public deleteClientAddress(clientId: string, addressId: string): Client | undefined {
    const client = this.getClientById(clientId);
    if (!client) return undefined;
    const addresses = (client.enderecos_adicionais || []).filter((a) => a.id !== addressId);
    return this.saveClient({
      ...client,
      enderecos_adicionais: addresses,
    });
  }

  public setDefaultClientAddress(clientId: string, addressId: string): Client | undefined {
    const client = this.getClientById(clientId);
    if (!client) return undefined;
    const addresses = (client.enderecos_adicionais || []).map((a) => ({
      ...a,
      principal: a.id === addressId,
    }));
    const target = addresses.find((a) => a.id === addressId);
    return this.saveClient({
      ...client,
      address: target?.logradouro || client.address,
      number: target?.numero || client.number,
      complement: target?.complemento || client.complement,
      neighborhood: target?.bairro || client.neighborhood,
      city: target?.cidade || client.city,
      state: target?.estado || client.state,
      cep: target?.cep || client.cep,
      referencia: target?.referencia || client.referencia,
      enderecos_adicionais: addresses,
    });
  }

  public addClientNote(clientId: string, text: string): Client | undefined {
    const client = this.getClientById(clientId);
    if (!client || !text.trim()) return undefined;
    const currentUser = this.getCurrentUser();
    const newNote: ClientNote = {
      id: `note-${Date.now()}`,
      cliente_id: clientId,
      data: new Date().toISOString(),
      usuario: currentUser.name,
      observacao: text.trim(),
    };
    const notes = [newNote, ...(client.notas_internas || [])];
    const updated = this.saveClient({
      ...client,
      notas_internas: notes,
    });
    this.logAudit(
      'Alteração',
      'Cliente',
      clientId,
      `Nova anotação registrada para ${client.name}`
    );
    return updated;
  }

  public deleteClient(id: string): void {
    const client = this.getClientById(id);
    const clients = this.getClients().filter((c) => c.id !== id);
    setItem(STORAGE_KEYS.CLIENTS, clients);
    this.logAudit('Exclusão', 'Cliente', id, `Cliente excluído: ${client?.name || id}`);
    notifyStorageChange();
  }

  // Drivers
  public getDrivers(): Driver[] {
    return getItem<Driver[]>(STORAGE_KEYS.DRIVERS, []);
  }

  public getDriverById(id: string): Driver | undefined {
    return this.getDrivers().find((d) => d.id === id);
  }

  public saveDriver(driver: Driver): Driver {
    const drivers = this.getDrivers();
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    const index = drivers.findIndex((d) => d.id === driver.id);
    if (index >= 0) {
      drivers[index] = { ...driver, updated_at: now };
      this.logAudit('Alteração', 'Motorista', driver.id, `Motorista ${driver.name} atualizado`);
    } else {
      driver.created_at = now;
      driver.updated_at = now;
      driver.created_by = currentUser.name;
      drivers.push(driver);
      this.logAudit('Criação', 'Motorista', driver.id, `Novo motorista cadastrado: ${driver.name}`);
    }
    setItem(STORAGE_KEYS.DRIVERS, drivers);
    notifyStorageChange();
    return driver;
  }

  public deleteDriver(id: string): void {
    const driver = this.getDriverById(id);
    const drivers = this.getDrivers().filter((d) => d.id !== id);
    setItem(STORAGE_KEYS.DRIVERS, drivers);
    this.logAudit('Exclusão', 'Motorista', id, `Motorista excluído: ${driver?.name || id}`);
    notifyStorageChange();
  }

  // Vehicles
  public getVehicles(): Vehicle[] {
    return getItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
  }

  public saveVehicle(vehicle: Vehicle): Vehicle {
    const vehicles = this.getVehicles();
    const index = vehicles.findIndex((v) => v.id === vehicle.id);
    const now = new Date().toISOString();
    if (index >= 0) {
      vehicles[index] = { ...vehicle, updated_at: now };
    } else {
      vehicle.created_at = now;
      vehicle.updated_at = now;
      vehicles.push(vehicle);
    }
    setItem(STORAGE_KEYS.VEHICLES, vehicles);
    notifyStorageChange();
    return vehicle;
  }

  // Sales
  public getSales(): Sale[] {
    return getItem<Sale[]>(STORAGE_KEYS.SALES, []);
  }

  public getSaleById(id: string): Sale | undefined {
    return this.getSales().find((s) => s.id === id);
  }

  public getNextSaleCode(): string {
    const sales = this.getSales();
    let maxNum = 124;
    sales.forEach((s) => {
      const match = s.code?.match(/V-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `V-${String(maxNum + 1).padStart(5, '0')}`;
  }

  public saveSale(saleData: Partial<Sale>, createDelivery = true): Sale {
    const sales = this.getSales();
    const currentUser = this.getCurrentUser();
    const settings = this.getSettings();
    const now = new Date().toISOString();

    const quantity = Math.max(0, Number(saleData.quantity) || 0);
    const unit_price = Math.max(0, Number(saleData.unit_price) || 0);
    const total_amount = Math.round(quantity * unit_price * 100) / 100;

    const commission_rate =
      saleData.commission_rate !== undefined
        ? Number(saleData.commission_rate)
        : settings.default_commission_rate || 2.5;
    const commission_amount = Math.round(total_amount * (commission_rate / 100) * 100) / 100;

    let payment_status = saleData.payment_status || 'Pendente';
    let amount_paid = Number(saleData.amount_paid) || 0;

    if (payment_status === 'Pago') {
      amount_paid = total_amount;
    } else if (payment_status === 'Pendente' && amount_paid <= 0) {
      amount_paid = 0;
    } else if (amount_paid > 0 && amount_paid < total_amount) {
      payment_status = 'Parcial';
    } else if (amount_paid >= total_amount && total_amount > 0) {
      payment_status = 'Pago';
      amount_paid = total_amount;
    }

    const pending_amount = Math.max(0, Math.round((total_amount - amount_paid) * 100) / 100);

    let sale: Sale;
    const isNew = !saleData.id || !sales.some((s) => s.id === saleData.id);

    if (isNew) {
      const id = saleData.id || `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const code = saleData.code || this.getNextSaleCode();
      sale = {
        id,
        code,
        sale_date: saleData.sale_date || getTodayDateString(),
        client_id: saleData.client_id,
        client_name: saleData.client_name || 'Cliente Geral',
        client_document: saleData.client_document || '',
        phone: saleData.phone || '',
        address: saleData.address || '',
        number: saleData.number || '',
        complement: saleData.complement || '',
        neighborhood: saleData.neighborhood || '',
        city: saleData.city || 'Balneário Camboriú',
        state: saleData.state || 'SC',
        driver_id: saleData.driver_id,
        driver_name: saleData.driver_name || '',
        vehicle_id: saleData.vehicle_id,
        vehicle_name: saleData.vehicle_name,
        quantity,
        unit_price,
        total_amount,
        payment_method: saleData.payment_method || 'PIX',
        payment_status: payment_status as PaymentStatus,
        sale_status: saleData.sale_status || (payment_status === 'Pago' ? 'Confirmada' : 'Aberta'),
        delivery_status: saleData.delivery_status || 'Aguardando',
        due_date: saleData.due_date || saleData.sale_date || getTodayDateString(),
        amount_paid,
        pending_amount,
        commission_rate,
        commission_amount,
        observation: saleData.observation || '',
        created_at: now,
        updated_at: now,
        created_by: currentUser.name,
      };
      sales.unshift(sale);

      this.logAudit(
        'Criação',
        'Venda',
        sale.id,
        `Venda ${sale.code} criada para ${sale.client_name} - Qtd: ${sale.quantity} (${sale.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`
      );

      // Also create payment record if amount was paid
      if (amount_paid > 0) {
        this.addPayment({
          id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          sale_id: sale.id,
          date: sale.sale_date,
          amount: amount_paid,
          payment_method: sale.payment_method,
          observation: 'Pagamento registrado na emissão da venda',
          registered_by: currentUser.name,
          created_at: now,
        });
      }

      // Automatically generate a delivery if requested and driver assigned
      if (createDelivery) {
        this.generateDeliveryForSale(sale);
      }
    } else {
      const index = sales.findIndex((s) => s.id === saleData.id);
      const oldSale = sales[index];
      sale = {
        ...oldSale,
        ...saleData,
        quantity,
        unit_price,
        total_amount,
        commission_rate,
        commission_amount,
        payment_status: payment_status as PaymentStatus,
        sale_status: saleData.sale_status || oldSale.sale_status || 'Confirmada',
        delivery_status: saleData.delivery_status || oldSale.delivery_status || 'Aguardando',
        vehicle_id: saleData.vehicle_id !== undefined ? saleData.vehicle_id : oldSale.vehicle_id,
        vehicle_name: saleData.vehicle_name !== undefined ? saleData.vehicle_name : oldSale.vehicle_name,
        amount_paid,
        pending_amount,
        updated_at: now,
      };
      sales[index] = sale;

      this.logAudit(
        'Alteração',
        'Venda',
        sale.id,
        `Venda ${sale.code} alterada. Valor anterior: R$ ${oldSale.total_amount.toFixed(2)} | Novo valor: R$ ${sale.total_amount.toFixed(2)}`,
        `R$ ${oldSale.total_amount.toFixed(2)}`,
        `R$ ${sale.total_amount.toFixed(2)}`
      );

      // Update related delivery address/client if changed
      this.syncDeliveryForSale(sale);
    }

    setItem(STORAGE_KEYS.SALES, sales);
    notifyStorageChange();
    return sale;
  }

  public cancelSale(id: string): Sale | undefined {
    const sales = this.getSales();
    const index = sales.findIndex((s) => s.id === id);
    if (index < 0) return undefined;
    const sale = sales[index];

    sales[index] = {
      ...sale,
      sale_status: 'Cancelada',
      delivery_status: 'Cancelada',
      pending_amount: 0,
      updated_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.SALES, sales);

    // Also cancel related deliveries
    const deliveries = this.getDeliveries();
    let deliveryChanged = false;
    deliveries.forEach((d) => {
      if (d.sale_id === id) {
        d.status = 'Cancelada';
        d.updated_at = new Date().toISOString();
        deliveryChanged = true;
      }
    });
    if (deliveryChanged) {
      setItem(STORAGE_KEYS.DELIVERIES, deliveries);
    }

    this.logAudit('Alteração', 'Venda', id, `Venda ${sale.code} cancelada.`);
    notifyStorageChange();
    return sales[index];
  }

  public duplicateSale(id: string): Sale | undefined {
    const sale = this.getSaleById(id);
    if (!sale) return undefined;
    const today = getTodayDateString();
    const newSaleData: Partial<Sale> = {
      client_id: sale.client_id,
      client_name: sale.client_name,
      client_document: sale.client_document,
      phone: sale.phone,
      address: sale.address,
      number: sale.number,
      complement: sale.complement,
      neighborhood: sale.neighborhood,
      city: sale.city,
      state: sale.state,
      driver_id: sale.driver_id,
      driver_name: sale.driver_name,
      vehicle_id: sale.vehicle_id,
      vehicle_name: sale.vehicle_name,
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      payment_method: sale.payment_method,
      payment_status: 'Pendente',
      amount_paid: 0,
      pending_amount: sale.total_amount,
      sale_date: today,
      due_date: today,
      sale_status: 'Aberta',
      delivery_status: 'Aguardando',
      commission_rate: sale.commission_rate,
      observation: sale.observation ? `Cópia da venda ${sale.code} - ${sale.observation}` : `Cópia da venda ${sale.code}`,
    };
    return this.saveSale(newSaleData, false);
  }

  public deleteSale(id: string): void {
    const sale = this.getSaleById(id);
    const sales = this.getSales().filter((s) => s.id !== id);
    setItem(STORAGE_KEYS.SALES, sales);

    // Also remove related deliveries and payments
    const deliveries = this.getDeliveries().filter((d) => d.sale_id !== id);
    setItem(STORAGE_KEYS.DELIVERIES, deliveries);

    const payments = this.getPayments().filter((p) => p.sale_id !== id);
    setItem(STORAGE_KEYS.PAYMENTS, payments);

    this.logAudit('Exclusão', 'Venda', id, `Venda excluída: ${sale?.code || id} (${sale?.client_name})`);
    notifyStorageChange();
  }

  // Deliveries
  public getDeliveries(): Delivery[] {
    return getItem<Delivery[]>(STORAGE_KEYS.DELIVERIES, []);
  }

  public getNextDeliveryCode(): string {
    const dels = this.getDeliveries();
    let maxNum = 124;
    dels.forEach((d) => {
      const match = d.code?.match(/ENT-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `ENT-${String(maxNum + 1).padStart(5, '0')}`;
  }

  public generateDeliveryForSale(sale: Sale): Delivery {
    const deliveries = this.getDeliveries();
    const existing = deliveries.find((d) => d.sale_id === sale.id);
    if (existing) return existing;

    const vehicles = this.getVehicles();
    const matchedVehicle = sale.vehicle_id ? vehicles.find(v => v.id === sale.vehicle_id) : undefined;
    const defaultVehicle = matchedVehicle || vehicles[0];

    const delivery: Delivery = {
      id: `del-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: this.getNextDeliveryCode(),
      sale_id: sale.id,
      sale_code: sale.code,
      delivery_date: sale.sale_date,
      client_name: sale.client_name,
      address: `${sale.address}${sale.number ? ', ' + sale.number : ''}${sale.neighborhood ? ' - ' + sale.neighborhood : ''}`,
      city: sale.city,
      quantity: sale.quantity,
      driver_id: sale.driver_id,
      driver_name: sale.driver_name || 'A definir',
      vehicle_id: defaultVehicle?.id,
      vehicle_name: defaultVehicle ? `${defaultVehicle.model} (${defaultVehicle.plate})` : undefined,
      status: 'Aguardando',
      observation: sale.observation || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: this.getCurrentUser().name,
    };

    deliveries.unshift(delivery);
    setItem(STORAGE_KEYS.DELIVERIES, deliveries);

    // Update sale delivery status
    const sales = this.getSales();
    const saleIdx = sales.findIndex((s) => s.id === sale.id);
    if (saleIdx >= 0) {
      sales[saleIdx] = {
        ...sales[saleIdx],
        delivery_status: 'Aguardando',
        sale_status: sales[saleIdx].sale_status === 'Aberta' ? 'Em entrega' : sales[saleIdx].sale_status,
        updated_at: new Date().toISOString(),
      };
      setItem(STORAGE_KEYS.SALES, sales);
    }

    this.logAudit('Entrega', 'Entrega', delivery.id, `Entrega ${delivery.code} gerada para venda ${sale.code}`);
    notifyStorageChange();
    return delivery;
  }

  public syncDeliveryForSale(sale: Sale): void {
    const deliveries = this.getDeliveries();
    const index = deliveries.findIndex((d) => d.sale_id === sale.id);
    if (index >= 0) {
      deliveries[index] = {
        ...deliveries[index],
        client_name: sale.client_name,
        address: `${sale.address}${sale.number ? ', ' + sale.number : ''}${sale.neighborhood ? ' - ' + sale.neighborhood : ''}`,
        city: sale.city,
        quantity: sale.quantity,
        driver_id: sale.driver_id || deliveries[index].driver_id,
        driver_name: sale.driver_name || deliveries[index].driver_name,
        updated_at: new Date().toISOString(),
      };
      setItem(STORAGE_KEYS.DELIVERIES, deliveries);
    }
  }

  public saveDelivery(delivery: Delivery): Delivery {
    const deliveries = this.getDeliveries();
    const now = new Date().toISOString();
    const index = deliveries.findIndex((d) => d.id === delivery.id);

    if (index >= 0) {
      const oldStatus = deliveries[index].status;
      deliveries[index] = { ...delivery, updated_at: now };
      this.logAudit(
        'Entrega',
        'Entrega',
        delivery.id,
        `Entrega ${delivery.code} atualizada: Status ${oldStatus} -> ${delivery.status}`
      );
    } else {
      delivery.created_at = now;
      delivery.updated_at = now;
      deliveries.unshift(delivery);
      this.logAudit('Criação', 'Entrega', delivery.id, `Nova entrega ${delivery.code} criada`);
    }

    setItem(STORAGE_KEYS.DELIVERIES, deliveries);
    notifyStorageChange();
    return delivery;
  }

  public updateDeliveryStatus(id: string, status: Delivery['status']): void {
    const deliveries = this.getDeliveries();
    const index = deliveries.findIndex((d) => d.id === id);
    if (index >= 0) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const old = deliveries[index];

      deliveries[index] = {
        ...old,
        status,
        updated_at: now.toISOString(),
        delivery_time: status === 'Entregue' ? old.delivery_time || timeStr : old.delivery_time,
        departure_time: status === 'Saiu para entrega' ? old.departure_time || timeStr : old.departure_time,
      };

      setItem(STORAGE_KEYS.DELIVERIES, deliveries);
      this.logAudit(
        'Entrega',
        'Entrega',
        id,
        `Entrega ${old.code} marcada como ${status}`
      );
      notifyStorageChange();
    }
  }

  public deleteDelivery(id: string): void {
    const deliveries = this.getDeliveries().filter((d) => d.id !== id);
    setItem(STORAGE_KEYS.DELIVERIES, deliveries);
    this.logAudit('Exclusão', 'Entrega', id, `Entrega excluída ID: ${id}`);
    notifyStorageChange();
  }

  // Expenses
  public getExpenses(): Expense[] {
    return getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  }

  public getNextExpenseCode(): string {
    const exps = this.getExpenses();
    let maxNum = 40;
    exps.forEach((e) => {
      const match = e.code?.match(/DESP-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `DESP-${String(maxNum + 1).padStart(5, '0')}`;
  }

  public saveExpense(expenseData: Partial<Expense>): Expense {
    const expenses = this.getExpenses();
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    let amount = Number(expenseData.amount) || 0;
    if (expenseData.is_fuel && expenseData.fuel_liters && expenseData.fuel_price_per_liter) {
      amount = Math.round(expenseData.fuel_liters * expenseData.fuel_price_per_liter * 100) / 100;
    }

    let expense: Expense;
    const isNew = !expenseData.id || !expenses.some((e) => e.id === expenseData.id);

    if (isNew) {
      const id = expenseData.id || `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const code = expenseData.code || this.getNextExpenseCode();
      expense = {
        id,
        code,
        expense_date: expenseData.expense_date || getTodayDateString(),
        description: expenseData.description || 'Despesa Operacional',
        category_id: expenseData.category_id || 'cat-18',
        category_name: expenseData.category_name || 'Outros',
        amount,
        payment_method: expenseData.payment_method || 'Dinheiro',
        driver_id: expenseData.driver_id,
        driver_name: expenseData.driver_name,
        vehicle_id: expenseData.vehicle_id,
        vehicle_name: expenseData.vehicle_name,
        sale_id: expenseData.sale_id,
        supplier: expenseData.supplier || '',
        doc_number: expenseData.doc_number || '',
        receipt_attachment: expenseData.receipt_attachment,
        is_fuel: expenseData.is_fuel || false,
        fuel_liters: expenseData.fuel_liters,
        fuel_price_per_liter: expenseData.fuel_price_per_liter,
        fuel_odometer: expenseData.fuel_odometer,
        gas_station: expenseData.gas_station,
        observation: expenseData.observation || '',
        created_at: now,
        updated_at: now,
        created_by: currentUser.name,
      };
      expenses.unshift(expense);
      this.logAudit(
        'Criação',
        'Despesa',
        expense.id,
        `Despesa ${expense.code} criada: ${expense.description} - R$ ${expense.amount.toFixed(2)} (${expense.category_name})`
      );
    } else {
      const index = expenses.findIndex((e) => e.id === expenseData.id);
      expense = {
        ...expenses[index],
        ...expenseData,
        amount,
        updated_at: now,
      };
      expenses[index] = expense;
      this.logAudit(
        'Alteração',
        'Despesa',
        expense.id,
        `Despesa ${expense.code} alterada para R$ ${expense.amount.toFixed(2)}`
      );
    }

    setItem(STORAGE_KEYS.EXPENSES, expenses);
    notifyStorageChange();
    return expense;
  }

  public deleteExpense(id: string): void {
    const expense = this.getExpenses().find((e) => e.id === id);
    const expenses = this.getExpenses().filter((e) => e.id !== id);
    setItem(STORAGE_KEYS.EXPENSES, expenses);
    this.logAudit('Exclusão', 'Despesa', id, `Despesa excluída: ${expense?.code || id}`);
    notifyStorageChange();
  }

  // Payments & Contas a Receber
  public getPayments(): PaymentRecord[] {
    return getItem<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, []);
  }

  public addPayment(record: PaymentRecord): void {
    const payments = this.getPayments();
    payments.unshift(record);
    setItem(STORAGE_KEYS.PAYMENTS, payments);

    // Update the associated sale amounts and status
    const sales = this.getSales();
    const index = sales.findIndex((s) => s.id === record.sale_id);
    if (index >= 0) {
      const sale = sales[index];
      const newPaid = Math.round((sale.amount_paid + record.amount) * 100) / 100;
      const newPending = Math.max(0, Math.round((sale.total_amount - newPaid) * 100) / 100);
      const newStatus = newPending <= 0 ? 'Pago' : 'Parcial';

      sales[index] = {
        ...sale,
        amount_paid: newPaid,
        pending_amount: newPending,
        payment_status: newStatus as PaymentStatus,
        updated_at: new Date().toISOString(),
      };
      setItem(STORAGE_KEYS.SALES, sales);

      this.logAudit(
        'Pagamento',
        'Pagamento',
        record.id,
        `Recebimento de R$ ${record.amount.toFixed(2)} registrado para venda ${sale.code}. Saldo restante: R$ ${newPending.toFixed(2)}`
      );
    }
    notifyStorageChange();
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  public logAudit(
    action: AuditLog['action'],
    entity_type: AuditLog['entity_type'],
    entity_id: string,
    description: string,
    old_value?: string,
    new_value?: string
  ): void {
    const logs = this.getAuditLogs();
    const currentUser = this.getCurrentUser();
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      user_name: currentUser.name,
      user_id: currentUser.id,
      action,
      entity_type,
      entity_id,
      description,
      old_value,
      new_value,
    };
    logs.unshift(log);
    // Keep max 500 logs
    if (logs.length > 500) logs.length = 500;
    setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // Event subscription
  public subscribe(callback: Listener): () => void {
    return subscribeToStorage(callback);
  }

  // Company info compatibility methods
  public getCompanyInfo(): CompanyInfo {
    const s = this.getSettings();
    return {
      name: s.company_name,
      trade_name: s.trade_name,
      cnpj: s.cnpj,
      phone: s.phone,
      email: s.email,
      address: s.address,
      city: s.city,
      state: s.state,
      default_gallon_price: s.default_unit_price,
      default_driver_commission: s.default_commission_rate,
    };
  }

  public saveCompanyInfo(info: CompanyInfo): void {
    this.saveSettings({
      company_name: info.name,
      trade_name: info.trade_name,
      cnpj: info.cnpj,
      phone: info.phone,
      email: info.email,
      address: info.address,
      city: info.city,
      state: info.state,
      default_unit_price: info.default_gallon_price,
      default_commission_rate: info.default_driver_commission,
      currency: 'BRL',
    });
  }

  // Backup aliases
  public importBackupJSON(jsonString: string): boolean {
    return this.restoreBackupJSON(jsonString);
  }

  public resetToDemoData(): void {
    this.resetToDefault();
  }

  // Backup & Restore
  public exportBackupJSON(): string {
    const backupData = {
      version: '2.0',
      exported_at: new Date().toISOString(),
      company: this.getSettings().company_name,
      users: this.getUsers(),
      settings: this.getSettings(),
      categories: this.getCategories(),
      clients: this.getClients(),
      drivers: this.getDrivers(),
      vehicles: this.getVehicles(),
      sales: this.getSales(),
      deliveries: this.getDeliveries(),
      expenses: this.getExpenses(),
      payments: this.getPayments(),
      auditLogs: this.getAuditLogs(),
    };
    return JSON.stringify(backupData, null, 2);
  }

  public restoreBackupJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data.sales || !Array.isArray(data.sales)) {
        throw new Error('Arquivo de backup inválido.');
      }
      if (data.users) setItem(STORAGE_KEYS.USERS, data.users);
      if (data.settings) setItem(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.categories) setItem(STORAGE_KEYS.CATEGORIES, data.categories);
      if (data.clients) setItem(STORAGE_KEYS.CLIENTS, data.clients);
      if (data.drivers) setItem(STORAGE_KEYS.DRIVERS, data.drivers);
      if (data.vehicles) setItem(STORAGE_KEYS.VEHICLES, data.vehicles);
      if (data.sales) setItem(STORAGE_KEYS.SALES, data.sales);
      if (data.deliveries) setItem(STORAGE_KEYS.DELIVERIES, data.deliveries);
      if (data.expenses) setItem(STORAGE_KEYS.EXPENSES, data.expenses);
      if (data.payments) setItem(STORAGE_KEYS.PAYMENTS, data.payments);
      if (data.auditLogs) setItem(STORAGE_KEYS.AUDIT_LOGS, data.auditLogs);

      this.logAudit('Alteração', 'Configuração', 'system', 'Restauração completa do banco de dados realizada com sucesso');
      notifyStorageChange();
      return true;
    } catch (err) {
      console.error('Falha ao restaurar backup:', err);
      return false;
    }
  }

  public resetToDefault(): void {
    const initial = generateInitialData();
    setItem(STORAGE_KEYS.USERS, initial.users);
    setItem(STORAGE_KEYS.CURRENT_USER, initial.currentUser);
    setItem(STORAGE_KEYS.SETTINGS, initial.settings);
    setItem(STORAGE_KEYS.CATEGORIES, initial.categories);
    setItem(STORAGE_KEYS.DRIVERS, initial.drivers);
    setItem(STORAGE_KEYS.VEHICLES, initial.vehicles);
    setItem(STORAGE_KEYS.CLIENTS, initial.clients);
    setItem(STORAGE_KEYS.SALES, initial.sales);
    setItem(STORAGE_KEYS.DELIVERIES, initial.deliveries);
    setItem(STORAGE_KEYS.EXPENSES, initial.expenses);
    setItem(STORAGE_KEYS.PAYMENTS, initial.payments);
    setItem(STORAGE_KEYS.AUDIT_LOGS, initial.auditLogs);
    notifyStorageChange();
  }
}

export const storage = new StorageService();

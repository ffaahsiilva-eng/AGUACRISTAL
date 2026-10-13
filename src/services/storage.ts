import { collection, doc, setDoc, onSnapshot, getDocs, getDoc, deleteDoc, query, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
  MonthlyClosingRecord,
  MonthlyClosingState,
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
  DELETED_SALES_IDS: 'aguacristal_deleted_sales_ids_v2',
  DELETED_DELIVERY_IDS: 'aguacristal_deleted_delivery_ids_v2',
  DELETED_EXPENSE_IDS: 'aguacristal_deleted_expense_ids_v2',
  DELETED_CLIENT_IDS: 'aguacristal_deleted_client_ids_v2',
  DELETED_DRIVER_IDS: 'aguacristal_deleted_driver_ids_v2',
  MONTHLY_CLOSING_STATE: 'aguacristal_monthly_closing_state_v2',
  MONTHLY_CLOSING_HISTORY: 'aguacristal_monthly_closing_history_v2',
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
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  }
}

// Helper to remove any undefined fields before sending to Firestore
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = typeof value === 'object' && value !== null ? sanitizeForFirestore(value) : value;
    }
  }
  return clean;
}

// Helpers for localStorage with memory fallback
const memoryStorage = new Map<string, string>();

function getItem<T>(key: string, defaultValue: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    }
    const memData = memoryStorage.get(key);
    return memData ? JSON.parse(memData) : defaultValue;
  } catch (error) {
    console.warn(`Error reading ${key} from storage:`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      memoryStorage.set(key, JSON.stringify(value));
    }
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
  private isSyncStarted = false;

  constructor() {
    this.init();
    // Start syncing with Firestore immediately in background
    this.startFirestoreSync().catch((err) => {
      console.warn('Initial Firestore sync attempt:', err);
    });
  }

  private getActiveClosedMonths(): Set<string> {
    const closingState = this.getMonthlyClosingState();
    const history = this.getMonthlyClosingHistory();
    const reopenedMonths = new Set(history.filter((h) => h.is_reopened).map((h) => h.month));
    return new Set(
      (closingState.closed_months || []).filter((m) => !reopenedMonths.has(m))
    );
  }

  private getReopenedMonthsSet(): Set<string> {
    const history = this.getMonthlyClosingHistory();
    return new Set(history.filter((h) => h.is_reopened).map((h) => h.month));
  }

  public async startFirestoreSync() {
    if (this.isSyncStarted) return;
    this.isSyncStarted = true;
    console.log('Starting Firestore realtime sync...');

    // Proactive initial fetch of settings/monthly_closing to hydrate state immediately
    try {
      getDoc(doc(db, 'settings', 'monthly_closing')).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as MonthlyClosingState;
          const reopenedMonths = (data.history || []).filter((h) => h.is_reopened).map((h) => h.month);
          data.closed_months = (data.closed_months || []).filter((m) => !reopenedMonths.includes(m));
          setItem(STORAGE_KEYS.MONTHLY_CLOSING_STATE, data);
          if (Array.isArray(data.history)) {
            setItem(STORAGE_KEYS.MONTHLY_CLOSING_HISTORY, data.history);
          }
          notifyStorageChange();
        }
      }).catch(() => {});
    } catch (e) {}

    // Realtime listener for settings/monthly_closing
    onSnapshot(doc(db, 'settings', 'monthly_closing'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as MonthlyClosingState;
        const reopenedMonths = (data.history || []).filter((h) => h.is_reopened).map((h) => h.month);
        data.closed_months = (data.closed_months || []).filter((m) => !reopenedMonths.includes(m));
        setItem(STORAGE_KEYS.MONTHLY_CLOSING_STATE, data);
        if (Array.isArray(data.history)) {
          setItem(STORAGE_KEYS.MONTHLY_CLOSING_HISTORY, data.history);
        }
        notifyStorageChange();
      }
    });

    // Realtime listener for settings/deleted_records
    onSnapshot(doc(db, 'settings', 'deleted_records'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setItem(STORAGE_KEYS.DELETED_EXPENSE_IDS, data?.deleted_expense_ids || []);
        setItem(STORAGE_KEYS.DELETED_SALES_IDS, data?.deleted_sales_ids || []);
        setItem(STORAGE_KEYS.DELETED_DELIVERY_IDS, data?.deleted_delivery_ids || []);
      } else {
        setItem(STORAGE_KEYS.DELETED_EXPENSE_IDS, []);
        setItem(STORAGE_KEYS.DELETED_SALES_IDS, []);
        setItem(STORAGE_KEYS.DELETED_DELIVERY_IDS, []);
      }
      notifyStorageChange();
    });

    // Immediate realtime listeners without waiting for sequential blocking queries
    onSnapshot(collection(db, 'sales'), (snapshot) => {
      const activeClosedMonths = this.getActiveClosedMonths();
      const history = this.getMonthlyClosingHistory();
      const salesMap = new Map<string, Sale>();

      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as Sale;
        if (!item || item.is_deleted) return;
        const m = (item.sale_date || '').slice(0, 7);
        // Only exclude if the month itself is currently closed
        if (!activeClosedMonths.has(m)) {
          salesMap.set(item.id, item);
        }
      });

      // Guarantee all base initial sales across all open months are always present
      const initial = generateInitialData();
      for (const s of initial.sales) {
        if (!s || s.is_deleted) continue;
        const m = (s.sale_date || '').slice(0, 7);
        if (!activeClosedMonths.has(m) && !salesMap.has(s.id)) {
          salesMap.set(s.id, s);
          // Persist missing base sale to Firestore
          setDoc(doc(db, 'sales', s.id), s).catch(() => {});
        }
      }

      // Preserve and guarantee all sales from reopened months from history snapshots
      for (const rec of history.filter((h) => h.is_reopened)) {
        if (Array.isArray(rec.sales_snapshot)) {
          for (const s of rec.sales_snapshot) {
            if (s && !s.is_deleted && !salesMap.has(s.id)) {
              salesMap.set(s.id, s);
            }
          }
        }
      }

      const items = Array.from(salesMap.values());
      items.sort((a, b) => {
        const timeA = a.created_at || a.sale_date || '';
        const timeB = b.created_at || b.sale_date || '';
        if (timeB !== timeA) return timeB.localeCompare(timeA);
        return (b.code || '').localeCompare(a.code || '');
      });
      setItem(STORAGE_KEYS.SALES, items);
      notifyStorageChange();
    });

    onSnapshot(collection(db, 'deliveries'), (snapshot) => {
      const activeClosedMonths = this.getActiveClosedMonths();
      const history = this.getMonthlyClosingHistory();
      const delivMap = new Map<string, Delivery>();

      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as Delivery;
        if (!item || item.is_deleted) return;
        const m = (item.delivery_date || '').slice(0, 7);
        if (!activeClosedMonths.has(m)) {
          delivMap.set(item.id, item);
        }
      });

      // Guarantee all base initial deliveries across all open months are always present
      const initial = generateInitialData();
      for (const d of initial.deliveries) {
        if (!d || d.is_deleted) continue;
        const m = (d.delivery_date || '').slice(0, 7);
        if (!activeClosedMonths.has(m) && !delivMap.has(d.id)) {
          delivMap.set(d.id, d);
          setDoc(doc(db, 'deliveries', d.id), d).catch(() => {});
        }
      }

      // Preserve and guarantee all deliveries from reopened months from history snapshots
      for (const rec of history.filter((h) => h.is_reopened)) {
        if (Array.isArray(rec.deliveries_snapshot)) {
          for (const d of rec.deliveries_snapshot) {
            if (d && !d.is_deleted && !delivMap.has(d.id)) {
              delivMap.set(d.id, d);
            }
          }
        }
      }

      const items = Array.from(delivMap.values());
      items.sort((a, b) => {
        const timeA = a.created_at || a.delivery_date || '';
        const timeB = b.created_at || b.delivery_date || '';
        if (timeB !== timeA) return timeB.localeCompare(timeA);
        return (b.code || '').localeCompare(a.code || '');
      });
      setItem(STORAGE_KEYS.DELIVERIES, items);
      notifyStorageChange();
    });

    onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const activeClosedMonths = this.getActiveClosedMonths();
      const history = this.getMonthlyClosingHistory();
      const expMap = new Map<string, Expense>();

      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as Expense;
        if (!item || item.is_deleted) return;
        const id = item.id || docSnap.id;
        const m = (item.expense_date || '').slice(0, 7);
        if (!activeClosedMonths.has(m)) {
          expMap.set(id, { ...item, id });
        }
      });

      // Preserve all expenses from reopened months from history snapshots
      for (const rec of history.filter((h) => h.is_reopened)) {
        if (Array.isArray(rec.expenses_snapshot)) {
          for (const e of rec.expenses_snapshot) {
            if (e && !e.is_deleted && !expMap.has(e.id)) {
              expMap.set(e.id, e);
            }
          }
        }
      }

      const items = Array.from(expMap.values());
      items.sort((a, b) => {
        const timeA = a.created_at || a.expense_date || '';
        const timeB = b.created_at || b.expense_date || '';
        if (timeB !== timeA) return timeB.localeCompare(timeA);
        return (b.code || '').localeCompare(a.code || '');
      });
      setItem(STORAGE_KEYS.EXPENSES, items);
      notifyStorageChange();
    });

    // Sync users, clients, drivers, settings
    onSnapshot(collection(db, 'users'), (snapshot) => {
      const items: any[] = [];
      snapshot.forEach(doc => items.push(doc.data()));
      if (items.length > 0) {
        setItem(STORAGE_KEYS.USERS, items);
        notifyStorageChange();
      }
    });

    onSnapshot(collection(db, 'clients'), (snapshot) => {
      const deletedIds = getItem<string[]>(STORAGE_KEYS.DELETED_CLIENT_IDS, []);
      const items: any[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as Client;
        if (!deletedIds.includes(item.id) && !item.is_deleted) {
          items.push(item);
        }
      });
      if (items.length > 0 || !snapshot.empty) {
        setItem(STORAGE_KEYS.CLIENTS, items);
        notifyStorageChange();
      }
    });

    onSnapshot(collection(db, 'drivers'), (snapshot) => {
      const deletedIds = getItem<string[]>(STORAGE_KEYS.DELETED_DRIVER_IDS, []);
      const items: any[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as Driver;
        if (!deletedIds.includes(item.id) && !item.is_deleted) {
          items.push(item);
        }
      });
      if (items.length > 0 || !snapshot.empty) {
        setItem(STORAGE_KEYS.DRIVERS, items);
        notifyStorageChange();
      }
    });

    onSnapshot(doc(db, 'settings', 'company_info'), (docSnap) => {
      if (docSnap.exists()) {
        setItem('aguacristal_company_info_v2', docSnap.data());
        notifyStorageChange();
      }
    });

    onSnapshot(doc(db, 'settings', 'company'), (docSnap) => {
      if (docSnap.exists()) {
        setItem(STORAGE_KEYS.SETTINGS, docSnap.data());
        notifyStorageChange();
      }
    });

    onSnapshot(doc(db, 'settings', 'monthly_closing'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as MonthlyClosingState;
        const reopenedMonths = (data.history || []).filter((h) => h.is_reopened).map((h) => h.month);
        data.closed_months = (data.closed_months || []).filter((m) => !reopenedMonths.includes(m));

        setItem(STORAGE_KEYS.MONTHLY_CLOSING_STATE, data);
        if (Array.isArray(data.history)) {
          setItem(STORAGE_KEYS.MONTHLY_CLOSING_HISTORY, data.history);

          // Purge deleted tracking for all reopened months
          const reopened = data.history.filter((h) => h.is_reopened);
          if (reopened.length > 0) {
            const restoredSaleIds = new Set<string>();
            const restoredDelivIds = new Set<string>();
            const restoredExpIds = new Set<string>();
            for (const r of reopened) {
              (r.sales_snapshot || []).forEach((s) => restoredSaleIds.add(s.id));
              (r.deliveries_snapshot || []).forEach((d) => restoredDelivIds.add(d.id));
              (r.expenses_snapshot || []).forEach((e) => restoredExpIds.add(e.id));
            }

            const curDelSales = getItem<string[]>(STORAGE_KEYS.DELETED_SALES_IDS, []);
            setItem(STORAGE_KEYS.DELETED_SALES_IDS, curDelSales.filter((id) => !restoredSaleIds.has(id)));

            const curDelDeliv = getItem<string[]>(STORAGE_KEYS.DELETED_DELIVERY_IDS, []);
            setItem(STORAGE_KEYS.DELETED_DELIVERY_IDS, curDelDeliv.filter((id) => !restoredDelivIds.has(id)));

            const curDelExp = getItem<string[]>(STORAGE_KEYS.DELETED_EXPENSE_IDS, []);
            setItem(STORAGE_KEYS.DELETED_EXPENSE_IDS, curDelExp.filter((id) => !restoredExpIds.has(id)));

            // Merge back into active storage if missing
            const curSales = getItem<Sale[]>(STORAGE_KEYS.SALES, []);
            const existingSaleIds = new Set(curSales.map((s) => s.id));
            const salesToAdd: Sale[] = [];
            for (const r of reopened) {
              for (const s of r.sales_snapshot || []) {
                if (!existingSaleIds.has(s.id) && !s.is_deleted) {
                  salesToAdd.push(s);
                  existingSaleIds.add(s.id);
                }
              }
            }
            if (salesToAdd.length > 0) {
              const merged = [...salesToAdd, ...curSales];
              merged.sort((a, b) => {
                const timeA = a.created_at || a.sale_date || '';
                const timeB = b.created_at || b.sale_date || '';
                if (timeB !== timeA) return timeB.localeCompare(timeA);
                return (b.code || '').localeCompare(a.code || '');
              });
              setItem(STORAGE_KEYS.SALES, merged);
            }

            const curDelivs = getItem<Delivery[]>(STORAGE_KEYS.DELIVERIES, []);
            const existingDelivIds = new Set(curDelivs.map((d) => d.id));
            const delivsToAdd: Delivery[] = [];
            for (const r of reopened) {
              for (const d of r.deliveries_snapshot || []) {
                if (!existingDelivIds.has(d.id) && !d.is_deleted) {
                  delivsToAdd.push(d);
                  existingDelivIds.add(d.id);
                }
              }
            }
            if (delivsToAdd.length > 0) {
              const mergedD = [...delivsToAdd, ...curDelivs];
              mergedD.sort((a, b) => {
                const timeA = a.created_at || a.delivery_date || '';
                const timeB = b.created_at || b.delivery_date || '';
                if (timeB !== timeA) return timeB.localeCompare(timeA);
                return (b.code || '').localeCompare(a.code || '');
              });
              setItem(STORAGE_KEYS.DELIVERIES, mergedD);
            }
          }
        }
        notifyStorageChange();
      }
    });
  }

  public init() {
    const DATA_VERSION = "v_real_data_imperatriz_2026_10_v8_all_months_active";
    const currentVersion = getItem<string | null>("acs_data_version", null);
    const existingSales = getItem<Sale[] | null>(STORAGE_KEYS.SALES, null);

    if (!existingSales || currentVersion !== DATA_VERSION || existingSales.length < 44) {
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
      setItem(STORAGE_KEYS.DELETED_SALES_IDS, []);
      setItem(STORAGE_KEYS.DELETED_DELIVERY_IDS, []);
      setItem(STORAGE_KEYS.DELETED_EXPENSE_IDS, []);
      setItem(STORAGE_KEYS.MONTHLY_CLOSING_STATE, { closed_months: [], history: [] });
      setItem(STORAGE_KEYS.MONTHLY_CLOSING_HISTORY, []);
      setItem("acs_data_version", DATA_VERSION);
    }

    // Patch require_admin_approval_for_new_users
    const currentSettings = getItem<CompanySettings | null>(STORAGE_KEYS.SETTINGS, null);
    if (currentSettings) {
      if (currentSettings.require_admin_approval_for_new_users !== false && !getItem('acs_approval_patched', '')) {
        currentSettings.require_admin_approval_for_new_users = false;
        setItem(STORAGE_KEYS.SETTINGS, currentSettings);
        setItem('acs_approval_patched', 'true');
      }
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

  public async saveUser(user: User): Promise<void> {
    const now = new Date().toISOString();
    
    if (!user.created_at) {
      user.created_at = now;
    }
    user.updated_at = now;
    
    await setDoc(doc(db, 'users', user.id), user);
    this.logAudit(user.created_at === now ? 'Criação' : 'Alteração', 'Usuário', user.id, `Usuário ${user.name} atualizado`);
  }

  // Settings
  public getSettings(): CompanySettings {
    return getItem<CompanySettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  public async updateSettings(settings: CompanySettings): Promise<void> {
    await setDoc(doc(db, 'settings', 'company'), settings);
    this.logAudit('Alteração', 'Configuração', 'settings', 'Configurações gerais da empresa atualizadas');
  }

  public async saveSettings(settings: CompanySettings): Promise<void> {
    await this.updateSettings(settings);
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
    const clients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, []);
    const deletedIds = getItem<string[]>(STORAGE_KEYS.DELETED_CLIENT_IDS, []);
    return clients.filter((c) => c && !c.is_deleted && !deletedIds.includes(c.id));
  }

  public getClientById(id: string): Client | undefined {
    return this.getClients().find((c) => c.id === id);
  }

  public async saveClient(client: Client): Promise<Client> {
    const clients = this.getClients();
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();
    
    const isNew = !clients.some(c => c.id === client.id);
    
    if (!client.created_at) {
      client.created_at = now;
      client.created_by = currentUser.name;
    }
    client.updated_at = now;
    
    if (isNew) {
      clients.unshift(client);
    } else {
      const index = clients.findIndex(c => c.id === client.id);
      clients[index] = client;
    }
    
    setItem(STORAGE_KEYS.CLIENTS, clients);
    notifyStorageChange();
    
    await setDoc(doc(db, 'clients', client.id), client);
    this.logAudit(isNew ? 'Criação' : 'Alteração', 'Cliente', client.id, `Cliente ${client.name} salvo via Firestore`);
    return client;
  }

  public async toggleClientStatus(id: string): Promise<Client | undefined> {
    const client = this.getClientById(id);
    if (!client) return undefined;
    const newStatus = client.status === 'Inativo' ? 'Ativo' : 'Inativo';
    const updated = await this.saveClient({
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

  public async addClientAddress(clientId: string, addressData: Omit<ClientAddress, "id">): Promise<Client | undefined> {
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
    const updated = await this.saveClient({
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

  public async updateClientAddress(clientId: string, address: ClientAddress): Promise<Client | undefined> {
    const client = this.getClientById(clientId);
    if (!client) return undefined;
    const addresses = [...(client.enderecos_adicionais || [])];
    const index = addresses.findIndex((a) => a.id === address.id);
    if (index >= 0) {
      if (address.principal) {
        addresses.forEach((a) => (a.principal = false));
      }
      addresses[index] = { ...address, updated_at: new Date().toISOString() };
      const updated = await this.saveClient({
        ...client,
        enderecos_adicionais: addresses,
      });
      return updated;
    }
    return client;
  }

  public async deleteClientAddress(clientId: string, addressId: string): Promise<Client | undefined> {
    const client = this.getClientById(clientId);
    if (!client) return undefined;
    const addresses = (client.enderecos_adicionais || []).filter((a) => a.id !== addressId);
    return await this.saveClient({
      ...client,
      enderecos_adicionais: addresses,
    });
  }

  public async setDefaultClientAddress(clientId: string, addressId: string): Promise<Client | undefined> {
    const client = this.getClientById(clientId);
    if (!client) return undefined;
    const addresses = (client.enderecos_adicionais || []).map((a) => ({
      ...a,
      principal: a.id === addressId,
    }));
    const target = addresses.find((a) => a.id === addressId);
    return await this.saveClient({
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

  public async addClientNote(clientId: string, text: string): Promise<Client | undefined> {
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
    const updated = await this.saveClient({
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

  public async deleteClient(id: string): Promise<void> {
    const deletedIds = getItem<string[]>(STORAGE_KEYS.DELETED_CLIENT_IDS, []);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      setItem(STORAGE_KEYS.DELETED_CLIENT_IDS, deletedIds);
    }
    const client = this.getClientById(id);
    const clients = this.getClients().filter((c) => c.id !== id);
    setItem(STORAGE_KEYS.CLIENTS, clients);
    this.logAudit('Exclusão', 'Cliente', id, `Cliente excluído: ${client?.name || id}`);
    notifyStorageChange();

    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (err) {
      console.error('Erro ao excluir cliente no Firestore:', err);
    }
  }

  // Drivers
  public getDrivers(): Driver[] {
    const drivers = getItem<Driver[]>(STORAGE_KEYS.DRIVERS, []);
    const deletedIds = getItem<string[]>(STORAGE_KEYS.DELETED_DRIVER_IDS, []);
    return drivers.filter((d) => d && !d.is_deleted && !deletedIds.includes(d.id));
  }

  public getDriverById(id: string): Driver | undefined {
    return this.getDrivers().find((d) => d.id === id);
  }

  public async saveDriver(driver: Driver): Promise<Driver> {
    const drivers = this.getDrivers();
    const now = new Date().toISOString();
    
    // Clear deleted mark if exists
    const deletedIds = getItem<string[]>(STORAGE_KEYS.DELETED_DRIVER_IDS, []);
    if (deletedIds.includes(driver.id)) {
      setItem(STORAGE_KEYS.DELETED_DRIVER_IDS, deletedIds.filter(i => i !== driver.id));
    }

    const isNew = !drivers.some(d => d.id === driver.id);
    
    if (!driver.created_at) {
      driver.created_at = now;
    }
    driver.updated_at = now;
    
    if (isNew) {
      drivers.unshift(driver);
    } else {
      const index = drivers.findIndex(d => d.id === driver.id);
      drivers[index] = driver;
    }
    
    setItem(STORAGE_KEYS.DRIVERS, drivers);
    notifyStorageChange();
    
    await setDoc(doc(db, 'drivers', driver.id), driver);
    this.logAudit(isNew ? 'Criação' : 'Alteração', 'Motorista', driver.id, `Motorista ${driver.name} salvo via Firestore`);
    return driver;
  }

  public async deleteDriver(id: string): Promise<void> {
    const deletedIds = getItem<string[]>(STORAGE_KEYS.DELETED_DRIVER_IDS, []);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      setItem(STORAGE_KEYS.DELETED_DRIVER_IDS, deletedIds);
    }
    const driver = this.getDriverById(id);
    const drivers = this.getDrivers().filter((d) => d.id !== id);
    setItem(STORAGE_KEYS.DRIVERS, drivers);
    this.logAudit('Exclusão', 'Motorista', id, `Motorista excluído: ${driver?.name || id}`);
    notifyStorageChange();

    try {
      await deleteDoc(doc(db, 'drivers', id));
    } catch (err) {
      console.error('Erro ao excluir motorista no Firestore:', err);
    }
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
    const sales = getItem<Sale[]>(STORAGE_KEYS.SALES, []);
    const history = this.getMonthlyClosingHistory();
    const activeClosedMonths = this.getActiveClosedMonths();

    const salesMap = new Map<string, Sale>();

    // 1. Add current sales from storage
    for (const s of sales) {
      if (!s || s.is_deleted) continue;
      const m = (s.sale_date || '').slice(0, 7);
      if (activeClosedMonths.has(m)) continue;
      salesMap.set(s.id, s);
    }

    // 2. Guarantee that all base initial sales across all open months are present
    const initial = generateInitialData();
    for (const s of initial.sales) {
      if (!s || s.is_deleted) continue;
      const m = (s.sale_date || '').slice(0, 7);
      if (activeClosedMonths.has(m)) continue;
      if (!salesMap.has(s.id)) {
        salesMap.set(s.id, s);
      }
    }

    // 3. Guarantee that all sales from reopened months are present!
    for (const rec of history.filter((h) => h.is_reopened)) {
      if (Array.isArray(rec.sales_snapshot)) {
        for (const s of rec.sales_snapshot) {
          if (s && !s.is_deleted && !salesMap.has(s.id)) {
            salesMap.set(s.id, s);
          }
        }
      }
    }

    return Array.from(salesMap.values()).sort((a, b) => {
      const timeA = a.created_at || a.sale_date || '';
      const timeB = b.created_at || b.sale_date || '';
      if (timeB !== timeA) return timeB.localeCompare(timeA);
      return (b.code || '').localeCompare(a.code || '');
    });
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

  public async saveSale(saleData: Partial<Sale>, createDelivery = true): Promise<Sale> {
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
      // Immediately persist so other synchronous hooks can find this sale
      setItem(STORAGE_KEYS.SALES, sales);
      notifyStorageChange();

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
      setItem(STORAGE_KEYS.SALES, sales);
      notifyStorageChange();

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

    // Ensure it's not marked as deleted
    const deletedSaleIds = getItem<string[]>(STORAGE_KEYS.DELETED_SALES_IDS, []);
    if (deletedSaleIds.includes(sale.id)) {
      setItem(STORAGE_KEYS.DELETED_SALES_IDS, deletedSaleIds.filter(i => i !== sale.id));
    }

    // Ensure final state with delivery/payment adjustments is saved and broadcast
    const currentSales = getItem<Sale[]>(STORAGE_KEYS.SALES, []);
    const finalIdx = currentSales.findIndex((s) => s.id === sale.id);
    if (finalIdx >= 0) {
      sale = currentSales[finalIdx];
    } else {
      currentSales.unshift(sale);
      setItem(STORAGE_KEYS.SALES, currentSales);
    }
    notifyStorageChange();

    await setDoc(doc(db, 'sales', sale.id), sale);
    return sale;
  }

  public async cancelSale(id: string): Promise<Sale | undefined> {
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
    const deliveriesToUpdate: Delivery[] = [];
    deliveries.forEach((d) => {
      if (d.sale_id === id) {
        d.status = 'Cancelada';
        d.updated_at = new Date().toISOString();
        deliveryChanged = true;
        deliveriesToUpdate.push(d);
      }
    });
    if (deliveryChanged) {
      setItem(STORAGE_KEYS.DELIVERIES, deliveries);
    }

    this.logAudit('Alteração', 'Venda', id, `Venda ${sale.code} cancelada.`);
    notifyStorageChange();

    try {
      await setDoc(doc(db, 'sales', id), sales[index]);
      for (const d of deliveriesToUpdate) {
        await setDoc(doc(db, 'deliveries', d.id), d);
      }
    } catch (e) {
      console.error('Erro ao atualizar cancelamento no Firestore:', e);
    }

    return sales[index];
  }

  public async duplicateSale(id: string): Promise<Sale | undefined> {
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
    return await this.saveSale(newSaleData, false);
  }

  public async deleteSale(id: string): Promise<void> {
    const sale = this.getSaleById(id);

    // 1. Add to permanent deleted IDs list to prevent any resurrect race condition
    const deletedIds = getItem<string[]>(STORAGE_KEYS.DELETED_SALES_IDS, []);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      setItem(STORAGE_KEYS.DELETED_SALES_IDS, deletedIds);
    }

    // 2. Remove from local sales
    const sales = this.getSales().filter((s) => s.id !== id);
    setItem(STORAGE_KEYS.SALES, sales);

    // 3. Remove and track related deliveries
    const relatedDeliveries = this.getDeliveries().filter((d) => d.sale_id === id);
    const deliveries = this.getDeliveries().filter((d) => d.sale_id !== id);
    setItem(STORAGE_KEYS.DELIVERIES, deliveries);
    const deletedDelIds = getItem<string[]>(STORAGE_KEYS.DELETED_DELIVERY_IDS, []);
    relatedDeliveries.forEach((d) => {
      if (!deletedDelIds.includes(d.id)) deletedDelIds.push(d.id);
    });
    setItem(STORAGE_KEYS.DELETED_DELIVERY_IDS, deletedDelIds);

    // 4. Remove related payments
    const payments = this.getPayments().filter((p) => p.sale_id !== id);
    setItem(STORAGE_KEYS.PAYMENTS, payments);

    this.logAudit('Exclusão', 'Venda', id, `Venda excluída: ${sale?.code || id} (${sale?.client_name})`);
    notifyStorageChange();

    // 5. Delete directly from Firestore collections so it never returns
    try {
      await deleteDoc(doc(db, 'sales', id));
      for (const del of relatedDeliveries) {
        await deleteDoc(doc(db, 'deliveries', del.id));
      }
    } catch (err) {
      console.error('Erro ao excluir venda no Firestore:', err);
    }
  }

  // Deliveries
  public getDeliveries(): Delivery[] {
    const deliveries = getItem<Delivery[]>(STORAGE_KEYS.DELIVERIES, []);
    const history = this.getMonthlyClosingHistory();
    const activeClosedMonths = this.getActiveClosedMonths();

    const delivMap = new Map<string, Delivery>();

    for (const d of deliveries) {
      if (!d || d.is_deleted) continue;
      const m = (d.delivery_date || '').slice(0, 7);
      if (activeClosedMonths.has(m)) continue;
      delivMap.set(d.id, d);
    }

    // Guarantee that all base initial deliveries across all open months are present
    const initial = generateInitialData();
    for (const d of initial.deliveries) {
      if (!d || d.is_deleted) continue;
      const m = (d.delivery_date || '').slice(0, 7);
      if (activeClosedMonths.has(m)) continue;
      if (!delivMap.has(d.id)) {
        delivMap.set(d.id, d);
      }
    }

    for (const rec of history.filter((h) => h.is_reopened)) {
      if (Array.isArray(rec.deliveries_snapshot)) {
        for (const d of rec.deliveries_snapshot) {
          if (d && !d.is_deleted && !delivMap.has(d.id)) {
            delivMap.set(d.id, d);
          }
        }
      }
    }

    return Array.from(delivMap.values()).sort((a, b) => {
      const timeA = a.created_at || a.delivery_date || '';
      const timeB = b.created_at || b.delivery_date || '';
      if (timeB !== timeA) return timeB.localeCompare(timeA);
      return (b.code || '').localeCompare(a.code || '');
    });
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

  public async generateDeliveryForSale(sale: Sale): Promise<Delivery> {
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

    try {
      await setDoc(doc(db, 'deliveries', delivery.id), delivery);
    } catch (err) {
      console.error('Erro ao salvar entrega no Firestore:', err);
    }
    return delivery;
  }

  public async syncDeliveryForSale(sale: Sale): Promise<void> {
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

  public async saveDelivery(delivery: Delivery): Promise<Delivery> {
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

    // Immediately persist and broadcast changes
    setItem(STORAGE_KEYS.DELIVERIES, deliveries);
    notifyStorageChange();

    await setDoc(doc(db, 'deliveries', delivery.id), delivery);
    return delivery;
  }

  public async updateDeliveryStatus(id: string, status: Delivery["status"]): Promise<void> {
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

      try {
        await setDoc(doc(db, 'deliveries', id), deliveries[index]);
      } catch (err) {
        console.error('Erro ao atualizar status da entrega no Firestore:', err);
      }
    }
  }

  public async deleteDelivery(id: string): Promise<void> {
    const deletedIds = getItem<string[]>(STORAGE_KEYS.DELETED_DELIVERY_IDS, []);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      setItem(STORAGE_KEYS.DELETED_DELIVERY_IDS, deletedIds);
    }
    const deliveries = this.getDeliveries().filter((d) => d.id !== id);
    setItem(STORAGE_KEYS.DELIVERIES, deliveries);
    this.logAudit('Exclusão', 'Entrega', id, `Entrega excluída ID: ${id}`);
    notifyStorageChange();

    try {
      await deleteDoc(doc(db, 'deliveries', id));
    } catch (err) {
      console.error('Erro ao excluir entrega no Firestore:', err);
    }
  }

  // Expenses
  public getExpenses(): Expense[] {
    const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const history = this.getMonthlyClosingHistory();
    const activeClosedMonths = this.getActiveClosedMonths();

    const expMap = new Map<string, Expense>();

    for (const e of expenses) {
      if (!e || e.is_deleted) continue;
      const m = (e.expense_date || '').slice(0, 7);
      if (activeClosedMonths.has(m)) continue;
      expMap.set(e.id, e);
    }

    for (const rec of history.filter((h) => h.is_reopened)) {
      if (Array.isArray(rec.expenses_snapshot)) {
        for (const e of rec.expenses_snapshot) {
          if (e && !e.is_deleted && !expMap.has(e.id)) {
            expMap.set(e.id, e);
          }
        }
      }
    }

    return Array.from(expMap.values()).sort((a, b) => {
      const timeA = a.created_at || a.expense_date || '';
      const timeB = b.created_at || b.expense_date || '';
      if (timeB !== timeA) return timeB.localeCompare(timeA);
      return (b.code || '').localeCompare(a.code || '');
    });
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

  public async saveExpense(expenseData: Partial<Expense>): Promise<Expense> {
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

    // Clear deleted tracking if saving
    const deletedExpIds = getItem<string[]>(STORAGE_KEYS.DELETED_EXPENSE_IDS, []);
    if (deletedExpIds.includes(expense.id)) {
      setItem(STORAGE_KEYS.DELETED_EXPENSE_IDS, deletedExpIds.filter(i => i !== expense.id));
    }

    // Immediately persist to localStorage and broadcast changes
    setItem(STORAGE_KEYS.EXPENSES, expenses);
    notifyStorageChange();

    await setDoc(doc(db, 'expenses', expense.id), expense);
    return expense;
  }

  public async deleteExpense(id: string): Promise<void> {
    const rawExpenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const expense = rawExpenses.find((e) => e && (e.id === id || e.code === id));

    const deletedIds = getItem<string[]>(STORAGE_KEYS.DELETED_EXPENSE_IDS, []);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
    }
    if (expense?.id && !deletedIds.includes(expense.id)) {
      deletedIds.push(expense.id);
    }
    if (expense?.code && !deletedIds.includes(expense.code)) {
      deletedIds.push(expense.code);
    }
    setItem(STORAGE_KEYS.DELETED_EXPENSE_IDS, deletedIds);

    const expenses = rawExpenses.filter(
      (e) => e && e.id !== id && e.code !== id && (expense ? e.id !== expense.id && e.code !== expense.code : true)
    );
    setItem(STORAGE_KEYS.EXPENSES, expenses);
    this.logAudit('Exclusão', 'Despesa', id, `Despesa excluída: ${expense?.code || id}`);
    notifyStorageChange();

    try {
      await deleteDoc(doc(db, 'expenses', id));
      if (expense?.id && expense.id !== id) {
        await deleteDoc(doc(db, 'expenses', expense.id));
      }
      // Also register in cloud deleted_records document so all sessions/reloads ignore it
      const deletedDocRef = doc(db, 'settings', 'deleted_records');
      const delSnap = await getDoc(deletedDocRef);
      const existingDel = delSnap.exists() ? (delSnap.data()?.deleted_expense_ids || []) : [];
      const newDel = Array.from(new Set([...existingDel, ...deletedIds]));
      await setDoc(deletedDocRef, { deleted_expense_ids: newDel }, { merge: true });
    } catch (err) {
      console.error('Erro ao excluir despesa no Firestore:', err);
    }
  }

  // Payments & Contas a Receber
  public getPayments(): PaymentRecord[] {
    return getItem<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, []);
  }

  public async addPayment(record: PaymentRecord): Promise<void> {
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

      try {
        await setDoc(doc(db, 'sales', sale.id), sales[index]);
      } catch (err) {
        console.error('Erro ao atualizar venda no Firestore após pagamento:', err);
      }
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

  public async saveCompanyInfo(info: CompanyInfo): Promise<void> {
    await setDoc(doc(db, 'settings', 'company_info'), info);
    this.logAudit('Alteração', 'Configuração', 'company', 'Dados da empresa atualizados via Firestore');
  }

  // Monthly Closing Methods
  public getMonthlyClosingState(): MonthlyClosingState {
    return getItem<MonthlyClosingState>(STORAGE_KEYS.MONTHLY_CLOSING_STATE, {
      closed_months: [],
      history: [],
    });
  }

  public getMonthlyClosingHistory(): MonthlyClosingRecord[] {
    const history = getItem<MonthlyClosingRecord[]>(STORAGE_KEYS.MONTHLY_CLOSING_HISTORY, []);
    return history.sort((a, b) => b.month.localeCompare(a.month));
  }

  public postponeMonthlyClosing(todayDateStr?: string): void {
    const state = this.getMonthlyClosingState();
    const today = todayDateStr || getTodayDateString();
    state.last_postponed_date = today;
    setItem(STORAGE_KEYS.MONTHLY_CLOSING_STATE, state);
    notifyStorageChange();

    setDoc(doc(db, 'settings', 'monthly_closing'), state).catch((err) => {
      console.warn('Erro ao salvar adiamento de fechamento no Firestore:', err);
    });
  }

  public async executeMonthlyClosing(
    targetMonth: string, // 'YYYY-MM'
    cutoffDate: string, // YYYY-MM-DD
    notes?: string
  ): Promise<MonthlyClosingRecord> {
    const currentUser = this.getCurrentUser();
    const allSales = getItem<Sale[]>(STORAGE_KEYS.SALES, []).filter((s) => s && !s.is_deleted);
    const allExpenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []).filter((e) => e && !e.is_deleted);
    const allDeliveries = getItem<Delivery[]>(STORAGE_KEYS.DELIVERIES, []).filter((d) => d && !d.is_deleted);

    // 1. Identify movements for target month (full month unless a valid in-month cutoff date is provided)
    const isCutoffInMonth = !!(cutoffDate && cutoffDate.startsWith(targetMonth));
    let salesToClose = allSales.filter(
      (s) =>
        !s.is_deleted &&
        (s.sale_date || '').startsWith(targetMonth) &&
        (isCutoffInMonth ? (s.sale_date || '') <= cutoffDate : true)
    );
    if (salesToClose.length === 0) {
      const initial = generateInitialData();
      salesToClose = initial.sales.filter(
        (s) =>
          !s.is_deleted &&
          (s.sale_date || '').startsWith(targetMonth) &&
          (isCutoffInMonth ? (s.sale_date || '') <= cutoffDate : true)
      );
    }

    let expensesToClose = allExpenses.filter(
      (e) =>
        !e.is_deleted &&
        (e.expense_date || '').startsWith(targetMonth) &&
        (isCutoffInMonth ? (e.expense_date || '') <= cutoffDate : true)
    );

    let deliveriesToClose = allDeliveries.filter(
      (d) =>
        !d.is_deleted &&
        (d.delivery_date || '').startsWith(targetMonth) &&
        (isCutoffInMonth ? (d.delivery_date || '') <= cutoffDate : true)
    );
    if (deliveriesToClose.length === 0) {
      const initial = generateInitialData();
      deliveriesToClose = initial.deliveries.filter(
        (d) =>
          !d.is_deleted &&
          (d.delivery_date || '').startsWith(targetMonth) &&
          (isCutoffInMonth ? (d.delivery_date || '') <= cutoffDate : true)
      );
    }

    // Month label
    const [year, month] = targetMonth.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthLabel = `${monthNames[parseInt(month, 10) - 1]} de ${year}`;

    // Aggregates
    const gross_revenue = salesToClose.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
    const total_received = salesToClose.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
    const total_receivable = salesToClose.reduce((acc, curr) => acc + (curr.pending_amount || 0), 0);
    const total_boxes = salesToClose.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    const total_expenses = expensesToClose.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const net_result = gross_revenue - total_expenses;
    const profit_margin = gross_revenue > 0 ? (net_result / gross_revenue) * 100 : 0;

    const closingRecord: MonthlyClosingRecord = {
      id: `closing-${targetMonth}-${Date.now()}`,
      month: targetMonth,
      month_label: monthLabel,
      closed_at: new Date().toISOString(),
      closed_by: currentUser.name || 'Administrador',
      closed_by_email: currentUser.email || '',
      gross_revenue,
      total_received,
      total_receivable,
      total_boxes,
      total_expenses,
      net_result,
      profit_margin,
      sales_count: salesToClose.length,
      expenses_count: expensesToClose.length,
      sales_snapshot: salesToClose,
      expenses_snapshot: expensesToClose,
      deliveries_snapshot: deliveriesToClose,
      notes: notes || (isCutoffInMonth ? `Fechamento do mês ${monthLabel} concluído até o dia ${cutoffDate}.` : `Fechamento completo do mês ${monthLabel}.`),
    };

    // 2. Update state & history
    const state = this.getMonthlyClosingState();
    if (!state.closed_months.includes(targetMonth)) {
      state.closed_months.push(targetMonth);
    }
    const history = this.getMonthlyClosingHistory();
    // remove any previous closing for this month or update it
    const filteredHistory = history.filter((h) => h.month !== targetMonth);
    filteredHistory.unshift(closingRecord);
    state.history = filteredHistory;

    setItem(STORAGE_KEYS.MONTHLY_CLOSING_STATE, state);
    setItem(STORAGE_KEYS.MONTHLY_CLOSING_HISTORY, filteredHistory);

    // 3. Reset/Zero movements for closed month (both local and Firestore)
    const salesIdsToDelete = salesToClose.map((s) => s.id);
    const expensesIdsToDelete = expensesToClose.map((e) => e.id);
    const deliveriesIdsToDelete = deliveriesToClose.map((d) => d.id);

    const deletedSalesIds = getItem<string[]>(STORAGE_KEYS.DELETED_SALES_IDS, []);
    const newDeletedSalesIds = Array.from(new Set([...deletedSalesIds, ...salesIdsToDelete]));
    setItem(STORAGE_KEYS.DELETED_SALES_IDS, newDeletedSalesIds);

    const deletedExpensesIds = getItem<string[]>(STORAGE_KEYS.DELETED_EXPENSE_IDS, []);
    const newDeletedExpensesIds = Array.from(new Set([...deletedExpensesIds, ...expensesIdsToDelete]));
    setItem(STORAGE_KEYS.DELETED_EXPENSE_IDS, newDeletedExpensesIds);

    const deletedDeliveriesIds = getItem<string[]>(STORAGE_KEYS.DELETED_DELIVERY_IDS, []);
    const newDeletedDeliveriesIds = Array.from(new Set([...deletedDeliveriesIds, ...deliveriesIdsToDelete]));
    setItem(STORAGE_KEYS.DELETED_DELIVERY_IDS, newDeletedDeliveriesIds);

    const remainingSales = allSales.filter((s) => !salesIdsToDelete.includes(s.id));
    const remainingExpenses = allExpenses.filter((e) => !expensesIdsToDelete.includes(e.id));
    const remainingDeliveries = allDeliveries.filter((d) => !deliveriesIdsToDelete.includes(d.id));

    setItem(STORAGE_KEYS.SALES, remainingSales);
    setItem(STORAGE_KEYS.EXPENSES, remainingExpenses);
    setItem(STORAGE_KEYS.DELIVERIES, remainingDeliveries);

    this.logAudit(
      'Alteração',
      'Configuração',
      closingRecord.id,
      `Fechamento do mês ${monthLabel} executado com sucesso. ${salesToClose.length} vendas e ${expensesToClose.length} despesas zeradas e arquivadas no histórico.`
    );

    notifyStorageChange();

    // 4. Persist to Firestore: update monthly_closing document and delete the items in chunks
    try {
      await setDoc(doc(db, 'settings', 'monthly_closing'), state);
      await setDoc(doc(db, 'settings', 'deleted_records'), {
        deleted_sales_ids: newDeletedSalesIds,
        deleted_expense_ids: newDeletedExpensesIds,
        deleted_delivery_ids: newDeletedDeliveriesIds,
        updated_at: new Date().toISOString(),
      });

      // Also save individual archive doc in firestore for durability
      await setDoc(doc(db, 'monthly_closings', targetMonth), closingRecord);

      // Delete items from firestore collections in batches
      const maxBatch = 400;
      let batch = writeBatch(db);
      let count = 0;

      for (const id of salesIdsToDelete) {
        batch.delete(doc(db, 'sales', id));
        count++;
        if (count >= maxBatch) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      for (const id of expensesIdsToDelete) {
        batch.delete(doc(db, 'expenses', id));
        count++;
        if (count >= maxBatch) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      for (const id of deliveriesIdsToDelete) {
        batch.delete(doc(db, 'deliveries', id));
        count++;
        if (count >= maxBatch) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.error('Erro ao persistir fechamento mensal no Firestore:', err);
    }

    return closingRecord;
  }

  public async reopenMonthlyClosing(
    targetMonthOrId: string
  ): Promise<MonthlyClosingRecord | null> {
    const currentUser = this.getCurrentUser();
    const state = this.getMonthlyClosingState();
    const history = this.getMonthlyClosingHistory();

    let record = history.find(
      (h) => h.month === targetMonthOrId || h.id === targetMonthOrId
    );

    // If not in local history or snapshot is empty, attempt to fetch from Firestore monthly_closings
    if (!record || !record.sales_snapshot || record.sales_snapshot.length === 0) {
      try {
        const fireDoc = await getDoc(doc(db, 'monthly_closings', targetMonthOrId));
        if (fireDoc.exists()) {
          const fData = fireDoc.data() as MonthlyClosingRecord;
          if (!record || (fData.sales_snapshot && fData.sales_snapshot.length > (record.sales_snapshot?.length || 0))) {
            record = fData;
          }
        }
      } catch (err) {
        console.warn(`Erro ao buscar ${targetMonthOrId} no Firestore:`, err);
      }
    }

    const monthTarget = record?.month || (targetMonthOrId.includes('-') ? targetMonthOrId : '2026-09');

    if ((!record || !record.sales_snapshot || record.sales_snapshot.length === 0) && monthTarget !== targetMonthOrId) {
      try {
        const fireDoc = await getDoc(doc(db, 'monthly_closings', monthTarget));
        if (fireDoc.exists()) {
          const fData = fireDoc.data() as MonthlyClosingRecord;
          if (!record || (fData.sales_snapshot && fData.sales_snapshot.length > (record.sales_snapshot?.length || 0))) {
            record = fData;
          }
        }
      } catch (err) {
        console.warn(`Erro ao buscar ${monthTarget} no Firestore:`, err);
      }
    }

    // If record still not found, construct a minimal record for that month
    if (!record) {
      const [year, month] = monthTarget.split('-');
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const monthLabel = `${monthNames[parseInt(month, 10) - 1] || month} de ${year}`;
      record = {
        id: `closing-${monthTarget}-${Date.now()}`,
        month: monthTarget,
        month_label: monthLabel,
        closed_at: new Date().toISOString(),
        closed_by: currentUser.name || 'Administrador',
        closed_by_email: currentUser.email || '',
        gross_revenue: 0,
        total_received: 0,
        total_receivable: 0,
        total_boxes: 0,
        total_expenses: 0,
        net_result: 0,
        profit_margin: 0,
        sales_count: 0,
        expenses_count: 0,
        sales_snapshot: [],
        expenses_snapshot: [],
        deliveries_snapshot: [],
      };
    }

    const rawSales = record.sales_snapshot || [];
    let salesToRestore = rawSales.map((s) => ({ ...s }));

    const rawDeliveries = record.deliveries_snapshot || [];
    let deliveriesToRestore = rawDeliveries.map((d) => ({ ...d }));

    const rawExpenses = record.expenses_snapshot || [];
    let expensesToRestore = rawExpenses.map((e) => ({ ...e }));

    // Fallback: If snapshot was empty or zeroed out, retrieve initial movements for this month
    if (salesToRestore.length === 0) {
      const initial = generateInitialData();
      const fallbackSales = initial.sales.filter((s) => (s.sale_date || '').startsWith(monthTarget));
      if (fallbackSales.length > 0) {
        salesToRestore = fallbackSales;
        record.sales_snapshot = fallbackSales;
        record.sales_count = fallbackSales.length;
        record.gross_revenue = fallbackSales.reduce((a, b) => a + (b.total_amount || 0), 0);
        record.total_received = fallbackSales.reduce((a, b) => a + (b.amount_paid || 0), 0);
        record.total_boxes = fallbackSales.reduce((a, b) => a + (b.quantity || 0), 0);
      }
    }

    if (deliveriesToRestore.length === 0) {
      const initial = generateInitialData();
      const fallbackDeliveries = initial.deliveries.filter((d) => (d.delivery_date || '').startsWith(monthTarget));
      if (fallbackDeliveries.length > 0) {
        deliveriesToRestore = fallbackDeliveries;
        record.deliveries_snapshot = fallbackDeliveries;
      }
    }

    const salesIdsToRestore = new Set(salesToRestore.map((s) => s.id));
    const expensesIdsToRestore = new Set(expensesToRestore.map((e) => e.id));
    const deliveriesIdsToRestore = new Set(deliveriesToRestore.map((d) => d.id));

    // 1. Remove restored IDs from deleted trackers (including any with -ret suffix or matching code)
    const deletedSalesIds = getItem<string[]>(STORAGE_KEYS.DELETED_SALES_IDS, []).filter(
      (id) => !salesIdsToRestore.has(id) && !salesToRestore.some((s) => s.code === id || id.startsWith(s.id))
    );
    setItem(STORAGE_KEYS.DELETED_SALES_IDS, deletedSalesIds);

    const deletedExpensesIds = getItem<string[]>(STORAGE_KEYS.DELETED_EXPENSE_IDS, []).filter(
      (id) => !expensesIdsToRestore.has(id) && !expensesToRestore.some((e) => e.code === id || id.startsWith(e.id))
    );
    setItem(STORAGE_KEYS.DELETED_EXPENSE_IDS, deletedExpensesIds);

    const deletedDeliveriesIds = getItem<string[]>(STORAGE_KEYS.DELETED_DELIVERY_IDS, []).filter(
      (id) => !deliveriesIdsToRestore.has(id) && !deliveriesToRestore.some((d) => d.code === id || id.startsWith(d.id))
    );
    setItem(STORAGE_KEYS.DELETED_DELIVERY_IDS, deletedDeliveriesIds);

    // 2. Merge back into local active collections (prevent duplicates)
    const currentSales = getItem<Sale[]>(STORAGE_KEYS.SALES, []);
    const existingSaleIds = new Set(currentSales.map((s) => s.id));
    const mergedSales = [
      ...salesToRestore.filter((s) => !existingSaleIds.has(s.id)),
      ...currentSales,
    ];
    mergedSales.sort((a, b) => {
      const timeA = a.created_at || a.sale_date || '';
      const timeB = b.created_at || b.sale_date || '';
      if (timeB !== timeA) return timeB.localeCompare(timeA);
      return (b.code || '').localeCompare(a.code || '');
    });
    setItem(STORAGE_KEYS.SALES, mergedSales);

    const currentExpenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const existingExpenseIds = new Set(currentExpenses.map((e) => e.id));
    const mergedExpenses = [
      ...expensesToRestore.filter((e) => !existingExpenseIds.has(e.id)),
      ...currentExpenses,
    ];
    mergedExpenses.sort((a, b) => {
      const timeA = a.created_at || a.expense_date || '';
      const timeB = b.created_at || b.expense_date || '';
      if (timeB !== timeA) return timeB.localeCompare(timeA);
      return (b.code || '').localeCompare(a.code || '');
    });
    setItem(STORAGE_KEYS.EXPENSES, mergedExpenses);

    const currentDeliveries = getItem<Delivery[]>(STORAGE_KEYS.DELIVERIES, []);
    const existingDeliveryIds = new Set(currentDeliveries.map((d) => d.id));
    const mergedDeliveries = [
      ...deliveriesToRestore.filter((d) => !existingDeliveryIds.has(d.id)),
      ...currentDeliveries,
    ];
    mergedDeliveries.sort((a, b) => {
      const timeA = a.created_at || a.delivery_date || '';
      const timeB = b.delivery_date || '';
      if (timeB !== timeA) return timeB.localeCompare(timeA);
      return (b.code || '').localeCompare(a.code || '');
    });
    setItem(STORAGE_KEYS.DELIVERIES, mergedDeliveries);

    // 3. Update state & history (mark reopened and remove from closed_months)
    state.closed_months = (state.closed_months || []).filter((m) => m !== record.month && m !== monthTarget);
    const updatedRecord: MonthlyClosingRecord = {
      ...record,
      is_reopened: true,
      reopened_at: new Date().toISOString(),
      reopened_by: currentUser.name || 'Administrador',
    };

    const hasInHistory = history.some((h) => h.id === record.id || h.month === record.month);
    const updatedHistory = hasInHistory
      ? history.map((h) => (h.id === record.id || h.month === record.month ? updatedRecord : h))
      : [updatedRecord, ...history];

    state.history = updatedHistory;

    setItem(STORAGE_KEYS.MONTHLY_CLOSING_STATE, state);
    setItem(STORAGE_KEYS.MONTHLY_CLOSING_HISTORY, updatedHistory);

    this.logAudit(
      'Alteração',
      'Configuração',
      record.id,
      `Fechamento do mês ${record.month_label} retornado com sucesso. ${salesToRestore.length} vendas, ${expensesToRestore.length} despesas e ${deliveriesToRestore.length} entregas reativadas no painel.`
    );

    notifyStorageChange();

    // 4. Batch persist to Firestore
    try {
      await setDoc(doc(db, 'settings', 'monthly_closing'), state);
      await setDoc(doc(db, 'settings', 'deleted_records'), {
        deleted_sales_ids: deletedSalesIds,
        deleted_expense_ids: deletedExpensesIds,
        deleted_delivery_ids: deletedDeliveriesIds,
        updated_at: new Date().toISOString(),
      });

      // Update doc in monthly_closings
      await setDoc(doc(db, 'monthly_closings', record.month), updatedRecord);

      // Re-add items in batches to firestore collections
      const maxBatch = 400;
      let batch = writeBatch(db);
      let count = 0;

      for (const sale of salesToRestore) {
        batch.set(doc(db, 'sales', sale.id), sanitizeForFirestore(sale));
        count++;
        if (count >= maxBatch) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      for (const expense of expensesToRestore) {
        batch.set(doc(db, 'expenses', expense.id), sanitizeForFirestore(expense));
        count++;
        if (count >= maxBatch) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      for (const delivery of deliveriesToRestore) {
        batch.set(doc(db, 'deliveries', delivery.id), sanitizeForFirestore(delivery));
        count++;
        if (count >= maxBatch) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.error('Erro ao persistir retorno de fechamento no Firestore:', err);
    }

    return updatedRecord;
  }

  public async reopenAllMonthlyClosings(): Promise<number> {
    const state = this.getMonthlyClosingState();
    const history = this.getMonthlyClosingHistory();
    const targets = new Set<string>();

    (state.closed_months || []).forEach((m) => targets.add(m));
    history.forEach((h) => targets.add(h.month));

    try {
      const col = await getDocs(collection(db, 'monthly_closings'));
      col.forEach((d) => targets.add(d.id));
    } catch (e) {}

    let count = 0;
    for (const month of Array.from(targets)) {
      await this.reopenMonthlyClosing(month);
      count++;
    }

    // Guarantee that closed_months and deleted trackers are completely cleared
    state.closed_months = [];
    setItem(STORAGE_KEYS.MONTHLY_CLOSING_STATE, state);
    setItem(STORAGE_KEYS.DELETED_SALES_IDS, []);
    setItem(STORAGE_KEYS.DELETED_DELIVERY_IDS, []);
    setItem(STORAGE_KEYS.DELETED_EXPENSE_IDS, []);
    try {
      await setDoc(doc(db, 'settings', 'monthly_closing'), state);
      await setDoc(doc(db, 'settings', 'deleted_records'), {
        deleted_sales_ids: [],
        deleted_delivery_ids: [],
        deleted_expense_ids: [],
        updated_at: new Date().toISOString(),
      });
    } catch (e) {}

    notifyStorageChange();
    return count;
  }

  public async deleteMonthlyClosingRecord(recordIdOrMonth: string): Promise<void> {
    const state = this.getMonthlyClosingState();
    const history = this.getMonthlyClosingHistory();

    const target = history.find(
      (h) => h.id === recordIdOrMonth || h.month === recordIdOrMonth
    );
    const month = target ? target.month : recordIdOrMonth;

    state.closed_months = (state.closed_months || []).filter((m) => m !== month);
    const updatedHistory = history.filter(
      (h) => h.id !== recordIdOrMonth && h.month !== recordIdOrMonth
    );
    state.history = updatedHistory;

    setItem(STORAGE_KEYS.MONTHLY_CLOSING_STATE, state);
    setItem(STORAGE_KEYS.MONTHLY_CLOSING_HISTORY, updatedHistory);
    notifyStorageChange();

    try {
      await setDoc(doc(db, 'settings', 'monthly_closing'), state);
      await deleteDoc(doc(db, 'monthly_closings', month));
    } catch (err) {
      console.error('Erro ao excluir registro de fechamento:', err);
    }
  }

  public async clearAllMonthlyClosingHistory(): Promise<void> {
    const emptyState: MonthlyClosingState = {
      closed_months: [],
      history: [],
      updated_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.MONTHLY_CLOSING_STATE, emptyState);
    setItem(STORAGE_KEYS.MONTHLY_CLOSING_HISTORY, []);
    setItem(STORAGE_KEYS.DELETED_SALES_IDS, []);
    setItem(STORAGE_KEYS.DELETED_DELIVERY_IDS, []);
    setItem(STORAGE_KEYS.DELETED_EXPENSE_IDS, []);
    notifyStorageChange();

    try {
      await setDoc(doc(db, 'settings', 'monthly_closing'), emptyState);
      await setDoc(doc(db, 'settings', 'deleted_records'), {
        deleted_sales_ids: [],
        deleted_delivery_ids: [],
        deleted_expense_ids: [],
        updated_at: new Date().toISOString(),
      });
      const col = await getDocs(collection(db, 'monthly_closings'));
      for (const d of col.docs) {
        await deleteDoc(doc(db, 'monthly_closings', d.id));
      }
    } catch (err) {
      console.error('Erro ao limpar histórico no Firestore:', err);
    }
  }

  public exportBackupJSON(): string {
    return JSON.stringify(localStorage);
  }

  public importBackupJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      Object.keys(data).forEach(key => {
        localStorage.setItem(key, data[key]);
      });
      notifyStorageChange();
      return true;
    } catch (e) {
      return false;
    }
  }

  public resetToDemoData(): void {
    this.init();
    notifyStorageChange();
  }
}

export const storage = new StorageService();

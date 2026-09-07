import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  Header,
  SaleModal,
  QuickSaleModal,
  DeliveryModal,
  ExpenseModal,
  ReceivePaymentModal,
  ExcelImportModal,
  PrintReportView,
  ConfirmModal,
  GlobalSearchModal,
} from './components';
import {
  DashboardView,
  SalesView,
  DeliveriesView,
  ReceivablesView,
  ExpensesView,
  DriversView,
  ClientsView,
  CommissionsView,
  FinancialClosingView,
  ReportsView,
  SettingsView,
} from './views';
import { storage } from './services/storage';
import { authService } from './services/auth';
import { AuthView } from './views/auth/AuthView';
import { Sale, Delivery, Expense, Client, Driver, User } from './types';
import { formatDate, formatCurrency, getTodayDateString } from './utils/formatters';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const sessionRes = authService.getSession();
    return sessionRes.user;
  });
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<boolean>(() => {
    const sessionRes = authService.getSession();
    return sessionRes.expired;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // Modals state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const [isQuickSaleModalOpen, setIsQuickSaleModalOpen] = useState(false);

  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isExpenseFuelMode, setIsExpenseFuelMode] = useState(false);

  const [isReceivePaymentModalOpen, setIsReceivePaymentModalOpen] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<Sale | null>(null);

  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState<any | null>(null);

  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Subscribe to storage updates
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setDataVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  // Handlers for Sales
  const handleOpenNewSale = (preselectedClient?: Client) => {
    if (preselectedClient) {
      const uPrice = preselectedClient.valor_unitario_padrao || 25.5;
      const pMethod = preselectedClient.forma_pagamento_preferencial || 'PIX';
      const dId = preselectedClient.motorista_preferencial_id || '';
      const dName = preselectedClient.motorista_preferencial_nome || '';
      const qty = 50;
      const total = Math.round(qty * uPrice * 100) / 100;
      setEditingSale({
        id: '',
        code: '',
        client_id: preselectedClient.id,
        client_name: preselectedClient.name,
        client_document: preselectedClient.cpf_cnpj,
        phone: preselectedClient.phone || preselectedClient.whatsapp,
        address: preselectedClient.address,
        number: preselectedClient.number || '',
        complement: preselectedClient.complement || '',
        neighborhood: preselectedClient.neighborhood,
        city: preselectedClient.city,
        state: preselectedClient.state || 'MA',
        driver_id: dId,
        driver_name: dName,
        quantity: qty,
        unit_price: uPrice,
        total_amount: total,
        payment_method: pMethod,
        payment_status: 'Pago',
        amount_paid: total,
        pending_amount: 0,
        sale_date: new Date().toISOString().split('T')[0],
        delivery_status: 'Aguardando',
        commission_rate: 2.5,
        commission_amount: Math.round(total * 0.025 * 100) / 100,
      });
    } else {
      setEditingSale(null);
    }
    setIsSaleModalOpen(true);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setIsSaleModalOpen(true);
  };

  const handleDeleteSale = (sale: Sale) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Venda',
      message: `Tem certeza que deseja excluir a venda ${sale.code} de ${sale.client_name}? Esta ação pode ser desfeita ou restaurada pelos administradores.`,
      confirmText: 'Sim, Excluir Venda',
      onConfirm: () => {
        storage.deleteSale(sale.id);
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Handlers for Delivery
  const handleOpenDeliveryModal = (delivery: Delivery) => {
    setEditingDelivery(delivery);
    setIsDeliveryModalOpen(true);
  };

  const handleDeleteDelivery = (delivery: Delivery) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Entrega',
      message: `Deseja remover a entrega ${delivery.code} para ${delivery.client_name}?`,
      confirmText: 'Excluir Entrega',
      onConfirm: () => {
        storage.deleteDelivery(delivery.id);
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handlePrintDeliveryRoute = (deliveriesToPrint: Delivery[]) => {
    setPrintConfig({
      title: 'Romaneio de Entregas & Rota dos Motoristas',
      periodText: `Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      summaryCards: [
        { label: 'Total Entregas', value: `${deliveriesToPrint.length}` },
        {
          label: 'Total Galões',
          value: `${deliveriesToPrint.reduce((a, b) => a + b.quantity, 0)} un`,
        },
      ],
      columns: [
        { header: 'Código', key: 'code' },
        { header: 'Cliente', key: 'client_name' },
        { header: 'Endereço Completo', key: 'address' },
        { header: 'Cidade', key: 'city' },
        { header: 'Motorista', key: 'driver_name' },
        { header: 'Galões', key: 'quantity', align: 'center' },
        { header: 'Status', key: 'status', align: 'center' },
      ],
      rows: deliveriesToPrint,
    });
    setIsPrintModalOpen(true);
  };

  // Handlers for Expenses
  const handleOpenNewExpense = (isFuel = false) => {
    setEditingExpense(null);
    setIsExpenseFuelMode(isFuel);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseFuelMode(expense.is_fuel);
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = (expense: Expense) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Despesa',
      message: `Deseja realmente remover o lançamento de despesa "${expense.description}" no valor de ${formatCurrency(expense.amount)}?`,
      confirmText: 'Excluir Despesa',
      onConfirm: () => {
        storage.deleteExpense(expense.id);
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Handlers for Receivables
  const handleOpenReceivePayment = (sale: Sale) => {
    setSelectedSaleForPayment(sale);
    setIsReceivePaymentModalOpen(true);
  };

  const handlePrintReceivablesReport = () => {
    const pendingSales = storage.getSales().filter((s) => !s.is_deleted && s.pending_amount > 0);
    const totalPending = pendingSales.reduce((acc, curr) => acc + curr.pending_amount, 0);

    setPrintConfig({
      title: 'Relatório Oficial de Contas a Receber (Cobrança)',
      periodText: `Posição em: ${new Date().toLocaleDateString('pt-BR')}`,
      summaryCards: [
        { label: 'Total Pendente a Receber', value: formatCurrency(totalPending) },
        { label: 'Títulos em Aberto', value: `${pendingSales.length}` },
      ],
      columns: [
        { header: 'Código', key: 'code' },
        { header: 'Data Venda', key: 'dateFormatted' },
        { header: 'Vencimento', key: 'dueFormatted' },
        { header: 'Cliente', key: 'client_name' },
        { header: 'Cidade', key: 'city' },
        { header: 'Total', key: 'totalFormatted', align: 'right' },
        { header: 'Saldo Devedor', key: 'pendingFormatted', align: 'right' },
      ],
      rows: pendingSales.map((s) => ({
        ...s,
        dateFormatted: formatDate(s.sale_date),
        dueFormatted: s.due_date ? formatDate(s.due_date) : 'À vista',
        totalFormatted: formatCurrency(s.total_amount),
        pendingFormatted: formatCurrency(s.pending_amount),
      })),
    });
    setIsPrintModalOpen(true);
  };

  // Handlers for Commissions Print
  const handlePrintCommissionStatement = (driverName: string, items: any[], totals: any) => {
    setPrintConfig({
      title: `Extrato & Recibo de Comissão - ${driverName}`,
      periodText: `Emissão para conferência e assinatura de pagamento de comissão`,
      summaryCards: [
        { label: 'Total Comissão a Pagar', value: formatCurrency(totals.totalCommission) },
        { label: 'Galões Entregues', value: `${totals.gallonsCount} un` },
        { label: 'Volume em Vendas', value: formatCurrency(totals.totalSalesAmount) },
        { label: 'Taxa Aplicada', value: `${totals.defaultRate}%` },
      ],
      columns: [
        { header: 'Data', key: 'dateFormatted' },
        { header: 'Venda', key: 'code' },
        { header: 'Cliente', key: 'client_name' },
        { header: 'Galões', key: 'quantity', align: 'center' },
        { header: 'Valor Venda', key: 'saleFormatted', align: 'right' },
        { header: 'Comissão', key: 'commFormatted', align: 'right' },
      ],
      rows: items.map((i) => ({
        ...i,
        dateFormatted: formatDate(i.sale_date),
        saleFormatted: formatCurrency(i.total_amount),
        commFormatted: formatCurrency(i.commission_amount),
      })),
    });
    setIsPrintModalOpen(true);
  };

  // Handlers for Closing DRE Print
  const handlePrintClosingReport = (monthText: string, dreData: any, summary: any) => {
    setPrintConfig({
      title: `Demonstrativo de Resultado do Exercício (DRE) - ${monthText}`,
      periodText: `Água Cristal Sul • Fechamento Financeiro Mensal Oficial`,
      summaryCards: [
        { label: 'Resultado Líquido do Mês', value: formatCurrency(dreData.netResult) },
        { label: 'Receita Bruta Vendas', value: formatCurrency(dreData.grossRevenue) },
        { label: 'Total Deduções/Custos', value: formatCurrency(dreData.totalDeductions) },
        { label: 'Margem de Lucro', value: `${summary.profitMargin.toFixed(1)}%` },
      ],
      columns: [
        { header: 'Linha do Demonstrativo Financeiro', key: 'line' },
        { header: 'Valor Apurado (R$)', key: 'valFormatted', align: 'right' },
      ],
      rows: [
        { line: '1. RECEITA OPERACIONAL BRUTA (Vendas de Água)', valFormatted: formatCurrency(dreData.grossRevenue) },
        { line: '(-) Despesas com Combustível', valFormatted: `- ${formatCurrency(dreData.fuelExpenses)}` },
        { line: '(-) Manutenção de Frotas & Veículos', valFormatted: `- ${formatCurrency(dreData.maintenanceExpenses)}` },
        { line: '(-) Comissões dos Motoristas', valFormatted: `- ${formatCurrency(dreData.commissionsExpenses)}` },
        { line: '(-) Salários e Pessoal', valFormatted: `- ${formatCurrency(dreData.salariesExpenses)}` },
        { line: '(-) Demais Despesas Operacionais', valFormatted: `- ${formatCurrency(dreData.otherExpenses)}` },
        { line: 'TOTAL DE DEDUÇÕES E CUSTOS', valFormatted: `- ${formatCurrency(dreData.totalDeductions)}` },
        { line: '(=) RESULTADO LÍQUIDO DO PERÍODO', valFormatted: formatCurrency(dreData.netResult) },
      ],
    });
    setIsPrintModalOpen(true);
  };

  // Global Search selection handler
  const handleSelectSearchResult = (type: string, item: any) => {
    if (type === 'sale') {
      setEditingSale(item);
      setIsSaleModalOpen(true);
    } else if (type === 'delivery') {
      setEditingDelivery(item);
      setIsDeliveryModalOpen(true);
    } else if (type === 'client') {
      setActiveTab('clients');
    } else if (type === 'driver') {
      setActiveTab('drivers');
    }
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Deliveries and receivables count for sidebar badges
  const deliveriesList = storage.getDeliveries();
  const salesList = storage.getSales();
  const pendingDeliveriesCount = deliveriesList.filter(
    (d) => d.status === 'Aguardando' || d.status === 'Saiu para entrega'
  ).length;
  const pendingReceivablesCount = salesList.filter(
    (s) => !s.is_deleted && s.sale_status !== 'Cancelada' && (s.pending_amount || 0) > 0
  ).length;

  const todayStr = getTodayDateString();
  const todaySalesTotal = salesList
    .filter((s) => !s.is_deleted && s.sale_status !== 'Cancelada' && s.sale_date === todayStr)
    .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  const todayDeliveriesCount = deliveriesList.filter(
    (d) => d.delivery_date === todayStr
  ).length;

  // Session monitor: checks for token/session expiration
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      const sessionRes = authService.getSession();
      if (!sessionRes.user || sessionRes.expired) {
        setCurrentUser(null);
        setSessionExpiredNotice(true);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setSessionExpiredNotice(false);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setSessionExpiredNotice(false);
  };

  // Role Permissions
  const isVisualizer = currentUser?.role === 'VISUALIZACAO';

  const handleNavigateTab = (tab: string) => {
    if (isVisualizer && (tab === 'settings' || tab === 'configuracoes')) {
      alert('Acesso restrito: o perfil de Visualização não possui acesso às Configurações do sistema.');
      return;
    }
    setActiveTab(tab);
  };

  const handlePermittedNewSale = (preselectedClient?: Client) => {
    if (isVisualizer) {
      alert('Acesso restrito: seu perfil de Visualização permite apenas consulta.');
      return;
    }
    handleOpenNewSale(preselectedClient);
  };

  const handlePermittedQuickSale = () => {
    if (isVisualizer) {
      alert('Acesso restrito: seu perfil de Visualização permite apenas consulta.');
      return;
    }
    setIsQuickSaleModalOpen(true);
  };

  const handlePermittedNewExpense = () => {
    if (isVisualizer) {
      alert('Acesso restrito: seu perfil de Visualização permite apenas consulta.');
      return;
    }
    handleOpenNewExpense();
  };

  // Route Protection: If not authenticated, render the complete Auth module
  if (!currentUser) {
    return (
      <AuthView
        onLoginSuccess={handleLoginSuccess}
        initialExpiredNotice={sessionExpiredNotice}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleNavigateTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        onOpenNewSale={() => handlePermittedNewSale()}
        onOpenQuickSale={() => handlePermittedQuickSale()}
        pendingDeliveriesCount={pendingDeliveriesCount}
        pendingReceivablesCount={pendingReceivablesCount}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenGlobalSearch={() => setIsSearchModalOpen(true)}
          onOpenQuickSale={() => handlePermittedQuickSale()}
          onOpenNewSale={() => handlePermittedNewSale()}
          todaySalesTotal={todaySalesTotal}
          todayDeliveriesCount={todayDeliveriesCount}
          onNavigateToTab={handleNavigateTab}
          onLogout={handleLogout}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-12">
            {activeTab === 'dashboard' && (
              <DashboardView
                onNavigate={handleNavigateTab}
                onOpenNewSale={() => handlePermittedNewSale()}
                onOpenQuickSale={() => handlePermittedQuickSale()}
                onOpenNewExpense={() => handlePermittedNewExpense()}
              />
            )}

            {(activeTab === 'sales' || activeTab === 'vendas') && (
              <SalesView
                onOpenNewSale={() => handleOpenNewSale()}
                onOpenQuickSale={() => setIsQuickSaleModalOpen(true)}
                onEditSale={handleEditSale}
                onDeleteSale={handleDeleteSale}
                onOpenReceivePayment={handleOpenReceivePayment}
                onOpenImportExcel={() => setIsExcelImportModalOpen(true)}
              />
            )}

            {(activeTab === 'deliveries' || activeTab === 'entregas') && (
              <DeliveriesView
                onOpenDeliveryModal={handleOpenDeliveryModal}
                onPrintRoute={handlePrintDeliveryRoute}
                onDeleteDelivery={handleDeleteDelivery}
              />
            )}

            {(activeTab === 'receivables' || activeTab === 'contas-receber') && (
              <ReceivablesView
                onOpenReceivePaymentModal={handleOpenReceivePayment}
                onPrintReceivablesReport={handlePrintReceivablesReport}
              />
            )}

            {(activeTab === 'expenses' || activeTab === 'despesas') && (
              <ExpensesView
                onOpenNewExpense={handleOpenNewExpense}
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {(activeTab === 'drivers' || activeTab === 'motoristas') && (
              <DriversView
                onSelectDriverHistory={(d) => {
                  setActiveTab('comissoes');
                }}
              />
            )}

            {(activeTab === 'clients' || activeTab === 'clientes') && (
              <ClientsView
                onNewSaleForClient={(c) => {
                  handleOpenNewSale(c);
                }}
                onOpenReceivePaymentModal={handleOpenReceivePayment}
              />
            )}

            {(activeTab === 'commissions' || activeTab === 'comissoes') && (
              <CommissionsView
                onPrintCommissionStatement={handlePrintCommissionStatement}
              />
            )}

            {(activeTab === 'financial_closing' || activeTab === 'fechamento-mensal' || activeTab === 'financeiro') && (
              <FinancialClosingView
                onPrintClosingReport={handlePrintClosingReport}
              />
            )}

            {(activeTab === 'reports' || activeTab === 'relatorios') && (
              <ReportsView
                onOpenPrintModal={(cfg) => {
                  setPrintConfig(cfg);
                  setIsPrintModalOpen(true);
                }}
              />
            )}

            {(activeTab === 'settings' || activeTab === 'configuracoes') && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Modals & Dialogs */}
      {isSearchModalOpen && (
        <GlobalSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectItem={handleSelectSearchResult}
        />
      )}

      {isSaleModalOpen && (
        <SaleModal
          isOpen={isSaleModalOpen}
          onClose={() => {
            setIsSaleModalOpen(false);
            setEditingSale(null);
          }}
          sale={editingSale}
        />
      )}

      {isQuickSaleModalOpen && (
        <QuickSaleModal
          isOpen={isQuickSaleModalOpen}
          onClose={() => setIsQuickSaleModalOpen(false)}
        />
      )}

      {isDeliveryModalOpen && (
        <DeliveryModal
          isOpen={isDeliveryModalOpen}
          onClose={() => {
            setIsDeliveryModalOpen(false);
            setEditingDelivery(null);
          }}
          delivery={editingDelivery}
        />
      )}

      {isExpenseModalOpen && (
        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          expense={editingExpense}
          initialIsFuel={isExpenseFuelMode}
        />
      )}

      {isReceivePaymentModalOpen && selectedSaleForPayment && (
        <ReceivePaymentModal
          isOpen={isReceivePaymentModalOpen}
          onClose={() => {
            setIsReceivePaymentModalOpen(false);
            setSelectedSaleForPayment(null);
          }}
          sale={selectedSaleForPayment}
        />
      )}

      {isExcelImportModalOpen && (
        <ExcelImportModal
          isOpen={isExcelImportModalOpen}
          onClose={() => setIsExcelImportModalOpen(false)}
        />
      )}

      {isPrintModalOpen && printConfig && (
        <PrintReportView
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPrintConfig(null);
          }}
          reportConfig={printConfig}
        />
      )}

      {confirmModalConfig.isOpen && (
        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          onConfirm={confirmModalConfig.onConfirm}
          onCancel={() =>
            setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))
          }
        />
      )}
    </div>
  );
}
export default App;

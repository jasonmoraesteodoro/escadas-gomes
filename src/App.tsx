import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, BarChart3, Bell, Building2, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign,
  FileText, Hammer, LayoutDashboard, LogOut, Plus, Search, Settings, ShieldCheck,
  SlidersHorizontal, Trash2, UserRound, Users, X, Eye, Download, Check, Clock3, Pencil
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type View = 'dashboard' | 'clients' | 'budgets' | 'finance' | 'settings';
type Modal = 'client' | 'budget' | 'catalog' | 'transaction' | 'budgetDetail' | null;
type CatalogKind = 'stair_types' | 'stair_sizes' | 'materials' | 'financial_categories';
type Client = { id: string; name: string; person_type: 'fisica' | 'juridica'; cpf_cnpj: string; city: string; phone?: string; rg?: string; birth_date?: string | null; street?: string; number?: string; neighborhood?: string; state?: string; postal_code?: string };
type CatalogItem = { id: string; name?: string; label?: string; meters?: number; unit?: string; kind?: string; description?: string };
type Budget = { id: string; quote_number: number; total: number; status: string; created_at: string; clients: { name: string }[] | null; stair_types: { name: string }[] | null; stair_sizes: { label: string }[] | null; client_id?: string; stair_type_id?: string | null; stair_size_id?: string | null; budget_items?: BudgetLine[] };
type BudgetLine = { material_id: string; material_name: string; quantity: number; unit_price: number };
type FinancialTransaction = { id: string; description: string; kind: 'receita' | 'despesa'; amount: number; occurred_on: string };

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const quoteCode = (value: number) => String(value).padStart(4, '0');
const clientName = (budget: Budget) => budget.clients?.[0]?.name ?? 'Cliente removido';
const stairName = (budget: Budget) => budget.stair_types?.[0]?.name ?? 'Tipo não informado';
const sizeLabel = (budget: Budget) => budget.stair_sizes?.[0]?.label ?? 'Medida não informada';
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"'`=/]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;' }[char] ?? char));
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const demoClients: Client[] = [{ id: 'demo-client-1', name: 'Mariana Oliveira', person_type: 'fisica', cpf_cnpj: 'RG 42.781.903-1', city: 'Belo Horizonte' }, { id: 'demo-client-2', name: 'Almeida Arquitetura', person_type: 'juridica', cpf_cnpj: '12.345.678/0001-90', city: 'Nova Lima' }];
const demoBudgets: Budget[] = [{ id: 'demo-budget-1', quote_number: 3, total: 18650, status: 'aprovado', created_at: '2026-10-28T12:00:00.000Z', client_id: 'demo-client-1', stair_type_id: 'demo-type-1', stair_size_id: 'demo-size-2', clients: [{ name: 'Mariana Oliveira' }], stair_types: [{ name: 'Escada flutuante' }], stair_sizes: [{ label: '3,20 m' }], budget_items: [{ material_id: 'demo-material-1', material_name: 'Degrau em madeira', quantity: 14, unit_price: 0 }, { material_id: 'demo-material-2', material_name: 'Guarda-corpo', quantity: 3.2, unit_price: 0 }] }, { id: 'demo-budget-2', quote_number: 2, total: 12400, status: 'pendente', created_at: '2026-10-24T12:00:00.000Z', client_id: 'demo-client-2', stair_type_id: 'demo-type-2', stair_size_id: 'demo-size-1', clients: [{ name: 'Almeida Arquitetura' }], stair_types: [{ name: 'Viga central' }], stair_sizes: [{ label: '2,80 m' }], budget_items: [{ material_id: 'demo-material-1', material_name: 'Degrau em madeira', quantity: 12, unit_price: 0 }] }];
const demoStairTypes: CatalogItem[] = [{ id: 'demo-type-1', name: 'Escada flutuante' }, { id: 'demo-type-2', name: 'Viga central' }];
const demoSizes: CatalogItem[] = [{ id: 'demo-size-1', label: '2,80 m', meters: 2.8 }, { id: 'demo-size-2', label: '3,20 m', meters: 3.2 }];
const demoMaterials: CatalogItem[] = [{ id: 'demo-material-1', name: 'Degrau em madeira', unit: 'un', description: 'Degraus maciços em madeira tauari com 4 cm de espessura. Medidas conforme projeto.' }, { id: 'demo-material-2', name: 'Guarda-corpo', unit: 'm', description: 'Guarda-corpo em perfil de aço com acabamento eletrostático. Inclui instalação.' }];
const demoTransactions: FinancialTransaction[] = [{ id: 'demo-finance-1', description: 'Entrada do projeto Mariana Oliveira', kind: 'receita', amount: 18650, occurred_on: '2026-10-28' }, { id: 'demo-finance-2', description: 'Compra de madeira', kind: 'despesa', amount: 4200, occurred_on: '2026-10-18' }, { id: 'demo-finance-3', description: 'Sinal Almeida Arquitetura', kind: 'receita', amount: 12400, occurred_on: '2026-09-12' }, { id: 'demo-finance-4', description: 'Ferragens e acabamento', kind: 'despesa', amount: 1850, occurred_on: '2026-09-08' }];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [modal, setModal] = useState<Modal>(null);
  const [catalogKind, setCatalogKind] = useState<CatalogKind>('stair_types');
  const [clients, setClients] = useState<Client[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [stairTypes, setStairTypes] = useState<CatalogItem[]>([]);
  const [sizes, setSizes] = useState<CatalogItem[]>([]);
  const [materials, setMaterials] = useState<CatalogItem[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [financialCategories, setFinancialCategories] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingBudget, setViewingBudget] = useState<Budget | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [editingCatalogItem, setEditingCatalogItem] = useState<CatalogItem | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) void loadData(); }, [session]);

  async function loadData() {
    setLoading(true);
    const [clientResult, budgetResult, typeResult, sizeResult, materialResult, transactionResult, categoryResult] = await Promise.all([
      supabase.from('clients').select('id,name,person_type,cpf_cnpj,city,rg,street,number,neighborhood,state,postal_code,birth_date').order('name'),
      supabase.from('budgets').select('id,quote_number,total,status,created_at,client_id,stair_type_id,stair_size_id,clients(name),stair_types(name),stair_sizes(label),budget_items(material_id,material_name,quantity,unit_price)').order('created_at', { ascending: false }),
      supabase.from('stair_types').select('id,name').order('name'),
      supabase.from('stair_sizes').select('id,label,meters').order('meters'),
      supabase.from('materials').select('id,name,unit,description').order('name'),
      supabase.from('financial_transactions').select('id,description,kind,amount,occurred_on').order('occurred_on', { ascending: false }),
      supabase.from('financial_categories').select('id,name,kind').order('name'),
    ]);
    if (!clientResult.error) setClients(clientResult.data ?? []);
    if (!budgetResult.error) setBudgets((budgetResult.data as Budget[]) ?? []);
    if (!typeResult.error) setStairTypes(typeResult.data ?? []);
    if (!sizeResult.error) setSizes(sizeResult.data ?? []);
    if (!materialResult.error) setMaterials(materialResult.data ?? []);
    if (!transactionResult.error) setTransactions((transactionResult.data as FinancialTransaction[]) ?? []);
    if (!categoryResult.error) setFinancialCategories(categoryResult.data ?? []);
    setLoading(false);
  }

  if (!authReady) return <div className="splash"><Building2 size={32} /><span>Escadas Gomes</span></div>;
  if (!session && !demoMode) return <AuthScreen />;

  const filteredBudgets = budgets.filter((budget) => {
    const term = search.toLowerCase();
    return quoteCode(budget.quote_number).includes(term) || clientName(budget).toLowerCase().includes(term) || String(budget.total).includes(term) || stairName(budget).toLowerCase().includes(term) || sizeLabel(budget).toLowerCase().includes(term);
  });
  const totalQuoted = budgets.reduce((sum, budget) => sum + Number(budget.total), 0);
  const approved = budgets.filter((budget) => budget.status === 'aprovado').length;

  const openCatalog = (kind: CatalogKind) => { setCatalogKind(kind); setEditingCatalogItem(null); setModal('catalog'); };
  const showNotice = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 3500); };

  // --- Demo-mode CRUD helpers ---
  const demoSaveClient = (data: Record<string, string>) => {
    const newClient: Client = { id: uid(), name: data.name, person_type: (data.person_type as 'fisica' | 'juridica') ?? 'fisica', cpf_cnpj: data.cpf_cnpj ?? '', city: data.city ?? '', rg: data.rg, birth_date: data.birth_date || null, street: data.street, number: data.number, neighborhood: data.neighborhood, state: data.state, postal_code: data.postal_code };
    setClients((prev) => [...prev, newClient]);
    return Promise.resolve();
  };
  const demoUpdateClient = (id: string, data: Record<string, string>) => {
    setClients((prev) => prev.map((c) => c.id === id ? { ...c, name: data.name, person_type: (data.person_type as 'fisica' | 'juridica') ?? 'fisica', cpf_cnpj: data.cpf_cnpj ?? '', city: data.city ?? '', rg: data.rg, birth_date: data.birth_date || null, street: data.street, number: data.number, neighborhood: data.neighborhood, state: data.state, postal_code: data.postal_code } : c));
    return Promise.resolve();
  };
  const demoDeleteClient = (id: string) => { setClients((prev) => prev.filter((c) => c.id !== id)); return Promise.resolve(); };

  const demoSaveCatalogItem = (kind: CatalogKind, payload: Record<string, unknown>) => {
    const item: CatalogItem = { id: uid(), ...payload } as CatalogItem;
    if (kind === 'stair_types') setStairTypes((prev) => [...prev, item]);
    if (kind === 'stair_sizes') setSizes((prev) => [...prev, item]);
    if (kind === 'materials') setMaterials((prev) => [...prev, item]);
    if (kind === 'financial_categories') setFinancialCategories((prev) => [...prev, item]);
    return Promise.resolve();
  };
  const demoUpdateCatalogItem = (kind: CatalogKind, id: string, payload: Record<string, unknown>) => {
    if (kind === 'stair_types') setStairTypes((prev) => prev.map((i) => i.id === id ? { ...i, ...payload } as CatalogItem : i));
    if (kind === 'stair_sizes') setSizes((prev) => prev.map((i) => i.id === id ? { ...i, ...payload } as CatalogItem : i));
    if (kind === 'materials') setMaterials((prev) => prev.map((i) => i.id === id ? { ...i, ...payload } as CatalogItem : i));
    if (kind === 'financial_categories') setFinancialCategories((prev) => prev.map((i) => i.id === id ? { ...i, ...payload } as CatalogItem : i));
    return Promise.resolve();
  };
  const demoDeleteCatalogItem = (kind: CatalogKind, id: string) => {
    if (kind === 'stair_types') setStairTypes((prev) => prev.filter((i) => i.id !== id));
    if (kind === 'stair_sizes') setSizes((prev) => prev.filter((i) => i.id !== id));
    if (kind === 'materials') setMaterials((prev) => prev.filter((i) => i.id !== id));
    if (kind === 'financial_categories') setFinancialCategories((prev) => prev.filter((i) => i.id !== id));
    return Promise.resolve();
  };

  const demoSaveTransaction = (data: { description: string; kind: 'receita' | 'despesa'; amount: number; occurred_on: string }) => {
    setTransactions((prev) => [{ id: uid(), ...data }, ...prev]);
    return Promise.resolve();
  };
  const demoUpdateTransaction = (id: string, data: { description: string; kind: 'receita' | 'despesa'; amount: number; occurred_on: string }) => {
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
    return Promise.resolve();
  };
  const demoDeleteTransaction = (id: string) => { setTransactions((prev) => prev.filter((t) => t.id !== id)); return Promise.resolve(); };

  const demoSaveBudget = (data: { client_id: string; stair_type_id: string | null; stair_size_id: string | null; total: number; lines: BudgetLine[] }) => {
    const number = (budgets.reduce((max, b) => Math.max(max, b.quote_number), 0)) + 1;
    const client = clients.find((c) => c.id === data.client_id);
    const type = stairTypes.find((t) => t.id === data.stair_type_id);
    const size = sizes.find((s) => s.id === data.stair_size_id);
    const newBudget: Budget = { id: uid(), quote_number: number, total: data.total, status: 'pendente', created_at: new Date().toISOString(), clients: client ? [{ name: client.name }] : null, stair_types: type ? [{ name: type.name ?? '' }] : null, stair_sizes: size ? [{ label: size.label ?? '' }] : null, budget_items: data.lines, client_id: data.client_id, stair_type_id: data.stair_type_id, stair_size_id: data.stair_size_id };
    setBudgets((prev) => [newBudget, ...prev]);
    return Promise.resolve();
  };
  const demoUpdateBudget = (id: string, data: { client_id: string; stair_type_id: string | null; stair_size_id: string | null; total: number; lines: BudgetLine[] }) => {
    const client = clients.find((c) => c.id === data.client_id);
    const type = stairTypes.find((t) => t.id === data.stair_type_id);
    const size = sizes.find((s) => s.id === data.stair_size_id);
    setBudgets((prev) => prev.map((b) => b.id === id ? { ...b, client_id: data.client_id, stair_type_id: data.stair_type_id, stair_size_id: data.stair_size_id, total: data.total, clients: client ? [{ name: client.name }] : null, stair_types: type ? [{ name: type.name ?? '' }] : null, stair_sizes: size ? [{ label: size.label ?? '' }] : null, budget_items: data.lines } : b));
    return Promise.resolve();
  };
  const demoDeleteBudget = (id: string) => { setBudgets((prev) => prev.filter((b) => b.id !== id)); return Promise.resolve(); };
  const demoUpdateBudgetStatus = (id: string, status: string) => {
    setBudgets((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
    return Promise.resolve();
  };

  // --- Delete handlers (shared) ---
  async function deleteClient(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;
    if (demoMode) { await demoDeleteClient(id); showNotice('Cliente excluído.'); return; }
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) { await loadData(); showNotice('Cliente excluído.'); }
  }
  async function deleteBudget(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este orçamento?')) return;
    if (demoMode) { await demoDeleteBudget(id); showNotice('Orçamento excluído.'); return; }
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (!error) { await loadData(); showNotice('Orçamento excluído.'); }
  }
  async function deleteTransaction(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta movimentação?')) return;
    if (demoMode) { await demoDeleteTransaction(id); showNotice('Movimentação excluída.'); return; }
    const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
    if (!error) { await loadData(); showNotice('Movimentação excluída.'); }
  }
  async function deleteCatalogItem(kind: CatalogKind, id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    if (demoMode) { await demoDeleteCatalogItem(kind, id); showNotice('Item excluído.'); return; }
    const { error } = await supabase.from(kind).delete().eq('id', id);
    if (!error) { await loadData(); showNotice('Item excluído.'); }
  }

  // --- Edit openers ---
  const openEditClient = (client: Client) => { setEditingClient(client); setModal('client'); };
  const openEditBudget = (budget: Budget) => { setEditingBudget(budget); setModal('budget'); };
  const openEditTransaction = (transaction: FinancialTransaction) => { setEditingTransaction(transaction); setModal('transaction'); };
  const openEditCatalogItem = (kind: CatalogKind, item: CatalogItem) => { setCatalogKind(kind); setEditingCatalogItem(item); setModal('catalog'); };

  const closeModal = () => { setModal(null); setEditingClient(null); setEditingBudget(null); setViewingBudget(null); setEditingTransaction(null); setEditingCatalogItem(null); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark logo-mark"><img src="/assets/icons/image.png" alt="Logo Gomes" /></span><span><strong>Escadas Gomes</strong><small>Controle de obras</small></span></div>
        <nav className="main-nav">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon={<Users size={18} />} label="Clientes" active={view === 'clients'} onClick={() => setView('clients')} />
          <NavItem icon={<FileText size={18} />} label="Orçamentos" active={view === 'budgets'} onClick={() => setView('budgets')} />
          <NavItem icon={<CircleDollarSign size={18} />} label="Financeiro" active={view === 'finance'} onClick={() => setView('finance')} />
        </nav>
        <div className="sidebar-bottom"><NavItem icon={<Settings size={18} />} label="Configurações" active={view === 'settings'} onClick={() => setView('settings')} /><button className="logout" onClick={() => { if (demoMode) setDemoMode(false); else void supabase.auth.signOut(); }}><LogOut size={17} /> Sair</button></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="mobile-title"><strong>{pageTitle(view)}</strong></div><div className="topbar-actions"><button className="icon-button"><Bell size={18} /></button><div className="user-chip"><span className="avatar">{(session?.user.email?.[0] ?? 'E').toUpperCase()}</span><span className="user-info"><strong>{session?.user.email?.split('@')[0] ?? 'escadasgomes'}</strong><small>Administrador</small></span><ChevronDown size={16} /></div></div></header>
        <div className="page-container">
          {view === 'dashboard' && <Dashboard clients={clients} budgets={budgets} totalQuoted={totalQuoted} approved={approved} onNavigate={setView} />}
          {view === 'clients' && <ClientsPage clients={clients} search={search} setSearch={setSearch} onNew={() => { setEditingClient(null); setModal('client'); }} onEdit={openEditClient} onDelete={deleteClient} />}
          {view === 'budgets' && <BudgetsPage budgets={filteredBudgets} search={search} setSearch={setSearch} onNew={() => { setEditingBudget(null); setModal('budget'); }} onEdit={openEditBudget} onView={(budget) => { setViewingBudget(budget); setModal('budgetDetail'); }} onDelete={deleteBudget} onRefresh={loadData} showNotice={showNotice} demoMode={demoMode} demoUpdateBudgetStatus={demoUpdateBudgetStatus} clients={clients} materials={materials} stairTypes={stairTypes} sizes={sizes} />}
          {view === 'finance' && <FinancePage transactions={transactions} onNew={() => { setEditingTransaction(null); setModal('transaction'); }} onEdit={openEditTransaction} onDelete={deleteTransaction} demoMode={demoMode} />}
          {view === 'settings' && <SettingsPage onOpenCatalog={openCatalog} onEditCatalogItem={openEditCatalogItem} onDeleteCatalogItem={deleteCatalogItem} showNotice={showNotice} demoMode={demoMode} stairTypes={stairTypes} sizes={sizes} materials={materials} financialCategories={financialCategories} />}
        </div>
      </main>
      <MobileNav view={view} onChange={setView} />
      {modal === 'client' && <ClientModal editing={editingClient} onClose={closeModal} onSaved={() => { closeModal(); if (!demoMode) void loadData(); showNotice(editingClient ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.'); }} demoMode={demoMode} demoSave={demoSaveClient} demoUpdate={demoUpdateClient} />}
      {modal === 'budget' && <BudgetModal editing={editingBudget} clients={clients} stairTypes={stairTypes} sizes={sizes} materials={materials} onClose={closeModal} onSaved={() => { closeModal(); if (!demoMode) void loadData(); showNotice(editingBudget ? 'Orçamento atualizado com sucesso.' : 'Orçamento salvo com sucesso.'); }} demoMode={demoMode} demoSave={demoSaveBudget} demoUpdate={demoUpdateBudget} />}
      {modal === 'budgetDetail' && viewingBudget && <BudgetDetailModal budget={viewingBudget} clients={clients} materials={materials} onClose={closeModal} onPrint={(b) => printBudgetPDF(b, clients, materials)} />}
      {modal === 'transaction' && <TransactionModal editing={editingTransaction} onClose={closeModal} onSaved={() => { closeModal(); if (!demoMode) void loadData(); showNotice(editingTransaction ? 'Movimentação atualizada com sucesso.' : 'Movimentação cadastrada com sucesso.'); }} demoMode={demoMode} demoSave={demoSaveTransaction} demoUpdate={demoUpdateTransaction} categories={financialCategories} />}
      {modal === 'catalog' && <CatalogModal kind={catalogKind} editing={editingCatalogItem} onClose={closeModal} onSaved={() => { closeModal(); if (!demoMode) void loadData(); showNotice(editingCatalogItem ? 'Cadastro atualizado com sucesso.' : 'Cadastro salvo com sucesso.'); }} demoMode={demoMode} demoSave={demoSaveCatalogItem} demoUpdate={demoUpdateCatalogItem} />}
      {notice && <div className="toast"><Check size={17} /> {notice}</div>}
    </div>
  );
}

function AuthScreen() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(''); const result = await supabase.auth.signInWithPassword({ email, password }); if (result.error) setError('E-mail ou senha incorretos.'); setBusy(false); }
  return <div className="auth-screen"><div className="auth-art"><div className="art-grid" /><div className="auth-art-content"><span className="brand-mark large"><Building2 size={28} /></span><p>Precisão em cada degrau.<br /><strong>Excelência em cada obra.</strong></p><div className="art-line" /></div></div><div className="auth-panel"><div className="auth-card"><div className="auth-logo"><span className="brand-mark logo-mark"><img src="/assets/icons/image.png" alt="Logo Gomes" /></span><div><strong>Escadas Gomes</strong><small>Controle de obras</small></div></div><div className="auth-heading"><p className="eyebrow">Bem-vindo de volta</p><h1>Acesse sua conta</h1><p>Gerencie clientes, propostas e resultados em um só lugar.</p></div><form onSubmit={submit}><label>E-mail<input type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Senha<input type="password" placeholder="Sua senha" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /></label>{error && <div className="form-feedback">{error}</div>}<button className="primary-button full" disabled={busy}>{busy ? 'Aguarde...' : 'Entrar'} <ChevronRight size={17} /></button></form></div></div></div>;
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{active && <span className="nav-dot" />}</button>; }
function MobileNav({ view, onChange }: { view: View; onChange: (view: View) => void }) { const items: { view: View; label: string; icon: React.ReactNode }[] = [{ view: 'dashboard', label: 'Início', icon: <LayoutDashboard size={19} /> }, { view: 'clients', label: 'Clientes', icon: <Users size={19} /> }, { view: 'budgets', label: 'Orçamentos', icon: <FileText size={19} /> }, { view: 'finance', label: 'Financeiro', icon: <CircleDollarSign size={19} /> }, { view: 'settings', label: 'Configurações', icon: <Settings size={19} /> }]; return <nav className="mobile-nav" aria-label="Navegação principal">{items.map((item) => <button key={item.view} className={view === item.view ? 'active' : ''} onClick={() => onChange(item.view)}>{item.icon}<span>{item.label}</span></button>)}</nav>; }
function pageTitle(view: View) { return { dashboard: 'Dashboard', clients: 'Clientes', budgets: 'Orçamentos', finance: 'Financeiro', settings: 'Configurações' }[view]; }

function Dashboard({ clients, budgets, totalQuoted, approved, onNavigate }: { clients: Client[]; budgets: Budget[]; totalQuoted: number; approved: number; onNavigate: (view: View) => void }) { return <><PageIntro eyebrow="Visão geral" title="Bom dia, vamos construir resultados." description="Acompanhe o movimento da Escadas Gomes em um só lugar." action={<button className="primary-button" onClick={() => onNavigate('budgets')}><Plus size={17} /> Novo orçamento</button>} /><div className="metric-grid"><Metric icon={<Users />} label="Clientes cadastrados" value={String(clients.length).padStart(2, '0')} trend="Base ativa" /><Metric icon={<FileText />} label="Orçamentos enviados" value={String(budgets.length).padStart(2, '0')} trend={`${approved} aprovados`} accent /><Metric icon={<CircleDollarSign />} label="Valor em propostas" value={money(totalQuoted)} trend="Total acumulado" /></div><div className="dashboard-grid"><section className="surface-panel"><div className="panel-heading"><div><p className="eyebrow">Acompanhe de perto</p><h2>Orçamentos recentes</h2></div><button className="text-button" onClick={() => onNavigate('budgets')}>Ver todos <ChevronRight size={15} /></button></div>{budgets.length === 0 ? <EmptyState icon={<FileText />} title="Nenhum orçamento ainda" text="Comece cadastrando sua primeira proposta." /> : <BudgetRows budgets={budgets.slice(0, 5)} />}</section><section className="surface-panel highlight-panel"><div className="highlight-icon"><Hammer size={22} /></div><p className="eyebrow">Seu próximo passo</p><h2>Transforme uma ideia em uma nova escada.</h2><p>Cadastre um orçamento completo com materiais, medidas e acabamento.</p><button className="outline-button" onClick={() => onNavigate('budgets')}>Criar orçamento <ChevronRight size={16} /></button></section></div></>; }
function Metric({ icon, label, value, trend, accent }: { icon: React.ReactNode; label: string; value: string; trend: string; accent?: boolean }) { return <div className={`metric-card ${accent ? 'accent' : ''}`}><div className="metric-top"><span className="metric-icon">{icon}</span><span className="metric-trend">{trend}</span></div><p>{label}</p><strong>{value}</strong></div>; }
function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>; }

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="row-actions"><button className="icon-button" title="Editar" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Pencil size={15} /></button><button className="icon-button danger" title="Excluir" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 size={15} /></button></div>;
}

type SortDir = 'asc' | 'desc';
function SortHeader({ label, column, sortCol, sortDir, onSort }: { label: string; column: string; sortCol: string; sortDir: SortDir; onSort: (col: string) => void }) {
  const active = sortCol === column;
  return <th className={active ? 'sort-active' : ''}><button type="button" className="sort-btn" onClick={() => onSort(column)}>{label}{active ? (sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowDown size={13} className="sort-idle" />}</button></th>;
}
function useSort(initialCol: string, initialDir: SortDir = 'asc') {
  const [sortCol, setSortCol] = useState(initialCol);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);
  const toggle = (col: string) => { if (col === sortCol) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } };
  return { sortCol, sortDir, toggle };
}
function ClientsPage({ clients, search, setSearch, onNew, onEdit, onDelete }: { clients: Client[]; search: string; setSearch: (value: string) => void; onNew: () => void; onEdit: (client: Client) => void; onDelete: (id: string) => void }) {
  const [typeFilter, setTypeFilter] = useState('todos');
  const { sortCol, sortDir, toggle } = useSort('name');
  const filtered = clients.filter((client) => {
    const term = search.toLowerCase();
    const matchesSearch = client.name.toLowerCase().includes(term) || (client.cpf_cnpj ?? '').toLowerCase().includes(term) || (client.city ?? '').toLowerCase().includes(term);
    const matchesType = typeFilter === 'todos' || client.person_type === typeFilter;
    return matchesSearch && matchesType;
  });
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'name') cmp = a.name.localeCompare(b.name, 'pt-BR');
    else if (sortCol === 'type') cmp = a.person_type.localeCompare(b.person_type);
    else if (sortCol === 'document') cmp = (a.cpf_cnpj ?? '').localeCompare(b.cpf_cnpj ?? '', 'pt-BR');
    else if (sortCol === 'city') cmp = (a.city ?? '').localeCompare(b.city ?? '', 'pt-BR');
    return sortDir === 'asc' ? cmp : -cmp;
  });
  return <><PageIntro eyebrow="Relacionamento" title="Clientes" description="Mantenha sua base organizada e pronta para novos projetos." action={<button className="primary-button" onClick={onNew}><Plus size={17} /> Cadastrar cliente</button>} /><div className="surface-panel"><FilterBar search={search} setSearch={setSearch} placeholder="Pesquisar por nome, documento ou cidade..."><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="filter-select"><option value="todos">Todos os tipos</option><option value="fisica">Pessoa física</option><option value="juridica">Pessoa jurídica</option></select></FilterBar><div className="table-wrap"><table><thead><tr><SortHeader label="Cliente" column="name" sortCol={sortCol} sortDir={sortDir} onSort={toggle} /><SortHeader label="Tipo" column="type" sortCol={sortCol} sortDir={sortDir} onSort={toggle} /><SortHeader label="Documento" column="document" sortCol={sortCol} sortDir={sortDir} onSort={toggle} /><SortHeader label="Localização" column="city" sortCol={sortCol} sortDir={sortDir} onSort={toggle} /><th>Ações</th></tr></thead><tbody>{sorted.map((client) => <tr key={client.id}><td><div className="person-cell"><span className="person-avatar">{client.name.slice(0, 1).toUpperCase()}</span><strong>{client.name}</strong></div></td><td><span className="soft-badge">{client.person_type === 'fisica' ? 'Pessoa física' : 'Pessoa jurídica'}</span></td><td>{client.cpf_cnpj || '—'}</td><td>{client.city || '—'}{client.state ? ' · ' + client.state : ''}</td><td><RowActions onEdit={() => onEdit(client)} onDelete={() => onDelete(client.id)} /></td></tr>)}</tbody></table>{sorted.length === 0 && <EmptyState icon={<Users />} title="Nenhum cliente encontrado" text="Cadastre clientes para começar sua base." />}</div></div></>;
}
function FilterBar({ search, setSearch, placeholder, children }: { search: string; setSearch: (value: string) => void; placeholder: string; children?: React.ReactNode }) { return <div className="toolbar filter-bar"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} /></div><div className="filter-controls">{children}</div></div>; }
function BudgetRows({ budgets }: { budgets: Budget[] }) { return <div className="budget-list">{budgets.map((budget) => <div className="budget-row" key={budget.id}><div className="quote-number">#{quoteCode(budget.quote_number)}</div><div className="budget-client"><strong>{clientName(budget)}</strong><small>{stairName(budget)} · {sizeLabel(budget)}</small></div><strong className="budget-total">{money(Number(budget.total))}</strong><Status status={budget.status} /></div>)}</div>; }
function BudgetsPage({ budgets, search, setSearch, onNew, onEdit, onView, onDelete, onRefresh, showNotice, demoMode, demoUpdateBudgetStatus, clients, materials, stairTypes, sizes }: { budgets: Budget[]; search: string; setSearch: (value: string) => void; onNew: () => void; onEdit: (budget: Budget) => void; onView: (budget: Budget) => void; onDelete: (id: string) => void; onRefresh: () => Promise<void>; showNotice: (text: string) => void; demoMode: boolean; demoUpdateBudgetStatus: (id: string, status: string) => Promise<void>; clients: Client[]; materials: CatalogItem[]; stairTypes: CatalogItem[]; sizes: CatalogItem[] }) {
  const [statusFilter, setStatusFilter] = useState('todos');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [sizeFilter, setSizeFilter] = useState('todos');
  const { sortCol, sortDir, toggle } = useSort('created_at', 'desc');
  const updateStatus = async (id: string, status: string) => {
    if (demoMode) { await demoUpdateBudgetStatus(id, status); showNotice('Status atualizado.'); return; }
    const { error } = await supabase.from('budgets').update({ status }).eq('id', id);
    if (!error) { await onRefresh(); showNotice('Status atualizado.'); }
  };
  const filtered = budgets.filter((budget) => {
    const matchesStatus = statusFilter === 'todos' || budget.status === statusFilter;
    const matchesType = typeFilter === 'todos' || budget.stair_type_id === typeFilter;
    const matchesSize = sizeFilter === 'todos' || budget.stair_size_id === sizeFilter;
    return matchesStatus && matchesType && matchesSize;
  });
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'number') cmp = a.quote_number - b.quote_number;
    else if (sortCol === 'client') cmp = clientName(a).localeCompare(clientName(b), 'pt-BR');
    else if (sortCol === 'type') cmp = stairName(a).localeCompare(stairName(b), 'pt-BR');
    else if (sortCol === 'size') cmp = sizeLabel(a).localeCompare(sizeLabel(b), 'pt-BR');
    else if (sortCol === 'created_at') cmp = a.created_at.localeCompare(b.created_at);
    else if (sortCol === 'total') cmp = Number(a.total) - Number(b.total);
    else if (sortCol === 'status') cmp = a.status.localeCompare(b.status);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  return <><PageIntro eyebrow="Propostas comerciais" title="Orçamentos" description="Crie propostas detalhadas e acompanhe cada oportunidade." action={<button className="primary-button" onClick={onNew}><Plus size={17} /> Novo orçamento</button>} /><div className="surface-panel"><FilterBar search={search} setSearch={setSearch} placeholder="Buscar por número, cliente, valor, tipo ou tamanho..."><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="filter-select"><option value="todos">Todos os status</option><option value="pendente">Pendente</option><option value="aprovado">Aprovado</option><option value="recusado">Recusado</option></select><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="filter-select"><option value="todos">Todos os tipos</option>{stairTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><select value={sizeFilter} onChange={(event) => setSizeFilter(event.target.value)} className="filter-select"><option value="todos">Todos os tamanhos</option>{sizes.map((size) => <option key={size.id} value={size.id}>{size.label}</option>)}</select></FilterBar><div className="table-wrap"><table className="budget-table-grid"><thead><tr><SortHeader label="Nº" column="number" sortCol={sortCol} sortDir={sortDir} onSort={toggle} /><SortHeader label="Cliente" column="client" sortCol={sortCol} sortDir={sortDir} onSort={toggle} /><SortHeader label="Tipo de escada" column="type" sortCol={sortCol} sortDir={sortDir} onSort={toggle} /><SortHeader label="Tamanho" column="size" sortCol={sortCol} sortDir={sortDir} onSort={toggle} /><SortHeader label="Data" column="created_at" sortCol={sortCol} sortDir={sortDir} onSort={toggle} /><SortHeader label="Valor" column="total" sortCol={sortCol} sortDir={sortDir} onSort={toggle} /><SortHeader label="Status" column="status" sortCol={sortCol} sortDir={sortDir} onSort={toggle} /><th>Ações</th></tr></thead><tbody>{sorted.map((budget) => <tr key={budget.id}><td><strong className="quote-cell">#{quoteCode(budget.quote_number)}</strong></td><td><strong>{clientName(budget)}</strong></td><td>{stairName(budget)}</td><td>{sizeLabel(budget)}</td><td className="muted-cell">{new Date(budget.created_at).toLocaleDateString('pt-BR')}</td><td><strong>{money(Number(budget.total))}</strong></td><td><select value={budget.status} onChange={(event) => void updateStatus(budget.id, event.target.value)} className="status-select"><option value="pendente">Pendente</option><option value="aprovado">Aprovado</option><option value="recusado">Recusado</option></select></td><td><div className="row-actions"><button className="icon-button" title="Visualizar" onClick={() => onView(budget)}><Eye size={16} /></button><button className="icon-button" title="Editar" onClick={() => onEdit(budget)}><Pencil size={16} /></button><button className="icon-button" title="Gerar PDF" onClick={() => printBudgetPDF(budget, clients, materials)}><Download size={16} /></button><button className="icon-button danger" title="Excluir" onClick={() => onDelete(budget.id)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{sorted.length === 0 && <EmptyState icon={<FileText />} title="Nenhum orçamento encontrado" text="Ajuste os filtros ou crie sua primeira proposta." />}</div></div></>;
}
function Status({ status }: { status: string }) { return <span className={`status ${status}`}><span />{status === 'aprovado' ? 'Aprovado' : status === 'recusado' ? 'Recusado' : 'Pendente'}</span>; }

// ---- Budget PDF / Print ----
function printBudgetPDF(budget: Budget, clients: Client[], materials: CatalogItem[]) {
  const client = clients.find((c) => c.id === (budget as Record<string, unknown>).client_id as string | undefined);
  const clientN = client?.name ?? clientName(budget);
  const clientAddress = [client?.street, client?.number, client?.neighborhood, client?.city, client?.state, client?.postal_code].filter(Boolean).join(', ');
  const clientDocument = client?.cpf_cnpj || client?.rg || '';
  const docTitle = `${quoteCode(budget.quote_number)}-${clientN.replace(/[^a-zA-Z0-9À-ÿ]+/g, '-')}`.replace(/-+$/g, '');
  const safeTitle = escapeHtml(docTitle);
  const printWindow = window.open('', '_blank', 'width=820,height=640');
  if (!printWindow) { alert('Permita pop-ups para gerar o PDF do orçamento.'); return; }
  const dateStr = new Date(budget.created_at).toLocaleDateString('pt-BR');
  const items = budget.budget_items ?? [];
  const itemsRows = items.length ? items.map((item) => {
    const mat = materials.find((m) => m.id === item.material_id);
    const desc = mat?.description ?? '';
    return `<tr><td><strong>${escapeHtml(item.material_name || mat?.name || '—')}</strong>${desc ? `<small>${escapeHtml(desc)}</small>` : ''}</td><td>${escapeHtml(item.quantity)}</td></tr>`;
  }).join('') : `<tr><td colspan="2" style="text-align:center;color:#999;padding:14px">Nenhum material vinculado.</td></tr>`;
  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${safeTitle}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans','Segoe UI',Arial,sans-serif; color:#201f22; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .doc { border: 3px solid #b4232b; border-radius: 8px; padding: 20px 24px; }
    .doc-header { display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #b4232b; padding-bottom: 14px; margin-bottom: 16px; }
    .brand { display:flex; align-items:center; gap:10px; }
    .brand-mark { width:38px; height:38px; border-radius:9px; background:#b4232b; color:#fff; display:grid; place-items:center; font-weight:800; font-size:16px; }
    .brand strong { font-size:15px; display:block; }
    .brand small { font-size:10px; color:#888; text-transform:uppercase; letter-spacing:.04em; }
    .meta { text-align:right; }
    .meta .num { font-size:22px; font-weight:800; color:#b4232b; line-height:1; }
    .meta small { font-size:10px; color:#888; display:block; margin-top:4px; }
    .sec { margin-bottom:14px; }
    .sec h2 { font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:#b4232b; margin-bottom:7px; font-weight:700; }
    .info-row { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px; margin-bottom:14px; }
    .info { border:1px solid #ebe9e7; border-radius:7px; padding:8px 11px; }
    .info small { font-size:9px; color:#999; text-transform:uppercase; letter-spacing:.05em; }
    .info strong { font-size:12px; display:block; margin-top:2px; }
    .client-box { background:#fbe9e8; border-radius:7px; padding:11px 14px; margin-bottom:14px; }
    .client-box strong { font-size:14px; display:block; }
    .client-box p { font-size:10px; color:#666; margin-top:3px; line-height:1.4; }
    .client-box .client-details { display:grid; grid-template-columns:1fr 2fr; gap:4px 14px; margin-top:7px; }
    .client-box .client-details span { font-size:10px; color:#555; }
    table { width:100%; border-collapse:collapse; }
    thead th { background:#b4232b; color:#fff; font-size:9px; text-transform:uppercase; letter-spacing:.06em; padding:8px 12px; text-align:left; font-weight:700; }
    thead th:last-child { text-align:center; width:60px; }
    tbody td { font-size:11px; padding:7px 12px; border-bottom:1px solid #ebe9e7; vertical-align:top; }
    tbody td strong { font-size:11.5px; display:block; }
    tbody td small { font-size:10px; color:#888; display:block; margin-top:2px; line-height:1.35; }
    tbody td:last-child { text-align:center; }
    .total-bar { display:flex; justify-content:space-between; align-items:center; background:#201f22; color:#fff; border-radius:8px; padding:10px 18px; margin-top:12px; }
    .total-bar small { font-size:10px; color:#ccc; text-transform:uppercase; letter-spacing:.06em; }
    .total-bar strong { font-size:20px; color:#fff; }
    .validity { margin-top:10px; padding:8px 14px; background:#f8f8f7; border-radius:6px; font-size:10px; color:#666; line-height:1.4; }
    .bottom { display:flex; justify-content:space-between; align-items:flex-end; margin-top:16px; }
    .sig { text-align:center; }
    .sig-line { border-top:1px solid #999; width:240px; padding-top:6px; font-size:10px; color:#777; }
    .foot { text-align:right; font-size:9px; color:#aaa; }
    @media print { .no-print { display:none; } }
  </style></head><body>
  <div class="doc">
    <div class="doc-header">
      <div class="brand"><div class="brand-mark">EG</div><div><strong>Escadas Gomes</strong><small>Controle de obras</small></div></div>
      <div class="meta"><div class="num">#${quoteCode(budget.quote_number)}</div><small>Orçamento · ${escapeHtml(dateStr)}</small></div>
    </div>
    <div class="client-box"><strong>${escapeHtml(clientN)}</strong><p>${client?.person_type === 'juridica' ? 'Pessoa jurídica' : 'Pessoa física'}${clientDocument ? ' · Documento: ' + escapeHtml(clientDocument) : ''}</p><div class="client-details"><span><b>Endereço:</b> ${escapeHtml(clientAddress || 'Não informado')}</span><span><b>RG:</b> ${escapeHtml(client?.rg || 'Não informado')}</span></div></div>
    <div class="info-row">
      <div class="info"><small>Tipo</small><strong>${escapeHtml(stairName(budget))}</strong></div>
      <div class="info"><small>Tamanho</small><strong>${escapeHtml(sizeLabel(budget))}</strong></div>
      <div class="info"><small>Data</small><strong>${escapeHtml(dateStr)}</strong></div>
    </div>
    <div class="sec"><h2>Materiais</h2><table><thead><tr><th>Descrição</th><th>Qtd.</th></tr></thead><tbody>${itemsRows}</tbody></table></div>
    <div class="total-bar"><small>Valor total da proposta</small><strong>${escapeHtml(money(Number(budget.total)))}</strong></div>
    <div class="validity">Proposta válida por 15 dias. Valores sujeitos a confirmação após visita técnica. Condições de pagamento a combinar.</div>
    <div class="bottom">
      <div class="sig"><div class="sig-line">Assinatura — Escadas Gomes</div></div>
      <div class="foot">Escadas Gomes · Orçamento #${quoteCode(budget.quote_number)}<br/>${escapeHtml(dateStr)}</div>
    </div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);}</script>
  </body></html>`);
  printWindow.document.close();
}

function FinancePage({ transactions, onNew, onEdit, onDelete, demoMode }: { transactions: FinancialTransaction[]; onNew: () => void; onEdit: (t: FinancialTransaction) => void; onDelete: (id: string) => void; demoMode: boolean }) {
  const currentYear = new Date().getFullYear(); const [year, setYear] = useState(String(currentYear)); const [month, setMonth] = useState('todos');
  const years = Array.from(new Set([currentYear, ...transactions.map((t) => Number(t.occurred_on.slice(0, 4)))] )).sort((a, b) => b - a);
  const months = ['Todos os meses', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const filtered = transactions.filter((t) => t.occurred_on.startsWith(year) && (month === 'todos' || Number(t.occurred_on.slice(5, 7)) === Number(month)));
  const grouped = Array.from({ length: month === 'todos' ? 12 : 1 }, (_, index) => { const monthNumber = month === 'todos' ? index + 1 : Number(month); const rows = filtered.filter((t) => Number(t.occurred_on.slice(5, 7)) === monthNumber); const revenue = rows.filter((t) => t.kind === 'receita').reduce((sum, t) => sum + Number(t.amount), 0); const expenses = rows.filter((t) => t.kind === 'despesa').reduce((sum, t) => sum + Number(t.amount), 0); return { monthNumber, revenue, expenses }; }).filter((row) => row.revenue || row.expenses || month !== 'todos');
  const revenueTotal = filtered.filter((t) => t.kind === 'receita').reduce((sum, t) => sum + Number(t.amount), 0);
  const expenseTotal = filtered.filter((t) => t.kind === 'despesa').reduce((sum, t) => sum + Number(t.amount), 0);
  return <><PageIntro eyebrow="Organização" title="Financeiro" description="Acompanhe suas receitas, despesas e saldo por período." action={<button className="primary-button" onClick={onNew}><Plus size={17} /> Nova movimentação</button>} /><div className="finance-filters surface-panel"><div><strong>Filtros</strong><p>Selecione o ano e o mês para analisar seu financeiro.</p></div><div className="filter-fields"><label>Ano<select value={year} onChange={(event) => setYear(event.target.value)}>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Mês<select value={month} onChange={(event) => setMonth(event.target.value)}>{months.map((item, index) => <option key={item} value={index === 0 ? 'todos' : String(index)}>{item}</option>)}</select></label></div></div><div className="finance-summary"><FinanceSummary label="Receitas" value={revenueTotal} tone="positive" /><FinanceSummary label="Despesas" value={expenseTotal} tone="negative" /><FinanceSummary label="Saldo do período" value={revenueTotal - expenseTotal} tone={revenueTotal - expenseTotal >= 0 ? 'balance' : 'negative'} /></div><section className="surface-panel finance-table-panel"><div className="panel-heading"><div><p className="eyebrow">Visão mensal</p><h2>Resumo financeiro por mês</h2></div><span className="transaction-count">{filtered.length} movimentações</span></div>{grouped.length === 0 ? <EmptyState icon={<CircleDollarSign />} title="Nenhuma movimentação no período" text="Escolha outro filtro ou cadastre uma nova movimentação." /> : <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr></thead><tbody>{grouped.map((row) => <tr key={row.monthNumber}><td><strong>{months[row.monthNumber]}</strong></td><td className="positive-text">{money(row.revenue)}</td><td className="negative-text">{money(row.expenses)}</td><td className={row.revenue - row.expenses >= 0 ? 'positive-text' : 'negative-text'}><strong>{money(row.revenue - row.expenses)}</strong></td></tr>)}<tr className="finance-total-row"><td><strong>Total</strong></td><td className="positive-text"><strong>{money(revenueTotal)}</strong></td><td className="negative-text"><strong>{money(expenseTotal)}</strong></td><td className={revenueTotal - expenseTotal >= 0 ? 'positive-text' : 'negative-text'}><strong>{money(revenueTotal - expenseTotal)}</strong></td></tr></tbody></table></div>}</section>{filtered.length > 0 && <section className="surface-panel transaction-panel"><div className="panel-heading"><div><p className="eyebrow">Detalhamento</p><h2>Movimentações do período</h2></div></div><div className="transaction-list">{filtered.map((t) => <div className="transaction-row" key={t.id}><span className={`transaction-icon ${t.kind}`}><CircleDollarSign size={16} /></span><div className="transaction-info"><strong>{t.description}</strong><small>{new Date(`${t.occurred_on}T12:00:00`).toLocaleDateString('pt-BR')}</small></div><strong className={t.kind === 'receita' ? 'positive-text' : 'negative-text'}>{t.kind === 'receita' ? '+' : '-'} {money(Number(t.amount))}</strong><div className="row-actions"><button className="icon-button" title="Editar" onClick={() => onEdit(t)}><Pencil size={15} /></button><button className="icon-button danger" title="Excluir" onClick={() => onDelete(t.id)}><Trash2 size={15} /></button></div></div>)}</div></section>}</>;
}
function FinanceSummary({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className={`finance-summary-card ${tone}`}><span>{label}</span><strong>{money(value)}</strong></div>; }

function SettingsPage({ onOpenCatalog, onEditCatalogItem, onDeleteCatalogItem, showNotice, demoMode, stairTypes, sizes, materials, financialCategories }: { onOpenCatalog: (kind: CatalogKind) => void; onEditCatalogItem: (kind: CatalogKind, item: CatalogItem) => void; onDeleteCatalogItem: (kind: CatalogKind, id: string) => void; showNotice: (text: string) => void; demoMode: boolean; stairTypes: CatalogItem[]; sizes: CatalogItem[]; materials: CatalogItem[]; financialCategories: CatalogItem[] }) {
  const [tab, setTab] = useState('perfil'); const [profile, setProfile] = useState({ full_name: '', phone: '', instagram: '' });
  useEffect(() => { if (!demoMode) supabase.from('profiles').select('full_name,phone,instagram').maybeSingle().then(({ data }) => { if (data) setProfile(data); }); }, [demoMode]);
  async function saveProfile(event: FormEvent) { event.preventDefault(); if (demoMode) { showNotice('Perfil atualizado (demonstração).'); return; } const user = (await supabase.auth.getUser()).data.user; if (!user) return; const { error } = await supabase.from('profiles').upsert({ id: user.id, ...profile }); if (!error) showNotice('Perfil atualizado.'); }
  return <><PageIntro eyebrow="Preferências" title="Configurações" description="Personalize seus cadastros e deixe o sistema com a sua cara." /><div className="settings-layout"><aside className="settings-nav">{[['perfil', <UserRound size={17} />, 'Meu perfil'], ['categorias', <BarChart3 size={17} />, 'Categorias'], ['escadas', <Hammer size={17} />, 'Tipos de escada'], ['materiais', <Building2 size={17} />, 'Materiais'], ['medidas', <SlidersHorizontal size={17} />, 'Tamanhos'], ['senha', <ShieldCheck size={17} />, 'Segurança']].map(([key, icon, label]) => <button key={String(key)} className={tab === key ? 'active' : ''} onClick={() => setTab(String(key))}>{icon}<span>{label}</span></button>)}</aside><section className="surface-panel settings-content">{tab === 'perfil' && <form onSubmit={saveProfile}><SectionHeading title="Meu perfil" text="Essas informações aparecem nos seus documentos." /><div className="form-grid"><label>Nome completo<input value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} placeholder="Seu nome" /></label><label>Telefone<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="(00) 00000-0000" /></label><label>Instagram<input value={profile.instagram} onChange={(event) => setProfile({ ...profile, instagram: event.target.value })} placeholder="@seuinstagram" /></label></div><button className="primary-button">Salvar perfil</button></form>}{tab === 'categorias' && <CatalogManager kind="financial_categories" onOpen={onOpenCatalog} onEdit={onEditCatalogItem} onDelete={onDeleteCatalogItem} items={financialCategories} />}{tab === 'escadas' && <CatalogManager kind="stair_types" onOpen={onOpenCatalog} onEdit={onEditCatalogItem} onDelete={onDeleteCatalogItem} items={stairTypes} />}{tab === 'materiais' && <CatalogManager kind="materials" onOpen={onOpenCatalog} onEdit={onEditCatalogItem} onDelete={onDeleteCatalogItem} items={materials} />}{tab === 'medidas' && <CatalogManager kind="stair_sizes" onOpen={onOpenCatalog} onEdit={onEditCatalogItem} onDelete={onDeleteCatalogItem} items={sizes} />}{tab === 'senha' && <PasswordForm showNotice={showNotice} demoMode={demoMode} />}</section></div></>;
}
function CatalogManager({ kind, onOpen, onEdit, onDelete, items }: { kind: CatalogKind; onOpen: (kind: CatalogKind) => void; onEdit: (kind: CatalogKind, item: CatalogItem) => void; onDelete: (kind: CatalogKind, id: string) => void; items: CatalogItem[] }) {
  const titles: Record<CatalogKind, [string, string]> = { financial_categories: ['Categorias', 'Receitas, despesas e subcategorias'], stair_types: ['Tipos de escada', 'Cadastre os modelos que sua empresa fabrica'], materials: ['Materiais', 'Itens que podem compor um orçamento'], stair_sizes: ['Tamanhos de escada', 'Medidas prontas para agilizar sua proposta'] };
  return <><div className="panel-heading"><SectionHeading title={titles[kind][0]} text={titles[kind][1]} /><button className="primary-button small" onClick={() => onOpen(kind)}><Plus size={16} /> Adicionar</button></div>{items.length === 0 ? <div className="settings-empty"><Hammer size={24} /><p>Cadastros personalizados</p><small>Use o botão acima para adicionar novos itens.</small></div> : <div className="catalog-list">{items.map((item) => <div className="catalog-list-item" key={item.id}><span className="catalog-item-name">{item.name ?? item.label}</span>{item.meters != null && <span className="catalog-item-meta">{item.meters} m</span>}{item.unit && <span className="catalog-item-meta">{item.unit}</span>}{item.kind && <span className="catalog-item-meta">{item.kind === 'receita' ? 'Receita' : 'Despesa'}</span>}<div className="row-actions"><button className="icon-button" title="Editar" onClick={() => onEdit(kind, item)}><Pencil size={15} /></button><button className="icon-button danger" title="Excluir" onClick={() => onDelete(kind, item.id)}><Trash2 size={15} /></button></div></div>)}</div>}</>;
}
function PasswordForm({ showNotice, demoMode }: { showNotice: (text: string) => void; demoMode: boolean }) { const [password, setPassword] = useState(''); async function submit(event: FormEvent) { event.preventDefault(); if (demoMode) { setPassword(''); showNotice('Senha alterada (demonstração).'); return; } const { error } = await supabase.auth.updateUser({ password }); if (!error) { setPassword(''); showNotice('Senha alterada com sucesso.'); } } return <form onSubmit={submit}><SectionHeading title="Segurança" text="Atualize sua senha de acesso." /><label>Nova senha<input type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite uma nova senha" required /></label><button className="primary-button">Alterar senha</button></form>; }
function SectionHeading({ title, text }: { title: string; text: string }) { return <div className="section-heading"><h2>{title}</h2><p>{text}</p></div>; }

function ClientModal({ editing, onClose, onSaved, demoMode, demoSave, demoUpdate }: { editing: Client | null; onClose: () => void; onSaved: () => void; demoMode: boolean; demoSave: (data: Record<string, string>) => Promise<void>; demoUpdate: (id: string, data: Record<string, string>) => Promise<void> }) {
  const [form, setForm] = useState({ person_type: editing?.person_type ?? 'fisica', name: editing?.name ?? '', rg: editing?.rg ?? '', cpf_cnpj: editing?.cpf_cnpj ?? '', birth_date: editing?.birth_date ?? '', street: editing?.street ?? '', number: editing?.number ?? '', neighborhood: editing?.neighborhood ?? '', city: editing?.city ?? '', state: editing?.state ?? '', postal_code: editing?.postal_code ?? '' });
  const [saving, setSaving] = useState(false);
  const change = (key: string, value: string) => setForm({ ...form, [key]: value });
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    if (demoMode) {
      if (editing) await demoUpdate(editing.id, form);
      else await demoSave(form);
      setSaving(false); onSaved(); return;
    }
    const payload = { ...form, birth_date: form.birth_date || null };
    if (editing) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editing.id);
      setSaving(false); if (!error) onSaved();
    } else {
      const { error } = await supabase.from('clients').insert(payload);
      setSaving(false); if (!error) onSaved();
    }
  }
  return <ModalShell title={editing ? 'Editar cliente' : 'Cadastrar novo cliente'} subtitle="Preencha os dados que você tiver. Os demais podem ficar para depois." onClose={onClose}><form onSubmit={submit}><div className="person-toggle"><button type="button" className={form.person_type === 'fisica' ? 'active' : ''} onClick={() => change('person_type', 'fisica')}>Pessoa física</button><button type="button" className={form.person_type === 'juridica' ? 'active' : ''} onClick={() => change('person_type', 'juridica')}>Pessoa jurídica</button></div><div className="form-grid"><label className="wide">Nome completo / Razão social<input value={form.name} onChange={(event) => change('name', event.target.value)} placeholder="Digite o nome do cliente" required /></label>{form.person_type === 'fisica' ? <label>RG<input value={form.rg} onChange={(event) => change('rg', event.target.value)} placeholder="RG do cliente" /></label> : <><label>CNPJ<input value={form.cpf_cnpj} onChange={(event) => change('cpf_cnpj', event.target.value)} placeholder="CNPJ da empresa" /></label><label>Data de nascimento<input type="date" value={form.birth_date} onChange={(event) => change('birth_date', event.target.value)} /></label></>}<label className="wide">Rua<input value={form.street} onChange={(event) => change('street', event.target.value)} placeholder="Rua, avenida ou rodovia" /></label><label>Número<input value={form.number} onChange={(event) => change('number', event.target.value)} /></label><label>Bairro<input value={form.neighborhood} onChange={(event) => change('neighborhood', event.target.value)} /></label><label>Cidade<input value={form.city} onChange={(event) => change('city', event.target.value)} /></label><label>Estado<input value={form.state} onChange={(event) => change('state', event.target.value)} /></label><label>CEP<input value={form.postal_code} onChange={(event) => change('postal_code', event.target.value)} /></label></div><ModalActions onClose={onClose} saving={saving} editing={!!editing} /></form></ModalShell>;
}

function BudgetDetailModal({ budget, clients, materials, onClose, onPrint }: { budget: Budget; clients: Client[]; materials: CatalogItem[]; onClose: () => void; onPrint: (b: Budget) => void }) {
  const client = clients.find((c) => c.id === (budget as Record<string, unknown>).client_id as string | undefined);
  const items = budget.budget_items ?? [];
  const statusLabel = budget.status === 'aprovado' ? 'Aprovado' : budget.status === 'recusado' ? 'Recusado' : 'Pendente';
  return <ModalShell title={`Orçamento #${quoteCode(budget.quote_number)}`} subtitle={clientName(budget)} onClose={onClose}><div className="detail-view">
    <div className="detail-status-row"><span className={`status ${budget.status}`}><span />{statusLabel}</span><strong className="detail-total">{money(Number(budget.total))}</strong></div>
    <div className="detail-info-grid"><div className="detail-info-item"><small>Cliente</small><strong>{clientName(budget)}</strong>{client?.city && <span>{client.city}</span>}</div><div className="detail-info-item"><small>Tipo de escada</small><strong>{stairName(budget)}</strong></div><div className="detail-info-item"><small>Tamanho</small><strong>{sizeLabel(budget)}</strong></div><div className="detail-info-item"><small>Emissão</small><strong>{new Date(budget.created_at).toLocaleDateString('pt-BR')}</strong></div></div>
    <div className="detail-section"><h3>Materiais</h3>{items.length === 0 ? <p className="detail-empty">Nenhum material vinculado a este orçamento.</p> : <div className="detail-materials">{items.map((item, index) => { const mat = materials.find((m) => m.id === item.material_id); return <div className="detail-material-item" key={`${index}-${item.material_id}`}><div><strong>{item.material_name || mat?.name || '—'}</strong>{mat?.description && <small>{mat.description}</small>}</div><span className="detail-qty">{item.quantity} un.</span></div>; })}</div>}</div>
    <div className="detail-actions"><button className="outline-button" onClick={onClose}>Fechar</button><button className="primary-button" onClick={() => onPrint(budget)}><Download size={16} /> Gerar PDF</button></div>
  </div></ModalShell>;
}
function BudgetModal({ editing, clients, stairTypes, sizes, materials, onClose, onSaved, demoMode, demoSave, demoUpdate }: { editing: Budget | null; clients: Client[]; stairTypes: CatalogItem[]; sizes: CatalogItem[]; materials: CatalogItem[]; onClose: () => void; onSaved: () => void; demoMode: boolean; demoSave: (data: { client_id: string; stair_type_id: string | null; stair_size_id: string | null; total: number; lines: BudgetLine[] }) => Promise<void>; demoUpdate: (id: string, data: { client_id: string; stair_type_id: string | null; stair_size_id: string | null; total: number; lines: BudgetLine[] }) => Promise<void> }) {
  const [clientId, setClientId] = useState(editing?.client_id ?? ''); const [typeId, setTypeId] = useState(editing?.stair_type_id ?? ''); const [sizeId, setSizeId] = useState(editing?.stair_size_id ?? ''); const [total, setTotal] = useState(editing ? String(editing.total) : ''); const [lines, setLines] = useState<BudgetLine[]>(editing?.budget_items ?? []); const [saving, setSaving] = useState(false);
  const [clientSearch, setClientSearch] = useState(''); const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const selectedClient = clients.find((c) => c.id === clientId) ?? null;
  const filteredClients = clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.cpf_cnpj ?? '').toLowerCase().includes(clientSearch.toLowerCase()) || (c.city ?? '').toLowerCase().includes(clientSearch.toLowerCase()));
  const addLine = () => setLines([...lines, { material_id: materials[0]?.id ?? '', material_name: materials[0]?.name ?? '', quantity: 1, unit_price: 0 }]);
  const updateLine = (index: number, field: keyof BudgetLine, value: string) => setLines(lines.map((line, itemIndex) => itemIndex === index ? { ...line, [field]: field === 'quantity' || field === 'unit_price' ? Number(value) : value, ...(field === 'material_id' ? { material_name: materials.find((material) => material.id === value)?.name ?? '' } : {}) } : line));
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    if (demoMode) {
      const data = { client_id: clientId, stair_type_id: typeId || null, stair_size_id: sizeId || null, total: Number(total) || 0, lines };
      if (!clientId) { setSaving(false); return; }
      if (editing) await demoUpdate(editing.id, data);
      else await demoSave(data);
      setSaving(false); onSaved(); return;
    }
    if (!clientId) { setSaving(false); return; }
    if (editing) {
      const { error } = await supabase.from('budgets').update({ client_id: clientId, stair_type_id: typeId || null, stair_size_id: sizeId || null, total: Number(total) || 0 }).eq('id', editing.id);
      if (!error) {
        await supabase.from('budget_items').delete().eq('budget_id', editing.id);
        if (lines.length) await supabase.from('budget_items').insert(lines.map((line) => ({ ...line, budget_id: editing.id })));
      }
      setSaving(false); if (!error) onSaved();
    } else {
      const { data: last } = await supabase.from('budgets').select('quote_number').order('quote_number', { ascending: false }).limit(1).maybeSingle();
      const number = (last?.quote_number ?? 0) + 1;
      const { data, error } = await supabase.from('budgets').insert({ quote_number: number, client_id: clientId, stair_type_id: typeId || null, stair_size_id: sizeId || null, total: Number(total) || 0 }).select('id').maybeSingle();
      if (!error && data && lines.length) await supabase.from('budget_items').insert(lines.map((line) => ({ ...line, budget_id: data.id })));
      setSaving(false); if (!error) onSaved();
    }
  }
  return <ModalShell title={editing ? 'Editar orçamento' : 'Novo orçamento'} subtitle="Monte uma proposta clara e completa para o seu cliente." onClose={onClose}><form onSubmit={submit}><div className="form-grid"><div className="client-picker"><label>Cliente{selectedClient ? <div className="client-selected"><div className="person-cell"><span className="person-avatar">{selectedClient.name.slice(0, 1).toUpperCase()}</span><div><strong>{selectedClient.name}</strong><small>{selectedClient.person_type === 'juridica' ? 'Pessoa jurídica' : 'Pessoa física'}{selectedClient.city ? ' · ' + selectedClient.city : ''}</small></div></div><button type="button" className="icon-button danger" title="Trocar cliente" onClick={() => { setClientId(''); setClientSearch(''); setClientPickerOpen(true); }}><X size={16} /></button></div> : clientPickerOpen ? <div className="client-search-wrap"><div className="search-box"><Search size={16} /><input autoFocus value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Buscar por nome, documento ou cidade..." /></div>{filteredClients.length === 0 ? <p className="client-empty">Nenhum cliente encontrado.</p> : <div className="client-results">{filteredClients.slice(0, 50).map((client) => <button type="button" key={client.id} className="client-result" onClick={() => { setClientId(client.id); setClientPickerOpen(false); setClientSearch(''); }}><span className="person-avatar">{client.name.slice(0, 1).toUpperCase()}</span><div><strong>{client.name}</strong><small>{client.person_type === 'juridica' ? 'CNPJ' : 'PF'}{client.cpf_cnpj ? ' · ' + client.cpf_cnpj : ''}{client.city ? ' · ' + client.city : ''}</small></div></button>)}{filteredClients.length > 50 && <p className="client-more">Mostrando 50 de {filteredClients.length} resultados. Refine a busca.</p>}</div>}</div> : <button type="button" className="picker-trigger" onClick={() => setClientPickerOpen(true)}><Search size={16} /><span>Buscar e vincular cliente...</span></button>}</label></div><label>Tipo de escada<select value={typeId} onChange={(event) => setTypeId(event.target.value)}><option value="">Selecione um tipo</option>{stairTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><label>Tamanho<select value={sizeId} onChange={(event) => setSizeId(event.target.value)}><option value="">Selecione uma medida</option>{sizes.map((size) => <option key={size.id} value={size.id}>{size.label}</option>)}</select></label><label>Valor total<input type="number" min="0" step="0.01" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="0,00" /></label></div><div className="lines-heading"><div><h3>Materiais</h3><p>Adicione apenas os itens que farão parte desta proposta.</p></div><button type="button" className="outline-button small" onClick={addLine}><Plus size={15} /> Adicionar material</button></div>{lines.map((line, index) => <div className="material-line" key={`${index}-${line.material_id}`}><select value={line.material_id} onChange={(event) => updateLine(index, 'material_id', event.target.value)}><option value="">Material</option>{materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}</select><input type="number" min="0" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} placeholder="Qtd." /><button type="button" className="icon-button danger" onClick={() => setLines(lines.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>)}{!clientId && <p className="form-hint">Selecione um cliente para salvar o orçamento.</p>}<ModalActions onClose={onClose} saving={saving} editing={!!editing} /></form></ModalShell>;
}

function CatalogModal({ kind, editing, onClose, onSaved, demoMode, demoSave, demoUpdate }: { kind: CatalogKind; editing: CatalogItem | null; onClose: () => void; onSaved: () => void; demoMode: boolean; demoSave: (kind: CatalogKind, payload: Record<string, unknown>) => Promise<void>; demoUpdate: (kind: CatalogKind, id: string, payload: Record<string, unknown>) => Promise<void> }) {
  const [name, setName] = useState(editing?.name ?? editing?.label ?? ''); const [meters, setMeters] = useState(editing?.meters != null ? String(editing.meters) : ''); const [unit, setUnit] = useState(editing?.unit ?? 'un'); const [description, setDescription] = useState(editing?.description ?? ''); const [categoryType, setCategoryType] = useState(editing?.kind ?? 'receita'); const [subcategory, setSubcategory] = useState(''); const [saving, setSaving] = useState(false);
  const labels: Record<CatalogKind, string> = { stair_types: 'Nome do tipo de escada', stair_sizes: 'Nome da medida', materials: 'Nome do material', financial_categories: 'Nome da categoria' };
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    const payload = kind === 'stair_sizes' ? { label: name, meters: Number(meters) || 0 } : kind === 'materials' ? { name, unit, description } : { name, ...(kind === 'financial_categories' ? { kind: categoryType } : {}) };
    if (demoMode) {
      if (editing) await demoUpdate(kind, editing.id, payload);
      else await demoSave(kind, payload);
      setSaving(false); onSaved(); return;
    }
    if (editing) {
      const { error } = await supabase.from(kind).update(payload).eq('id', editing.id);
      setSaving(false); if (!error) onSaved();
    } else {
      const { data, error } = await supabase.from(kind).insert(payload).select('id').maybeSingle();
      if (!error && data?.id && kind === 'financial_categories' && subcategory.trim()) await supabase.from('financial_subcategories').insert({ category_id: data.id, name: subcategory.trim() });
      setSaving(false); if (!error) onSaved();
    }
  }
  return <ModalShell title={editing ? 'Editar cadastro' : 'Novo cadastro'} subtitle="Adicione um item para usar nos seus próximos orçamentos." onClose={onClose}><form onSubmit={submit}><label>{labels[kind]}<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Digite aqui" required /></label>{kind === 'financial_categories' && <><label>Tipo<select value={categoryType} onChange={(event) => setCategoryType(event.target.value)}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></label><label>Subcategoria opcional<input value={subcategory} onChange={(event) => setSubcategory(event.target.value)} placeholder="Ex.: Materiais, mão de obra..." /></label></>}{kind === 'stair_sizes' && <label>Medida em metros<input type="number" min="0" step="0.01" value={meters} onChange={(event) => setMeters(event.target.value)} placeholder="Ex.: 3,50" /></label>}{kind === 'materials' && <><label>Unidade de medida<input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="un, m, kg..." /></label><label>Descrição (medidas, acabamento)<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Degraus maciços em madeira tauari com 4 cm de espessura. Medidas conforme projeto." rows={3} /></label></>}<ModalActions onClose={onClose} saving={saving} editing={!!editing} /></form></ModalShell>;
}

function TransactionModal({ editing, onClose, onSaved, demoMode, demoSave, demoUpdate, categories }: { editing: FinancialTransaction | null; onClose: () => void; onSaved: () => void; demoMode: boolean; demoSave: (data: { description: string; kind: 'receita' | 'despesa'; amount: number; occurred_on: string }) => Promise<void>; demoUpdate: (id: string, data: { description: string; kind: 'receita' | 'despesa'; amount: number; occurred_on: string }) => Promise<void>; categories: CatalogItem[] }) {
  const [description, setDescription] = useState(editing?.description ?? ''); const [kind, setKind] = useState<'receita' | 'despesa'>(editing?.kind ?? 'receita'); const [amount, setAmount] = useState(editing ? String(editing.amount) : ''); const [date, setDate] = useState(editing?.occurred_on ?? new Date().toISOString().slice(0, 10)); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    const data = { description, kind, amount: Number(amount) || 0, occurred_on: date };
    if (demoMode) { if (editing) await demoUpdate(editing.id, data); else await demoSave(data); setSaving(false); onSaved(); return; }
    if (editing) { const { error } = await supabase.from('financial_transactions').update(data).eq('id', editing.id); setSaving(false); if (!error) onSaved(); }
    else { const { error } = await supabase.from('financial_transactions').insert(data); setSaving(false); if (!error) onSaved(); }
  }
  return <ModalShell title={editing ? 'Editar movimentação' : 'Nova movimentação'} subtitle="Registre uma receita ou despesa no seu financeiro." onClose={onClose}><form onSubmit={submit}><div className="person-toggle"><button type="button" className={kind === 'receita' ? 'active' : ''} onClick={() => setKind('receita')}>Receita</button><button type="button" className={kind === 'despesa' ? 'active' : ''} onClick={() => setKind('despesa')}>Despesa</button></div><label>Descrição<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Entrada do projeto" required /></label><div className="form-grid"><label>Valor (R$)<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" required /></label><label>Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label></div><ModalActions onClose={onClose} saving={saving} editing={!!editing} /></form></ModalShell>;
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop"><div className="modal-card"><div className="modal-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div>{children}</div></div>; }
function ModalActions({ onClose, saving, editing }: { onClose: () => void; saving: boolean; editing?: boolean }) { return <div className="modal-actions"><button type="button" className="outline-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar cadastro'} <Check size={16} /></button></div>; }
function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{text}</p></div>; }

export default App;

import React, { useState, useMemo, useCallback, FormEvent } from 'react';
import {
  Plus, Calendar, Building2, Receipt, Trash2, Edit3, Wallet,
  Loader2, CheckCircle2, Save, X, Calculator, ArrowRight,
  PieChart, Layers, Tag, List, BarChart3, Settings, TrendingUp,
  Printer, Factory, FileText, ChevronDown, EyeOff, Download
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Purchase, Company, Sector, FormData, DEFAULT_SECTORS } from '@/types/purchases';

const generateId = () => Math.random().toString(36).substring(2, 15);

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const ComprasApp: React.FC = () => {
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>('purchases', []);
  const [registeredCompanies, setRegisteredCompanies] = useLocalStorage<Company[]>('companies', []);
  const [sectors, setSectors] = useLocalStorage<Sector[]>('sectors',
    DEFAULT_SECTORS.map(name => ({ id: generateId(), name }))
  );
  const [purchaseLimit, setPurchaseLimit] = useLocalStorage<number>('purchaseLimit', 120000.00);

  const [activeTab, setActiveTab] = useState('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [tempLimit, setTempLimit] = useState("");
  const [newSectorName, setNewSectorName] = useState("");

  const [formData, setFormData] = useState<FormData>({
    company: '',
    dueDate: '',
    amount: '',
    sector: sectors[0]?.name || '',
  });

  const handleCompanyChange = useCallback((companyName: string) => {
    setFormData(prev => {
      const matched = registeredCompanies.find(
        c => c.name.toLowerCase() === companyName.trim().toLowerCase()
      );
      return {
        ...prev,
        company: companyName,
        ...(matched?.lastSector && !editingId ? { sector: matched.lastSector } : {}),
      };
    });
  }, [registeredCompanies, editingId]);

  const companyNames = useMemo(() => registeredCompanies.map(c => c.name).sort(), [registeredCompanies]);

  const handleAddSector = () => {
    if (!newSectorName.trim()) return;
    if (editingSectorId) {
      setSectors(prev => prev.map(s => s.id === editingSectorId ? { ...s, name: newSectorName.trim() } : s));
      setEditingSectorId(null);
    } else {
      setSectors(prev => [...prev, { id: generateId(), name: newSectorName.trim() }].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setNewSectorName("");
  };

  const handleDeleteSector = (id: string) => {
    setSectors(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.company || !formData.dueDate) return;

    const companyNameTrimmed = formData.company.trim();

    const existingCompany = registeredCompanies.find(c => c.name.toLowerCase() === companyNameTrimmed.toLowerCase());
    if (!existingCompany) {
      setRegisteredCompanies(prev => [...prev, {
        id: generateId(), name: companyNameTrimmed, lastSector: formData.sector, createdAt: new Date().toISOString()
      }]);
    } else if (existingCompany.lastSector !== formData.sector) {
      setRegisteredCompanies(prev => prev.map(c => c.id === existingCompany.id ? { ...c, lastSector: formData.sector } : c));
    }

    const data = {
      company: companyNameTrimmed,
      dueDate: formData.dueDate,
      amount: parseFloat(formData.amount) || 0,
      sector: formData.sector || sectors[0]?.name || "Geral",
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      setPurchases(prev => prev.map(p => p.id === editingId ? { ...p, ...data } : p));
      setEditingId(null);
    } else {
      setPurchases(prev => [...prev, { ...data, id: generateId(), createdAt: new Date().toISOString() }]);
    }

    setFormData({ company: '', dueDate: '', amount: '', sector: sectors[0]?.name || '' });
  };

  const handleSaveLimit = () => {
    const newLimit = parseFloat(tempLimit);
    if (isNaN(newLimit)) return;
    setPurchaseLimit(newLimit);
    setIsEditingLimit(false);
  };

  const handleDelete = (id: string) => {
    setPurchases(prev => prev.filter(p => p.id !== id));
  };

  const handleDeleteCompany = (id: string) => {
    setRegisteredCompanies(prev => prev.filter(c => c.id !== id));
  };

  const startEdit = (p: Purchase) => {
    setEditingId(p.id);
    setFormData({
      company: p.company,
      dueDate: p.dueDate,
      amount: String(p.amount),
      sector: p.sector || sectors[0]?.name || "",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sortedPurchases = useMemo(() =>
    [...purchases].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [purchases]
  );

  const totalSpent = useMemo(() => purchases.reduce((acc, curr) => acc + (curr.amount || 0), 0), [purchases]);
  const balance = purchaseLimit - totalSpent;
  const usagePercentage = purchaseLimit > 0 ? (totalSpent / purchaseLimit) * 100 : 0;

  const sectorTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    sectors.forEach(s => (totals[s.name] = 0));
    purchases.forEach(p => {
      if (totals[p.sector] !== undefined) totals[p.sector] += (p.amount || 0);
    });
    return totals;
  }, [purchases, sectors]);

  const topCompanies = useMemo(() => {
    const map: Record<string, number> = {};
    purchases.forEach(p => { map[p.company] = (map[p.company] || 0) + (p.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => ({ name, amount }));
  }, [purchases]);

  const totalsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    purchases.forEach(p => { map[p.dueDate] = (map[p.dueDate] || 0) + (p.amount || 0); });
    return Object.entries(map).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).map(([date, amount]) => ({ date, amount }));
  }, [purchases]);

  const tabs = [
    { key: 'list', label: 'Notas', icon: List },
    { key: 'sectors', label: 'Setores', icon: PieChart },
    { key: 'charts', label: 'Gráficos', icon: BarChart3 },
    { key: 'companies', label: 'Fornecedores', icon: Factory },
    { key: 'config', label: 'Configurar', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased pb-12">
      {/* Navbar — Apple glass style */}
      <nav className="glass sticky top-0 z-50 border-b border-border/60">
        <div className="max-w-3xl mx-auto px-5 py-3 md:px-8 md:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl apple-shadow-md">
              <Calculator className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-base md:text-lg font-semibold tracking-tight">Compras</h1>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-medium flex items-center justify-end gap-1.5">
                Limite
                <button onClick={() => { setTempLimit(purchaseLimit.toString()); setIsEditingLimit(true); }} className="hover:text-primary transition-colors">
                  <Settings className="w-3 h-3" />
                </button>
              </p>
              {isEditingLimit ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input type="number" className="bg-secondary text-foreground text-xs px-2.5 py-1 rounded-lg border border-border w-20 md:w-28 outline-none focus:border-primary transition-colors" value={tempLimit} onChange={(e) => setTempLimit(e.target.value)} autoFocus />
                  <button onClick={handleSaveLimit} className="text-success hover:opacity-80 transition-opacity"><Save className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <p className="font-semibold text-sm">{formatCurrency(purchaseLimit)}</p>
              )}
            </div>

            <div className="h-8 w-px bg-border/60" />

            <div className="text-right">
              <p className="text-[10px] text-destructive/80 font-medium">Gasto</p>
              <p className="font-semibold text-sm text-destructive">{formatCurrency(totalSpent)}</p>
            </div>

            <div className="bg-secondary px-4 py-2 rounded-2xl apple-shadow-sm">
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Saldo</p>
              <p className="font-bold text-base leading-tight">{formatCurrency(balance)}</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-5 md:px-8 pt-6 space-y-5">
        {/* Form */}
        <section className={`p-5 md:p-8 rounded-2xl transition-all duration-300 animate-fade-in apple-shadow-md bg-card ${editingId ? 'ring-2 ring-warning/40' : ''}`}>
          <div className="flex justify-between items-center mb-5 md:mb-6">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2.5">
              {editingId ? <Edit3 className="w-4 h-4 text-warning" /> : <Plus className="w-4 h-4 text-primary" />}
              {editingId ? 'Editar Registro' : 'Novo Registro'}
            </h2>
            {editingId && (
              <button onClick={() => { setEditingId(null); setFormData(prev => ({ ...prev, company: '', dueDate: '', amount: '' })); }} className="text-xs font-medium text-warning bg-warning/10 hover:bg-warning/15 px-3.5 py-1.5 rounded-full transition-colors">
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-muted-foreground mb-2 ml-0.5">Fornecedor</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input type="text" list="companies-list" placeholder="Nome do fornecedor..." className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-border/60 focus:border-primary focus:bg-card rounded-xl outline-none text-sm font-medium transition-all placeholder:text-muted-foreground/40" value={formData.company} onChange={(e) => handleCompanyChange(e.target.value)} required />
                <datalist id="companies-list">{companyNames.map(name => <option key={name} value={name} />)}</datalist>
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-muted-foreground mb-2 ml-0.5">Setor</label>
              <div className="relative">
                <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <select className="w-full pl-10 pr-8 py-3 bg-secondary/60 border border-border/60 focus:border-primary focus:bg-card rounded-xl outline-none text-sm font-medium appearance-none transition-all" value={formData.sector} onChange={(e) => setFormData({ ...formData, sector: e.target.value })} required>
                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:col-span-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 ml-0.5">Vencimento</label>
                <input type="date" className="w-full px-3.5 py-3 bg-secondary/60 border border-border/60 focus:border-primary focus:bg-card rounded-xl outline-none text-sm font-medium transition-all" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 ml-0.5">Valor</label>
                <input type="number" step="0.01" placeholder="0,00" className="w-full px-3.5 py-3 bg-secondary/60 border border-border/60 focus:border-primary focus:bg-card rounded-xl outline-none text-sm font-bold text-primary transition-all placeholder:text-muted-foreground/30" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
            </div>

            <div className="md:col-span-1">
              <button type="submit" className={`w-full h-[46px] rounded-xl font-semibold text-sm active:scale-[0.97] flex items-center justify-center transition-all duration-200 apple-shadow-md ${editingId ? 'bg-warning text-card' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
                {editingId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </section>

        {/* Tabs — Apple segmented control */}
        <div className="bg-secondary/80 p-1 rounded-xl flex w-full md:w-fit overflow-x-auto hide-scrollbar whitespace-nowrap">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-card text-foreground apple-shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: List */}
        {activeTab === 'list' && (
          <div className="bg-card rounded-2xl apple-shadow-md overflow-hidden min-h-[300px] animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-medium text-muted-foreground border-b border-border/60">
                    <th className="px-5 py-3.5 md:px-6">Fornecedor</th>
                    <th className="px-5 py-3.5 md:px-6">Setor</th>
                    <th className="px-5 py-3.5 md:px-6 text-center">Data</th>
                    <th className="px-5 py-3.5 md:px-6 text-right">Valor</th>
                    <th className="px-5 py-3.5 md:px-6 text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sortedPurchases.map((p) => (
                    <tr key={p.id} className="group hover:bg-secondary/40 transition-colors duration-150">
                      <td className="px-5 py-3.5 md:px-6 font-semibold text-foreground text-sm truncate max-w-[120px] md:max-w-[300px]">{p.company}</td>
                      <td className="px-5 py-3.5 md:px-6 text-muted-foreground text-xs">{p.sector}</td>
                      <td className="px-5 py-3.5 md:px-6 text-xs text-muted-foreground text-center whitespace-nowrap">{new Date(p.dueDate).toLocaleDateString('pt-BR')}</td>
                      <td className="px-5 py-3.5 md:px-6 text-right font-semibold text-foreground text-sm">{formatCurrency(p.amount)}</td>
                      <td className="px-5 py-3.5 md:px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEdit(p)} className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-all duration-150"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/5 transition-all duration-150"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedPurchases.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-20 text-center text-muted-foreground/40 font-medium text-sm">Nenhum lançamento registrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Sectors */}
        {activeTab === 'sectors' && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {sectors.map(s => (
              <div key={s.id} className="bg-card p-5 md:p-6 rounded-2xl apple-shadow-sm transition-all hover:apple-shadow-md">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 truncate">{s.name}</h4>
                <p className="text-xl md:text-2xl font-bold text-foreground leading-tight mb-3">{formatCurrency(sectorTotals[s.name] || 0)}</p>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min(((sectorTotals[s.name] || 0) / purchaseLimit) * 100, 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Charts */}
        {activeTab === 'charts' && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-card p-5 md:p-8 rounded-2xl apple-shadow-md">
              <h3 className="text-sm font-semibold text-foreground mb-8 text-center">Vencimentos</h3>
              <div className="h-[220px] md:h-[300px] min-w-[300px] flex items-end justify-around gap-3 pb-10 relative px-2">
                {totalsByDate.map((item, idx) => {
                  const max = Math.max(...totalsByDate.map(t => t.amount)) || 1;
                  const height = (item.amount / max) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end max-w-[64px]">
                      <div className="w-full bg-primary/90 rounded-xl transition-all duration-500 ease-out relative" style={{ height: `${height}%`, minHeight: '24px' }}>
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="bg-foreground/30 backdrop-blur-sm rounded-lg px-1.5 py-2 flex flex-col items-center leading-none">
                            {formatCurrency(item.amount).split('').map((char, i) => (
                              <span key={i} className="text-[7px] md:text-[9px] font-bold text-primary-foreground" style={{ lineHeight: '1.2' }}>
                                {char === ' ' ? '\u00A0' : char}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] md:text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card p-5 md:p-8 rounded-2xl apple-shadow-md">
              <h3 className="text-sm font-semibold text-foreground mb-6 text-center">Concentrações</h3>
              <div className="space-y-5">
                {topCompanies.map((item, idx) => {
                  const max = topCompanies[0]?.amount || 1;
                  const width = (item.amount / max) * 100;
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-muted-foreground truncate pr-3">{item.name}</span>
                        <span className="font-semibold text-foreground">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${width}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Config */}
        {activeTab === 'config' && (
          <div className="bg-card rounded-2xl apple-shadow-md min-h-[300px] animate-fade-in">
            <div className="p-5 md:p-8">
              <div className="flex gap-3 mb-6 max-w-xl">
                <input type="text" placeholder="Novo setor..." className="flex-1 px-4 py-3 bg-secondary/60 border border-border/60 focus:border-primary rounded-xl text-sm font-medium outline-none transition-all placeholder:text-muted-foreground/40" value={newSectorName} onChange={(e) => setNewSectorName(e.target.value)} />
                <button onClick={handleAddSector} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all">OK</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sectors.map(s => (
                  <div key={s.id} className="bg-secondary/40 px-4 py-3.5 rounded-xl flex items-center justify-between group transition-colors hover:bg-secondary/70">
                    <span className="text-sm font-medium text-foreground truncate pr-3">{s.name}</span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => { setEditingSectorId(s.id); setNewSectorName(s.name); }} className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-all"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteSector(s.id)} className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/5 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Companies */}
        {activeTab === 'companies' && (
          <div className="bg-card rounded-2xl apple-shadow-md min-h-[300px] animate-fade-in">
            <div className="p-5 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-3">
              {registeredCompanies.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                <div key={c.id} className="bg-secondary/40 px-4 py-3.5 rounded-xl flex items-center justify-between group transition-colors hover:bg-secondary/70">
                  <span className="text-sm font-medium text-foreground truncate pr-3">{c.name}</span>
                  <button onClick={() => handleDeleteCompany(c.id)} className="p-2 text-muted-foreground/40 hover:text-destructive rounded-lg hover:bg-destructive/5 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer status */}
        <div className="pt-2">
          <div className="bg-card p-5 rounded-2xl apple-shadow-sm flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Uso do Teto</span>
            <div className="flex items-center gap-3">
              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(usagePercentage, 100)}%` }}></div>
              </div>
              <span className="text-lg font-bold text-foreground">{usagePercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComprasApp;

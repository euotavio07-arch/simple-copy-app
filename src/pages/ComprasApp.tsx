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

  // Auto-fill sector when company changes
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

    // Update companies master list
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
    <div className="min-h-screen bg-background text-foreground antialiased font-sans pb-10">
      {/* Navbar */}
      <nav className="bg-nav text-nav-foreground sticky top-0 z-50 px-3 py-2 md:px-6 md:py-3 shadow-xl">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-primary p-1.5 md:p-2 rounded-lg shadow-lg">
              <Calculator className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xs md:text-sm font-black uppercase tracking-tight">Compras</h1>
          </div>

          <div className="flex items-center gap-3 md:gap-6 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right border-r border-muted-foreground/20 pr-3 md:pr-6">
              <p className="text-[7px] md:text-[9px] font-bold text-muted-foreground uppercase flex items-center justify-end gap-1">
                Limite
                <button onClick={() => { setTempLimit(purchaseLimit.toString()); setIsEditingLimit(true); }} className="hover:text-primary">
                  <Settings className="w-2 md:w-2.5 h-2 md:h-2.5" />
                </button>
              </p>
              {isEditingLimit ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input type="number" className="bg-nav/80 text-nav-foreground text-[9px] px-1.5 py-0.5 rounded border border-primary w-16 md:w-24" value={tempLimit} onChange={(e) => setTempLimit(e.target.value)} autoFocus />
                  <button onClick={handleSaveLimit} className="text-success"><Save className="w-2.5 h-2.5" /></button>
                </div>
              ) : (
                <p className="font-bold text-[10px] md:text-xs">{formatCurrency(purchaseLimit)}</p>
              )}
            </div>

            <div className="text-right flex flex-col justify-center">
              <p className="text-[7px] md:text-[9px] font-bold text-destructive uppercase leading-none mb-0.5">Gasto</p>
              <p className="font-black text-[10px] md:text-xs text-destructive leading-none">{formatCurrency(totalSpent)}</p>
            </div>

            <div className="bg-card text-card-foreground px-3 py-1 md:px-4 md:py-1.5 rounded-lg shadow-lg min-w-[100px] md:min-w-[130px] text-right">
              <p className="text-[7px] md:text-[8px] font-bold opacity-50 uppercase mb-0.5 leading-none">Saldo</p>
              <p className="font-black text-[11px] md:text-sm leading-none">{formatCurrency(balance)}</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Form */}
        <section className={`p-4 md:p-6 rounded-2xl md:rounded-[2rem] border transition-all duration-300 bg-card shadow-sm ${editingId ? 'border-warning/50 bg-warning/5' : 'border-border'}`}>
          <div className="flex justify-between items-center mb-4 md:mb-6 px-1">
            <h2 className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              {editingId ? <Edit3 className="w-3 h-3 md:w-4 md:h-4 text-warning" /> : <Plus className="w-3 h-3 md:w-4 md:h-4 text-primary" />}
              {editingId ? 'Editar' : 'Novo Registo'}
            </h2>
            {editingId && (
              <button onClick={() => { setEditingId(null); setFormData(prev => ({ ...prev, company: '', dueDate: '', amount: '' })); }} className="text-[8px] md:text-[9px] font-bold text-warning uppercase bg-warning/10 px-3 py-1 rounded-full">
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-5 items-end">
            <div className="md:col-span-4">
              <label className="block text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase mb-1 md:mb-2 ml-1">Fornecedor</label>
              <div className="relative">
                <Building2 className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <input type="text" list="companies-list" placeholder="Nome..." className="w-full pl-9 md:pl-12 pr-4 py-2 md:py-3 bg-secondary border border-border focus:border-primary focus:bg-card rounded-xl md:rounded-2xl outline-none font-semibold text-xs md:text-sm transition-all" value={formData.company} onChange={(e) => handleCompanyChange(e.target.value)} required />
                <datalist id="companies-list">{companyNames.map(name => <option key={name} value={name} />)}</datalist>
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase mb-1 md:mb-2 ml-1">Setor</label>
              <div className="relative">
                <Layers className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <select className="w-full pl-9 md:pl-12 pr-8 md:pr-10 py-2 md:py-3 bg-secondary border border-border focus:border-primary focus:bg-card rounded-xl md:rounded-2xl outline-none font-bold text-xs md:text-sm appearance-none" value={formData.sector} onChange={(e) => setFormData({ ...formData, sector: e.target.value })} required>
                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-3 md:w-4 h-3 md:h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:col-span-4">
              <div>
                <label className="block text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase mb-1 md:mb-2 ml-1">Vencimento</label>
                <input type="date" className="w-full px-3 md:px-5 py-2 md:py-3 bg-secondary border border-border focus:border-primary focus:bg-card rounded-xl md:rounded-2xl outline-none font-bold text-xs md:text-sm uppercase" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required />
              </div>
              <div>
                <label className="block text-[8px] md:text-[10px] font-bold text-muted-foreground uppercase mb-1 md:mb-2 ml-1">Valor</label>
                <input type="number" step="0.01" placeholder="0,00" className="w-full px-3 md:px-5 py-2 md:py-3 bg-secondary border border-border focus:border-primary focus:bg-card rounded-xl md:rounded-2xl outline-none font-black text-xs md:text-sm text-primary shadow-inner" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
            </div>

            <div className="md:col-span-1">
              <button type="submit" className={`w-full h-10 md:h-[52px] rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg active:scale-95 flex items-center justify-center transition-all ${editingId ? 'bg-warning text-warning/10' : 'bg-nav text-nav-foreground'}`}>
                {editingId ? <Save className="w-4 h-4 md:w-5 md:h-5" /> : <Plus className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
            </div>
          </form>
        </section>

        {/* Tabs */}
        <div className="flex bg-card p-1 rounded-xl md:rounded-2xl w-full md:w-fit border border-border overflow-x-auto hide-scrollbar whitespace-nowrap shadow-sm">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2 md:px-8 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.key ? 'bg-nav text-nav-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>
              <tab.icon className="w-3 md:w-4 h-3 md:h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: List */}
        {activeTab === 'list' && (
          <div className="bg-card rounded-xl md:rounded-[2rem] border border-border shadow-sm overflow-hidden min-h-[300px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary text-[8px] md:text-[10px] font-black text-muted-foreground uppercase border-b border-border tracking-widest">
                    <th className="px-4 py-3 md:px-8 md:py-5">Fornecedor</th>
                    <th className="px-4 py-3 md:px-8 md:py-5">Setor</th>
                    <th className="px-4 py-3 md:px-8 md:py-5 text-center">Data</th>
                    <th className="px-4 py-3 md:px-8 md:py-5 text-right">Valor</th>
                    <th className="px-4 py-3 md:px-8 md:py-5 text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {sortedPurchases.map((p) => (
                    <tr key={p.id} className="group hover:bg-secondary/50 transition-all">
                      <td className="px-4 py-3 md:px-8 md:py-4 font-bold text-foreground uppercase text-[9px] md:text-xs truncate max-w-[120px] md:max-w-[300px]">{p.company}</td>
                      <td className="px-4 py-3 md:px-8 md:py-4 font-bold text-muted-foreground uppercase text-[7px] md:text-[9px] italic">{p.sector}</td>
                      <td className="px-4 py-3 md:px-8 md:py-4 text-[8px] md:text-[11px] font-bold text-muted-foreground text-center whitespace-nowrap">{new Date(p.dueDate).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 md:px-8 md:py-4 text-right font-black text-foreground text-[9px] md:text-xs">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 md:px-8 md:py-4 text-center">
                        <div className="flex items-center justify-center gap-1 md:gap-2">
                          <button onClick={() => startEdit(p)} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg active:bg-primary/10"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg active:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedPurchases.length === 0 && (
                    <tr><td colSpan={5} className="px-8 py-20 text-center opacity-30 font-black text-xs uppercase italic tracking-widest">Sem lançamentos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Sectors */}
        {activeTab === 'sectors' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {sectors.map(s => (
              <div key={s.id} className="bg-card p-4 md:p-8 rounded-xl md:rounded-[2rem] border border-border shadow-sm transition-all">
                <h4 className="text-[8px] md:text-xs font-black text-muted-foreground uppercase mb-1 md:mb-3 tracking-widest truncate">{s.name}</h4>
                <p className="text-sm md:text-3xl font-black text-foreground leading-none mb-2 md:mb-4">{formatCurrency(sectorTotals[s.name] || 0)}</p>
                <div className="w-full bg-secondary h-1 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(((sectorTotals[s.name] || 0) / purchaseLimit) * 100, 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Charts */}
        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 gap-4 md:gap-8">
            <div className="bg-card p-4 md:p-10 rounded-xl md:rounded-[2.5rem] border border-border shadow-sm overflow-x-auto">
              <h3 className="text-[9px] md:text-xs font-black text-muted-foreground uppercase tracking-widest mb-10 text-center">Vencimentos</h3>
              <div className="h-[200px] md:h-[300px] min-w-[300px] flex items-end justify-around gap-2 pb-10 border-b-2 border-l-2 border-border/50 relative px-4">
                {totalsByDate.map((item, idx) => {
                  const max = Math.max(...totalsByDate.map(t => t.amount)) || 1;
                  const height = (item.amount / max) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end max-w-[60px]">
                      <div className="w-full bg-primary rounded-t-lg transition-all shadow-md relative flex items-center justify-center" style={{ height: `${height}%` }}>
                        <div className="flex flex-col items-center leading-none py-1">
                          {formatCurrency(item.amount).split('').map((char, i) => (
                            <span key={i} className="text-[7px] md:text-[9px] font-black text-primary-foreground drop-shadow-sm" style={{ lineHeight: '1.1' }}>
                              {char === ' ' ? '\u00A0' : char}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="absolute top-full mt-2 -rotate-45 origin-top-right text-[7px] md:text-[10px] font-black text-muted-foreground whitespace-nowrap uppercase tracking-tighter">
                        {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-card p-4 md:p-10 rounded-xl md:rounded-[2.5rem] border border-border shadow-sm">
              <h3 className="text-[9px] md:text-xs font-black text-muted-foreground uppercase tracking-widest mb-8 text-center italic">Concentrações</h3>
              <div className="space-y-4 md:space-y-8">
                {topCompanies.map((item, idx) => {
                  const max = topCompanies[0]?.amount || 1;
                  const width = (item.amount / max) * 100;
                  return (
                    <div key={idx} className="space-y-1.5 md:space-y-3">
                      <div className="flex justify-between text-[9px] md:text-xs font-black uppercase tracking-tighter">
                        <span className="text-muted-foreground truncate pr-2">{item.name}</span>
                        <span className="text-foreground">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="w-full bg-secondary h-2 md:h-3.5 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-primary transition-all duration-1000 shadow-md" style={{ width: `${width}%` }}></div>
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
          <div className="bg-card rounded-xl md:rounded-[2rem] border border-border shadow-sm min-h-[300px] md:min-h-[450px]">
            <div className="p-4 md:p-10">
              <div className="flex gap-2 md:gap-5 mb-6 md:mb-10 max-w-xl">
                <input type="text" placeholder="Novo setor..." className="flex-1 px-4 py-2 md:px-6 md:py-3 bg-secondary border border-border focus:border-primary rounded-xl font-bold text-xs" value={newSectorName} onChange={(e) => setNewSectorName(e.target.value)} />
                <button onClick={handleAddSector} className="bg-primary text-primary-foreground px-4 md:px-10 py-2 md:py-3 rounded-xl text-[9px] md:text-[11px] font-black uppercase flex items-center gap-2">OK</button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                {sectors.map(s => (
                  <div key={s.id} className="bg-card px-4 py-3 md:px-6 md:py-5 rounded-2xl border border-border/50 flex items-center justify-between group shadow-sm">
                    <span className="text-[10px] md:text-xs font-black text-foreground uppercase truncate pr-2">{s.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingSectorId(s.id); setNewSectorName(s.name); }} className="p-1.5 text-muted-foreground hover:text-primary transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteSector(s.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Companies */}
        {activeTab === 'companies' && (
          <div className="bg-card rounded-xl md:rounded-[2rem] border border-border shadow-sm min-h-[300px]">
            <div className="p-4 md:p-10 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
              {registeredCompanies.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                <div key={c.id} className="bg-card px-4 py-3 md:px-6 md:py-5 rounded-2xl border border-border/50 flex items-center justify-between group shadow-sm transition-all">
                  <span className="text-[10px] md:text-xs font-black text-foreground uppercase truncate pr-2">{c.name}</span>
                  <button onClick={() => handleDeleteCompany(c.id)} className="p-1.5 text-muted-foreground/30 hover:text-destructive rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-5 pt-4">
          <div className="bg-nav text-nav-foreground p-4 md:p-6 rounded-xl md:rounded-[2rem] flex items-center justify-between shadow-2xl">
            <span className="text-[9px] md:text-[11px] font-black uppercase opacity-50 tracking-widest leading-none">Uso de Teto</span>
            <span className="text-xl md:text-3xl font-black tracking-tighter">{usagePercentage.toFixed(1)}%</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComprasApp;

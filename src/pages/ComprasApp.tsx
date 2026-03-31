import React, { useState, useMemo, useCallback, FormEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Calendar, Building2, Receipt, Trash2, Edit3, Wallet,
  Loader2, CheckCircle2, Save, X, Calculator, ArrowLeft,
  PieChart, Layers, List, BarChart3, Settings, TrendingUp,
  Printer, ChevronDown, EyeOff, Trophy, Clock, AlertCircle, Filter
} from 'lucide-react';
import { useCycleData } from '@/hooks/useSupabaseData';
import { FormData as PurchaseFormData } from '@/types/purchases';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const getStatusInfo = (dateStr: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateStr); dueDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Vencido', color: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20' };
  if (diffDays <= 3) return { label: 'Próximo', color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' };
  return { label: 'No prazo', color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' };
};

const ComprasApp: React.FC = () => {
  const navigate = useNavigate();
  const { cycleId } = useParams<{ cycleId: string }>();
  const {
    cycle, loading,
    addPurchase, updatePurchase, deletePurchase, clearPurchases,
    upsertCompany, deleteCompany,
    addSector, updateSector, deleteSector,
    updateLimit, refetch,
  } = useCycleData(cycleId);

  // Redirect if cycle not found
  useEffect(() => {
    if (!loading && !cycle) {
      const timer = setTimeout(() => navigate('/'), 300);
      return () => clearTimeout(timer);
    }
  }, [cycle, loading, navigate]);

  const purchases = cycle?.purchases || [];
  const registeredCompanies = cycle?.companies || [];
  const sectors = cycle?.sectors || [];
  const purchaseLimit = cycle?.purchaseLimit || 120000;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [tempLimit, setTempLimit] = useState("");
  const [newSectorName, setNewSectorName] = useState("");
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; id: string | null; type: string; title: string }>({ show: false, id: null, type: 'nota', title: '' });

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const [formData, setFormData] = useState<PurchaseFormData>({
    company: '',
    dueDate: '',
    amount: '',
    sector: '',
  });

  // Set default sector when sectors load
  useEffect(() => {
    if (sectors.length > 0 && !formData.sector) {
      setFormData(prev => ({ ...prev, sector: sectors[0]?.name || '' }));
    }
  }, [sectors]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const filteredPurchases = useMemo(() => {
    let filtered = purchases;
    if (filterDateFrom) {
      filtered = filtered.filter((p: any) => (p.dueDate || p.due_date) >= filterDateFrom);
    }
    if (filterDateTo) {
      filtered = filtered.filter((p: any) => (p.dueDate || p.due_date) <= filterDateTo);
    }
    return filtered;
  }, [purchases, filterDateFrom, filterDateTo]);

  const handleCompanyChange = useCallback((companyName: string) => {
    setFormData(prev => {
      const matched = registeredCompanies.find((c: any) => (c.name || '').toLowerCase() === companyName.trim().toLowerCase());
      const lastSector = matched ? (matched.last_sector || (matched as any).lastSector) : null;
      return { ...prev, company: companyName, ...(lastSector && !editingId ? { sector: lastSector } : {}) };
    });
  }, [registeredCompanies, editingId]);

  const companyNames = useMemo(() => registeredCompanies.map((c: any) => c.name).sort(), [registeredCompanies]);

  const handleAddSector = async () => {
    if (!newSectorName.trim()) return;
    if (editingSectorId) {
      await updateSector(editingSectorId, newSectorName.trim());
      setEditingSectorId(null);
    } else {
      await addSector(newSectorName.trim());
    }
    setNewSectorName("");
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.company || !formData.dueDate) return;
    const companyNameTrimmed = formData.company.trim().toUpperCase();
    const sectorName = formData.sector || sectors[0]?.name || "Geral";

    if (editingId) {
      await updatePurchase(editingId, {
        company: companyNameTrimmed,
        dueDate: formData.dueDate,
        amount: parseFloat(formData.amount) || 0,
        sector: sectorName,
      });
    } else {
      await addPurchase({
        company: companyNameTrimmed,
        dueDate: formData.dueDate,
        amount: parseFloat(formData.amount) || 0,
        sector: sectorName,
      });
    }

    // Upsert company
    await upsertCompany(companyNameTrimmed, sectorName);
    await refetch();

    setEditingId(null);
    setFormData({ company: '', dueDate: '', amount: '', sector: sectors[0]?.name || '' });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    const id = confirmDelete.id;
    const type = confirmDelete.type;
    if (type === 'nota') await deletePurchase(id);
    else if (type === 'setor') await deleteSector(id);
    else if (type === 'empresa') await deleteCompany(id);
    setConfirmDelete({ show: false, id: null, type: 'nota', title: '' });
  };

  const handleSaveLimit = async () => {
    const newLimit = parseFloat(tempLimit);
    if (isNaN(newLimit)) return;
    await updateLimit(newLimit);
    setIsEditingLimit(false);
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setFormData({ company: p.company, dueDate: p.dueDate || p.due_date, amount: String(p.amount), sector: p.sector || sectors[0]?.name || "" });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGeneratePDF = async () => {
    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) return;
    setIsGeneratingPDF(true);
    setIsPrintMode(true);
    setTimeout(async () => {
      const element = document.getElementById('report-container');
      const opt = {
        margin: 0,
        filename: `${cycle?.name || 'Relatorio'}_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 2.5, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'] }
      };
      await html2pdf().set(opt).from(element).save();
      setIsGeneratingPDF(false);
      setIsPrintMode(false);
    }, 1000);
  };

  const sortedPurchases = useMemo(() =>
    [...filteredPurchases].sort((a: any, b: any) => new Date(a.dueDate || a.due_date).getTime() - new Date(b.dueDate || b.due_date).getTime()),
    [filteredPurchases]
  );

  const totalSpent = useMemo(() => filteredPurchases.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0), [filteredPurchases]);
  const balance = purchaseLimit - totalSpent;
  const usagePercentage = purchaseLimit > 0 ? (totalSpent / purchaseLimit) * 100 : 0;

  const sectorTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    sectors.forEach((s: any) => (totals[s.name] = 0));
    filteredPurchases.forEach((p: any) => { if (totals[p.sector] !== undefined) totals[p.sector] += (p.amount || 0); });
    return totals;
  }, [filteredPurchases, sectors]);

  const topCompanies = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPurchases.forEach((p: any) => { map[p.company] = (map[p.company] || 0) + (p.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, amount]) => ({ name, amount }));
  }, [filteredPurchases]);

  const totalsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPurchases.forEach((p: any) => { const d = p.dueDate || p.due_date; map[d] = (map[d] || 0) + (p.amount || 0); });
    return Object.entries(map).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).map(([date, amount]) => ({ date, amount }));
  }, [filteredPurchases]);

  const hasActiveFilter = filterDateFrom || filterDateTo;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cycle) return null;

  return (
    <div className={`min-h-screen bg-background text-foreground antialiased pb-24 md:pb-12 ${isPrintMode ? 'is-printing' : ''}`}>
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 border-b border-border/60 no-print">
        <div className="max-w-5xl mx-auto px-5 py-3 md:px-8 md:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-secondary transition-all active:scale-95">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-sm md:text-base font-bold tracking-tight capitalize">{cycle.name}</h1>
              {cycle.periodFrom && cycle.periodTo && (
                <p className="text-[9px] text-muted-foreground font-medium">
                  {new Date(cycle.periodFrom + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {new Date(cycle.periodTo + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`p-2.5 rounded-xl transition-all active:scale-95 ${hasActiveFilter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
            <div className="bg-card px-3 py-1.5 rounded-2xl border border-border/60 apple-shadow-sm flex flex-col items-end">
              <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Saldo</span>
              <span className={`text-xs font-bold leading-tight mt-0.5 ${balance < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatCurrency(balance)}</span>
            </div>
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="bg-primary text-primary-foreground p-2.5 rounded-xl apple-shadow-md active:scale-95 transition-all"
            >
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Period Filter Panel */}
        {showFilter && (
          <div className="border-t border-border/40 px-5 py-3 md:px-8 animate-fade-in">
            <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Período:</span>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="px-3 py-2 bg-secondary/60 border border-border/60 rounded-xl text-xs font-medium outline-none focus:border-primary transition-all" />
              <span className="text-xs text-muted-foreground">até</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="px-3 py-2 bg-secondary/60 border border-border/60 rounded-xl text-xs font-medium outline-none focus:border-primary transition-all" />
              {hasActiveFilter && (
                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }} className="text-[9px] font-bold text-destructive bg-destructive/5 px-3 py-2 rounded-xl hover:bg-destructive/10 transition-all">Limpar</button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* --- PDF REPORT --- */}
      <div id="report-container" className={isPrintMode ? 'block bg-background' : 'hidden'}>
        <div className="p-6" style={{ pageBreakAfter: 'always' }}>
          <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground uppercase">Resumo de Compras Mensal</h2>
              <p className="text-[8px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Extraído em {new Date().toLocaleDateString('pt-BR')} — {cycle.name}</p>
            </div>
            <div className="bg-foreground p-3 rounded-2xl text-background flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              <div className="border-l border-background/20 pl-2">
                <p className="text-[7px] font-bold uppercase opacity-50">Saldo</p>
                <p className="text-sm font-bold">{formatCurrency(balance)}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5 text-center">
            <div className="bg-card p-3 rounded-2xl"><p className="text-[7px] font-medium text-muted-foreground uppercase">Limite</p><p className="text-sm font-bold">{formatCurrency(purchaseLimit)}</p></div>
            <div className="bg-card p-3 rounded-2xl"><p className="text-[7px] font-medium text-muted-foreground uppercase">Gasto</p><p className="text-sm font-bold text-destructive">{formatCurrency(totalSpent)}</p></div>
            <div className="bg-card p-3 rounded-2xl border-b-2 border-primary"><p className="text-[7px] font-medium text-muted-foreground uppercase">Saldo</p><p className="text-sm font-bold text-success">{formatCurrency(balance)}</p></div>
          </div>
          <div className="bg-card p-4 rounded-2xl mb-5">
            <h3 className="text-[9px] font-bold text-muted-foreground uppercase mb-3 text-center border-b border-border pb-2">Fluxo Mensal de Vencimentos</h3>
            <div className="space-y-2">
              {totalsByDate.map((item, idx) => {
                const max = Math.max(...totalsByDate.map(t => t.amount)) || 1;
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-[7px] font-bold uppercase">
                      <span className={getStatusInfo(item.date).color}>{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(item.amount / max) * 100}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-card p-4 rounded-2xl">
              <h3 className="text-[8px] font-bold text-muted-foreground uppercase mb-3 text-center border-b border-border pb-1.5">Top 10 Fornecedores</h3>
              {topCompanies.map((item, idx) => (
                <div key={idx} className="mb-1.5">
                  <div className="flex justify-between text-[7px] font-bold uppercase truncate pr-2">
                    <span>{idx + 1}. {item.name}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="w-full bg-secondary h-1 rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-foreground rounded-full" style={{ width: `${(item.amount / (topCompanies[0]?.amount || 1)) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sectors.slice(0, 10).map((s: any) => (
                <div key={s.id} className="bg-card p-2 rounded-xl border border-border text-center flex flex-col justify-center">
                  <h4 className="text-[6px] font-bold text-muted-foreground uppercase truncate mb-0.5">{s.name}</h4>
                  <p className="text-[8px] font-bold text-foreground leading-none">{formatCurrency(sectorTotals[s.name] || 0)}</p>
                  <p className="text-[6px] font-bold text-primary mt-1 bg-primary/10 py-0.5 rounded-full">{totalSpent > 0 ? ((sectorTotals[s.name] || 0) / totalSpent * 100).toFixed(1) : 0}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* Grouped by createdAt table */}
          <div className="bg-card rounded-2xl overflow-hidden border border-border mb-4">
            <div className="px-6 py-3 bg-secondary border-b border-border text-center uppercase tracking-widest text-[8px] font-bold">Notas Cadastradas por Dia</div>
            <table className="w-full text-left border-collapse">
              {(() => {
                const grouped: Record<string, any[]> = {};
                filteredPurchases.forEach((p: any) => {
                  const ca = p.createdAt || p.created_at || '';
                  const dateKey = ca ? ca.split('T')[0] : 'sem-data';
                  if (!grouped[dateKey]) grouped[dateKey] = [];
                  grouped[dateKey].push(p);
                });
                const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                const grandTotal = filteredPurchases.reduce((a: number, p: any) => a + (p.amount || 0), 0);
                return (
                  <tbody>
                    {sortedDates.map(dateKey => {
                      const notes = grouped[dateKey];
                      const subtotal = notes.reduce((a: number, p: any) => a + (p.amount || 0), 0);
                      const dateLabel = dateKey === 'sem-data' ? 'Sem data' : new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      return (
                        <React.Fragment key={dateKey}>
                          <tr className="bg-secondary">
                            <td colSpan={3} className="px-6 py-2 text-[8px] font-extrabold uppercase text-foreground">{dateLabel}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <th className="px-6 py-1.5 text-[7px] font-bold text-muted-foreground uppercase">Empresa</th>
                            <th className="px-6 py-1.5 text-[7px] font-bold text-muted-foreground uppercase text-center">Vencimento</th>
                            <th className="px-6 py-1.5 text-[7px] font-bold text-muted-foreground uppercase text-right">Valor</th>
                          </tr>
                          {notes.map((p: any) => (
                            <tr key={p.id} className="border-b border-border/40">
                              <td className="px-6 py-1.5 font-semibold text-foreground uppercase text-[8px]">{p.company}</td>
                              <td className="px-6 py-1.5 text-[8px] text-muted-foreground text-center">{new Date(p.dueDate || p.due_date).toLocaleDateString('pt-BR')}</td>
                              <td className="px-6 py-1.5 text-right font-bold text-foreground text-[8px]">{formatCurrency(p.amount)}</td>
                            </tr>
                          ))}
                          <tr className="bg-secondary/60 border-b-2 border-border">
                            <td colSpan={2} className="px-6 py-1.5 text-[7px] font-bold text-muted-foreground uppercase">Subtotal do dia</td>
                            <td className="px-6 py-1.5 text-right font-extrabold text-foreground text-[9px]">{formatCurrency(subtotal)}</td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                    <tr className="bg-foreground text-background">
                      <td colSpan={2} className="px-6 py-2.5 text-[8px] font-extrabold uppercase">Total Geral</td>
                      <td className="px-6 py-2.5 text-right font-extrabold text-[10px]">{formatCurrency(grandTotal)}</td>
                    </tr>
                  </tbody>
                );
              })()}
            </table>
          </div>
        </div>
      </div>

      {/* --- MAIN INTERFACE --- */}
      {!isPrintMode && (
        <main className="max-w-5xl mx-auto px-4 md:px-8 pt-6 space-y-5 relative z-10">
          {/* Summary Cards */}
          <section className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto hide-scrollbar pb-2">
            {[
              { label: 'Gasto Total', val: totalSpent, color: 'text-destructive', icon: Receipt, bg: 'bg-destructive/5' },
              { label: 'Saldo Livre', val: balance, color: balance < 0 ? 'text-destructive' : 'text-success', icon: Wallet, bg: 'bg-secondary' },
              { label: 'Ocupação', val: `${usagePercentage.toFixed(1)}%`, color: 'text-primary', icon: TrendingUp, bg: 'bg-primary/5' }
            ].map((item, i) => (
              <div key={i} className="bg-card p-5 md:p-6 rounded-2xl apple-shadow-sm flex items-center justify-between min-w-[220px] md:min-w-0 flex-1 border border-border/40">
                <div>
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                  <p className={`text-xl font-bold ${item.color}`}>{typeof item.val === 'number' ? formatCurrency(item.val) : item.val}</p>
                </div>
                <div className={`${item.bg} p-3 rounded-xl border border-border/40`}>
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </section>

          {hasActiveFilter && (
            <div className="bg-primary/5 border border-primary/20 px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fade-in">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Filtro ativo: {filterDateFrom ? new Date(filterDateFrom + 'T12:00:00').toLocaleDateString('pt-BR') : '...'} até {filterDateTo ? new Date(filterDateTo + 'T12:00:00').toLocaleDateString('pt-BR') : '...'}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">({filteredPurchases.length} notas)</span>
            </div>
          )}

          {/* Form */}
          <section className={`bg-card p-5 md:p-8 rounded-2xl apple-shadow-md border-2 transition-all duration-300 animate-fade-in ${editingId ? 'border-warning/40 ring-4 ring-warning/5' : 'border-transparent'}`}>
            <div className="flex justify-between items-center mb-5 md:mb-6">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2.5">
                {editingId ? <Edit3 className="w-4 h-4 text-warning" /> : <Plus className="w-4 h-4 text-primary" />}
                {editingId ? 'Modificar Registro' : 'Registrar Nova Nota'}
              </h2>
              {editingId && (
                <button onClick={() => { setEditingId(null); setFormData(prev => ({ ...prev, company: '', dueDate: '', amount: '' })); }} className="text-xs font-medium text-warning bg-warning/10 hover:bg-warning/15 px-3.5 py-1.5 rounded-full transition-colors">
                  Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4 md:grid md:grid-cols-12 md:gap-5 items-end">
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-muted-foreground mb-2 ml-0.5">Fornecedor</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input type="text" list="companies-list" placeholder="Empresa..." className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-border/60 focus:border-primary focus:bg-card rounded-xl outline-none text-sm font-medium transition-all placeholder:text-muted-foreground/40" value={formData.company} onChange={(e) => handleCompanyChange(e.target.value)} required />
                  <datalist id="companies-list">{companyNames.map((name: string) => <option key={name} value={name} />)}</datalist>
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-muted-foreground mb-2 ml-0.5">Setor</label>
                <div className="relative">
                  <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <select className="w-full pl-10 pr-8 py-3 bg-secondary/60 border border-border/60 focus:border-primary focus:bg-card rounded-xl outline-none text-sm font-medium appearance-none transition-all" value={formData.sector} onChange={(e) => setFormData({ ...formData, sector: e.target.value })} required>
                    <option value="" disabled>Setor...</option>
                    {sectors.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-3 md:contents">
                <div className="flex-1 md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-2 ml-0.5">Vencimento</label>
                  <input type="date" className="w-full px-3.5 py-3 bg-secondary/60 border border-border/60 focus:border-primary focus:bg-card rounded-xl outline-none text-sm font-medium transition-all" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required />
                </div>
                <div className="flex-1 md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-2 ml-0.5">Valor</label>
                  <input type="number" step="0.01" placeholder="0,00" className="w-full px-3.5 py-3 bg-secondary/60 border border-border/60 focus:border-primary focus:bg-card rounded-xl outline-none text-sm font-bold text-primary transition-all placeholder:text-muted-foreground/30" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                </div>
              </div>

              <div className="md:col-span-1">
                <button type="submit" className={`w-full h-[46px] md:h-[52px] rounded-xl font-semibold text-sm active:scale-[0.97] flex items-center justify-center transition-all duration-200 apple-shadow-md ${editingId ? 'bg-warning text-card' : 'bg-foreground text-background hover:opacity-90'}`}>
                  {editingId ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </section>

          {/* Desktop Tabs */}
          <div className="hidden md:flex bg-secondary/80 p-1 rounded-xl w-fit overflow-x-auto hide-scrollbar whitespace-nowrap">
            {[
              { key: 'dashboard', label: 'Painel', icon: BarChart3 },
              { key: 'list', label: 'Notas', icon: List },
              { key: 'sectors', label: 'Setores', icon: PieChart },
              { key: 'config', label: 'Ajustes', icon: Settings },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.key ? 'bg-card text-foreground apple-shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 gap-5 animate-fade-in">
              <div className="bg-card p-5 md:p-8 rounded-2xl apple-shadow-md">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6 text-center border-b border-border pb-3">Fluxo de Pagamentos</h3>
                <div className="space-y-4 max-w-4xl mx-auto">
                  {totalsByDate.map((item, idx) => {
                    const max = Math.max(...totalsByDate.map(t => t.amount)) || 1;
                    const status = getStatusInfo(item.date);
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-tight">
                          <span className={status.color}>
                            {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ({status.label})
                          </span>
                          <span className="text-foreground font-bold">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="w-full bg-secondary h-3 rounded-full overflow-hidden border border-border/40">
                          <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${(item.amount / max) * 100}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                  {totalsByDate.length === 0 && (
                    <p className="text-center text-muted-foreground/40 font-medium text-sm py-12">Nenhum lançamento registrado</p>
                  )}
                </div>
              </div>

              <div className="bg-card p-5 md:p-8 rounded-2xl apple-shadow-md">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6 text-center border-b border-border pb-3 flex items-center justify-center gap-2">
                  <Trophy className="w-4 h-4 text-warning" /> Top Fornecedores
                </h3>
                <div className="space-y-4 max-w-4xl mx-auto">
                  {topCompanies.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold uppercase tracking-tight truncate pr-3">
                        <span className="text-muted-foreground">{idx + 1}. {item.name}</span>
                        <span className="text-foreground font-bold">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border/40">
                        <div className="h-full bg-foreground rounded-full transition-all duration-700 ease-out" style={{ width: `${(item.amount / (topCompanies[0]?.amount || 1)) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                  {topCompanies.length === 0 && (
                    <p className="text-center text-muted-foreground/40 font-medium text-sm py-12">Nenhum fornecedor registrado</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: List */}
          {activeTab === 'list' && (
            <div className="bg-card rounded-2xl apple-shadow-md overflow-hidden min-h-[300px] animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60 tracking-wider">
                      <th className="px-5 py-4 md:px-6">Fornecedor</th>
                      <th className="px-5 py-4 md:px-6 text-center">Status</th>
                      <th className="px-5 py-4 md:px-6 text-right">Valor</th>
                      <th className="px-5 py-4 md:px-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {sortedPurchases.map((p: any) => {
                      const status = getStatusInfo(p.dueDate || p.due_date);
                      return (
                        <tr key={p.id} className="group hover:bg-secondary/40 transition-colors duration-150">
                          <td className="px-5 py-4 md:px-6">
                            <div className="font-semibold text-foreground uppercase text-xs">{p.company}</div>
                            <div className="text-[9px] font-medium text-muted-foreground uppercase mt-0.5">{p.sector}</div>
                          </td>
                          <td className="px-5 py-4 md:px-6 text-center">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase border ${status.bg} ${status.color} ${status.border}`}>
                              <Clock className="w-2.5 h-2.5" /> {status.label}
                            </div>
                          </td>
                          <td className="px-5 py-4 md:px-6 text-right font-bold text-foreground text-sm">{formatCurrency(p.amount)}</td>
                          <td className="px-5 py-4 md:px-6 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startEdit(p)} className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setConfirmDelete({ show: true, id: p.id, type: 'nota', title: p.company })} className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/5 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedPurchases.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-20 text-center text-muted-foreground/40 font-medium text-sm">Nenhum lançamento registrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Sectors */}
          {activeTab === 'sectors' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              {sectors.map((s: any) => (
                <div key={s.id} className="bg-card p-5 md:p-6 rounded-2xl apple-shadow-sm text-center hover:scale-[1.02] transition-all border border-border/40">
                  <h4 className="text-[9px] font-medium text-muted-foreground uppercase mb-2 truncate">{s.name}</h4>
                  <p className="text-base md:text-xl font-bold text-foreground">{formatCurrency(sectorTotals[s.name] || 0)}</p>
                  <div className="inline-block px-3 py-1 bg-primary text-primary-foreground rounded-full text-[8px] font-bold mt-2 apple-shadow-sm">
                    {totalSpent > 0 ? ((sectorTotals[s.name] || 0) / totalSpent * 100).toFixed(1) : 0}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Config */}
          {activeTab === 'config' && (
            <div className="bg-card rounded-2xl apple-shadow-md min-h-[300px] animate-fade-in">
              <div className="p-5 md:p-8 space-y-8">
                <div className="bg-secondary/40 p-6 rounded-2xl">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Limite de Compras
                  </h3>
                  <div className="flex items-center gap-3">
                    {isEditingLimit ? (
                      <>
                        <input type="number" className="flex-1 px-4 py-3 bg-card border border-border/60 focus:border-primary rounded-xl text-sm font-bold outline-none transition-all" value={tempLimit} onChange={(e) => setTempLimit(e.target.value)} autoFocus />
                        <button onClick={handleSaveLimit} className="bg-primary text-primary-foreground px-5 py-3 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setIsEditingLimit(false)} className="bg-secondary text-muted-foreground px-5 py-3 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-foreground flex-1">{formatCurrency(purchaseLimit)}</p>
                        <button onClick={() => { setTempLimit(purchaseLimit.toString()); setIsEditingLimit(true); }} className="bg-secondary text-foreground px-5 py-3 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all"><Edit3 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-foreground p-6 rounded-2xl text-center">
                  <h3 className="text-primary font-bold uppercase text-[9px] mb-4 tracking-widest">Manutenção</h3>
                  <button
                    onClick={async () => { if (confirm("Deseja apagar TODOS os registos deste ciclo?")) await clearPurchases(); }}
                    className="bg-destructive text-destructive-foreground px-6 py-3 rounded-xl flex items-center justify-center gap-3 font-semibold uppercase text-[10px] transition-all active:scale-95 mx-auto apple-shadow-md"
                  >
                    <Trash2 className="w-4 h-4" /> Limpar Base
                  </button>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-4 text-center">Departamentos</h3>
                  <div className="flex gap-3 mb-6">
                    <input type="text" placeholder="Novo setor..." className="flex-1 px-4 py-3 bg-secondary/60 border border-border/60 focus:border-primary rounded-xl text-sm font-medium outline-none transition-all placeholder:text-muted-foreground/40" value={newSectorName} onChange={(e) => setNewSectorName(e.target.value)} />
                    <button onClick={handleAddSector} className="bg-foreground text-background px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all">OK</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sectors.map((s: any) => (
                      <div key={s.id} className="bg-secondary/40 px-4 py-3.5 rounded-xl flex items-center justify-between group transition-colors hover:bg-secondary/70">
                        <span className="text-sm font-medium text-foreground truncate pr-3">{s.name}</span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => { setEditingSectorId(s.id); setNewSectorName(s.name); }} className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-all"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => setConfirmDelete({ show: true, id: s.id, type: 'setor', title: s.name })} className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/5 transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer status */}
          <div className="pt-2">
            <div className="bg-card p-5 rounded-2xl apple-shadow-sm flex items-center justify-between border border-border/40">
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
      )}

      {/* Mobile Bottom Navigation */}
      {!isPrintMode && (
        <footer className="fixed bottom-0 left-0 right-0 glass border-t border-border/60 px-6 py-3 flex justify-around md:hidden z-50 rounded-t-3xl no-print">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Painel' },
            { id: 'list', icon: List, label: 'Notas' },
            { id: 'sectors', icon: PieChart, label: 'Setores' },
            { id: 'config', icon: Settings, label: 'Ajustes' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 transition-all min-w-[44px] min-h-[44px] justify-center ${activeTab === tab.id ? 'text-primary scale-110' : 'text-muted-foreground'}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase tracking-tight">{tab.label}</span>
            </button>
          ))}
        </footer>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-foreground/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-3xl p-8 max-w-sm w-full apple-shadow-xl text-center border border-border">
            <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-bold text-foreground uppercase tracking-tight mb-2">Eliminar {confirmDelete.type}?</h3>
            <p className="text-xs text-muted-foreground mb-8 leading-relaxed font-medium">
              Confirma a remoção de: <br /><span className="text-destructive font-bold">"{confirmDelete.title}"</span>?
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={executeDelete} className="w-full bg-destructive text-destructive-foreground py-4 rounded-2xl font-semibold text-xs uppercase tracking-wider apple-shadow-md active:scale-95 transition-all">Eliminar Agora</button>
              <button onClick={() => setConfirmDelete({ show: false, id: null, type: 'nota', title: '' })} className="w-full bg-secondary text-muted-foreground py-4 rounded-2xl font-semibold text-xs uppercase tracking-wider active:scale-95 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Print mode exit */}
      {isPrintMode && (
        <div className="fixed top-6 left-6 z-[100] no-print">
          <button onClick={() => setIsPrintMode(false)} className="bg-foreground text-background p-3 rounded-full apple-shadow-xl active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      )}
      {isPrintMode && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] no-print">
          <button onClick={handleGeneratePDF} disabled={isGeneratingPDF} className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold text-xs uppercase tracking-wider apple-shadow-xl flex items-center gap-2 active:scale-95 transition-all">
            {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Baixar PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ComprasApp;

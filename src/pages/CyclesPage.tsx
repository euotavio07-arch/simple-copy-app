import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, Calendar, Receipt, AlertCircle, Printer, Loader2, ChevronRight, X, BarChart3, FileText, Pencil, Check } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Cycle, DEFAULT_SECTORS } from '@/types/purchases';
import logoImg from '@/assets/logo-fotech-completa.jpeg';

const generateId = () => Math.random().toString(36).substring(2, 15);

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const CyclesPage: React.FC = () => {
  const navigate = useNavigate();
  const [cycles, setCycles] = useLocalStorage<Cycle[]>('cycles', []);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; id: string | null; name: string }>({ show: false, id: null, name: '' });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // New cycle modal
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [newCycleName, setNewCycleName] = useState('');
  const [newCyclePeriodFrom, setNewCyclePeriodFrom] = useState('');
  const [newCyclePeriodTo, setNewCyclePeriodTo] = useState('');

  // Edit cycle modal
  const [showEditCycleModal, setShowEditCycleModal] = useState(false);
  const [editCycleId, setEditCycleId] = useState('');
  const [editCycleName, setEditCycleName] = useState('');
  const [editCyclePeriodFrom, setEditCyclePeriodFrom] = useState('');
  const [editCyclePeriodTo, setEditCyclePeriodTo] = useState('');

  // PDF options modal
  const [showPDFModal, setShowPDFModal] = useState(false);

  // Editable app name
  const [appName, setAppName] = useLocalStorage<string>('appName', 'Gestor Gerencial');
  const [isEditingAppName, setIsEditingAppName] = useState(false);
  const [tempAppName, setTempAppName] = useState('');

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const openNewCycleModal = () => {
    const now = new Date();
    const name = `Ciclo ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setNewCycleName(name);
    setNewCyclePeriodFrom(firstDay);
    setNewCyclePeriodTo(lastDay);
    setShowNewCycleModal(true);
  };

  const handleCreateCycle = () => {
    if (!newCyclePeriodFrom || !newCyclePeriodTo) return;
    const newCycle: Cycle = {
      id: generateId(),
      name: newCycleName || `Ciclo ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      createdAt: new Date().toISOString(),
      periodFrom: newCyclePeriodFrom,
      periodTo: newCyclePeriodTo,
      purchases: [],
      companies: [],
      sectors: DEFAULT_SECTORS.map(n => ({ id: generateId(), name: n })),
      purchaseLimit: 120000,
    };
    const updated = [newCycle, ...cycles];
    window.localStorage.setItem('cycles', JSON.stringify(updated));
    setCycles(updated);
    setShowNewCycleModal(false);
    navigate(`/cycle/${newCycle.id}`);
  };

  const openEditCycleModal = (cycle: Cycle, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditCycleId(cycle.id);
    setEditCycleName(cycle.name);
    setEditCyclePeriodFrom(cycle.periodFrom || '');
    setEditCyclePeriodTo(cycle.periodTo || '');
    setShowEditCycleModal(true);
  };

  const handleEditCycle = () => {
    setCycles(prev => prev.map(c => c.id === editCycleId ? { ...c, name: editCycleName, periodFrom: editCyclePeriodFrom, periodTo: editCyclePeriodTo } : c));
    setShowEditCycleModal(false);
  };

  const executeDelete = () => {
    if (!confirmDelete.id) return;
    setCycles(prev => prev.filter(c => c.id !== confirmDelete.id));
    setConfirmDelete({ show: false, id: null, name: '' });
  };

  const getStatusInfo = (dateStr: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'Vencido', color: 'text-destructive' };
    if (diff <= 3) return { label: 'Próximo', color: 'text-warning' };
    return { label: 'No prazo', color: 'text-success' };
  };

  const formatPeriod = (from: string, to: string) => {
    if (!from && !to) return '';
    const f = from ? new Date(from + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '...';
    const t = to ? new Date(to + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '...';
    return `${f} — ${t}`;
  };

  // PDF individual per cycle (existing behavior)
  const handleGenerateIndividualPDF = async () => {
    const html2pdf = (window as any).html2pdf;
    if (!html2pdf || cycles.length === 0) return;
    setIsGeneratingPDF(true);
    setShowPDFModal(false);

    const container = document.createElement('div');
    container.style.width = '210mm';
    container.style.fontFamily = "-apple-system, 'Inter', sans-serif";
    container.style.color = '#1c1c1c';
    container.style.background = '#fff';

    cycles.forEach((cycle, cycleIdx) => {
      const totalSpent = cycle.purchases.reduce((a, p) => a + (p.amount || 0), 0);
      const balance = cycle.purchaseLimit - totalSpent;
      const sorted = [...cycle.purchases].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      const period = formatPeriod(cycle.periodFrom, cycle.periodTo);

      let html = `
        <div style="padding: 24px; ${cycleIdx < cycles.length - 1 ? 'page-break-after: always;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #007AFF; padding-bottom: 12px; margin-bottom: 16px;">
            <div>
              <h2 style="font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0;">${cycle.name}</h2>
              <p style="font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0 0;">Período: ${period}</p>
            </div>
            <div style="background: #1c1c1c; color: #fff; padding: 10px 16px; border-radius: 14px; text-align: right;">
              <p style="font-size: 7px; text-transform: uppercase; opacity: 0.5; margin: 0;">Saldo</p>
              <p style="font-size: 14px; font-weight: 700; margin: 2px 0 0 0;">${formatCurrency(balance)}</p>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; text-align: center;">
            <div style="background: #f5f5f7; padding: 12px; border-radius: 14px;">
              <p style="font-size: 7px; color: #999; text-transform: uppercase; margin: 0;">Limite</p>
              <p style="font-size: 13px; font-weight: 700; margin: 4px 0 0 0;">${formatCurrency(cycle.purchaseLimit)}</p>
            </div>
            <div style="background: #f5f5f7; padding: 12px; border-radius: 14px;">
              <p style="font-size: 7px; color: #999; text-transform: uppercase; margin: 0;">Gasto</p>
              <p style="font-size: 13px; font-weight: 700; color: #dc2626; margin: 4px 0 0 0;">${formatCurrency(totalSpent)}</p>
            </div>
            <div style="background: #f5f5f7; padding: 12px; border-radius: 14px; border-bottom: 2px solid #007AFF;">
              <p style="font-size: 7px; color: #999; text-transform: uppercase; margin: 0;">Saldo</p>
              <p style="font-size: 13px; font-weight: 700; color: #16a34a; margin: 4px 0 0 0;">${formatCurrency(balance)}</p>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
            <thead>
              <tr style="border-bottom: 1px solid #e5e5e5;">
                <th style="text-align: left; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999;">Fornecedor</th>
                <th style="text-align: left; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999;">Setor</th>
                <th style="text-align: center; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999;">Vencimento</th>
                <th style="text-align: right; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map(p => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 6px 12px; font-weight: 600; text-transform: uppercase;">${p.company}</td>
                  <td style="padding: 6px 12px; color: #666;">${p.sector}</td>
                  <td style="padding: 6px 12px; text-align: center; color: ${getStatusInfo(p.dueDate).color === 'text-destructive' ? '#dc2626' : getStatusInfo(p.dueDate).color === 'text-warning' ? '#d97706' : '#16a34a'};">${new Date(p.dueDate).toLocaleDateString('pt-BR')}</td>
                  <td style="padding: 6px 12px; text-align: right; font-weight: 700;">${formatCurrency(p.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      container.innerHTML += html;
    });

    document.body.appendChild(container);
    const opt = {
      margin: 0,
      filename: `Relatorio_Ciclos_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 2.5, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    await html2pdf().set(opt).from(container).save();
    document.body.removeChild(container);
    setIsGeneratingPDF(false);
  };

  // PDF consolidated — all cycles summed with graphs
  const handleGenerateConsolidatedPDF = async () => {
    const html2pdf = (window as any).html2pdf;
    if (!html2pdf || cycles.length === 0) return;
    setIsGeneratingPDF(true);
    setShowPDFModal(false);

    const allPurchases = cycles.flatMap(c => c.purchases);
    const totalLimit = cycles.reduce((a, c) => a + c.purchaseLimit, 0);
    const totalSpent = allPurchases.reduce((a, p) => a + (p.amount || 0), 0);
    const balance = totalLimit - totalSpent;

    // Totals by date
    const dateMap: Record<string, number> = {};
    allPurchases.forEach(p => { dateMap[p.dueDate] = (dateMap[p.dueDate] || 0) + (p.amount || 0); });
    const totalsByDate = Object.entries(dateMap).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).map(([date, amount]) => ({ date, amount }));

    // Top companies
    const compMap: Record<string, number> = {};
    allPurchases.forEach(p => { compMap[p.company] = (compMap[p.company] || 0) + (p.amount || 0); });
    const topCompanies = Object.entries(compMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, amount]) => ({ name, amount }));

    // Sector totals
    const sectorMap: Record<string, number> = {};
    allPurchases.forEach(p => { sectorMap[p.sector] = (sectorMap[p.sector] || 0) + (p.amount || 0); });
    const sectorEntries = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);

    const container = document.createElement('div');
    container.style.width = '210mm';
    container.style.fontFamily = "-apple-system, 'Inter', sans-serif";
    container.style.color = '#1c1c1c';
    container.style.background = '#fff';

    // Page 1 - Summary + Charts
    let page1 = `
      <div style="padding: 24px; page-break-after: always;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #007AFF; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0;">Relatório Consolidado</h2>
            <p style="font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0 0;">Todos os ciclos • ${cycles.length} ciclos • Extraído em ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div style="background: #1c1c1c; color: #fff; padding: 10px 16px; border-radius: 14px; text-align: right;">
            <p style="font-size: 7px; text-transform: uppercase; opacity: 0.5; margin: 0;">Saldo Total</p>
            <p style="font-size: 14px; font-weight: 700; margin: 2px 0 0 0;">${formatCurrency(balance)}</p>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; text-align: center;">
          <div style="background: #f5f5f7; padding: 12px; border-radius: 14px;">
            <p style="font-size: 7px; color: #999; text-transform: uppercase; margin: 0;">Limite Total</p>
            <p style="font-size: 13px; font-weight: 700; margin: 4px 0 0 0;">${formatCurrency(totalLimit)}</p>
          </div>
          <div style="background: #f5f5f7; padding: 12px; border-radius: 14px;">
            <p style="font-size: 7px; color: #999; text-transform: uppercase; margin: 0;">Gasto Total</p>
            <p style="font-size: 13px; font-weight: 700; color: #dc2626; margin: 4px 0 0 0;">${formatCurrency(totalSpent)}</p>
          </div>
          <div style="background: #f5f5f7; padding: 12px; border-radius: 14px; border-bottom: 2px solid #007AFF;">
            <p style="font-size: 7px; color: #999; text-transform: uppercase; margin: 0;">Saldo Total</p>
            <p style="font-size: 13px; font-weight: 700; color: #16a34a; margin: 4px 0 0 0;">${formatCurrency(balance)}</p>
          </div>
        </div>

        <div style="background: #fafafa; padding: 16px; border-radius: 14px; margin-bottom: 16px;">
          <h3 style="font-size: 8px; font-weight: 700; color: #999; text-transform: uppercase; text-align: center; margin: 0 0 12px 0; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px;">Fluxo de Vencimentos Consolidado</h3>
          ${totalsByDate.slice(0, 15).map(item => {
            const max = Math.max(...totalsByDate.map(t => t.amount)) || 1;
            const statusColor = getStatusInfo(item.date).color === 'text-destructive' ? '#dc2626' : getStatusInfo(item.date).color === 'text-warning' ? '#d97706' : '#16a34a';
            return `
              <div style="margin-bottom: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 7px; font-weight: 700; text-transform: uppercase;">
                  <span style="color: ${statusColor};">${new Date(item.date).toLocaleDateString('pt-BR')}</span>
                  <span>${formatCurrency(item.amount)}</span>
                </div>
                <div style="width: 100%; background: #e5e5e5; height: 6px; border-radius: 999px; overflow: hidden; margin-top: 2px;">
                  <div style="height: 100%; background: #007AFF; border-radius: 999px; width: ${(item.amount / max) * 100}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="background: #fafafa; padding: 14px; border-radius: 14px;">
            <h3 style="font-size: 8px; font-weight: 700; color: #999; text-transform: uppercase; text-align: center; margin: 0 0 10px 0; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px;">Top 10 Fornecedores</h3>
            ${topCompanies.map((item, idx) => `
              <div style="margin-bottom: 5px;">
                <div style="display: flex; justify-content: space-between; font-size: 7px; font-weight: 700; text-transform: uppercase;">
                  <span>${idx + 1}. ${item.name}</span>
                  <span>${formatCurrency(item.amount)}</span>
                </div>
                <div style="width: 100%; background: #e5e5e5; height: 4px; border-radius: 999px; overflow: hidden; margin-top: 2px;">
                  <div style="height: 100%; background: #1c1c1c; border-radius: 999px; width: ${(item.amount / (topCompanies[0]?.amount || 1)) * 100}%;"></div>
                </div>
              </div>
            `).join('')}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${sectorEntries.slice(0, 10).map(([name, amount]) => `
              <div style="background: #fafafa; padding: 8px; border-radius: 10px; border: 1px solid #e5e5e5; text-align: center;">
                <h4 style="font-size: 6px; font-weight: 700; color: #999; text-transform: uppercase; margin: 0 0 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</h4>
                <p style="font-size: 8px; font-weight: 700; margin: 0;">${formatCurrency(amount)}</p>
                <p style="font-size: 6px; font-weight: 700; color: #007AFF; background: rgba(0,122,255,0.1); padding: 2px; border-radius: 999px; margin: 4px 0 0 0;">${totalSpent > 0 ? (amount / totalSpent * 100).toFixed(1) : 0}%</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Page 2 - All purchases table
    const allSorted = [...allPurchases].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    let page2 = `
      <div style="padding: 24px;">
        <div style="background: #fafafa; border-radius: 14px; overflow: hidden; border: 1px solid #e5e5e5;">
          <div style="padding: 10px; background: #f0f0f0; border-bottom: 1px solid #e5e5e5; text-align: center; text-transform: uppercase; letter-spacing: 2px; font-size: 8px; font-weight: 700;">Cronograma Consolidado</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
            <thead>
              <tr style="border-bottom: 1px solid #e5e5e5;">
                <th style="text-align: left; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999;">Fornecedor</th>
                <th style="text-align: left; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999;">Setor</th>
                <th style="text-align: center; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999;">Vencimento</th>
                <th style="text-align: right; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${allSorted.map(p => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 5px 12px; font-weight: 600; text-transform: uppercase;">${p.company}</td>
                  <td style="padding: 5px 12px; color: #666;">${p.sector}</td>
                  <td style="padding: 5px 12px; text-align: center; color: ${getStatusInfo(p.dueDate).color === 'text-destructive' ? '#dc2626' : getStatusInfo(p.dueDate).color === 'text-warning' ? '#d97706' : '#16a34a'};">${new Date(p.dueDate).toLocaleDateString('pt-BR')}</td>
                  <td style="padding: 5px 12px; text-align: right; font-weight: 700;">${formatCurrency(p.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = page1 + page2;
    document.body.appendChild(container);
    const opt = {
      margin: 0,
      filename: `Relatorio_Consolidado_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 2.5, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    await html2pdf().set(opt).from(container).save();
    document.body.removeChild(container);
    setIsGeneratingPDF(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 border-b border-border/60">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Logo" className="w-10 h-10 rounded-xl apple-shadow-md object-cover" />
            <div className="flex items-center gap-2">
              {isEditingAppName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempAppName}
                    onChange={e => setTempAppName(e.target.value)}
                    className="text-base font-bold tracking-tight bg-secondary/60 border border-border/60 focus:border-primary rounded-lg px-2 py-1 outline-none transition-all w-40"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') { setAppName(tempAppName || 'Gestor Gerencial'); setIsEditingAppName(false); } }}
                  />
                  <button onClick={() => { setAppName(tempAppName || 'Gestor Gerencial'); setIsEditingAppName(false); }} className="p-1.5 rounded-lg bg-primary text-primary-foreground">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="cursor-pointer group" onClick={() => { setTempAppName(appName); setIsEditingAppName(true); }}>
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-base font-bold tracking-tight">{appName}</h1>
                    <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all" />
                  </div>
                  <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Ciclos de Compras</p>
                </div>
              )}
            </div>
          </div>
          {cycles.length > 1 && (
            <button
              onClick={() => setShowPDFModal(true)}
              disabled={isGeneratingPDF}
              className="bg-secondary text-foreground px-4 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all apple-shadow-sm border border-border/40"
            >
              {isGeneratingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              PDF Geral
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 md:px-8 pt-8 pb-12 space-y-6">
        {/* New Cycle Button */}
        <button
          onClick={openNewCycleModal}
          className="w-full bg-foreground text-background p-6 rounded-2xl apple-shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all duration-200 group"
        >
          <div className="bg-primary p-2 rounded-xl">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold uppercase tracking-wider">Iniciar Novo Ciclo</span>
          <ChevronRight className="w-4 h-4 ml-auto opacity-50 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Cycles List */}
        {cycles.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
              <FolderOpen className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground/50">Nenhum ciclo criado</p>
            <p className="text-xs text-muted-foreground/30 mt-1">Clique acima para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Ciclos Salvos ({cycles.length})</h2>
            {cycles.map(cycle => {
              const totalSpent = cycle.purchases.reduce((a, p) => a + (p.amount || 0), 0);
              const balance = cycle.purchaseLimit - totalSpent;
              const period = formatPeriod(cycle.periodFrom, cycle.periodTo);
              return (
                <div
                  key={cycle.id}
                  className="bg-card p-5 rounded-2xl apple-shadow-sm border border-border/40 animate-fade-in"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 cursor-pointer" onClick={() => navigate(`/cycle/${cycle.id}`)}>
                      <h3 className="text-sm font-bold text-foreground capitalize">{cycle.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-[9px] text-muted-foreground font-medium">
                          {period || new Date(cycle.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[9px] text-muted-foreground/30">•</span>
                        <Receipt className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-[9px] text-muted-foreground font-medium">{cycle.purchases.length} notas</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete({ show: true, id: cycle.id, name: cycle.name }); }}
                      className="p-2.5 text-muted-foreground hover:text-destructive rounded-xl hover:bg-destructive/5 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-3 cursor-pointer" onClick={() => navigate(`/cycle/${cycle.id}`)}>
                    <div className="flex-1 bg-secondary/60 p-3 rounded-xl text-center">
                      <p className="text-[7px] font-bold text-muted-foreground uppercase">Gasto</p>
                      <p className="text-xs font-bold text-destructive mt-0.5">{formatCurrency(totalSpent)}</p>
                    </div>
                    <div className="flex-1 bg-secondary/60 p-3 rounded-xl text-center">
                      <p className="text-[7px] font-bold text-muted-foreground uppercase">Saldo</p>
                      <p className={`text-xs font-bold mt-0.5 ${balance < 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(balance)}</p>
                    </div>
                    <div className="flex items-center pl-2">
                      <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Cycle Modal */}
      {showNewCycleModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-foreground/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-3xl p-8 max-w-sm w-full apple-shadow-xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground uppercase tracking-tight">Novo Ciclo</h3>
              <button onClick={() => setShowNewCycleModal(false)} className="p-2 rounded-xl hover:bg-secondary transition-all">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Nome do Ciclo</label>
                <input
                  type="text"
                  value={newCycleName}
                  onChange={e => setNewCycleName(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary/60 border border-border/60 focus:border-primary rounded-xl text-sm font-medium outline-none transition-all"
                  placeholder="Ex: Ciclo Janeiro 2025"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Período — Início
                </label>
                <input
                  type="date"
                  value={newCyclePeriodFrom}
                  onChange={e => setNewCyclePeriodFrom(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary/60 border border-border/60 focus:border-primary rounded-xl text-sm font-medium outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Período — Fim
                </label>
                <input
                  type="date"
                  value={newCyclePeriodTo}
                  onChange={e => setNewCyclePeriodTo(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary/60 border border-border/60 focus:border-primary rounded-xl text-sm font-medium outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={handleCreateCycle}
                disabled={!newCyclePeriodFrom || !newCyclePeriodTo}
                className="w-full bg-foreground text-background py-4 rounded-2xl font-semibold text-xs uppercase tracking-wider apple-shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                Criar Ciclo
              </button>
              <button
                onClick={() => setShowNewCycleModal(false)}
                className="w-full bg-secondary text-muted-foreground py-4 rounded-2xl font-semibold text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Options Modal */}
      {showPDFModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-foreground/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-3xl p-8 max-w-sm w-full apple-shadow-xl border border-border text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Printer className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground uppercase tracking-tight mb-2">Gerar PDF Geral</h3>
            <p className="text-xs text-muted-foreground mb-8 leading-relaxed font-medium">
              Escolha o tipo de relatório que deseja gerar:
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGenerateConsolidatedPDF}
                disabled={isGeneratingPDF}
                className="w-full bg-foreground text-background py-4 rounded-2xl font-semibold text-xs uppercase tracking-wider apple-shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                Consolidado (todos somados)
              </button>
              <button
                onClick={handleGenerateIndividualPDF}
                disabled={isGeneratingPDF}
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-semibold text-xs uppercase tracking-wider apple-shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Individual (cada ciclo)
              </button>
              <button
                onClick={() => setShowPDFModal(false)}
                className="w-full bg-secondary text-muted-foreground py-4 rounded-2xl font-semibold text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {confirmDelete.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-foreground/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-3xl p-8 max-w-sm w-full apple-shadow-xl text-center border border-border">
            <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-bold text-foreground uppercase tracking-tight mb-2">Eliminar ciclo?</h3>
            <p className="text-xs text-muted-foreground mb-8 leading-relaxed font-medium">
              Todos os dados de <br /><span className="text-destructive font-bold">"{confirmDelete.name}"</span> serão removidos.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={executeDelete} className="w-full bg-destructive text-destructive-foreground py-4 rounded-2xl font-semibold text-xs uppercase tracking-wider apple-shadow-md active:scale-95 transition-all">
                Eliminar Agora
              </button>
              <button onClick={() => setConfirmDelete({ show: false, id: null, name: '' })} className="w-full bg-secondary text-muted-foreground py-4 rounded-2xl font-semibold text-xs uppercase tracking-wider active:scale-95 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CyclesPage;

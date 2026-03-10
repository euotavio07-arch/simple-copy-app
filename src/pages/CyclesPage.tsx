import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, Calendar, Receipt, AlertCircle, Printer, Loader2, ChevronRight, Calculator } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Cycle, DEFAULT_SECTORS } from '@/types/purchases';

const generateId = () => Math.random().toString(36).substring(2, 15);

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const CyclesPage: React.FC = () => {
  const navigate = useNavigate();
  const [cycles, setCycles] = useLocalStorage<Cycle[]>('cycles', []);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; id: string | null; name: string }>({ show: false, id: null, name: '' });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const handleNewCycle = () => {
    const now = new Date();
    const name = `Ciclo ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
    const newCycle: Cycle = {
      id: generateId(),
      name,
      createdAt: now.toISOString(),
      purchases: [],
      companies: [],
      sectors: DEFAULT_SECTORS.map(n => ({ id: generateId(), name: n })),
      purchaseLimit: 120000,
    };
    setCycles(prev => [newCycle, ...prev]);
    navigate(`/cycle/${newCycle.id}`);
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

  const handleGenerateGeneralPDF = async () => {
    const html2pdf = (window as any).html2pdf;
    if (!html2pdf || cycles.length === 0) return;
    setIsGeneratingPDF(true);

    const container = document.createElement('div');
    container.style.width = '210mm';
    container.style.fontFamily = "-apple-system, 'Inter', sans-serif";
    container.style.color = '#1c1c1c';
    container.style.background = '#fff';

    cycles.forEach((cycle, cycleIdx) => {
      const totalSpent = cycle.purchases.reduce((a, p) => a + (p.amount || 0), 0);
      const balance = cycle.purchaseLimit - totalSpent;

      const sectorTotals: Record<string, number> = {};
      cycle.sectors.forEach(s => (sectorTotals[s.name] = 0));
      cycle.purchases.forEach(p => { if (sectorTotals[p.sector] !== undefined) sectorTotals[p.sector] += (p.amount || 0); });

      const sorted = [...cycle.purchases].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      let html = `
        <div style="padding: 24px; ${cycleIdx < cycles.length - 1 ? 'page-break-after: always;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #007AFF; padding-bottom: 12px; margin-bottom: 16px;">
            <div>
              <h2 style="font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0;">${cycle.name}</h2>
              <p style="font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0 0;">Criado em ${new Date(cycle.createdAt).toLocaleDateString('pt-BR')}</p>
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
                <th style="text-align: left; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999; letter-spacing: 1px;">Fornecedor</th>
                <th style="text-align: left; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999; letter-spacing: 1px;">Setor</th>
                <th style="text-align: center; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999; letter-spacing: 1px;">Vencimento</th>
                <th style="text-align: right; padding: 8px 12px; font-size: 7px; text-transform: uppercase; color: #999; letter-spacing: 1px;">Valor</th>
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
      filename: `Relatorio_Geral_${new Date().getTime()}.pdf`,
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
            <div className="bg-foreground p-2.5 rounded-xl apple-shadow-md">
              <Calculator className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Gestor Gerencial</h1>
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">Ciclos de Compras</p>
            </div>
          </div>
          {cycles.length > 1 && (
            <button
              onClick={handleGenerateGeneralPDF}
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
          onClick={handleNewCycle}
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
                        <span className="text-[9px] text-muted-foreground font-medium">{new Date(cycle.createdAt).toLocaleDateString('pt-BR')}</span>
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

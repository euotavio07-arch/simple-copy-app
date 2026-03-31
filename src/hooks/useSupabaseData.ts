import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CycleRow {
  id: string;
  name: string;
  created_at: string;
  period_from: string | null;
  period_to: string | null;
  purchase_limit: number;
}

export interface PurchaseRow {
  id: string;
  cycle_id: string;
  company: string;
  due_date: string;
  amount: number;
  sector: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyRow {
  id: string;
  cycle_id: string;
  name: string;
  last_sector: string | null;
  created_at: string;
}

export interface SectorRow {
  id: string;
  cycle_id: string;
  name: string;
  created_at: string;
}

// Mapped type matching old Cycle interface for backwards compat in UI
export interface CycleWithData extends CycleRow {
  purchases: PurchaseRow[];
  companies: CompanyRow[];
  sectors: SectorRow[];
  purchaseLimit: number;
  periodFrom: string;
  periodTo: string;
  createdAt: string;
}

function mapCycle(c: CycleRow, purchases: PurchaseRow[], companies: CompanyRow[], sectors: SectorRow[]): CycleWithData {
  return {
    ...c,
    purchases: purchases.map(p => ({
      ...p,
      dueDate: p.due_date,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })) as any,
    companies: companies.map(co => ({
      ...co,
      lastSector: co.last_sector,
      createdAt: co.created_at,
    })) as any,
    sectors,
    purchaseLimit: c.purchase_limit,
    periodFrom: c.period_from || '',
    periodTo: c.period_to || '',
    createdAt: c.created_at,
  };
}

export function useCycles() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<CycleWithData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCycles = useCallback(async () => {
    if (!user) { setCycles([]); setLoading(false); return; }
    setLoading(true);
    
    const { data: cycleRows } = await supabase
      .from('cycles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!cycleRows || cycleRows.length === 0) {
      setCycles([]);
      setLoading(false);
      return;
    }

    const cycleIds = cycleRows.map(c => c.id);
    
    const [{ data: allPurchases }, { data: allCompanies }, { data: allSectors }] = await Promise.all([
      supabase.from('purchases').select('*').in('cycle_id', cycleIds),
      supabase.from('companies').select('*').in('cycle_id', cycleIds),
      supabase.from('sectors').select('*').in('cycle_id', cycleIds),
    ]);

    const mapped = cycleRows.map(c => mapCycle(
      c,
      (allPurchases || []).filter(p => p.cycle_id === c.id),
      (allCompanies || []).filter(co => co.cycle_id === c.id),
      (allSectors || []).filter(s => s.cycle_id === c.id),
    ));

    setCycles(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCycles(); }, [fetchCycles]);

  return { cycles, loading, refetch: fetchCycles };
}

export function useCycleActions() {
  const { user } = useAuth();

  const createCycle = async (data: { name: string; periodFrom: string; periodTo: string; purchaseLimit?: number; defaultSectors: string[] }) => {
    if (!user) return null;
    
    const { data: cycle, error } = await supabase
      .from('cycles')
      .insert({
        user_id: user.id,
        name: data.name,
        period_from: data.periodFrom || null,
        period_to: data.periodTo || null,
        purchase_limit: data.purchaseLimit || 120000,
      })
      .select()
      .single();

    if (error || !cycle) return null;

    // Insert default sectors
    if (data.defaultSectors.length > 0) {
      await supabase.from('sectors').insert(
        data.defaultSectors.map(name => ({
          cycle_id: cycle.id,
          user_id: user.id,
          name,
        }))
      );
    }

    return cycle.id;
  };

  const updateCycle = async (id: string, data: { name?: string; periodFrom?: string; periodTo?: string; purchaseLimit?: number }) => {
    if (!user) return;
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.periodFrom !== undefined) update.period_from = data.periodFrom || null;
    if (data.periodTo !== undefined) update.period_to = data.periodTo || null;
    if (data.purchaseLimit !== undefined) update.purchase_limit = data.purchaseLimit;
    
    await supabase.from('cycles').update(update).eq('id', id);
  };

  const deleteCycle = async (id: string) => {
    await supabase.from('cycles').delete().eq('id', id);
  };

  return { createCycle, updateCycle, deleteCycle };
}

export function useCycleData(cycleId: string | undefined) {
  const { user } = useAuth();
  const [cycle, setCycle] = useState<CycleWithData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCycle = useCallback(async () => {
    if (!user || !cycleId) { setCycle(null); setLoading(false); return; }
    setLoading(true);

    const [{ data: cycleRow }, { data: purchases }, { data: companies }, { data: sectors }] = await Promise.all([
      supabase.from('cycles').select('*').eq('id', cycleId).maybeSingle(),
      supabase.from('purchases').select('*').eq('cycle_id', cycleId).order('created_at', { ascending: true }),
      supabase.from('companies').select('*').eq('cycle_id', cycleId),
      supabase.from('sectors').select('*').eq('cycle_id', cycleId).order('name'),
    ]);

    if (!cycleRow) { setCycle(null); setLoading(false); return; }

    setCycle(mapCycle(cycleRow, purchases || [], companies || [], sectors || []));
    setLoading(false);
  }, [user, cycleId]);

  useEffect(() => { fetchCycle(); }, [fetchCycle]);

  // Purchase actions
  const addPurchase = async (data: { company: string; dueDate: string; amount: number; sector: string }) => {
    if (!user || !cycleId) return;
    await supabase.from('purchases').insert({
      cycle_id: cycleId,
      user_id: user.id,
      company: data.company,
      due_date: data.dueDate,
      amount: data.amount,
      sector: data.sector,
    });
    await fetchCycle();
  };

  const updatePurchase = async (id: string, data: { company: string; dueDate: string; amount: number; sector: string }) => {
    if (!user) return;
    await supabase.from('purchases').update({
      company: data.company,
      due_date: data.dueDate,
      amount: data.amount,
      sector: data.sector,
    }).eq('id', id);
    await fetchCycle();
  };

  const deletePurchase = async (id: string) => {
    await supabase.from('purchases').delete().eq('id', id);
    await fetchCycle();
  };

  const clearPurchases = async () => {
    if (!cycleId) return;
    await supabase.from('purchases').delete().eq('cycle_id', cycleId);
    await fetchCycle();
  };

  // Company actions
  const upsertCompany = async (name: string, lastSector: string) => {
    if (!user || !cycleId) return;
    const existing = cycle?.companies.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.last_sector !== lastSector && (existing as any).lastSector !== lastSector) {
        await supabase.from('companies').update({ last_sector: lastSector }).eq('id', existing.id);
      }
    } else {
      await supabase.from('companies').insert({
        cycle_id: cycleId,
        user_id: user.id,
        name,
        last_sector: lastSector,
      });
    }
  };

  const deleteCompany = async (id: string) => {
    await supabase.from('companies').delete().eq('id', id);
    await fetchCycle();
  };

  // Sector actions
  const addSector = async (name: string) => {
    if (!user || !cycleId) return;
    await supabase.from('sectors').insert({
      cycle_id: cycleId,
      user_id: user.id,
      name,
    });
    await fetchCycle();
  };

  const updateSector = async (id: string, name: string) => {
    await supabase.from('sectors').update({ name }).eq('id', id);
    await fetchCycle();
  };

  const deleteSector = async (id: string) => {
    await supabase.from('sectors').delete().eq('id', id);
    await fetchCycle();
  };

  // Limit
  const updateLimit = async (limit: number) => {
    if (!cycleId) return;
    await supabase.from('cycles').update({ purchase_limit: limit }).eq('id', cycleId);
    await fetchCycle();
  };

  return {
    cycle,
    loading,
    refetch: fetchCycle,
    addPurchase,
    updatePurchase,
    deletePurchase,
    clearPurchases,
    upsertCompany,
    deleteCompany,
    addSector,
    updateSector,
    deleteSector,
    updateLimit,
  };
}

export function useAppSettings() {
  const { user } = useAuth();
  const [appName, setAppNameState] = useState('Gestor Gerencial');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('app_settings')
      .select('app_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAppNameState(data.app_name);
        setLoading(false);
      });
  }, [user]);

  const setAppName = async (name: string) => {
    if (!user) return;
    setAppNameState(name);
    const { data } = await supabase
      .from('app_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      await supabase.from('app_settings').update({ app_name: name }).eq('user_id', user.id);
    } else {
      await supabase.from('app_settings').insert({ user_id: user.id, app_name: name });
    }
  };

  return { appName, setAppName, loading };
}

export interface Purchase {
  id: string;
  company: string;
  dueDate: string;
  amount: number;
  sector: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  lastSector?: string;
  createdAt?: string;
}

export interface Sector {
  id: string;
  name: string;
}

export interface FormData {
  company: string;
  dueDate: string;
  amount: string;
  sector: string;
}

export interface Cycle {
  id: string;
  name: string;
  createdAt: string;
  periodFrom: string;
  periodTo: string;
  purchases: Purchase[];
  companies: Company[];
  sectors: Sector[];
  purchaseLimit: number;
}

export const DEFAULT_SECTORS = [
  "Mercearia e Secos",
  "Padaria e Confeitaria",
  "Laticínios e Frios",
  "Hortifruti (FLV)",
  "Açougue / Proteínas",
  "Bebidas",
  "Descartáveis e Embalagens",
  "Limpeza e Higiene",
];

// batchTypes.ts

export interface Fruit {
  name: string;
  amount: number | string;
  unit: string;
}

export interface Malt {
  name: string;
  amount: number | string;
  unit: string;
}

export interface Hop {
  name: string;
  amount: number | string;
  unit: string;
  time: number; // boil time in minutes
}

export interface Ingredient {
  name: string;
  amount: number | string;
  unit: string;
}

export interface Batch {
  id: number;
  user_id: string;
  aktivt_kar: number | null;

  // Basic batch info
  name: string;
  type: string;
  status: "Aktiv" | "Sekundær" | "secondary" | "Ferdig" | "Other";

  // Dates
  startdato: string;
  secondary_startdate?: string;
  created_at: string;

  // Gravity
  og: number;
  fg?: number;

  // Volume
  volume_l: number;

  // Mead fields
  honey_type?: string;
  honey_amount?: number;

  // Fruits (Mead)
  fruits?: Fruit[];

  // Beer fields
  malts?: Malt[];
  hops?: Hop[];
  boil_time?: number;

  // Cider / Wine / Seltzer
  juice_type?: string;
  sugar_amount?: number;

  // Other fields
  ingredients?: Ingredient[];
  steps?: string[];

  // Shared fields
  additives?: string;
  full_process?: string;
  notes?: string;

  // Secondary
  secondary_additions?: string;
  secondary_notes?: string;

  // Calculated values
  ibu?: number | null;
  ebc?: number | null;
}

export interface Recipe {
  id: number;
  user_id: string;

  name: string;
  type: string;

  og: number;
  fg: number;
  abv: number;
  volume: number;

  // Mead
  honey_type?: string;
  honey_amount?: number;
  fruits?: Fruit[];

  // Beer
  malts?: Malt[];
  hops?: Hop[];
  boil_time?: number;

  // Cider / Wine / Seltzer
  juice_type?: string;
  sugar_amount?: number;

  // Other
  ingredients?: Ingredient[];
  steps?: string[];

  // Shared
  additives?: string;
  full_process?: string;
  notes?: string;

  // Visibility
  is_public: boolean;

  created_at: string;
}

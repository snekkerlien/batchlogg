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
  ebc?: number | string;
}

export interface Hop {
  name: string;
  amount: number | string;
  unit: string;
  time: number | string;
  alpha?: number | string;
  year?: number | string | null;
  addition_type?: "boil" | "whirlpool";
  temperature?: number | string;
}

export interface DryHop {
  name: string;
  amount: number | string;
  contact: number | string;
  alpha?: number | string;
  year?: number | string | null;
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
  fg?: number | null;
  abv?: number | null;

  // Volume
  volume_l: number;
  boil_volume_l?: number | null;

  // Mead fields
  base_liquid?: string | null;
  base_liquid_amount?: number | null;
  honey_type?: string;
  honey_amount?: number;

  // Fruits (Mead)
  fruits?: Fruit[];

  // Beer fields
  beer_subtype?: string | null;
  kit_url?: string | null;
  malts?: Malt[];
  hops?: Hop[];
  dry_hops?: DryHop[];
  boil_time?: number;
  yeast?: string | null;

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

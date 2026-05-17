import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VoucherCategory {
  id: string;
  label: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
}

// Fallback used until DB returns (and for SSR/tests). Must mirror voucher_categories seed.
export const DEFAULT_CATEGORIES: VoucherCategory[] = [
  { id: 'alimentacao', label: 'Alimentação', icon: 'utensils', sort_order: 1, active: true },
  { id: 'refeicao', label: 'Refeição', icon: 'coffee', sort_order: 2, active: true },
  { id: 'mobilidade', label: 'Mobilidade', icon: 'bus', sort_order: 3, active: true },
  { id: 'saude', label: 'Saúde', icon: 'heart', sort_order: 4, active: true },
  { id: 'educacao', label: 'Educação', icon: 'book', sort_order: 5, active: true },
  { id: 'cultura', label: 'Cultura', icon: 'film', sort_order: 6, active: true },
];

let cache: VoucherCategory[] | null = null;
let inflight: Promise<VoucherCategory[]> | null = null;

export async function fetchCategories(): Promise<VoucherCategory[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from('voucher_categories')
      .select('id,label,icon,sort_order,active')
      .eq('active', true)
      .order('sort_order');
    if (error || !data || data.length === 0) {
      cache = DEFAULT_CATEGORIES;
    } else {
      cache = data as VoucherCategory[];
    }
    return cache;
  })();
  return inflight;
}

export function categoryLabel(id: string | null | undefined, list?: VoucherCategory[]): string {
  if (!id) return '—';
  const src = list ?? cache ?? DEFAULT_CATEGORIES;
  return src.find(c => c.id === id)?.label ?? id;
}

export function useCategories() {
  const [cats, setCats] = useState<VoucherCategory[]>(cache ?? DEFAULT_CATEGORIES);
  useEffect(() => { fetchCategories().then(setCats); }, []);
  return cats;
}

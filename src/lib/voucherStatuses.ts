import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VoucherStatusId = "active" | "partially_used" | "used" | "expired" | "cancelled";

export interface VoucherStatus {
  id: string;
  label: string;
  tone: "success" | "info" | "muted" | "danger" | "neutral" | string;
  sort_order: number;
  active: boolean;
}

// Fallback used until DB returns. Must mirror voucher_statuses seed.
export const DEFAULT_VOUCHER_STATUSES: VoucherStatus[] = [
  { id: "active",         label: "Ativo",              tone: "success", sort_order: 1, active: true },
  { id: "partially_used", label: "Parcialmente usado", tone: "info",    sort_order: 2, active: true },
  { id: "used",           label: "Usado",              tone: "muted",   sort_order: 3, active: true },
  { id: "expired",        label: "Expirado",           tone: "danger",  sort_order: 4, active: true },
  { id: "cancelled",      label: "Cancelado",          tone: "muted",   sort_order: 5, active: true },
];

let cache: VoucherStatus[] | null = null;

export function useVoucherStatuses() {
  const [statuses, setStatuses] = useState<VoucherStatus[]>(cache ?? DEFAULT_VOUCHER_STATUSES);
  useEffect(() => {
    if (cache) return;
    (async () => {
      const { data } = await supabase
        .from("voucher_statuses")
        .select("id,label,tone,sort_order,active")
        .eq("active", true)
        .order("sort_order");
      if (data && data.length) {
        cache = data as VoucherStatus[];
        setStatuses(cache);
      }
    })();
  }, []);
  return statuses;
}

export function voucherStatusLabel(id?: string | null, list?: VoucherStatus[]): string {
  if (!id) return "—";
  const src = list ?? cache ?? DEFAULT_VOUCHER_STATUSES;
  return src.find(s => s.id === id)?.label ?? id;
}

export function voucherStatusTone(id?: string | null, list?: VoucherStatus[]): string {
  if (!id) return "neutral";
  const src = list ?? cache ?? DEFAULT_VOUCHER_STATUSES;
  return src.find(s => s.id === id)?.tone ?? "neutral";
}

/** Tailwind classes per tone for badges. */
export function toneBadgeClass(tone: string): string {
  switch (tone) {
    case "success": return "bg-green-500/10 text-green-400";
    case "info":    return "bg-blue-500/10 text-blue-400";
    case "danger":  return "bg-destructive/10 text-destructive";
    case "muted":   return "bg-white/5 text-white/40";
    default:        return "bg-white/5 text-white/60";
  }
}

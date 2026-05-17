import { supabase } from '@/integrations/supabase/client';

/**
 * Garante que cada transação tenha `beneficiary_name` preenchido,
 * buscando via vouchers -> profiles quando estiver vazio.
 */
export async function enrichBeneficiaryNames<T extends { voucher_id?: string; beneficiary_name?: string | null }>(
  txs: T[]
): Promise<T[]> {
  const missing = txs.filter(t => !t.beneficiary_name && t.voucher_id);
  if (missing.length === 0) return txs;

  const voucherIds = Array.from(new Set(missing.map(t => t.voucher_id!)));
  const { data: vouchers } = await supabase
    .from('vouchers')
    .select('id, beneficiary_id')
    .in('id', voucherIds);

  const voucherToBenef = new Map<string, string>();
  (vouchers ?? []).forEach((v: any) => v.beneficiary_id && voucherToBenef.set(v.id, v.beneficiary_id));

  const benefIds = Array.from(new Set(Array.from(voucherToBenef.values())));
  if (benefIds.length === 0) return txs;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', benefIds);

  const idToName = new Map<string, string>();
  (profiles ?? []).forEach((p: any) => idToName.set(p.id, p.name));

  return txs.map(t => {
    if (t.beneficiary_name || !t.voucher_id) return t;
    const bId = voucherToBenef.get(t.voucher_id);
    const name = bId ? idToName.get(bId) : undefined;
    return name ? { ...t, beneficiary_name: name } : t;
  });
}

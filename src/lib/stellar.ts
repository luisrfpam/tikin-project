import { supabase } from '@/integrations/supabase/client';

export const STELLAR_PUBLIC_KEY = 'GA77ZOQA43YJIS6NF26UIRB2MH6N4ZMF277XCQSVDNT5YPZQPWPAV27A';

export type StellarEntity = 'voucher' | 'transaction' | 'issuer_funds' | 'issuer_beneficiary' | 'voucher_category' | 'charge';

export interface StellarRegisterArgs {
  internal_id: string;
  entity_type: StellarEntity;
  operation: string;
  amount?: number;
  issuer_id?: string;
}

export interface StellarRegisterResult {
  success: boolean;
  hash?: string | null;
  ledger?: number | null;
  error?: string | null;
  cached?: boolean;
}

export async function registerOnStellar(args: StellarRegisterArgs): Promise<StellarRegisterResult> {
  try {
    const { data, error } = await supabase.functions.invoke('stellar-register', { body: args });
    if (error) return { success: false, error: error.message };
    return data as StellarRegisterResult;
  } catch (e: any) {
    return { success: false, error: String(e?.message ?? e) };
  }
}

export function stellarExplorerUrl(hash: string) {
  // Monta o link de consulta da transacao no Stellar Expert usando o explorer da rede Testnet.
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function shortHash(hash?: string | null, len = 6) {
  if (!hash) return '';
  return `${hash.slice(0, len)}…${hash.slice(-4)}`;
}

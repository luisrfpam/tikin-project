import { supabase } from '@/integrations/supabase/client';

export interface EtherfuseCustomer {
  customer_id: string;
  kyc_status: 'pending' | 'approved' | 'rejected';
  kyc_url: string;
  stellar_public_key: string;
}

export interface OnrampOrder {
  id: string;
  issuer_id: string;
  issuer_funds_id: string | null;
  etherfuse_order_id: string | null;
  amount_brl: number;
  pix_qr: string | null;
  pix_copy_paste: string | null;
  expires_at: string | null;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  stellar_tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

export async function ensureEtherfuseCustomer(): Promise<EtherfuseCustomer> {
  const { data, error } = await supabase.functions.invoke('etherfuse-create-customer', { body: {} });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as EtherfuseCustomer;
}

export async function createOnrampOrder(amountBRL: number, issuerFundsId?: string): Promise<OnrampOrder> {
  const { data, error } = await supabase.functions.invoke('etherfuse-create-onramp', {
    body: { amount_brl: amountBRL, issuer_funds_id: issuerFundsId },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as OnrampOrder;
}

export async function getOrderStatus(orderId: string, force?: 'pay' | 'expire'): Promise<OnrampOrder> {
  const { data, error } = await supabase.functions.invoke('etherfuse-order-status', {
    body: { order_id: orderId, force },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as OnrampOrder;
}

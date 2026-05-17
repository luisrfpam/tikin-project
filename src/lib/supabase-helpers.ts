import { supabase } from '@/integrations/supabase/client';

// Blockchain Mock
export async function mockBlockchainMint(voucherId: string) {
  // Simulates blockchain asset mint for voucher integrity
  const fakeAssetId = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  return { blockchain_asset_id: fakeAssetId, status: 'minted' };
}

// Blockchain Mock - instant settlement
export async function mockBlockchainSettle(transactionId: string, amount: number) {
  // Simulates Blockchain instant settlement callback
  return { tx_id: `TXF-${Date.now()}`, status: 'settled', amount, settled_at: new Date().toISOString() };
}

// Biometry Mock
export async function mockBiometryVerify() {
  // Simulates face liveness + face match
  return new Promise<{ verified: boolean; token: string }>((resolve) => {
    setTimeout(() => {
      resolve({
        verified: true,
        token: `BIO-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      });
    }, 1500);
  });
}

export async function addAuditLog(action: string, entityType: string, entityId?: string, details?: Record<string, string | number | boolean>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('audit_logs').insert([{
    actor_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    details: details ? JSON.parse(JSON.stringify(details)) : null,
  }]);
}

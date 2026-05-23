import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Star, KeyRound, Loader2 } from 'lucide-react';
import { isValidCPF, isValidCNPJ, onlyDigits } from '@/lib/validators';
import { DOC_MESSAGES } from '@/lib/documentMessages';

type KeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
interface PixKey {
  id: string;
  key_type: KeyType;
  key_value: string;
  is_default: boolean;
}

const TYPE_LABEL: Record<KeyType, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  phone: 'Telefone',
  random: 'Chave aleatória',
};

function maskKey(type: KeyType, value: string) {
  if (type === 'cpf' || type === 'cnpj') {
    const d = value.replace(/\D/g, '');
    if (d.length === 11) return `${d.slice(0,3)}.***.***-${d.slice(-2)}`;
    if (d.length === 14) return `${d.slice(0,2)}.***.***/****-${d.slice(-2)}`;
  }
  if (type === 'email') {
    const [u, dom] = value.split('@');
    if (!dom) return value;
    return `${u.slice(0,2)}***@${dom}`;
  }
  if (type === 'phone') {
    const d = value.replace(/\D/g, '');
    return `(${d.slice(0,2)}) *****-${d.slice(-4)}`;
  }
  return `${value.slice(0,4)}…${value.slice(-4)}`;
}

function validate(type: KeyType, value: string): string | null {
  const v = value.trim();
  const digits = onlyDigits(v);
  if (!v) return 'Informe o valor da chave';
  if (type === 'cpf' && (digits.length !== 11 || !isValidCPF(digits))) return DOC_MESSAGES.cpfInvalid;
  if (type === 'cnpj' && (digits.length !== 14 || !isValidCNPJ(digits))) return DOC_MESSAGES.cnpjInvalid;
  if (type === 'email' && !/^\S+@\S+\.\S+$/.test(v)) return 'E-mail inválido';
  if (type === 'phone' && digits.length < 10) return 'Telefone inválido';
  if (type === 'random' && v.length < 8) return 'Chave aleatória muito curta';
  return null;
}

export function MerchantPixKeys({ establishmentId }: { establishmentId: string }) {
  const [keys, setKeys] = useState<PixKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<KeyType>('cpf');
  const [newValue, setNewValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('merchant_pix_keys')
      .select('id, key_type, key_value, is_default')
      .eq('establishment_id', establishmentId)
      .order('created_at', { ascending: true });
    setKeys((data as PixKey[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (establishmentId) load(); }, [establishmentId]);

  const handleAdd = async () => {
    const err = validate(newType, newValue);
    if (err) return toast.error(err);
    const normalized = newValue.trim();
    if (keys.some(k => k.key_value === normalized)) {
      return toast.error('Esta chave já está cadastrada');
    }
    if (keys.length >= 3) return toast.error('Limite de 3 chaves PIX atingido');
    setSaving(true);
    const { error } = await supabase.from('merchant_pix_keys').insert({
      establishment_id: establishmentId,
      key_type: newType,
      key_value: normalized,
      is_default: keys.length === 0, // primeira vira default
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setNewValue(''); setAdding(false);
    toast.success('Chave PIX cadastrada');
    load();
  };

  const handleSetDefault = async (id: string) => {
    setSaving(true);
    // Limpa default atual e seta novo
    await supabase.from('merchant_pix_keys').update({ is_default: false })
      .eq('establishment_id', establishmentId).eq('is_default', true);
    const { error } = await supabase.from('merchant_pix_keys').update({ is_default: true }).eq('id', id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Chave padrão atualizada');
    load();
  };

  const handleDelete = async (id: string, wasDefault: boolean) => {
    if (!confirm('Remover esta chave PIX?')) return;
    setSaving(true);
    const { error } = await supabase.from('merchant_pix_keys').delete().eq('id', id);
    if (!error && wasDefault) {
      const remaining = keys.filter(k => k.id !== id);
      if (remaining[0]) {
        await supabase.from('merchant_pix_keys').update({ is_default: true }).eq('id', remaining[0].id);
      }
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Chave removida');
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-tikin-orange" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-tikin-orange/5 border border-tikin-orange/20 rounded-xl p-3 text-[11px] text-tikin-navy/70">
        Cadastre até 3 chaves PIX. A chave marcada como <strong>padrão</strong> é onde você recebe os pagamentos em Real.
      </div>

      <div className="space-y-2">
        {keys.length === 0 && (
          <p className="text-xs text-tikin-navy/50 text-center py-4">Nenhuma chave cadastrada ainda.</p>
        )}
        {keys.map(k => (
          <div key={k.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F7F8FA]">
            <div className="w-9 h-9 rounded-lg bg-white text-tikin-orange flex items-center justify-center shrink-0">
              <KeyRound size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] font-bold uppercase tracking-wider text-tikin-navy/50">{TYPE_LABEL[k.key_type]}</p>
                {k.is_default && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-tikin-orange text-white text-[9px] font-bold uppercase">
                    <Star size={9} fill="currentColor" /> Padrão
                  </span>
                )}
              </div>
              <p className="text-sm font-mono text-tikin-navy truncate">{maskKey(k.key_type, k.key_value)}</p>
            </div>
            {!k.is_default && (
              <button onClick={() => handleSetDefault(k.id)} disabled={saving}
                className="text-[10px] font-bold text-tikin-orange uppercase">Definir padrão</button>
            )}
            <button onClick={() => handleDelete(k.id, k.is_default)} disabled={saving}
              className="text-destructive/60 hover:text-destructive">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="bg-white border border-tikin-navy/10 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-tikin-navy/50">Tipo</label>
            <select value={newType} onChange={e => setNewType(e.target.value as KeyType)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-sm">
              {(Object.keys(TYPE_LABEL) as KeyType[]).map(t => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-tikin-navy/50">Valor</label>
            <input value={newValue} onChange={e => setNewValue(e.target.value)}
              placeholder={newType === 'email' ? 'voce@empresa.com' : newType === 'phone' ? '+5511999999999' : ''}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setNewValue(''); }}
              className="flex-1 py-2 rounded-lg border border-tikin-navy/10 text-xs font-bold text-tikin-navy/60">CANCELAR</button>
            <button onClick={handleAdd} disabled={saving}
              className="flex-1 py-2 rounded-lg bg-tikin-orange text-white text-xs font-extrabold disabled:opacity-60">
              {saving ? 'SALVANDO...' : 'CADASTRAR'}
            </button>
          </div>
        </div>
      ) : keys.length < 3 ? (
        <button onClick={() => setAdding(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-tikin-orange/40 text-tikin-orange text-sm font-extrabold flex items-center justify-center gap-2">
          <Plus size={16} /> ADICIONAR CHAVE PIX
        </button>
      ) : (
        <p className="text-[11px] text-tikin-navy/40 text-center">Limite de 3 chaves atingido.</p>
      )}
    </div>
  );
}

import { brl } from '@/lib/format';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { MobileNav } from '@/components/layout/MobileNav';
import { QrCode, Check, DollarSign, Zap, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { categoryLabel } from '@/lib/categories';
import { enrichBeneficiaryNames } from '@/lib/enrichTx';
import { toast } from 'sonner';

export default function LojistaHome() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [totalReceived, setTotalReceived] = useState(0);
  const [txs, setTxs] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('active');
  const [hasDefaultPix, setHasDefaultPix] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('establishments').select('id, status').eq('user_id', user.id).single().then(async ({ data: est }) => {
      if (!est) return;
      setStatus((est as any).status || 'active');

      const { count } = await supabase
        .from('merchant_pix_keys')
        .select('id', { count: 'exact', head: true })
        .eq('establishment_id', est.id)
        .eq('is_default', true);
      setHasDefaultPix((count ?? 0) > 0);

      const { data } = await supabase.from('transactions').select('*').eq('establishment_id', est.id).order('created_at', { ascending: false });
      const all = await enrichBeneficiaryNames((data as any[]) ?? []);
      setTxs(all.slice(0, 8));
      setTotalReceived(all.filter(t => t.status === 'confirmed').reduce((s, t) => {
        const sign = t.tx_type === 'debit' ? -1 : 1;
        return s + sign * Number(t.amount);
      }, 0));
    });
  }, [user]);

  const handleChargeNow = () => {
    if (!hasDefaultPix) {
      toast.warning('Para cobrar, cadastre e defina uma chave PIX padrão em Perfil > PIX.');
      return;
    }
    navigate('/lojista/receber');
  };

  return (
    <div className="min-h-screen bg-[#FFFAF5] pb-28">
      {/* Orange topbar */}
      <nav className="bg-tikin-orange px-6 sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 max-w-md mx-auto">
          <img src="/logo-fundo-branco.webp" alt="TIKIN" className="h-6" />
          <button onClick={signOut} className="text-white/70 text-xs font-extrabold">SAIR</button>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-5 py-6 space-y-5">
        {/* Hero recebimentos */}
        <section className="bg-tikin-orange text-white rounded-3xl p-7 relative overflow-hidden shadow-orange">
          <div className="absolute right-3 top-3 opacity-10">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="white">
              <rect x="60" y="20" width="12" height="12"/><rect x="80" y="20" width="12" height="12"/>
              <rect x="40" y="40" width="12" height="12"/><rect x="60" y="40" width="12" height="12"/><rect x="80" y="40" width="12" height="12"/>
              <rect x="20" y="60" width="12" height="12"/><rect x="40" y="60" width="12" height="12"/>
            </svg>
          </div>
          <p className="text-white/60 text-xs font-heading font-extrabold uppercase tracking-widest">Recebido (total)</p>
          <p className="font-heading font-black text-4xl mt-2 leading-none">
            R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex gap-6 mt-5">
            <div>
              <p className="font-heading font-black text-xl">4,5%</p>
              <p className="text-[10px] text-white/60">Taxa fixa</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="font-heading font-black text-xl">{txs.length}</p>
              <p className="text-[10px] text-white/60">Transações</p>
            </div>
          </div>
        </section>

        {/* Status grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Check, label: 'Recebimento', value: 'No ato', color: 'success' },
            { icon: DollarSign, label: 'Taxa', value: '4,5%', color: 'tikin-orange' },
            { icon: Zap, label: 'Próximo crédito', value: 'Imediato', color: 'tikin-navy' },
            { icon: Shield, label: 'Status', value: status === 'active' ? 'Loja ativa' : 'Loja inativa', color: status === 'active' ? 'success' : 'destructive' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-tikin-orange/10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${s.color}/10 text-${s.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-heading font-extrabold uppercase text-tikin-navy/40">{s.label}</p>
                  <p className="font-heading font-black text-sm text-tikin-navy">{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action */}
        <button
          onClick={handleChargeNow}
          aria-disabled={!hasDefaultPix}
          className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-heading font-extrabold shadow-elevated transition-opacity ${
            hasDefaultPix
              ? 'bg-tikin-navy text-white'
              : 'bg-tikin-navy/40 text-white cursor-not-allowed'
          }`}
        >
          <QrCode size={24} /> COBRAR AGORA
        </button>
        {!hasDefaultPix && (
          <p className="text-xs text-tikin-navy/60 text-center -mt-2">
            Cadastre uma chave PIX padrão no Perfil para habilitar cobranças.
          </p>
        )}

        {/* Recent */}
        <section className="bg-white rounded-2xl p-5 border border-tikin-orange/10">
          <h2 className="font-heading font-extrabold text-tikin-navy text-sm uppercase tracking-wider mb-3">Recebimentos recentes</h2>
          {txs.length === 0 && <p className="text-sm text-tikin-navy/50">Nenhum recebimento ainda.</p>}
          <div className="divide-y divide-tikin-orange/5">
            {txs.map(t => {
              const isCredit = t.tx_type !== 'debit';
              return (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isCredit ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}>
                      <Check size={16} />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-tikin-navy text-sm">{t.beneficiary_name || 'Beneficiário'}</p>
                      <p className="text-xs text-tikin-navy/40">
                        {categoryLabel(t.voucher_category) || 'Geral'} · {format(new Date(t.created_at), 'dd/MM HH:mm')}
                      </p>
                    </div>
                  </div>
                  <span className={`font-heading font-black ${isCredit ? 'text-success' : 'text-destructive'}`}>
                    {isCredit ? '+' : '-'} R$ {brl(Number(t.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

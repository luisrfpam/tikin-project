import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { MobileNav } from '@/components/layout/MobileNav';
import { User, Mail, Building, Shield, MapPin, Phone, Clock, Tag, Lock, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { categoryLabel } from '@/lib/categories';
import { formatCnpj } from '@/lib/utils';
import { MerchantPixKeys } from '@/components/MerchantPixKeys';


interface Establishment {
  id: string;
  name: string;
  trade_name: string | null;
  cnpj: string;
  cnae: string;
  cnae_validated: boolean;
  category: string | null;
  accepted_categories: string[];
  phone: string | null;
  contact_email: string | null;
  opening_hours: string | null;
  status: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}

export default function LojistaPerfil() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'dados' | 'estabelecimento' | 'pix' | 'senha'>('dados');
  const [est, setEst] = useState<Establishment | null>(null);
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('establishments').select('*').eq('user_id', user.id).single()
      .then(({ data }) => setEst(data as any));
  }, [user]);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd1.length < 6) return toast.error('Mínimo 6 caracteres');
    if (pwd1 !== pwd2) return toast.error('As senhas não coincidem');
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd1 });
    setSaving(false);
    if (error) return toast.error(error.message);
    setPwd1(''); setPwd2('');
    toast.success('Senha alterada com sucesso');
  };

  const initials = (profile?.name || 'L').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const fullAddress = est ? [est.logradouro, est.numero, est.complemento, est.bairro, est.cidade && est.uf ? `${est.cidade}/${est.uf}` : null, est.cep].filter(Boolean).join(', ') : '';

  return (
    <div className="min-h-screen bg-[#FFFAF5] pb-28">
      <nav className="bg-tikin-orange px-6 sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 max-w-md mx-auto">
          <button onClick={() => navigate('/lojista')} className="text-white"><ArrowLeft size={22} /></button>
          <img src="/logo-fundo-branco.webp" alt="TIKIN" className="h-6" />
          <button onClick={signOut} className="text-white/70 text-xs font-extrabold">SAIR</button>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-5 py-6 space-y-4">
        <div className="bg-white rounded-2xl p-6 text-center shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tikin-orange to-tikin-navy text-white flex items-center justify-center font-heading font-black text-lg mx-auto mb-3">
            {initials}
          </div>
          <p className="font-heading font-black text-tikin-navy">{est?.trade_name || est?.name || profile?.name}</p>
          <p className="text-xs text-tikin-navy/50">{profile?.email}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
            est?.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}>
            Loja {est?.status === 'active' ? 'ativa' : 'inativa'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-1 flex shadow-card text-[11px] font-bold">
          {(['dados', 'estabelecimento', 'pix', 'senha'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl capitalize ${tab === t ? 'bg-tikin-navy text-white' : 'text-tikin-navy/50'}`}>
              {t === 'pix' ? 'PIX' : t}
            </button>
          ))}
        </div>


        {tab === 'dados' && (
          <div className="bg-white rounded-2xl p-6 space-y-4 shadow-card">
            <Row icon={<User size={16} />} label="Responsável" value={profile?.name || '—'} />
            <Row icon={<Mail size={16} />} label="E-mail" value={profile?.email || '—'} />
            <Row icon={<Building size={16} />} label="CNPJ" value={formatCnpj(profile?.cnpj || est?.cnpj)} />
          </div>
        )}

        {tab === 'estabelecimento' && est && (
          <div className="bg-white rounded-2xl p-6 space-y-4 shadow-card">
            <Row icon={<Building size={16} />} label="Razão social" value={est.name} />
            <Row icon={<Building size={16} />} label="Nome fantasia" value={est.trade_name || '—'} />
            <Row icon={<Tag size={16} />} label="Categoria" value={categoryLabel(est.category)} />
            <Row icon={<Shield size={16} />} label="CNAE" value={`${est.cnae} ${est.cnae_validated ? '✓' : ''}`} />
            <Row icon={<Phone size={16} />} label="Telefone" value={est.phone || '—'} />
            <Row icon={<Mail size={16} />} label="E-mail comercial" value={est.contact_email || '—'} />
            <Row icon={<Clock size={16} />} label="Horário" value={est.opening_hours || '—'} />
            <Row icon={<MapPin size={16} />} label="Endereço" value={fullAddress || '—'} />
            <div>
              <p className="text-[10px] font-bold text-tikin-navy/40 uppercase tracking-wider mb-2">Vouchers aceitos</p>
              <div className="flex flex-wrap gap-2">
                {(est.accepted_categories || []).map(c => (
                  <span key={c} className="px-3 py-1 rounded-full bg-tikin-orange/10 text-tikin-orange text-[11px] font-bold">{categoryLabel(c)}</span>
                ))}
                {(!est.accepted_categories || est.accepted_categories.length === 0) && (
                  <span className="text-xs text-tikin-navy/40">Nenhum tipo configurado.</span>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'pix' && est && (
          <div className="bg-white rounded-2xl p-6 shadow-card">
            <MerchantPixKeys establishmentId={est.id} />
          </div>
        )}



        {tab === 'senha' && (
          <form onSubmit={changePassword} className="bg-white rounded-2xl p-6 space-y-4 shadow-card">
            <p className="text-xs text-tikin-navy/60">Defina uma nova senha (mínimo 6 caracteres).</p>
            <div>
              <label className="text-[11px] font-bold text-tikin-navy/50 uppercase tracking-wider">Nova senha</label>
              <input type="password" value={pwd1} onChange={e => setPwd1(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-tikin-navy/50 uppercase tracking-wider">Confirmar</label>
              <input type="password" value={pwd2} onChange={e => setPwd2(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] text-sm" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-tikin-orange text-white py-3 rounded-xl font-heading font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              <Lock size={16} /> {saving ? 'SALVANDO...' : 'ALTERAR SENHA'}
            </button>
          </form>
        )}

        <button onClick={signOut} className="w-full bg-white py-3 rounded-xl border border-destructive/20 text-destructive font-heading font-extrabold text-sm flex items-center justify-center gap-2">
          <LogOut size={16} /> SAIR DA CONTA
        </button>
      </main>
      <MobileNav />
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-tikin-navy/40 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-tikin-navy/40 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-sm text-tikin-navy break-words">{value}</p>
      </div>
    </div>
  );
}

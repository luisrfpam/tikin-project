import { brl } from '@/lib/format';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { User, Mail, CreditCard, Phone, Lock, Heart, Wallet, ChevronRight, LogOut, ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { categoryLabel } from '@/lib/categories';
import { voucherStatusLabel, voucherStatusTone } from '@/lib/voucherStatuses';
import { formatCpf } from '@/lib/utils';

interface Voucher { id: string; remaining_value: number; value: number; rules: any; status: string; expiration_date: string; }
interface Fav { establishment_id: string; establishments: { name: string; category: string|null; address: string|null }; }

export default function BeneficiarioPerfil() {
  const { profile, user, signOut } = useAuth();
  const [tab, setTab] = useState<'dados'|'senha'|'saldos'|'favoritos'>('dados');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [favs, setFavs] = useState<Fav[]>([]);
  const [phone, setPhone] = useState('');
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailCat, setDetailCat] = useState<string | null>(null);
  const [detailStatus, setDetailStatus] = useState<'all'|'active'|'partially_used'|'used'|'expired'|'cancelled'>('all');
  const [detailSearch, setDetailSearch] = useState('');
  const [detailPage, setDetailPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    if (!user) return;
    supabase.from('vouchers').select('id, value, remaining_value, rules, status, expiration_date')
      .eq('beneficiary_id', user.id).then(({ data }) => setVouchers((data as any) ?? []));
    (supabase.from as any)('favorites')
      .select('establishment_id, establishments(name, category, address)')
      .eq('beneficiary_id', user.id)
      .then(({ data }: any) => setFavs(data ?? []));
    supabase.from('profiles').select('phone').eq('id', user.id).single().then(({ data }: any) => {
      if (data?.phone) setPhone(data.phone);
    });
  }, [user]);

  // group balances by category
  const balanceByType: Record<string, number> = {};
  vouchers.filter(v => v.status === 'active' || v.status === 'partially_used').forEach(v => {
    const c = (v.rules?.category as string) || 'geral';
    balanceByType[c] = (balanceByType[c] || 0) + Number(v.remaining_value);
  });
  const totalBalance = Object.values(balanceByType).reduce((s,n)=>s+n,0);

  const savePhone = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ phone }).eq('id', user.id);
    setSaving(false);
    if (error) return toast.error('Erro ao salvar');
    toast.success('Telefone atualizado');
  };

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

  const removeFav = async (id: string) => {
    await (supabase.from as any)('favorites').delete().eq('beneficiary_id', user!.id).eq('establishment_id', id);
    setFavs(favs.filter(f => f.establishment_id !== id));
  };

  const initials = (profile?.name || 'U').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-28">
      <AppHeader variant="navy" />
      <main className="max-w-md mx-auto px-5 py-6 space-y-4">
        <div className="bg-white rounded-2xl p-6 text-center shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tikin-navy to-tikin-orange text-white flex items-center justify-center font-heading font-black text-lg mx-auto mb-3">
            {initials}
          </div>
          <p className="font-heading font-black text-tikin-navy">{profile?.name}</p>
          <p className="text-xs text-tikin-navy/50">{profile?.email}</p>
          <p className="text-[10px] text-tikin-navy/30 mt-1">CPF: {formatCpf(profile?.cpf)}</p>
        </div>

        <div className="bg-white rounded-2xl p-1 flex shadow-card text-xs font-bold">
          {(['dados','senha','saldos','favoritos'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl capitalize ${tab===t?'bg-tikin-navy text-white':'text-tikin-navy/50'}`}>{t}</button>
          ))}
        </div>

        {tab === 'dados' && (
          <div className="bg-white rounded-2xl p-6 space-y-4 shadow-card">
            <Row icon={<User size={16} />} label="Nome" value={profile?.name || '—'} />
            <Row icon={<Mail size={16} />} label="E-mail" value={profile?.email || '—'} />
            <Row icon={<CreditCard size={16} />} label="CPF" value={formatCpf(profile?.cpf)} />
            <div>
              <label className="flex items-center gap-2 text-[11px] font-bold text-tikin-navy/50 uppercase tracking-wider mb-1">
                <Phone size={14} /> Telefone
              </label>
              <div className="flex gap-2">
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] text-sm" />
                <button onClick={savePhone} disabled={saving}
                  className="px-4 bg-tikin-orange text-white rounded-xl text-xs font-extrabold">SALVAR</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'senha' && (
          <form onSubmit={changePassword} className="bg-white rounded-2xl p-6 space-y-4 shadow-card">
            <p className="text-xs text-tikin-navy/60">Defina uma nova senha (mínimo 6 caracteres).</p>
            <div>
              <label className="text-[11px] font-bold text-tikin-navy/50 uppercase tracking-wider">Nova senha</label>
              <input type="password" value={pwd1} onChange={e=>setPwd1(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-tikin-navy/50 uppercase tracking-wider">Confirmar</label>
              <input type="password" value={pwd2} onChange={e=>setPwd2(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] text-sm" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-tikin-orange text-white py-3 rounded-xl font-heading font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              <Lock size={16} /> {saving?'SALVANDO...':'ALTERAR SENHA'}
            </button>
          </form>
        )}

        {tab === 'saldos' && !detailCat && (
          <div className="bg-white rounded-2xl p-6 space-y-3 shadow-card">
            <div className="text-center mb-2">
              <p className="text-[10px] text-tikin-navy/40 font-bold uppercase">Saldo total ativo</p>
              <p className="font-heading text-3xl font-black text-tikin-navy">R$ {brl(totalBalance)}</p>
            </div>
            {Object.keys(balanceByType).length === 0 && (
              <p className="text-center text-sm text-tikin-navy/50">Nenhum saldo ativo.</p>
            )}
            {Object.entries(balanceByType).map(([cat, val]) => (
              <button
                key={cat}
                onClick={() => { setDetailCat(cat); setDetailStatus('all'); setDetailSearch(''); setDetailPage(1); }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F7F8FA] hover:bg-tikin-navy/5 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-tikin-orange/10 text-tikin-orange flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-tikin-navy">{categoryLabel(cat)}</p>
                    <p className="text-[10px] text-tikin-navy/40 font-bold uppercase tracking-wider">Ver detalhes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-heading font-black text-tikin-navy text-sm">R$ {brl(val)}</p>
                  <ChevronRight size={16} className="text-tikin-navy/40" />
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'saldos' && detailCat && (() => {
          const all = vouchers.filter(v => ((v.rules?.category as string) || 'geral') === detailCat);
          const filtered = all
            .filter(v => detailStatus === 'all' || v.status === detailStatus)
            .filter(v => !detailSearch || format(new Date(v.expiration_date), 'dd/MM/yyyy').includes(detailSearch));
          const total = filtered.reduce((s, v) => s + Number(v.remaining_value), 0);
          const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
          const page = Math.min(detailPage, totalPages);
          const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
          const statuses: Array<{ id: typeof detailStatus; label: string }> = [
            { id: 'all', label: 'Todos' },
            { id: 'active', label: 'Ativos' },
            { id: 'partially_used', label: 'Parciais' },
            { id: 'used', label: 'Usados' },
            { id: 'expired', label: 'Expirados' },
            { id: 'cancelled', label: 'Cancelados' },
          ];
          return (
            <div className="bg-white rounded-2xl p-5 space-y-4 shadow-card">
              <button onClick={() => setDetailCat(null)} className="flex items-center gap-1 text-xs font-bold text-tikin-navy/60">
                <ArrowLeft size={14} /> VOLTAR
              </button>
              <div>
                <p className="text-[10px] text-tikin-navy/40 font-bold uppercase tracking-wider">Detalhes da categoria</p>
                <p className="font-heading text-xl font-black text-tikin-navy">{categoryLabel(detailCat)}</p>
                <p className="text-xs text-tikin-navy/60 mt-1">
                  {filtered.length} voucher{filtered.length === 1 ? '' : 's'} · Saldo filtrado <span className="font-bold text-tikin-navy">R$ {brl(total)}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F7F8FA]">
                <Search size={14} className="text-tikin-navy/40" />
                <input
                  value={detailSearch}
                  onChange={e => { setDetailSearch(e.target.value); setDetailPage(1); }}
                  placeholder="Buscar por data (dd/mm/aaaa)"
                  className="flex-1 bg-transparent text-xs text-tikin-navy outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {statuses.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setDetailStatus(s.id); setDetailPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${detailStatus === s.id ? 'bg-tikin-navy text-white' : 'bg-[#F7F8FA] text-tikin-navy/60'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="divide-y divide-tikin-navy/5">
                {pageItems.length === 0 && (
                  <p className="text-center text-xs text-tikin-navy/40 py-6">Nenhum voucher encontrado com esses filtros.</p>
                )}
                {pageItems.map(v => {
                  const tone = voucherStatusTone(v.status);
                  const cls = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-destructive' : tone === 'info' ? 'text-blue-500' : 'text-tikin-navy/40';
                  return (
                    <div key={v.id} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-tikin-navy">R$ {brl(Number(v.remaining_value))}</p>
                        <p className="text-[10px] text-tikin-navy/50">
                          de R$ {brl(Number(v.value))} · val. {format(new Date(v.expiration_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <span className={`text-[11px] font-bold ${cls}`}>{voucherStatusLabel(v.status)}</span>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-tikin-navy/5">
                  <button
                    onClick={() => setDetailPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg bg-[#F7F8FA] text-xs font-bold text-tikin-navy disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-[11px] font-bold text-tikin-navy/60">Página {page} de {totalPages}</span>
                  <button
                    onClick={() => setDetailPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg bg-[#F7F8FA] text-xs font-bold text-tikin-navy disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {tab === 'favoritos' && (
          <div className="bg-white rounded-2xl shadow-card divide-y divide-tikin-navy/5">
            {favs.length === 0 && (
              <p className="p-8 text-center text-sm text-tikin-navy/50">
                Nenhum favorito ainda. Marque ❤ em "Onde usar".
              </p>
            )}
            {favs.map(f => (
              <div key={f.establishment_id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-bold text-tikin-navy text-sm truncate">{f.establishments?.name}</p>
                  <p className="text-[11px] text-tikin-navy/50 truncate">{f.establishments?.category} · {f.establishments?.address}</p>
                </div>
                <button onClick={() => removeFav(f.establishment_id)} className="text-tikin-orange">
                  <Heart size={16} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
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
    <div className="flex items-center gap-3">
      <div className="text-tikin-navy/40">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-tikin-navy/40 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-sm text-tikin-navy truncate">{value}</p>
      </div>
    </div>
  );
}

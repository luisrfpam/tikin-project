import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, DollarSign, Search, X, ChevronLeft, Power, Receipt, Wallet } from 'lucide-react';
import { EmissorLayout } from './EmissorLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { maskCpf, fmtBRL, formatCpfInput, isValidCpf, isValidEmail, formatBRLInput, parseBRLInput, onlyDigits } from '@/lib/utils';
import { format, subDays, parseISO, startOfMonth } from 'date-fns';
import { useCategories, categoryLabel } from '@/lib/categories';
import { useVoucherStatuses, voucherStatusLabel, voucherStatusTone, toneBadgeClass } from '@/lib/voucherStatuses';
import { registerOnStellar } from '@/lib/stellar';
import { StellarHashLink } from '@/components/StellarHashLink';

interface IssuerRow { id: string; company_name: string; }
interface BenefRow { id: string; name: string; cpf_masked: string; status: 'active' | 'inactive'; }
interface LinkRow { beneficiary_id: string; status: 'active' | 'inactive'; }
interface Voucher { id: string; beneficiary_id: string | null; value: number; remaining_value: number; status: string; rules: any; expiration_date: string; created_at: string; }
interface Tx { id: string; amount: number; created_at: string; voucher_category: string | null; tx_type: string; status: string; voucher_id: string; }
interface FundRow {
  id: string;
  month: string;
  monthly_budget: number;
  allocated: number;
  category_caps?: Record<string, number> | null;
  category_allocated?: Record<string, number> | null;
}

const PERIODS = [5, 10, 15, 30, 90];

export default function EmissorBeneficiarios() {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [issuer, setIssuer] = useState<IssuerRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [benefs, setBenefs] = useState<BenefRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [fund, setFund] = useState<FundRow | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [showNew, setShowNew] = useState(false);
  const [showAddSaldo, setShowAddSaldo] = useState<boolean | { id: string; name: string }>(false);
  const [extratoOf, setExtratoOf] = useState<{ id: string; name: string } | null>(null);
  const [saldoOf, setSaldoOf] = useState<{ id: string; name: string; saldo: number } | null>(null);

  useEffect(() => { if (user) loadAll(); }, [user]);

  async function loadAll() {
    setLoading(true);
    const { data: iss } = await supabase.from('issuers').select('id,company_name').eq('user_id', user!.id).maybeSingle();
    if (!iss) { setLoading(false); return; }
    setIssuer(iss);

    const month = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const [{ data: lks }, { data: vs }, { data: fs }, { data: bs }] = await Promise.all([
      supabase.from('issuer_beneficiaries').select('beneficiary_id,status').eq('issuer_id', iss.id),
      supabase.from('vouchers').select('id,beneficiary_id,value,remaining_value,status,rules,expiration_date,created_at').eq('issuer_id', iss.id),
      supabase.from('issuer_funds').select('*').eq('issuer_id', iss.id).eq('month', month).maybeSingle(),
      supabase.rpc('get_issuer_beneficiaries', { _issuer_id: iss.id }),
    ]);
    setLinks((lks as LinkRow[]) || []);
    setVouchers((vs as Voucher[]) || []);
    setFund((fs as FundRow) || null);
    setBenefs((bs as BenefRow[]) || []);

    setLoading(false);
  }

  const rows = useMemo(() => {
    const byId = new Map(benefs.map(b => [b.id, b]));
    return links.map(l => {
      const b = byId.get(l.beneficiary_id);
      const saldo = vouchers
        .filter(v => v.beneficiary_id === l.beneficiary_id && v.status !== 'expired')
        .reduce((s, v) => s + Number(v.remaining_value), 0);
      return {
        id: l.beneficiary_id,
        name: b?.name || '—',
        cpfMasked: b?.cpf_masked || '—',
        status: l.status,
        saldo,
      };
    }).filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase().replace(/\D/g, '');
        const txt = search.toLowerCase();
        const cpfDigits = r.cpfMasked.replace(/\D/g, '');
        if (!r.name.toLowerCase().includes(txt) && !(q && cpfDigits.includes(q))) return false;
      }
      return true;
    });
  }, [links, benefs, vouchers, search, statusFilter]);

  const fundDisponivel = fund ? Number(fund.monthly_budget) - Number(fund.allocated) : 0;

  async function toggleStatus(beneficiary_id: string, status: 'active' | 'inactive') {
    if (!issuer) return;
    const next = status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('issuer_beneficiaries').update({ status: next }).eq('issuer_id', issuer.id).eq('beneficiary_id', beneficiary_id);
    if (error) toast.error(error.message); else { toast.success(`Beneficiário ${next === 'active' ? 'ativado' : 'inativado'}`); loadAll(); }
  }

  if (loading) return <div className="min-h-screen bg-tikin-navy flex items-center justify-center"><Loader2 className="text-tikin-orange animate-spin" /></div>;

  return (
    <EmissorLayout title="Gestão de Beneficiários" subtitle={issuer?.company_name}>
      <div className="p-4 sm:p-8 space-y-5">
        {/* Fundos */}
        <div className="grid sm:grid-cols-4 gap-3">
          <KCard label="Orçamento do mês" value={`R$ ${fmtBRL(fund?.monthly_budget || 0)}`} />
          <KCard label="Alocado no mês" value={`R$ ${fmtBRL(fund?.allocated || 0)}`} />
          <KCard label="Disponível" value={`R$ ${fmtBRL(fundDisponivel)}`} accent />
          <button onClick={() => navigate('/emissor/fundos')} className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-5 flex flex-col items-start justify-between text-left">
            <Wallet size={18} className="text-tikin-orange" />
            <span className="font-heading font-black text-sm">Gerenciar fundos</span>
          </button>
        </div>

        {/* Filters + actions */}
        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex gap-3 flex-1 min-w-0">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CPF…" className="pl-9 bg-white/5 border-white/10 text-white" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="h-10 rounded-md bg-[#0A1530] border border-white/10 px-3 text-sm text-white">
              <option value="all" className="bg-[#0A1530]">Status: Todos</option>
              <option value="active" className="bg-[#0A1530]">Ativos</option>
              <option value="inactive" className="bg-[#0A1530]">Inativos</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddSaldo(true)} className="px-4 rounded-xl border border-tikin-orange/30 bg-tikin-orange/10 text-tikin-orange font-heading font-extrabold text-xs flex items-center gap-2">
              <DollarSign size={14} /> ADICIONAR SALDO (CPF)
            </button>
            <button onClick={() => setShowNew(true)} className="px-5 rounded-xl bg-tikin-orange text-white font-heading font-extrabold text-xs flex items-center gap-2">
              <Plus size={14} /> NOVO BENEFICIÁRIO
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] border-b border-white/10">
              <tr className="text-[10px] font-bold uppercase text-white/40">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">CPF</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Saldo disponível</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-white/40">Nenhum beneficiário</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-6 py-4 text-sm font-semibold">{r.name}</td>
                  <td className="px-6 py-4 text-xs text-white/60 font-mono">{r.cpfMasked}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${r.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
                      {r.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSaldoOf({ id: r.id, name: r.name, saldo: r.saldo })}
                      title="Ver detalhe do saldo"
                      className="text-sm font-heading font-black text-right hover:text-tikin-orange transition underline-offset-4 hover:underline"
                    >
                      R$ {fmtBRL(r.saldo)}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button title="Adicionar voucher" onClick={() => setShowAddSaldo({ id: r.id, name: r.name })} className="p-2 rounded-md bg-white/5 hover:bg-white/10 text-tikin-orange"><Plus size={14} /></button>
                      <button title={r.status === 'active' ? 'Inativar' : 'Ativar'} onClick={() => toggleStatus(r.id, r.status)} className="p-2 rounded-md bg-white/5 hover:bg-white/10"><Power size={14} className={r.status === 'active' ? 'text-green-400' : 'text-white/40'} /></button>
                      <button title="Ver extrato" onClick={() => setExtratoOf({ id: r.id, name: r.name })} className="p-2 rounded-md bg-white/5 hover:bg-white/10"><Receipt size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && <NovoBeneficiarioModal issuerId={issuer?.id || ''} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); loadAll(); }} />}
      {showAddSaldo && (
        <AddSaldoModal
          issuerId={issuer?.id || ''}
          fundDisponivel={fundDisponivel}
          fundCategoryCaps={fund?.category_caps || null}
          fundCategoryAllocated={fund?.category_allocated || null}
          prefill={typeof showAddSaldo === 'object' ? showAddSaldo : null}
          onClose={() => setShowAddSaldo(false)}
          onDone={() => { setShowAddSaldo(false); loadAll(); }}
        />
      )}
      {extratoOf && issuer && <ExtratoModal issuerId={issuer.id} beneficiary={extratoOf} onClose={() => setExtratoOf(null)} />}
      {saldoOf && <SaldoDetailModal beneficiary={saldoOf} vouchers={vouchers.filter(v => v.beneficiary_id === saldoOf.id && v.status !== 'expired')} onClose={() => setSaldoOf(null)} />}
    </EmissorLayout>
  );
}

function KCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? 'bg-tikin-orange/10 border-tikin-orange/30' : 'bg-white/5 border-white/10'}`}>
      <p className="text-[10px] font-heading font-bold uppercase tracking-widest text-white/40">{label}</p>
      <p className={`font-heading font-black text-xl mt-2 ${accent ? 'text-tikin-orange' : ''}`}>{value}</p>
    </div>
  );
}

function Modal({ children, onClose, title, subtitle }: { children: React.ReactNode; onClose: () => void; title: string; subtitle?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F1729] border border-white/10 rounded-3xl w-full max-w-lg p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="font-heading font-black text-lg">{title}</h2>
            {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NovoBeneficiarioModal({ issuerId, onClose, onDone }: { issuerId: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(''); const [cpf, setCpf] = useState(''); const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 3) return toast.error('Nome inválido');
    if (!isValidCpf(cpf)) return toast.error('CPF inválido');
    if (!isValidEmail(email)) return toast.error('E-mail inválido');
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('create-beneficiary', { body: { name: name.trim(), cpf: onlyDigits(cpf), email: email.trim().toLowerCase() } });
    if (error || (data as any)?.error) { setLoading(false); toast.error((data as any)?.error || error?.message || 'Erro'); return; }
    // Register beneficiary lifecycle on Stellar using issuer_beneficiaries row id.
    const issuerBeneficiaryId = (data as any).issuer_beneficiary_id as string | null;
    const wasCreated = Boolean((data as any).created);
    if (issuerBeneficiaryId) {
      const ops = wasCreated ? ['create_beneficiary', 'link_beneficiary'] : ['link_beneficiary'];
      let okCount = 0;
      for (const op of ops) {
        const r = await registerOnStellar({
          internal_id: issuerBeneficiaryId,
          entity_type: 'issuer_beneficiary',
          operation: op,
          issuer_id: issuerId || undefined,
        });
        if (r.success) okCount += 1;
      }
      if (okCount > 0) {
        toast.success(wasCreated
          ? 'Cadastro e vínculo do beneficiário registrados na Stellar'
          : 'Vínculo do beneficiário registrado na Stellar');
      }
    }
    setLoading(false);
    setTempPwd((data as any).temp_password || null);
    setCreated(true);
    toast.success((data as any).created ? 'Beneficiário cadastrado' : 'Beneficiário vinculado');
  }

  if (created) {
    return (
      <Modal onClose={() => { onDone(); }} title="Beneficiário cadastrado!" subtitle="">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          {tempPwd ? (
            <>
              <p className="text-sm text-white/70 mb-3">Senha temporária gerada. Envie ao beneficiário com segurança — ele deverá trocá-la no primeiro login:</p>
              <div className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 font-mono text-lg font-black tracking-widest text-tikin-orange mb-4 select-all">{tempPwd}</div>
              <button onClick={() => { navigator.clipboard.writeText(tempPwd); toast.success('Senha copiada'); }} className="text-xs underline text-white/60 mb-4">Copiar senha</button>
            </>
          ) : (
            <p className="text-sm text-white/70 mb-4">Beneficiário já existente foi vinculado a este emissor.</p>
          )}
          <button onClick={onDone} className="w-full py-3 bg-tikin-orange rounded-xl font-heading font-black">FECHAR</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Novo Beneficiário">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label className="text-[10px] uppercase text-white/40 font-bold">Nome completo</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: João da Silva" className="bg-white/5 border-white/10 text-white mt-2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] uppercase text-white/40 font-bold">CPF</Label>
            <Input value={cpf} onChange={e => setCpf(formatCpfInput(e.target.value))} required inputMode="numeric" maxLength={14} placeholder="000.000.000-00" className="bg-white/5 border-white/10 text-white mt-2" />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-white/40 font-bold">E-mail</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@empresa.com" className="bg-white/5 border-white/10 text-white mt-2" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-4 bg-tikin-orange rounded-xl font-heading font-black flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />} CADASTRAR BENEFICIÁRIO
        </button>
      </form>
    </Modal>
  );
}

function AddSaldoModal({
  issuerId,
  fundDisponivel,
  fundCategoryCaps,
  fundCategoryAllocated,
  prefill,
  onClose,
  onDone,
}: {
  issuerId: string;
  fundDisponivel: number;
  fundCategoryCaps?: Record<string, number> | null;
  fundCategoryAllocated?: Record<string, number> | null;
  prefill?: { id: string; name: string } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const cats = useCategories();
  const [cpf, setCpf] = useState(''); const [value, setValue] = useState(''); const [category, setCategory] = useState('alimentacao'); const [expDate, setExpDate] = useState('');
  const [loading, setLoading] = useState(false); const [done, setDone] = useState(false);
  const [benefName, setBenefName] = useState<string>('');
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');

  // Prefill CPF + name when opened from a beneficiary row
  useEffect(() => {
    if (!prefill?.id || !issuerId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc('get_issuer_beneficiary_cpf', { _issuer_id: issuerId, _beneficiary_id: prefill.id });
      if (cancelled || !data) return;
      setCpf(formatCpfInput(data as string));
      setBenefName(prefill.name);
      setLookupState('found');
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.id, issuerId]);

  useEffect(() => {
    const digits = onlyDigits(cpf);
    if (digits.length !== 11) { setBenefName(''); setLookupState('idle'); return; }
    let cancelled = false;
    setLookupState('loading');
    (async () => {
      const { data, error } = await supabase.rpc('lookup_beneficiary_name_by_cpf', { _cpf: digits });
      if (cancelled) return;
      if (error || !data) { setBenefName(''); setLookupState('notfound'); }
      else { setBenefName(data as string); setLookupState('found'); }
    })();
    return () => { cancelled = true; };
  }, [cpf]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (onlyDigits(cpf).length !== 11) return toast.error('Informe um CPF com 11 dígitos');
    if (lookupState !== 'found') return toast.error('Beneficiário não cadastrado. Cadastre antes em "Novo Beneficiário".');
    const val = parseBRLInput(value);
    if (!(val > 0)) return toast.error('Valor inválido');
    if (val > fundDisponivel) return toast.error('Valor maior que o disponível no mês');

    const catCap = Number(fundCategoryCaps?.[category] || 0);
    const catAllocated = Number(fundCategoryAllocated?.[category] || 0);
    const catRemaining = Math.max(0, catCap - catAllocated);
    if (catCap > 0 && val > catRemaining) {
      return toast.error(`Limite da categoria excedido. Disponível em ${categoryLabel(category, cats)}: R$ ${fmtBRL(catRemaining)}`);
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('add-voucher-to-beneficiary', {
      body: { cpf: onlyDigits(cpf), value: val, category, expiration_date: expDate },
    });
    if (error || (data as any)?.error) {
      let message = (data as any)?.error || error?.message || 'Erro';
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const body = await ctx.json();
          if (body?.error) message = body.error;
        } catch {
          // keep default message when response body can't be parsed
        }
      }
      setLoading(false);
      toast.error(message);
      return;
    }

    // If this flow created (or reused) issuer-beneficiary association,
    // ensure the non-financial link event is anchored on Stellar.
    const issuerBeneficiaryId = (data as any)?.issuer_beneficiary_id as string | null;
    if (issuerBeneficiaryId) {
      const rLink = await registerOnStellar({
        internal_id: issuerBeneficiaryId,
        entity_type: 'issuer_beneficiary',
        operation: 'link_beneficiary',
        issuer_id: issuerId,
      });
      if (rLink.success && rLink.hash && !rLink.cached) {
        toast.success(`Vínculo do beneficiário registrado na Stellar (${rLink.hash.slice(0, 8)}…)`);
      } else if (!rLink.success && rLink.error) {
        toast.warning('Stellar (vínculo): ' + rLink.error);
      }
    }

    // Register voucher on Stellar
    const voucher = (data as any).voucher;
    if (voucher?.id) {
      const r = await registerOnStellar({ internal_id: voucher.id, entity_type: 'voucher', operation: 'create_voucher', amount: val, issuer_id: issuerId });
      if (r.success && r.hash) toast.success(`Voucher emitido e registrado na Stellar (${r.hash.slice(0, 8)}…)`);
      else if (r.error) toast.warning('Stellar: ' + r.error);
    }
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <Modal onClose={onDone} title="Saldo adicionado!">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <p className="text-sm text-white/60 mb-6">Voucher emitido na carteira do beneficiário.</p>
          <button onClick={onDone} className="w-full py-3 bg-tikin-orange rounded-xl font-heading font-black">FECHAR</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Adicionar Saldo Individual" subtitle={`Disponível no mês: R$ ${fmtBRL(fundDisponivel)}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label className="text-[10px] uppercase text-white/40 font-bold">CPF do beneficiário</Label>
          <Input id="saldo-cpf" value={cpf} onChange={e => setCpf(formatCpfInput(e.target.value))} required inputMode="numeric" maxLength={14} placeholder="000.000.000-00" className="bg-white/5 border-white/10 text-white mt-2" />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-white/40 font-bold">Nome do beneficiário</Label>
          <div className="relative mt-2">
            <Input
              readOnly
              value={
                lookupState === 'loading' ? 'Buscando…' :
                lookupState === 'found' ? benefName :
                lookupState === 'notfound' ? 'Beneficiário não cadastrado' :
                ''
              }
              placeholder="Preenchido automaticamente após o CPF"
              className={`bg-white/[0.03] border-white/10 text-white ${lookupState === 'notfound' ? 'text-red-400' : lookupState === 'found' ? 'text-green-400 font-semibold' : ''}`}
            />
            {lookupState === 'loading' && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/40" />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] uppercase text-white/40 font-bold">Categoria</Label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-10 rounded-md bg-[#0A1530] border border-white/10 px-3 text-sm text-white mt-2">
              {cats.map(c => <option key={c.id} value={c.id} className="bg-[#0A1530]">{c.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-white/40 font-bold">Valor (R$)</Label>
            <Input inputMode="numeric" value={value} onChange={e => setValue(formatBRLInput(e.target.value))} required placeholder="0,00" className="bg-white/5 border-white/10 text-white mt-2" />
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase text-white/40 font-bold">Data de expiração</Label>
          <Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} required className="bg-white/5 border-white/10 text-white mt-2" />
        </div>
        <button type="submit" disabled={loading} className="w-full py-4 bg-tikin-orange rounded-xl font-heading font-black flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />} ADICIONAR SALDO
        </button>
      </form>
    </Modal>
  );
}

function ExtratoModal({ issuerId, beneficiary, onClose }: { issuerId: string; beneficiary: { id: string; name: string }; onClose: () => void }) {
  const cats = useCategories();
  const statuses = useVoucherStatuses();
  const [period, setPeriod] = useState<number | 'custom'>(30);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [txs, setTxs] = useState<Tx[]>([]);
  const [voucherMap, setVoucherMap] = useState<Record<string, Voucher>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [period, startDate, endDate]);

  async function load() {
    setLoading(true);
    let sinceISO: string;
    let untilISO: string | null = null;
    if (period === 'custom') {
      if (!startDate || !endDate) { setLoading(false); return; }
      sinceISO = new Date(startDate + 'T00:00:00').toISOString();
      untilISO = new Date(endDate + 'T23:59:59').toISOString();
    } else {
      sinceISO = subDays(new Date(), period).toISOString();
    }
    const { data: vs } = await supabase.from('vouchers')
      .select('id,beneficiary_id,value,remaining_value,status,rules,expiration_date,created_at')
      .eq('issuer_id', issuerId).eq('beneficiary_id', beneficiary.id);
    const vouchers = (vs as Voucher[]) || [];
    const map: Record<string, Voucher> = {};
    vouchers.forEach(v => { map[v.id] = v; });
    setVoucherMap(map);
    const voucherIds = vouchers.map(v => v.id);
    if (voucherIds.length === 0) { setTxs([]); setLoading(false); return; }
    let q = supabase.from('transactions')
      .select('id,amount,created_at,voucher_category,tx_type,status,voucher_id')
      .in('voucher_id', voucherIds).gte('created_at', sinceISO);
    if (untilISO) q = q.lte('created_at', untilISO);
    const { data: ts } = await q.order('created_at', { ascending: false });
    setTxs((ts as Tx[]) || []);
    setLoading(false);
  }

  const filtered = useMemo(() => txs.filter(t => {
    const v = voucherMap[t.voucher_id];
    if (cat !== 'all' && (t.voucher_category || v?.rules?.category) !== cat) return false;
    if (statusFilter !== 'all' && v?.status !== statusFilter) return false;
    return true;
  }), [txs, cat, statusFilter, voucherMap]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F1729] border border-white/10 rounded-3xl w-full max-w-3xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="font-heading font-black text-lg">Extrato — {beneficiary.name}</h2>
            <p className="text-xs text-white/40 mt-1">Apenas transações dos vouchers emitidos por você</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"><X size={16} /></button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <div className="flex gap-1 flex-wrap">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${period === p ? 'bg-tikin-orange text-white' : 'bg-white/5 text-white/60'}`}>{p} dias</button>
            ))}
            <button onClick={() => setPeriod('custom')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${period === 'custom' ? 'bg-tikin-orange text-white' : 'bg-white/5 text-white/60'}`}>Personalizado</button>
          </div>
          <select value={cat} onChange={e => setCat(e.target.value)} className="h-8 rounded-md bg-[#0A1530] border border-white/10 px-2 text-xs text-white">
            <option value="all" className="bg-[#0A1530]">Todas categorias</option>
            {cats.map(c => <option key={c.id} value={c.id} className="bg-[#0A1530]">{c.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-8 rounded-md bg-[#0A1530] border border-white/10 px-2 text-xs text-white">
            <option value="all" className="bg-[#0A1530]">Todos status</option>
            {statuses.map(s => <option key={s.id} value={s.id} className="bg-[#0A1530]">{s.label}</option>)}
          </select>
        </div>

        {period === 'custom' && (
          <div className="flex gap-2 mb-4 items-end flex-wrap">
            <div>
              <Label className="text-[10px] uppercase text-white/40 font-bold">Data início</Label>
              <Input type="date" value={startDate} max={endDate || undefined} onChange={e => setStartDate(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1 h-9" />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-white/40 font-bold">Data fim</Label>
              <Input type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1 h-9" />
            </div>
          </div>
        )}

        {loading ? <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-tikin-orange" /></div> : (
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-[10px] uppercase text-white/40">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-white/40 text-xs">Sem transações no período</td></tr>}
                {filtered.map(t => {
                  const v = voucherMap[t.voucher_id];
                  const sid = v?.status;
                  return (
                  <tr key={t.id} className="border-t border-white/5">
                    <td className="px-4 py-3 text-xs text-white/70">{format(parseISO(t.created_at), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-4 py-3 text-xs">{categoryLabel(t.voucher_category || v?.rules?.category, cats)}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${toneBadgeClass(voucherStatusTone(sid, statuses))}`}>
                        {voucherStatusLabel(sid, statuses)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold text-xs ${t.tx_type === 'credit' ? 'text-tikin-orange' : 'text-green-400'}`}>R$ {fmtBRL(Number(t.amount))}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SaldoDetailModal({ beneficiary, vouchers, onClose }: { beneficiary: { id: string; name: string; saldo: number }; vouchers: Voucher[]; onClose: () => void }) {
  const cats = useCategories();
  const statuses = useVoucherStatuses();
  const list = [...vouchers]
    .filter(v => Number(v.remaining_value) > 0)
    .sort((a, b) => parseISO(a.expiration_date).getTime() - parseISO(b.expiration_date).getTime());
  const total = list.reduce((s, v) => s + Number(v.remaining_value), 0);

  return (
    <Modal onClose={onClose} title={`Saldo disponível — ${beneficiary.name}`} subtitle={`Composição do saldo: R$ ${fmtBRL(total)} em ${list.length} voucher(s) ativos/parciais deste emitente`}>
      {list.length === 0 ? (
        <p className="text-sm text-white/50 py-8 text-center">Sem vouchers com saldo disponível.</p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto -mx-2">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase text-white/40 font-bold">
                <th className="px-2 py-2">Emitido</th>
                <th className="px-2 py-2">Categoria</th>
                <th className="px-2 py-2">Vence</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2 text-right">Valor</th>
                <th className="px-2 py-2 text-right">Restante</th>
              </tr>
            </thead>
            <tbody>
              {list.map(v => (
                <tr key={v.id} className="border-t border-white/5">
                  <td className="px-2 py-2 text-xs text-white/70">{format(parseISO(v.created_at), 'dd/MM/yy')}</td>
                  <td className="px-2 py-2 text-xs text-white/80">{categoryLabel(v.rules?.category, cats)}</td>
                  <td className="px-2 py-2 text-xs text-white/60">{format(parseISO(v.expiration_date), 'dd/MM/yy')}</td>
                  <td className="px-2 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${toneBadgeClass(voucherStatusTone(v.status, statuses))}`}>
                      {voucherStatusLabel(v.status, statuses)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right text-xs text-white/60">R$ {fmtBRL(Number(v.value))}</td>
                  <td className="px-2 py-2 text-right text-xs font-bold text-tikin-orange">R$ {fmtBRL(Number(v.remaining_value))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10">
                <td colSpan={5} className="px-2 py-3 text-xs uppercase font-bold text-white/50 text-right">Saldo disponível total</td>
                <td className="px-2 py-3 text-right font-heading font-black text-tikin-orange">R$ {fmtBRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Modal>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Pencil, LogOut, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  clearAdminSession,
  hasAdminSession,
} from '@/lib/adminCredentials';
import { Button } from '@/components/ui/button';
import { formatCnpj, onlyDigits } from '@/lib/utils';
import { isValidCNPJ, maskCNPJ } from '@/lib/validators';
import { DOC_MESSAGES } from '@/lib/documentMessages';

interface AdminIssuer {
  id: string;
  user_id: string;
  company_name: string;
  razao_social: string | null;
  cnpj: string;
  responsible_name: string | null;
  responsible_role: string | null;
  corporate_email: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminEmittersPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<AdminIssuer[]>([]);
  const [editing, setEditing] = useState<AdminIssuer | null>(null);
  const [formAttempted, setFormAttempted] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    razao_social: '',
    cnpj: '',
    responsible_name: '',
    responsible_role: '',
    corporate_email: '',
  });

  useEffect(() => {
    if (!hasAdminSession()) {
      navigate('/tikin-admin/login', { replace: true });
      return;
    }
    void loadIssuers();
  }, [navigate]);

  const loadIssuers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_issuers_secure');

    if (error) {
      toast.error('Não foi possível carregar emitentes.');
      setLoading(false);
      if ((error.message || '').toLowerCase().includes('não autorizado')) {
        clearAdminSession();
        navigate('/tikin-admin/login', { replace: true });
      }
      return;
    }

    setItems((data ?? []) as AdminIssuer[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = [
        it.company_name,
        it.razao_social ?? '',
        it.cnpj,
        it.responsible_name ?? '',
        it.corporate_email ?? '',
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const toggleEnabled = async (issuer: AdminIssuer) => {
    setSaving(true);
    const { error } = await supabase.rpc('admin_set_issuer_enabled_secure', {
      _issuer_id: issuer.id,
      _is_enabled: !issuer.is_enabled,
    });

    setSaving(false);
    if (error) {
      toast.error('Falha ao atualizar status do emitente.');
      return;
    }

    toast.success(!issuer.is_enabled ? 'Emitente ativado.' : 'Emitente desativado com sucesso.');
    void loadIssuers();
  };

  const openEdit = (issuer: AdminIssuer) => {
    setEditing(issuer);
    setFormAttempted(false);
    setForm({
      company_name: issuer.company_name ?? '',
      razao_social: issuer.razao_social ?? '',
      cnpj: maskCNPJ(issuer.cnpj ?? ''),
      responsible_name: issuer.responsible_name ?? '',
      responsible_role: issuer.responsible_role ?? '',
      corporate_email: issuer.corporate_email ?? '',
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setFormAttempted(false);
  };

  const saveEdit = async () => {
    if (!editing) return;

    const cnpjDigits = onlyDigits(form.cnpj);
    if (cnpjDigits.length !== 14 || !isValidCNPJ(cnpjDigits)) {
      setFormAttempted(true);
      toast.error(DOC_MESSAGES.cnpjInvalid);
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc('admin_update_issuer_secure', {
      _issuer_id: editing.id,
      _company_name: form.company_name,
      _razao_social: form.razao_social,
      _cnpj: cnpjDigits,
      _responsible_name: form.responsible_name,
      _responsible_role: form.responsible_role,
      _corporate_email: form.corporate_email,
    });

    setSaving(false);
    if (error) {
      toast.error('Falha ao salvar alterações do emitente.');
      return;
    }

    closeEdit();
    toast.success('Cadastro do emitente atualizado.');
    void loadIssuers();
  };

  const doLogout = async () => {
    clearAdminSession();
    await signOut();
    navigate('/tikin-admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <header className="bg-white px-6 md:px-10 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <img src="/logo-fundo-branco.png" alt="TIKIN" className="h-7" />
          <span className="text-tikin-navy/70 text-sm font-black border-l border-tikin-navy/10 pl-4 hidden sm:inline">
            Gestão de Emitentes
          </span>
        </div>
        <button
          type="button"
          onClick={doLogout}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-extrabold text-tikin-navy hover:bg-tikin-navy/5"
        >
          <LogOut size={16} /> Sair
        </button>
      </header>

      <main className="flex-1 px-4 md:px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white border border-tikin-navy/10 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl font-black text-tikin-navy">Emitentes Cadastrados</h1>
                <p className="text-sm text-tikin-navy/60">Aprove, desative e edite informações cadastrais.</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tikin-navy/40" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar por empresa, CNPJ ou responsável"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-tikin-navy/10 bg-[#F7F8FA] text-sm outline-none focus:border-tikin-navy"
                />
              </div>
            </div>
          </div>

          {editing && (
            <section className="bg-white rounded-2xl border border-tikin-navy/10 p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-tikin-navy/40">Edição de emitente</p>
                  <h2 className="mt-1 font-heading text-xl font-black text-tikin-navy">{editing.company_name}</h2>
                  <p className="text-sm text-tikin-navy/60">Formulário inline, responsivo e sem modal.</p>
                </div>
                <span className={`inline-flex w-fit px-3 py-1 rounded-full text-xs font-black ${editing.is_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {editing.is_enabled ? 'ATIVO' : 'PENDENTE'}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm font-medium text-tikin-navy/70">
                  Nome da empresa
                  <input
                    className="mt-1 w-full rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] px-4 py-3 outline-none transition focus:border-tikin-navy"
                    value={form.company_name}
                    onChange={e => setForm(v => ({ ...v, company_name: e.target.value }))}
                  />
                </label>

                <label className="text-sm font-medium text-tikin-navy/70">
                  Razão social
                  <input
                    className="mt-1 w-full rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] px-4 py-3 outline-none transition focus:border-tikin-navy"
                    value={form.razao_social}
                    onChange={e => setForm(v => ({ ...v, razao_social: e.target.value }))}
                  />
                </label>

                <label className="text-sm font-medium text-tikin-navy/70 md:col-span-2">
                  CNPJ
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={18}
                    aria-invalid={formAttempted && !isValidCNPJ(onlyDigits(form.cnpj))}
                    className="mt-1 w-full rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] px-4 py-3 outline-none transition focus:border-tikin-navy aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500"
                    value={form.cnpj}
                    onChange={e => setForm(v => ({ ...v, cnpj: maskCNPJ(e.target.value) }))}
                  />
                  <span className={`mt-1 block text-xs ${formAttempted && !isValidCNPJ(onlyDigits(form.cnpj)) ? 'text-red-600' : 'text-tikin-navy/55'}`}>
                    Use o formato 00.000.000/0000-00.
                  </span>
                </label>

                <label className="text-sm font-medium text-tikin-navy/70">
                  Responsável
                  <input
                    className="mt-1 w-full rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] px-4 py-3 outline-none transition focus:border-tikin-navy"
                    value={form.responsible_name}
                    onChange={e => setForm(v => ({ ...v, responsible_name: e.target.value }))}
                  />
                </label>

                <label className="text-sm font-medium text-tikin-navy/70">
                  Cargo
                  <input
                    className="mt-1 w-full rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] px-4 py-3 outline-none transition focus:border-tikin-navy"
                    value={form.responsible_role}
                    onChange={e => setForm(v => ({ ...v, responsible_role: e.target.value }))}
                  />
                </label>

                <label className="text-sm font-medium text-tikin-navy/70 md:col-span-2">
                  E-mail corporativo
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-tikin-navy/10 bg-[#F7F8FA] px-4 py-3 outline-none transition focus:border-tikin-navy"
                    value={form.corporate_email}
                    onChange={e => setForm(v => ({ ...v, corporate_email: e.target.value }))}
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeEdit} className="rounded-xl px-5 py-3">
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setFormAttempted(true);
                    void saveEdit();
                  }}
                  className="rounded-xl bg-tikin-navy px-5 py-3 hover:bg-tikin-navy/90"
                >
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </section>
          )}

          {loading ? (
            <div className="bg-white rounded-2xl border border-tikin-navy/10 p-6 text-sm text-tikin-navy/60">Carregando emitentes...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((issuer) => (
                <article key={issuer.id} className="bg-white rounded-2xl border border-tikin-navy/10 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-lg font-black text-tikin-navy">{issuer.company_name}</h3>
                      <p className="text-sm text-tikin-navy/65">CNPJ: {formatCnpj(issuer.cnpj)}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black ${issuer.is_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                    >
                      {issuer.is_enabled ? 'ATIVO' : 'PENDENTE'}
                    </span>
                  </div>

                  <dl className="mt-4 space-y-1 text-sm text-tikin-navy/70">
                    <div><strong>Razão social:</strong> {issuer.razao_social || '-'}</div>
                    <div><strong>Responsável:</strong> {issuer.responsible_name || '-'} {issuer.responsible_role ? `(${issuer.responsible_role})` : ''}</div>
                    <div><strong>E-mail corporativo:</strong> {issuer.corporate_email || '-'}</div>
                  </dl>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void toggleEnabled(issuer)}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold text-white ${issuer.is_enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-60`}
                    >
                      {issuer.is_enabled ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                      {issuer.is_enabled ? 'Desativar' : 'Ativar'}
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => openEdit(issuer)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold text-tikin-navy bg-tikin-navy/5 hover:bg-tikin-navy/10 disabled:opacity-60"
                    >
                      <Pencil size={15} /> Editar cadastro
                    </button>
                  </div>
                </article>
              ))}

              {!filtered.length && (
                <div className="bg-white rounded-2xl border border-tikin-navy/10 p-6 text-sm text-tikin-navy/60">
                  Nenhum emitente encontrado para esse filtro.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

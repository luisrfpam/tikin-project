import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import { Heart, MapPin, Phone, Clock, Navigation2, List, Map as MapIcon, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useCategories, categoryLabel } from '@/lib/categories';
import { IssuerScopePicker, useIssuerScope } from '@/lib/issuerScope';

interface Establishment {
  id: string;
  name: string;
  trade_name: string | null;
  category: string | null;
  address: string | null;
  cidade: string | null;
  uf: string | null;
  phone: string | null;
  opening_hours: string | null;
  accepted_categories: string[];
  latitude: number | null;
  longitude: number | null;
}

function haversineKm(a: {lat:number;lng:number}, b: {lat:number;lng:number}) {
  const R = 6371;
  const dLat = (b.lat-a.lat) * Math.PI / 180;
  const dLng = (b.lng-a.lng) * Math.PI / 180;
  const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}

export default function BeneficiarioOndeUsar() {
  const { user } = useAuth();
  const catList = useCategories();
  const scope = useIssuerScope();
  const [estabs, setEstabs] = useState<Establishment[]>([]);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [voucherCats, setVoucherCats] = useState<{ category: string; issuer_id: string }[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('todos');
  const [sortByDistance, setSortByDistance] = useState(false);
  const [pos, setPos] = useState<{lat:number;lng:number} | null>(null);
  const [view, setView] = useState<'list'|'map'>('list');
  const [selected, setSelected] = useState<Establishment | null>(null);

  useEffect(() => {
    supabase.from('establishments').select('*').then(({ data }) => setEstabs((data as any) ?? []));
    if (user) {
      (supabase.from as any)('favorites').select('establishment_id').eq('beneficiary_id', user.id)
        .then(({ data }: any) => setFavs(new Set((data ?? []).map((f: any) => f.establishment_id))));
      supabase.from('vouchers').select('rules, issuer_id').eq('beneficiary_id', user.id).in('status',['active','partially_used'])
        .then(({ data }) => setVoucherCats((data as any[] ?? []).map(v => ({ category: v.rules?.category, issuer_id: v.issuer_id })).filter(x => x.category)));
    }
  }, [user]);

  const requestGeo = () => {
    if (!navigator.geolocation) return toast.error('Geolocalização indisponível');
    navigator.geolocation.getCurrentPosition(
      p => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setSortByDistance(true); },
      () => toast.error('Não foi possível obter sua localização'),
    );
  };

  const toggleFav = async (id: string) => {
    if (!user) return;
    if (favs.has(id)) {
      await (supabase.from as any)('favorites').delete().eq('beneficiary_id', user.id).eq('establishment_id', id);
      favs.delete(id); setFavs(new Set(favs));
    } else {
      await (supabase.from as any)('favorites').insert({ beneficiary_id: user.id, establishment_id: id });
      setFavs(new Set([...favs, id]));
    }
  };

  // Categorias dos vouchers ativos filtradas pelo emissor selecionado
  const scopedCats = useMemo(() => {
    const list = voucherCats.filter(v => scope.matches(v.issuer_id)).map(v => v.category);
    return Array.from(new Set(list));
  }, [voucherCats, scope.selectedId]);

  const filtered = useMemo(() => {
    let list = estabs.filter(e => {
      if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (category !== 'todos' && !(e.accepted_categories||[]).includes(category)) return false;
      // Quando há emissor selecionado, mostra apenas estabelecimentos que aceitam
      // pelo menos uma categoria dos vouchers ativos daquele emissor.
      if (scope.current && scopedCats.length && !(e.accepted_categories||[]).some(c => scopedCats.includes(c))) return false;
      return true;
    });
    if (sortByDistance && pos) {
      list = [...list].sort((a, b) => {
        if (!a.latitude || !b.latitude) return 0;
        return haversineKm(pos, {lat:a.latitude!,lng:a.longitude!}) - haversineKm(pos, {lat:b.latitude!,lng:b.longitude!});
      });
    }
    return list;
  }, [estabs, query, category, sortByDistance, pos, scope.current, scopedCats]);

  const cats = ['todos', ...Array.from(new Set(estabs.flatMap(e => e.accepted_categories || [])))];

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-28">
      <AppHeader variant="navy" />
      <main className="max-w-md mx-auto px-5 py-6 space-y-4">
        <div>
          <h1 className="font-heading text-2xl font-black text-tikin-navy">Onde usar</h1>
          <p className="text-xs text-tikin-navy/50 mt-1">
            Estabelecimentos que aceitam seus vouchers{scopedCats.length ? ` (${scopedCats.map(c => categoryLabel(c, catList)).join(', ')})` : ''}{scope.current ? ` · filtrado por ${scope.current.name}` : ''}.
          </p>
        </div>

        <IssuerScopePicker />

        <div className="bg-white rounded-2xl p-3 shadow-card flex items-center gap-2">
          <Search size={18} className="text-tikin-navy/30 ml-2" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome"
            className="flex-1 outline-none text-sm text-tikin-navy bg-transparent" />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-card">
          <p className="text-[11px] font-bold text-tikin-navy/60 mb-2 font-heading uppercase tracking-wider">Tipo de voucher</p>
          <div className="flex flex-wrap gap-2">
            {cats.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${
                  category===c?'bg-tikin-orange text-white':'bg-[#F7F8FA] text-tikin-navy/60'}`}>{c === 'todos' ? 'Todos' : categoryLabel(c, catList)}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={requestGeo}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 ${
              sortByDistance?'bg-tikin-navy text-white':'bg-white text-tikin-navy/60'}`}>
            <Navigation2 size={14} /> {sortByDistance && pos ? 'Próximos a você' : 'Usar minha localização'}
          </button>
          <div className="bg-white rounded-lg flex">
            <button onClick={() => setView('list')} className={`px-3 py-2 rounded-lg ${view==='list'?'bg-tikin-navy text-white':'text-tikin-navy/40'}`}>
              <List size={14} />
            </button>
            <button onClick={() => setView('map')} className={`px-3 py-2 rounded-lg ${view==='map'?'bg-tikin-navy text-white':'text-tikin-navy/40'}`}>
              <MapIcon size={14} />
            </button>
          </div>
        </div>

        {view === 'map' ? (
          <div className="bg-white rounded-2xl overflow-hidden shadow-card aspect-square relative">
            <iframe
              title="map"
              className="w-full h-full border-0"
              src={`https://www.google.com/maps?q=${pos ? `${pos.lat},${pos.lng}` : 'São+Paulo'}&z=13&output=embed`}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="p-8 text-center text-sm text-tikin-navy/50 bg-white rounded-2xl">Nenhum estabelecimento.</p>
            )}
            {filtered.map(e => {
              const dist = pos && e.latitude && e.longitude ? haversineKm(pos, {lat:e.latitude,lng:e.longitude}) : null;
              return (
                <button key={e.id} onClick={() => setSelected(e)} className="w-full text-left bg-white rounded-2xl p-4 shadow-card flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-tikin-orange/10 text-tikin-orange flex items-center justify-center font-heading font-black text-sm">
                    {e.name.substring(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-extrabold text-tikin-navy text-sm truncate">{e.trade_name || e.name}</p>
                    <p className="text-[11px] text-tikin-navy/50 truncate">{categoryLabel(e.category, catList)} · {e.address || 'Endereço indisponível'}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(e.accepted_categories||[]).slice(0,3).map(c => (
                        <span key={c} className="text-[9px] px-2 py-0.5 rounded-full bg-tikin-navy/5 text-tikin-navy/60">{categoryLabel(c, catList)}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {dist !== null && <span className="text-[10px] font-bold text-tikin-navy/40">{dist.toFixed(1)} km</span>}
                    <span onClick={(ev) => { ev.stopPropagation(); toggleFav(e.id); }}
                      className={favs.has(e.id)?'text-tikin-orange':'text-tikin-navy/20'}>
                      <Heart size={16} fill={favs.has(e.id)?'currentColor':'none'} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 bg-tikin-navy/40 z-[60] flex items-end overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 pb-28 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-heading text-xl font-black text-tikin-navy">{selected.trade_name || selected.name}</p>
                <p className="text-xs text-tikin-navy/50">{categoryLabel(selected.category, catList)}</p>
              </div>
              <button onClick={() => toggleFav(selected.id)} className={favs.has(selected.id)?'text-tikin-orange':'text-tikin-navy/30'}>
                <Heart size={22} fill={favs.has(selected.id)?'currentColor':'none'} />
              </button>
            </div>

            {selected.address && (
              <div className="flex items-start gap-3 text-sm text-tikin-navy">
                <MapPin size={16} className="text-tikin-navy/40 mt-0.5" />
                <span>{selected.address}{selected.cidade?` · ${selected.cidade}/${selected.uf}`:''}</span>
              </div>
            )}
            {selected.phone && (
              <a href={`tel:${selected.phone}`} className="flex items-center gap-3 text-sm text-tikin-navy">
                <Phone size={16} className="text-tikin-navy/40" /> {selected.phone}
              </a>
            )}
            {selected.opening_hours && (
              <div className="flex items-center gap-3 text-sm text-tikin-navy">
                <Clock size={16} className="text-tikin-navy/40" /> {selected.opening_hours}
              </div>
            )}

            <div>
              <p className="text-[11px] font-bold text-tikin-navy/50 mb-2 uppercase tracking-wider">Vouchers aceitos</p>
              <div className="flex gap-2 flex-wrap">
                {(selected.accepted_categories||[]).map(c => (
                  <span key={c} className="text-xs px-3 py-1 rounded-full bg-tikin-orange/10 text-tikin-orange font-bold">{categoryLabel(c, catList)}</span>
                ))}
              </div>
            </div>

            <a target="_blank" rel="noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${
                selected.latitude && selected.longitude
                  ? `${selected.latitude},${selected.longitude}`
                  : encodeURIComponent(selected.address || selected.name)
              }`}
              className="w-full block text-center bg-tikin-orange text-white py-3 rounded-xl font-heading font-extrabold text-sm">
              COMO CHEGAR
            </a>
            <button onClick={() => setSelected(null)} className="w-full text-tikin-navy/50 text-xs font-bold">Fechar</button>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
}

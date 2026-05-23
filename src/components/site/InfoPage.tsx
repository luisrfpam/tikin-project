import SitePage from "@/components/site/SitePage";
import { Link } from "react-router-dom";

interface InfoPageProps {
  hero: { title: string; subtitle: string; img?: string; tag?: string };
  sections: Array<{ title: string; body: string; bullets?: string[] }>;
  cta?: { label: string; to: string };
}

export default function InfoPage({ hero, sections, cta }: InfoPageProps) {
  return (
    <SitePage>
      <header className="relative min-h-[400px] flex items-center overflow-hidden">
        {hero.img && (
          <img
            src={hero.img}
            alt=""
            fetchPriority="high"
            decoding="async"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-tikin-navy/80" />
        <div className="container-tikin relative z-10 py-16">
          {hero.tag && <p className="font-heading text-tikin-orange font-extrabold mb-3 tracking-widest text-sm">{hero.tag}</p>}
          <h1 className="font-heading text-4xl md:text-6xl font-black text-white leading-tight max-w-4xl">{hero.title}</h1>
          <p className="text-lg text-white/85 mt-6 max-w-2xl">{hero.subtitle}</p>
        </div>
      </header>

      <div className="container-tikin py-20 space-y-16">
        {sections.map((s, i) => (
          <section key={i} className="grid md:grid-cols-[1fr_2fr] gap-8 items-start">
            <h2 className="font-heading text-3xl font-black text-tikin-navy">{s.title}</h2>
            <div>
              <p className="text-lg text-tikin-navy/80 leading-relaxed">{s.body}</p>
              {s.bullets && (
                <ul className="mt-6 space-y-3">
                  {s.bullets.map(b => (
                    <li key={b} className="flex gap-3 items-start">
                      <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-tikin-orange" />
                      <span className="text-tikin-navy/85">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
        {cta && (
          <div className="text-center pt-8">
            <Link to={cta.to} className="inline-block bg-tikin-orange text-white px-10 py-4 rounded-xl font-heading font-black shadow-orange hover:scale-[1.02] transition">
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </SitePage>
  );
}

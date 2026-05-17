import SitePage from "@/components/site/SitePage";

export default function LegalPage({ title, body }: { title: string; body: { h: string; p: string }[] }) {
  return (
    <SitePage>
      <header className="bg-tikin-navy py-16">
        <div className="container-tikin">
          <h1 className="font-heading text-4xl md:text-5xl font-black text-white">{title}</h1>
        </div>
      </header>
      <div className="container-tikin py-16 max-w-3xl space-y-8">
        {body.map((s, i) => (
          <section key={i}>
            <h2 className="font-heading text-2xl font-black text-tikin-navy mb-3">{s.h}</h2>
            <p className="text-tikin-navy/80 leading-relaxed">{s.p}</p>
          </section>
        ))}
      </div>
    </SitePage>
  );
}

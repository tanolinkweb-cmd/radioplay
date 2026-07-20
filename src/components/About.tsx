import { Music2 } from "lucide-react";

const About = () => {
  return (
    <section id="banda" className="relative py-16 sm:py-20">
      <div className="container max-w-5xl">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-neon-magenta/20 to-neon-cyan/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-neon-cyan/20 bg-card/60 p-10 backdrop-blur">
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-neon-cyan">
                <span className="rounded-full border border-neon-cyan/40 px-3 py-1">Rock</span>
                <span className="rounded-full border border-neon-magenta/40 px-3 py-1 text-neon-magenta">Hard</span>
                <span className="rounded-full border border-foreground/20 px-3 py-1 text-muted-foreground">Garage</span>
              </div>
              <p className="mt-8 font-display text-5xl leading-none text-gradient-neon">220V</p>
              <p className="mt-2 text-sm text-muted-foreground">de pura energia em cada acorde</p>
            </div>
          </div>

          <div>
            <div className="mb-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-neon-magenta">
              <Music2 className="h-3 w-3" /> Tonelada Elétrica
            </div>
            <h2 className="font-display text-5xl leading-none sm:text-6xl">
              Uma <span className="text-gradient-neon">tonelada</span> de barulho.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Nascida da paixão pelo rock, a Tonelada Elétrica entrega riffs cortantes, baterias
              pesadas e uma atitude que não pede licença. Um som direto, intenso e cheio de energia.
              Aqui, o rock'n'roll é servido em alta voltagem.
            </p>

            <dl className="mt-10 grid grid-cols-3 gap-4 text-center">
              {[
                { k: "Ouça", v: "Sem moderação" },
                { k: "24h", v: "Online sem parar" },
                { k: "Decibéis", v: "Do bit ao volt" },
              ].map((s) => (
                <div key={s.v} className="rounded-2xl border border-border bg-card/50 p-5 backdrop-blur transition-colors hover:border-neon-cyan/40">
                  <dt className="font-display text-3xl text-gradient-neon">{s.k}</dt>
                  <dd className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

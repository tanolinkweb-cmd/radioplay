import { Instagram, Youtube, Music } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative border-t border-border/60 pb-32 pt-12">
      <div className="container max-w-5xl">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="font-display text-3xl tracking-widest text-gradient-neon">
            TONELADA ELÉTRICA
          </div>

          <nav className="flex flex-wrap justify-center gap-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <a href="#hero" className="hover:text-neon-cyan">Início</a>
            <a href="#banda" className="hover:text-neon-cyan">Banda</a>
            <a href="#tracks" className="hover:text-neon-cyan">Setlist</a>
          </nav>

          <div className="flex gap-3">
            {[Instagram, Youtube, Music].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-neon-magenta hover:text-neon-magenta hover:shadow-[0_0_20px_hsl(var(--neon-magenta)/0.4)]"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>

          <div className="space-y-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
            <div>© {new Date().getFullYear()} Tonelada Elétrica · RadioPlay</div>
            <a
              href="https://www.magicpage.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block transition-colors hover:text-neon-cyan"
            >
              MagicPage — RadioPlay Tonelada Elétrica
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

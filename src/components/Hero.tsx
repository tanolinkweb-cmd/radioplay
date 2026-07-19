import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Check, Palette, Pause, Play, Shuffle, Zap } from "lucide-react";
import { useRadio } from "@/context/RadioContext";
import SpectrumVisualizer, { type VisualizationMode } from "./SpectrumVisualizer";
import { Button } from "@/components/ui/button";

type VisualizationChoice = VisualizationMode | "random";

const VISUALIZATION_STORAGE_KEY = "tonelada-visualization";
const VISUALIZATION_MODES: VisualizationMode[] = [
  "bars",
  "waves",
  "circles",
  "ovals",
  "particles",
  "kaleidoscope",
];
const VISUALIZATION_OPTIONS: { value: VisualizationChoice; label: string }[] = [
  { value: "bars", label: "Barras (original)" },
  { value: "waves", label: "Linhas onduladas" },
  { value: "circles", label: "Círculos pulsantes" },
  { value: "ovals", label: "Ovais concêntricos" },
  { value: "particles", label: "Partículas reativas" },
  { value: "kaleidoscope", label: "Fractais caleidoscópicos" },
  { value: "random", label: "Aleatório" },
];

function getSavedVisualization(): VisualizationChoice {
  const saved = localStorage.getItem(VISUALIZATION_STORAGE_KEY);
  return VISUALIZATION_OPTIONS.some(({ value }) => value === saved)
    ? (saved as VisualizationChoice)
    : "bars";
}

function getRandomMode(previous?: VisualizationMode): VisualizationMode {
  const available = VISUALIZATION_MODES.filter((mode) => mode !== previous);
  return available[Math.floor(Math.random() * available.length)];
}

const AnimatedWord = ({
  word,
  className,
  accents,
}: {
  word: string;
  className: string;
  accents: number[];
}) => (
  <span className={`hero-word ${className}`} aria-label={word}>
    {Array.from(word).map((letter, index) => (
      <span
        key={`${letter}-${index}`}
        aria-hidden="true"
        className={`hero-letter ${accents.includes(index) ? "hero-letter-accent" : ""}`}
        style={{ "--letter-index": index } as CSSProperties}
      >
        {letter}
      </span>
    ))}
  </span>
);

const Hero = () => {
  const { currentIndex, isPlaying, togglePlay } = useRadio();
  const [menuOpen, setMenuOpen] = useState(false);
  const [visualization, setVisualization] = useState<VisualizationChoice>(getSavedVisualization);
  const [activeMode, setActiveMode] = useState<VisualizationMode>(() => {
    const saved = getSavedVisualization();
    return saved === "random" ? getRandomMode() : saved;
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(VISUALIZATION_STORAGE_KEY, visualization);
    if (visualization === "random") {
      setActiveMode((previous) => getRandomMode(previous));
    } else {
      setActiveMode(visualization);
    }
  }, [visualization, currentIndex]);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <section id="hero" className="relative isolate flex min-h-[100svh] w-full items-center justify-center overflow-hidden">
      {/* Background visualizer */}
      <div className="pointer-events-none absolute inset-0">
        <SpectrumVisualizer
          className="absolute inset-0 h-full w-full opacity-70"
          intensity={1.1}
          mode={activeMode}
        />
        {/* vignette + radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background))_85%)]" />
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-neon-magenta/20 blur-[120px]" />
        <div className="absolute -bottom-40 right-10 h-[400px] w-[400px] rounded-full bg-neon-cyan/20 blur-[120px]" />
      </div>

      <div ref={menuRef} className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neon-cyan/30 bg-card/55 text-neon-cyan/80 backdrop-blur-xl transition-all hover:border-neon-cyan/60 hover:bg-neon-cyan/10 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
          aria-label="Escolher visualização de áudio"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Visualização de áudio"
        >
          <Palette className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Estilos de visualização"
            className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-neon-cyan/25 bg-card/95 p-2 text-left shadow-[0_0_35px_hsl(var(--neon-cyan)/0.18)] backdrop-blur-xl"
          >
            <div className="px-3 pb-2 pt-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-neon-cyan/70">
              Visualização de áudio
            </div>
            {VISUALIZATION_OPTIONS.map((option) => {
              const selected = visualization === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    setVisualization(option.value);
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-colors ${
                    selected
                      ? "bg-neon-magenta/10 text-foreground"
                      : "text-muted-foreground hover:bg-neon-cyan/10 hover:text-foreground"
                  }`}
                >
                  {option.value === "random" ? (
                    <Shuffle className="h-3.5 w-3.5 shrink-0 text-neon-magenta" />
                  ) : (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-neon-cyan to-neon-magenta shadow-[0_0_8px_hsl(var(--neon-cyan)/0.65)]" />
                  )}
                  <span className="flex-1">{option.label}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-neon-cyan" />}
                </button>
              );
            })}
            {visualization === "random" && (
              <div className="border-t border-border/60 px-3 pb-1 pt-2 text-[9px] uppercase tracking-widest text-muted-foreground">
                Atual: {VISUALIZATION_OPTIONS.find(({ value }) => value === activeMode)?.label}
              </div>
            )}
          </div>
        )}
      </div>

      {/* grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--neon-cyan)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neon-cyan)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neon-cyan/40 bg-neon-cyan/5 px-4 py-1.5 backdrop-blur-sm animate-flicker">
          <Zap className="h-3.5 w-3.5 text-neon-cyan" fill="currentColor" />
          <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-neon-cyan">
            Rádio Online · 24/7
          </span>
        </div>

        <h1 className="font-display text-[clamp(3.5rem,14vw,11rem)] leading-[0.85] tracking-tight">
          <AnimatedWord
            word="TONELADA"
            accents={[1, 4, 7]}
            className="hero-word-neon drop-shadow-[0_0_30px_hsl(var(--neon-magenta)/0.5)]"
          />
          <AnimatedWord
            word="ELÉTRICA"
            accents={[0, 3, 6]}
            className="hero-word-light mt-1 text-foreground/95 [text-shadow:0_0_25px_hsl(var(--neon-cyan)/0.4)]"
          />
        </h1>

        <p className="mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
          Música de alta voltagem direto na sua veia. Conecte os fones, aumente o volume e
          deixe o spectrum analyzer dançar com a batida.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button
            onClick={togglePlay}
            size="lg"
            className="group relative h-14 overflow-hidden rounded-full bg-gradient-to-r from-neon-cyan to-neon-magenta px-8 text-base font-bold uppercase tracking-widest text-background shadow-[0_0_40px_hsl(var(--neon-magenta)/0.5)] transition-all hover:scale-105 hover:shadow-[0_0_60px_hsl(var(--neon-magenta)/0.8)]"
          >
            {isPlaying ? (
              <><Pause className="mr-2 h-5 w-5" fill="currentColor" /> Pausar Música</>
            ) : (
              <><Play className="mr-2 h-5 w-5" fill="currentColor" /> Tocar Música</>
            )}
          </Button>

          <a
            href="#tracks"
            className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/70 underline-offset-8 hover:text-neon-cyan hover:underline"
          >
            Ver setlist ↓
          </a>
        </div>

        {/* status pill */}
        <div className="mt-12 flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? "bg-neon-magenta animate-pulse" : "bg-muted-foreground/50"}`} />
          {isPlaying ? "Transmitindo agora" : "Pressione play"}
        </div>
      </div>
    </section>
  );
};

export default Hero;

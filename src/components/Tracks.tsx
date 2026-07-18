import { Play, Pause } from "lucide-react";
import { useRadio } from "@/context/RadioContext";

const Tracks = () => {
  const { tracks, currentIndex, isPlaying, selectIndex, togglePlay } = useRadio();

  return (
    <section id="tracks" className="relative py-28">
      <div className="container max-w-4xl">
        <div className="mb-12 flex items-end justify-between gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-neon-cyan">Setlist</div>
            <h2 className="mt-2 font-display text-5xl leading-none sm:text-6xl">
              Tocando <span className="text-gradient-neon">agora</span>
            </h2>
          </div>
          <div className="hidden text-xs text-muted-foreground sm:block">
            {tracks.length} faixas em rotação
          </div>
        </div>

        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
          {tracks.map((t, i) => {
            const active = i === currentIndex;
            return (
              <li
                key={t.title}
                className={`group flex items-center gap-4 px-5 py-4 transition-colors ${
                  active ? "bg-neon-magenta/5" : "hover:bg-neon-cyan/5"
                }`}
              >
                <button
                  onClick={() => {
                    if (active) togglePlay();
                    else {
                      selectIndex(i);
                    }
                  }}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all ${
                    active
                      ? "border-neon-magenta bg-neon-magenta/20 text-neon-magenta shadow-[0_0_20px_hsl(var(--neon-magenta)/0.5)]"
                      : "border-border text-foreground/70 group-hover:border-neon-cyan/60 group-hover:text-neon-cyan"
                  }`}
                  aria-label={`Tocar ${t.title}`}
                >
                  {active && isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className={`truncate font-display text-lg tracking-wider ${active ? "text-gradient-neon" : "text-foreground"}`}>
                    {String(i + 1).padStart(2, "0")} · {t.title}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{t.artist}</div>
                </div>

                {active && isPlaying && (
                  <div className="flex items-end gap-[2px]">
                    {[0, 1, 2, 3].map((b) => (
                      <span
                        key={b}
                        className="w-[3px] rounded-sm bg-neon-cyan"
                        style={{
                          height: "16px",
                          animation: `equalize ${0.5 + b * 0.15}s ease-in-out ${b * 0.05}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {tracks.length} faixas em rotação · Tonelada Elétrica
        </p>
      </div>
    </section>
  );
};

export default Tracks;

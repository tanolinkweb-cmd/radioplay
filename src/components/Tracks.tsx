import { useEffect, useMemo, useState } from "react";
import { Heart, Pause, Play } from "lucide-react";
import { useRadio } from "@/context/RadioContext";
import CoverArt from "@/components/CoverArt";

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

type ListFilter = "all" | "favorites";

const Tracks = () => {
  const {
    tracks,
    currentIndex,
    current,
    isPlaying,
    selectIndex,
    togglePlay,
    isFavorite,
    toggleFavorite,
    selectionTracks,
    audioRef,
    getCover,
  } = useRadio();

  const [filter, setFilter] = useState<ListFilter>("all");
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [liveTime, setLiveTime] = useState(0);

  const visible = useMemo(() => {
    if (filter === "favorites") {
      return selectionTracks.map((track) => ({
        track,
        queueIndex: tracks.findIndex((item) => item.id === track.id),
      }));
    }
    return tracks.map((track, queueIndex) => ({ track, queueIndex }));
  }, [filter, selectionTracks, tracks]);

  useEffect(() => {
    let cancelled = false;
    const loaders: HTMLAudioElement[] = [];

    tracks.forEach((track) => {
      if (durations[track.id]) return;
      const audio = new Audio();
      audio.preload = "metadata";
      audio.crossOrigin = "anonymous";
      audio.src = track.src;
      const onMeta = () => {
        if (cancelled || !Number.isFinite(audio.duration)) return;
        setDurations((prev) =>
          prev[track.id] ? prev : { ...prev, [track.id]: audio.duration },
        );
      };
      audio.addEventListener("loadedmetadata", onMeta);
      loaders.push(audio);
    });

    return () => {
      cancelled = true;
      loaders.forEach((audio) => {
        audio.removeAttribute("src");
        audio.load();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const sync = () => setLiveTime(audio.currentTime || 0);
    sync();
    audio.addEventListener("timeupdate", sync);
    audio.addEventListener("seeked", sync);
    return () => {
      audio.removeEventListener("timeupdate", sync);
      audio.removeEventListener("seeked", sync);
    };
  }, [audioRef, currentIndex]);

  return (
    <section id="tracks" className="relative py-14 sm:py-16">
      <div className="container max-w-4xl">
        <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-neon-cyan">Setlist</div>
            <h2 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
              Tocando <span className="text-gradient-neon">agora</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-card/50 p-1 backdrop-blur sm:w-72">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                filter === "all"
                  ? "bg-neon-cyan/15 text-neon-cyan"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas ({tracks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("favorites")}
              className={`rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                filter === "favorites"
                  ? "bg-neon-magenta/15 text-neon-magenta"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Minha ({selectionTracks.length})
            </button>
          </div>
        </div>

        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
          {visible.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhuma faixa na Minha seleção.
              <br />
              Toque no ♥ para adicionar favoritos.
            </li>
          )}

          {visible.map(({ track: t, queueIndex }) => {
            const active = queueIndex === currentIndex;
            const favorited = isFavorite(t.id);
            const duration = durations[t.id];
            const timeLabel = active
              ? `${formatTime(liveTime)} / ${formatTime(duration ?? 0)}`
              : formatTime(duration ?? 0);

            return (
              <li
                key={t.id}
                className={`group flex items-center gap-3 px-3 py-3 transition-colors sm:gap-4 sm:px-5 sm:py-3.5 ${
                  active ? "bg-neon-magenta/5" : "hover:bg-neon-cyan/5"
                }`}
              >
                <CoverArt
                  src={getCover(t.id)}
                  alt={`Capa de ${t.title}`}
                  size="sm"
                  className={active ? "ring-1 ring-neon-magenta/50" : ""}
                />
                <button
                  onClick={() => {
                    if (active) togglePlay();
                    else if (queueIndex >= 0) selectIndex(queueIndex);
                  }}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all sm:h-11 sm:w-11 ${
                    active
                      ? "border-neon-magenta bg-neon-magenta/20 text-neon-magenta shadow-[0_0_20px_hsl(var(--neon-magenta)/0.5)]"
                      : "border-border text-foreground/70 group-hover:border-neon-cyan/60 group-hover:text-neon-cyan"
                  }`}
                  aria-label={`Tocar ${t.title}`}
                >
                  {active && isPlaying ? (
                    <Pause className="h-4 w-4" fill="currentColor" />
                  ) : (
                    <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate font-display text-base tracking-wider sm:text-lg ${
                      active ? "text-gradient-neon" : "text-foreground"
                    }`}
                  >
                    {String((queueIndex >= 0 ? queueIndex : 0) + 1).padStart(2, "0")} · {t.title}
                  </div>
                  <div className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                    <span className="truncate">{t.artist}</span>
                    {favorited && (
                      <span className="hidden shrink-0 text-[9px] uppercase tracking-widest text-neon-magenta sm:inline">
                        · Favorita
                      </span>
                    )}
                  </div>
                </div>

                {active && isPlaying && (
                  <div className="hidden items-end gap-[2px] sm:flex">
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

                <div
                  className={`shrink-0 font-mono text-[10px] tracking-wider sm:text-xs ${
                    active ? "text-neon-cyan" : "text-muted-foreground"
                  }`}
                  aria-label={active ? `Tempo ${timeLabel}` : `Duração ${timeLabel}`}
                >
                  {timeLabel}
                </div>

                <button
                  type="button"
                  onClick={() => toggleFavorite(t.id)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                    favorited
                      ? "text-neon-magenta"
                      : "text-muted-foreground hover:text-neon-magenta"
                  }`}
                  aria-label={
                    favorited
                      ? `Remover ${t.title} da Minha seleção`
                      : `Adicionar ${t.title} à Minha seleção`
                  }
                  title={favorited ? "Remover da Minha seleção" : "Adicionar à Minha seleção"}
                >
                  <Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {filter === "favorites"
            ? `${selectionTracks.length} na Minha seleção`
            : `${tracks.length} faixas em rotação`}
          {current ? ` · agora: ${current.title}` : ""}
        </p>
      </div>
    </section>
  );
};

export default Tracks;

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Heart,
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRadio } from "@/context/RadioContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import CoverArt from "@/components/CoverArt";
import MarqueeText from "@/components/MarqueeText";
import SpectrumVisualizer from "@/components/SpectrumVisualizer";

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

type PlaylistTab = "all" | "selection";

const FloatingPlayer = () => {
  const {
    current,
    isPlaying,
    radioOn,
    togglePlay,
    next,
    prev,
    tracks,
    currentIndex,
    selectIndex,
    audioRef,
    isFavorite,
    toggleFavorite,
    selectionTracks,
    getCover,
  } = useRadio();

  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistTab, setPlaylistTab] = useState<PlaylistTab>("all");
  const [isSeeking, setIsSeeking] = useState(false);
  const playlistRef = useRef<HTMLDivElement>(null);
  const activeProgressBarRef = useRef<HTMLDivElement | null>(null);
  const seekingRef = useRef(false);

  const favorited = isFavorite(current.id);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted, audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (seekingRef.current) return;
      const { currentTime: time, duration: dur } = audio;
      setCurrentTime(Number.isFinite(time) ? time : 0);
      setDuration(Number.isFinite(dur) && dur > 0 ? dur : 0);
      if (!dur || !Number.isFinite(dur) || dur <= 0) {
        setProgress(0);
        return;
      }
      setProgress((time / dur) * 100);
    };

    updateProgress();
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("durationchange", updateProgress);
    audio.addEventListener("ended", updateProgress);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateProgress);
      audio.removeEventListener("durationchange", updateProgress);
      audio.removeEventListener("ended", updateProgress);
    };
  }, [audioRef, currentIndex]);

  useEffect(() => {
    setProgress(0);
    setCurrentTime(0);
  }, [currentIndex]);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!playlistRef.current?.contains(event.target as Node)) {
        setPlaylistOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPlaylistOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const seekFromClientX = (clientX: number) => {
    const audio = audioRef.current;
    const bar = activeProgressBarRef.current;
    if (!audio || !bar || !audio.duration || !Number.isFinite(audio.duration)) return;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const nextTime = ratio * audio.duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    setProgress(ratio * 100);
  };

  const endSeek = () => {
    seekingRef.current = false;
    setIsSeeking(false);
    activeProgressBarRef.current = null;
  };

  const startSeek = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    activeProgressBarRef.current = event.currentTarget;
    seekingRef.current = true;
    setIsSeeking(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    seekFromClientX(event.clientX);
  };

  useEffect(() => {
    if (!isSeeking) return;

    const onMove = (event: PointerEvent) => seekFromClientX(event.clientX);
    const onUp = () => endSeek();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isSeeking]);

  const pickTrack = (indexInQueue: number) => {
    if (indexInQueue === currentIndex) {
      if (!isPlaying) togglePlay();
    } else {
      selectIndex(indexInQueue);
    }
    setPlaylistOpen(false);
  };

  const pickSelectionTrack = (trackId: string) => {
    const index = tracks.findIndex((item) => item.id === trackId);
    if (index >= 0) pickTrack(index);
  };

  const visibleTracks =
    playlistTab === "selection"
      ? selectionTracks.map((track) => ({
          track,
          queueIndex: tracks.findIndex((item) => item.id === track.id),
        }))
      : tracks.map((track, queueIndex) => ({ track, queueIndex }));

  const progressBar = (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="w-8 shrink-0 text-right font-mono text-[10px] tabular-nums text-neon-cyan/80">
        {formatTime(currentTime)}
      </span>
      <div
        role="slider"
        aria-label="Progresso da música"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || 0)}
        aria-valuenow={Math.round(currentTime)}
        tabIndex={0}
        className="group relative h-1.5 min-w-0 flex-1 cursor-pointer touch-none rounded-full bg-border/70"
        onPointerDown={startSeek}
        onKeyDown={(event) => {
          const audio = audioRef.current;
          if (!audio || !audio.duration) return;
          if (event.key === "ArrowRight") {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
          }
          if (event.key === "ArrowLeft") {
            audio.currentTime = Math.max(0, audio.currentTime - 5);
          }
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-neon-cyan to-neon-magenta"
          style={{
            width: `${progress}%`,
            transition: isSeeking ? "none" : "width 150ms linear",
          }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-foreground opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>
      <span className="w-8 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
        {formatTime(duration)}
      </span>
    </div>
  );

  return (
    <div
      ref={playlistRef}
      className="fixed bottom-3 left-1/2 z-50 w-[min(820px,calc(100vw-1.5rem))] -translate-x-1/2"
    >
      <div className="relative overflow-hidden rounded-2xl border border-neon-cyan/30 bg-card/55 backdrop-blur-xl shadow-[0_0_30px_-5px_hsl(var(--neon-magenta)/0.5)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] overflow-hidden rounded-t-2xl">
          <div className="h-full w-[200%] bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-cyan animate-marquee" />
        </div>

        {/* Espectro em segundo plano — modo Ondas (linhas onduladas) */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl">
          <SpectrumVisualizer
            className="absolute inset-0 h-full w-full opacity-90"
            mode="waves"
            intensity={0.85}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-card/88 via-card/55 to-card/15" />
        </div>

        {/* Esquerda: capa+título | Centro: timer | Direita: controles */}
        <div className="relative z-10 flex items-center gap-2 px-2.5 pt-2 sm:gap-3 sm:px-3 sm:pt-2.5">
          <CoverArt
            src={getCover(current.id)}
            alt={`Capa de ${current.title}`}
            size="sm"
            className={`h-10 w-10 sm:h-11 sm:w-11 ${isPlaying ? "ring-1 ring-neon-magenta/50" : ""}`}
          />

          <div className="min-w-0 w-[7.5rem] shrink-0 overflow-hidden sm:w-[11rem] md:w-[13rem]">
            <div className="flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full bg-neon-magenta ${
                  radioOn ? "animate-pulse" : "opacity-50"
                }`}
              />
              <span className="truncate text-[9px] uppercase tracking-[0.18em] text-neon-magenta/80">
                {radioOn ? "Ao vivo" : "Rádio"} · {currentIndex + 1}/{tracks.length}
              </span>
            </div>
            <MarqueeText
              text={current.title}
              className="font-display text-sm tracking-wider text-foreground sm:text-base"
            />
            <div className="truncate text-[10px] text-muted-foreground">{current.artist}</div>
          </div>

          <div className="hidden min-w-0 flex-1 md:flex">{progressBar}</div>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => toggleFavorite(current.id)}
              className={`h-8 w-8 ${
                favorited ? "text-neon-magenta" : "text-foreground/80 hover:text-neon-magenta"
              }`}
              aria-label={favorited ? "Remover da Minha seleção" : "Adicionar à Minha seleção"}
            >
              <Heart className={`h-3.5 w-3.5 ${favorited ? "fill-current" : ""}`} />
            </Button>

            <div className="relative">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setPlaylistOpen((open) => !open)}
                className={`h-8 w-8 ${
                  playlistOpen ? "bg-neon-cyan/10 text-neon-cyan" : "text-foreground/80 hover:text-neon-cyan"
                }`}
                aria-label="Selecionar faixa"
                aria-expanded={playlistOpen}
              >
                <ListMusic className="h-3.5 w-3.5" />
              </Button>

              {playlistOpen && (
                <div
                  role="menu"
                  className="absolute bottom-[calc(100%+0.55rem)] right-0 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-neon-cyan/30 bg-card/95 shadow-[0_0_35px_hsl(var(--neon-cyan)/0.2)] backdrop-blur-xl sm:w-80"
                >
                  <div className="border-b border-border/60 px-3 pt-2">
                    <div className="pb-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-neon-cyan/70">
                      Setlist
                    </div>
                    <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-background/40 p-1">
                      <button
                        type="button"
                        onClick={() => setPlaylistTab("all")}
                        className={`rounded-lg px-2 py-1.5 text-[10px] uppercase tracking-widest ${
                          playlistTab === "all"
                            ? "bg-neon-cyan/15 text-neon-cyan"
                            : "text-muted-foreground"
                        }`}
                      >
                        Todas ({tracks.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlaylistTab("selection")}
                        className={`rounded-lg px-2 py-1.5 text-[10px] uppercase tracking-widest ${
                          playlistTab === "selection"
                            ? "bg-neon-magenta/15 text-neon-magenta"
                            : "text-muted-foreground"
                        }`}
                      >
                        Minha ({selectionTracks.length})
                      </button>
                    </div>
                  </div>
                  <ul className="max-h-[11rem] overflow-y-auto p-1.5 [scrollbar-width:thin]">
                    {visibleTracks.length === 0 && (
                      <li className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                        Nenhuma faixa na Minha seleção.
                      </li>
                    )}
                    {visibleTracks.map(({ track, queueIndex }) => {
                      const active = queueIndex === currentIndex;
                      return (
                        <li key={track.id}>
                          <div
                            className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${
                              active ? "bg-neon-magenta/15" : "hover:bg-neon-cyan/10"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                playlistTab === "selection"
                                  ? pickSelectionTrack(track.id)
                                  : pickTrack(queueIndex)
                              }
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              <CoverArt src={getCover(track.id)} alt="" size="sm" />
                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block truncate text-sm font-display tracking-wider ${
                                    active ? "text-gradient-neon" : "text-foreground"
                                  }`}
                                >
                                  {track.title}
                                </span>
                                <span className="block truncate text-[10px] text-muted-foreground">
                                  {track.artist}
                                </span>
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(track.id);
                              }}
                              className={`flex h-8 w-8 items-center justify-center ${
                                isFavorite(track.id) ? "text-neon-magenta" : "text-muted-foreground"
                              }`}
                            >
                              <Heart className={`h-3.5 w-3.5 ${isFavorite(track.id) ? "fill-current" : ""}`} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={prev}
              className="h-8 w-8 text-foreground/80 hover:text-neon-cyan"
              aria-label="Anterior"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </Button>

            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pausar" : "Tocar"}
              className="mx-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan to-neon-magenta text-background shadow-[0_0_18px_hsl(var(--neon-magenta)/0.55)] sm:h-10 sm:w-10"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" fill="currentColor" />
              ) : (
                <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
              )}
            </button>

            <Button
              size="icon"
              variant="ghost"
              onClick={next}
              className="h-8 w-8 text-foreground/80 hover:text-neon-magenta"
              aria-label="Próxima"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMuted((m) => !m)}
              className="h-8 w-8 text-foreground/80 hover:text-neon-cyan"
              aria-label={muted ? "Ativar som" : "Silenciar"}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>

            <Slider
              value={[muted ? 0 : volume * 100]}
              onValueChange={(v) => {
                setMuted(false);
                setVolume(v[0] / 100);
              }}
              max={100}
              step={1}
              className="hidden w-16 lg:flex"
              aria-label="Volume"
            />
          </div>
        </div>

        {/* No mobile/tablet a barra fica abaixo (no desktop já está no meio) */}
        <div className="relative z-10 flex px-2.5 pb-1 md:hidden">{progressBar}</div>

        {/* Espaço sob o progresso para o espectro aparecer com mais clareza */}
        <div className="relative z-10 h-5 sm:h-6" aria-hidden="true" />
      </div>
    </div>
  );
};

export default FloatingPlayer;

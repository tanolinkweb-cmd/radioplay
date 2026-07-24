import { useEffect, useRef, useState } from "react";
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
  const progressBarRef = useRef<HTMLDivElement>(null);
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
    const bar = progressBarRef.current;
    if (!audio || !bar || !audio.duration || !Number.isFinite(audio.duration)) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const nextTime = ratio * audio.duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    setProgress(ratio * 100);
  };

  const endSeek = () => {
    seekingRef.current = false;
    setIsSeeking(false);
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

  return (
    <div
      ref={playlistRef}
      className="fixed bottom-3 left-1/2 z-50 w-[min(960px,calc(100vw-1.5rem))] -translate-x-1/2"
    >
      <div className="relative rounded-2xl border border-neon-cyan/30 bg-card/80 backdrop-blur-xl shadow-[0_0_30px_-5px_hsl(var(--neon-magenta)/0.5)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden rounded-t-2xl">
          <div className="h-full w-[200%] bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-cyan animate-marquee" />
        </div>

        <div className="flex flex-col gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          {/* Linha 1: capa + título (máximo de espaço para o nome) */}
          <div className="flex min-w-0 items-center gap-3">
            <CoverArt
              src={getCover(current.id)}
              alt={`Capa de ${current.title}`}
              size="md"
              className={isPlaying ? "ring-1 ring-neon-magenta/50" : ""}
            />

            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="mb-0.5 flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full bg-neon-magenta opacity-75 ${
                      radioOn ? "animate-ping" : ""
                    }`}
                  />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neon-magenta" />
                </span>
                <span className="truncate text-[9px] font-semibold uppercase tracking-[0.28em] text-neon-magenta/90">
                  {radioOn ? "Ao vivo" : "Rádio"} · Faixa {currentIndex + 1}/{tracks.length}
                </span>
              </div>

              <MarqueeText
                text={current.title}
                className="font-display text-lg tracking-wider text-foreground drop-shadow-[0_0_12px_hsl(var(--neon-cyan)/0.25)] sm:text-xl"
              />

              <div className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
                {current.artist}
              </div>
            </div>
          </div>

          {/* Linha 2: controles — título não compete por espaço */}
          <div className="flex items-center justify-between gap-1 sm:justify-end sm:gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => toggleFavorite(current.id)}
              className={`h-9 w-9 hover:bg-neon-magenta/10 ${
                favorited ? "text-neon-magenta" : "text-foreground/80 hover:text-neon-magenta"
              }`}
              aria-label={favorited ? "Remover da Minha seleção" : "Adicionar à Minha seleção"}
              title={favorited ? "Remover da Minha seleção" : "Adicionar à Minha seleção"}
            >
              <Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
            </Button>

            <div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setPlaylistOpen((open) => !open)}
                className={`h-9 w-9 hover:bg-neon-cyan/10 hover:text-neon-cyan ${
                  playlistOpen ? "bg-neon-cyan/10 text-neon-cyan" : "text-foreground/80"
                }`}
                aria-label="Selecionar faixa"
                aria-haspopup="menu"
                aria-expanded={playlistOpen}
                title="Selecionar faixa"
              >
                <ListMusic className="h-4 w-4" />
              </Button>

              {playlistOpen && (
                <div
                  role="menu"
                  aria-label="Lista de faixas"
                  className="absolute bottom-[calc(100%+0.65rem)] left-1/2 z-50 w-[calc(100%-1rem)] max-w-80 -translate-x-1/2 overflow-hidden rounded-2xl border border-neon-cyan/30 bg-card/95 shadow-[0_0_35px_hsl(var(--neon-cyan)/0.2)] backdrop-blur-xl sm:left-auto sm:right-4 sm:w-80 sm:translate-x-0"
                >
                  <div className="border-b border-border/60 px-3 pt-2">
                    <div className="pb-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-neon-cyan/70">
                      Setlist
                    </div>
                    <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-background/40 p-1">
                      <button
                        type="button"
                        onClick={() => setPlaylistTab("all")}
                        className={`rounded-lg px-2 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
                          playlistTab === "all"
                            ? "bg-neon-cyan/15 text-neon-cyan"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Todas ({tracks.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlaylistTab("selection")}
                        className={`rounded-lg px-2 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${
                          playlistTab === "selection"
                            ? "bg-neon-magenta/15 text-neon-magenta"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Minha ({selectionTracks.length})
                      </button>
                    </div>
                  </div>

                  <ul className="max-h-[11rem] overflow-y-auto overscroll-contain p-1.5 [scrollbar-width:thin]">
                    {visibleTracks.length === 0 && (
                      <li className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                        Nenhuma faixa na Minha seleção.
                        <br />
                        Toque no ♥ para adicionar.
                      </li>
                    )}
                    {visibleTracks.map(({ track, queueIndex }) => {
                      const active = queueIndex === currentIndex;
                      return (
                        <li key={track.id}>
                          <div
                            className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 transition-colors ${
                              active
                                ? "bg-neon-magenta/15 text-foreground"
                                : "text-muted-foreground hover:bg-neon-cyan/10 hover:text-foreground"
                            }`}
                          >
                            <button
                              type="button"
                              role="menuitemradio"
                              aria-checked={active}
                              onClick={() =>
                                playlistTab === "selection"
                                  ? pickSelectionTrack(track.id)
                                  : pickTrack(queueIndex)
                              }
                              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left"
                            >
                              <CoverArt
                                src={getCover(track.id)}
                                alt={`Capa de ${track.title}`}
                                size="sm"
                                className={active ? "ring-1 ring-neon-magenta/60" : ""}
                              />
                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block truncate text-sm font-display tracking-wider ${
                                    active ? "text-gradient-neon" : ""
                                  }`}
                                >
                                  {track.title}
                                </span>
                                <span className="block truncate text-[10px] uppercase tracking-widest text-muted-foreground">
                                  {track.artist}
                                </span>
                              </span>
                              {active && isPlaying && (
                                <span className="flex items-end gap-[2px]">
                                  {[0, 1, 2].map((bar) => (
                                    <span
                                      key={bar}
                                      className="w-[2px] rounded-sm bg-neon-cyan"
                                      style={{
                                        height: "12px",
                                        animation: `equalize ${0.5 + bar * 0.15}s ease-in-out ${bar * 0.05}s infinite`,
                                      }}
                                    />
                                  ))}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleFavorite(track.id);
                              }}
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                                isFavorite(track.id)
                                  ? "text-neon-magenta"
                                  : "text-muted-foreground hover:text-neon-magenta"
                              }`}
                              aria-label={
                                isFavorite(track.id)
                                  ? `Remover ${track.title} da seleção`
                                  : `Adicionar ${track.title} à seleção`
                              }
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

            <div className="flex flex-1 items-center justify-center gap-1 sm:flex-none sm:gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={prev}
                className="h-9 w-9 text-foreground/80 hover:bg-neon-cyan/10 hover:text-neon-cyan"
                aria-label="Anterior"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pausar rádio" : "Tocar rádio"}
                className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan to-neon-magenta text-background shadow-[0_0_20px_hsl(var(--neon-magenta)/0.6)] transition-transform hover:scale-105 active:scale-95"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-neon-cyan to-neon-magenta opacity-0 blur-md transition-opacity group-hover:opacity-80" />
                {isPlaying ? (
                  <Pause className="relative h-5 w-5" fill="currentColor" />
                ) : (
                  <Play className="relative h-5 w-5 translate-x-[1px]" fill="currentColor" />
                )}
              </button>

              <Button
                size="icon"
                variant="ghost"
                onClick={next}
                className="h-9 w-9 text-foreground/80 hover:bg-neon-magenta/10 hover:text-neon-magenta"
                aria-label="Próxima"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setMuted((m) => !m)}
                className="h-9 w-9 text-foreground/80 hover:bg-neon-cyan/10 hover:text-neon-cyan"
                aria-label={muted ? "Ativar som" : "Silenciar"}
              >
                {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[muted ? 0 : volume * 100]}
                onValueChange={(v) => {
                  setMuted(false);
                  setVolume(v[0] / 100);
                }}
                max={100}
                step={1}
                className="w-24"
                aria-label="Volume"
              />
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMuted((m) => !m)}
              className="h-9 w-9 text-foreground/80 hover:bg-neon-cyan/10 hover:text-neon-cyan sm:hidden"
              aria-label={muted ? "Ativar som" : "Silenciar"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="px-3 pb-3 sm:px-5">
          <div
            ref={progressBarRef}
            role="slider"
            aria-label="Progresso da música"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration || 0)}
            aria-valuenow={Math.round(currentTime)}
            aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
            tabIndex={0}
            className="group relative h-2 cursor-pointer touch-none rounded-full bg-border/70 sm:h-1.5"
            onPointerDown={(event) => {
              event.preventDefault();
              seekingRef.current = true;
              setIsSeeking(true);
              progressBarRef.current?.setPointerCapture?.(event.pointerId);
              seekFromClientX(event.clientX);
            }}
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
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-neon-cyan to-neon-magenta shadow-[0_0_12px_hsl(var(--neon-magenta)/0.55)]"
              style={{
                width: `${progress}%`,
                transition: isSeeking ? "none" : "width 150ms linear",
              }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-foreground opacity-90 shadow-[0_0_10px_hsl(var(--neon-cyan)/0.8)] sm:h-3 sm:w-3 sm:opacity-0 sm:group-hover:opacity-100"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground">
            <span className="text-neon-cyan/80">{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingPlayer;

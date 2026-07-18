import { useEffect, useRef, useState } from "react";
import { ListMusic, Pause, Play, Radio, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useRadio } from "@/context/RadioContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const FloatingPlayer = () => {
  const {
    current,
    isPlaying,
    togglePlay,
    next,
    prev,
    tracks,
    currentIndex,
    selectIndex,
    audioRef,
  } = useRadio();

  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const playlistRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted, audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const { currentTime, duration } = audio;
      if (!duration || !Number.isFinite(duration) || duration <= 0) {
        setProgress(0);
        return;
      }
      setProgress((currentTime / duration) * 100);
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
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio * 100);
  };

  const pickTrack = (index: number) => {
    if (index === currentIndex) {
      if (!isPlaying) togglePlay();
    } else {
      selectIndex(index);
    }
    setPlaylistOpen(false);
  };

  return (
    <div
      ref={playlistRef}
      className="fixed bottom-3 left-1/2 z-50 w-[min(960px,calc(100vw-1.5rem))] -translate-x-1/2"
    >
      <div className="relative rounded-2xl border border-neon-cyan/30 bg-card/80 backdrop-blur-xl shadow-[0_0_30px_-5px_hsl(var(--neon-magenta)/0.5)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden rounded-t-2xl">
          <div className="h-full w-[200%] bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-cyan animate-marquee" />
        </div>

        <div className="flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3">
          <div className="hidden items-center gap-2 rounded-full border border-neon-magenta/50 bg-neon-magenta/10 px-3 py-1 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-magenta opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-magenta" />
            </span>
            <span className="font-display text-xs tracking-widest text-neon-magenta">AO VIVO</span>
          </div>

          <Radio className="h-5 w-5 shrink-0 text-neon-cyan sm:hidden" />

          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-display text-base tracking-wider text-foreground sm:text-lg">
                {current.title}
              </span>
              <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                — {current.artist}
              </span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-neon-cyan/70">
              Faixa {currentIndex + 1} / {tracks.length}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
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
                  <div className="border-b border-border/60 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-neon-cyan/70">
                    Setlist · {tracks.length} faixas
                  </div>
                  {/* ~4 itens visíveis (~2.75rem cada) com scroll */}
                  <ul className="max-h-[11rem] overflow-y-auto overscroll-contain p-1.5 [scrollbar-width:thin]">
                    {tracks.map((track, index) => {
                      const active = index === currentIndex;
                      return (
                        <li key={`${track.src}-${index}`}>
                          <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={active}
                            onClick={() => pickTrack(index)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                              active
                                ? "bg-neon-magenta/15 text-foreground"
                                : "text-muted-foreground hover:bg-neon-cyan/10 hover:text-foreground"
                            }`}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-display tracking-wider ${
                                active
                                  ? "border-neon-magenta text-neon-magenta shadow-[0_0_12px_hsl(var(--neon-magenta)/0.45)]"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-sm ${active ? "text-gradient-neon font-display tracking-wider" : "font-display tracking-wider"}`}>
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
              className="h-9 w-9 text-foreground/80 hover:bg-neon-cyan/10 hover:text-neon-cyan"
              aria-label="Anterior"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pausar" : "Tocar"}
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

            <div className="ml-1 hidden items-center gap-2 sm:flex">
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

        {/* Barra de progresso: esquerda → direita conforme currentTime/duration */}
        <div className="px-3 pb-3 sm:px-5">
          <div
            ref={progressBarRef}
            role="slider"
            aria-label="Progresso da música"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            tabIndex={0}
            className="group relative h-1.5 cursor-pointer overflow-hidden rounded-full bg-border/70"
            onClick={(event) => seekFromClientX(event.clientX)}
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
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-neon-cyan to-neon-magenta shadow-[0_0_12px_hsl(var(--neon-magenta)/0.55)] transition-[width] duration-150 ease-linear"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-foreground opacity-0 shadow-[0_0_10px_hsl(var(--neon-cyan)/0.8)] transition-opacity group-hover:opacity-100"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingPlayer;

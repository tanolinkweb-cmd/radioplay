import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";

export type Track = {
  title: string;
  artist: string;
  src: string;
};

// Faixas oficiais em /public/music (mesma origem = sem CORS).
const DEMO_TRACKS: Track[] = [
  {
    title: "Alucinação (Cover 2025)",
    artist: "Tonelada Elétrica",
    src: `${import.meta.env.BASE_URL}music/Alucinacao_cover_2025.mp3`,
  },
  {
    title: "Atak 2026 (Extend)",
    artist: "Tonelada Elétrica",
    src: `${import.meta.env.BASE_URL}music/Atak_2026_Extend_1.mp3`,
  },
  {
    title: "Ataque Tonelada (Onbeat)",
    artist: "Tonelada Elétrica",
    src: `${import.meta.env.BASE_URL}music/Ataque_Tonelada_Onbeat_1.mp3`,
  },
  {
    title: "Meu Violão",
    artist: "Tonelada Elétrica",
    src: `${import.meta.env.BASE_URL}music/Meu_Violao.mp3`,
  },
  {
    title: "Na Brisa do Pensamento",
    artist: "Tonelada Elétrica",
    src: `${import.meta.env.BASE_URL}music/Na_Brisa_do_Pensamento.mp3`,
  },
  {
    title: "Na Brisa do Pensamento (v2)",
    artist: "Tonelada Elétrica",
    src: `${import.meta.env.BASE_URL}music/Na_Brisa_do_Pensamento_v2.mp3`,
  },
  {
    title: "Ruas (Cover)",
    artist: "Tonelada Elétrica",
    src: `${import.meta.env.BASE_URL}music/Ruas_Cover.mp3`,
  },
  {
    title: "Sem Regras",
    artist: "Tonelada Elétrica",
    src: `${import.meta.env.BASE_URL}music/Sem_Regras.mp3`,
  },
  {
    title: "Soumm",
    artist: "Tonelada Elétrica",
    src: `${import.meta.env.BASE_URL}music/Soumm.mp3`,
  },
];

type RadioContextValue = {
  tracks: Track[];
  currentIndex: number;
  current: Track;
  isPlaying: boolean;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  selectIndex: (i: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  analyser: AnalyserNode | null;
  ensureAudioGraph: () => void;
};

const RadioContext = createContext<RadioContextValue | null>(null);

export const RadioProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playAfterSelectRef = useRef(false);

  const ensureAudioGraph = useCallback(() => {
    if (!audioRef.current) return;
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(audioRef.current);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.82;
      src.connect(an);
      an.connect(ctx.destination);
      audioCtxRef.current = ctx;
      sourceRef.current = src;
      setAnalyser(an);
    }
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    ensureAudioGraph();
    if (a.paused) {
      a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, [ensureAudioGraph]);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % DEMO_TRACKS.length);
  }, []);
  const prev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length);
  }, []);
  const selectIndex = useCallback((i: number) => {
    playAfterSelectRef.current = true;
    setCurrentIndex(i);
  }, []);

  // When track changes, autoplay if was playing or selected from playlist
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const shouldPlay = isPlaying || playAfterSelectRef.current;
    playAfterSelectRef.current = false;
    a.load();
    if (shouldPlay) {
      ensureAudioGraph();
      a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const value = useMemo<RadioContextValue>(() => ({
    tracks: DEMO_TRACKS,
    currentIndex,
    current: DEMO_TRACKS[currentIndex],
    isPlaying,
    togglePlay,
    next,
    prev,
    selectIndex,
    audioRef,
    analyser,
    ensureAudioGraph,
  }), [currentIndex, isPlaying, togglePlay, next, prev, selectIndex, analyser, ensureAudioGraph]);

  return (
    <RadioContext.Provider value={value}>
      {children}
      {/* Persistent audio element - survives all section changes */}
      <audio
        ref={audioRef}
        src={DEMO_TRACKS[currentIndex].src}
        crossOrigin="anonymous"
        preload="metadata"
        onEnded={next}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </RadioContext.Provider>
  );
};

export const useRadio = () => {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used within RadioProvider");
  return ctx;
};

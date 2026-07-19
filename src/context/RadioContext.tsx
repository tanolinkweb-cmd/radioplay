import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";

export type Track = {
  title: string;
  artist: string;
  src: string;
};

const musicSrc = (filename: string) =>
  `${import.meta.env.BASE_URL}music/${encodeURIComponent(filename)}`;

// Catálogo oficial em /public/music (mesma origem = sem CORS).
const CATALOG: Track[] = [
  { title: "Alucinação", artist: "Tonelada Elétrica", src: musicSrc("alucinacao.mp3") },
  { title: "Alucinação (Cover 2025)", artist: "Tonelada Elétrica", src: musicSrc("Alucinacao_cover_2025.mp3") },
  { title: "Alucination Back Free", artist: "Tonelada Elétrica", src: musicSrc("alucination back free.mp3") },
  { title: "Atak 2026 (Extend)", artist: "Tonelada Elétrica", src: musicSrc("Atak_2026_Extend_1.mp3") },
  { title: "Ataque — Tonelada Elétrica V1", artist: "Tonelada Elétrica", src: musicSrc("Ataque  - Tonelada Elétrica V1.mp3") },
  { title: "Ataque Tonelada (Onbeat)", artist: "Tonelada Elétrica", src: musicSrc("Ataque_Tonelada_Onbeat_1.mp3") },
  { title: "Ataque-Tonelada V3", artist: "Tonelada Elétrica", src: musicSrc("Ataque-Tonelada V3.mp3") },
  { title: "Faça seu site com Magic Page", artist: "Tonelada Elétrica", src: musicSrc("faca seu site com Magic Page.mp3") },
  { title: "Instrumental Manguebeat", artist: "Tonelada Elétrica", src: musicSrc("instrumental manguebeat.mp3") },
  { title: "Meu Violão", artist: "Tonelada Elétrica", src: musicSrc("Meu_Violao.mp3") },
  { title: "Mina Gasolina (Cover 2026)", artist: "Tonelada Elétrica", src: musicSrc("Mina Gasolina- Tonelada Elétrica Cover  2026.mp3") },
  { title: "Na Brisa do Pensamento", artist: "Tonelada Elétrica", src: musicSrc("Na_Brisa_do_Pensamento.mp3") },
  { title: "No Compasso da Onda", artist: "Tonelada Elétrica", src: musicSrc("No compasso da onda.mp3") },
  { title: "Outros Tempos", artist: "Tonelada Elétrica", src: musicSrc("Outros Tempos.mp3") },
  { title: "Ruas Vazias (Cover)", artist: "Tonelada Elétrica", src: musicSrc("Ruas Vazias (Cover).mp3") },
  { title: "Ruas (Cover)", artist: "Tonelada Elétrica", src: musicSrc("Ruas_Cover.mp3") },
  { title: "Sem Regras", artist: "Tonelada Elétrica", src: musicSrc("Sem_Regras.mp3") },
  { title: "Sirenes do Mangue (Cover)", artist: "Tonelada Elétrica", src: musicSrc("Sirenes do Mangue (Cover).mp3") },
  { title: "Somos Contra (Cover 2026)", artist: "Tonelada Elétrica", src: musicSrc("Somos Contra - Sistema Nervoso Versão Cover 2026.mp3") },
  { title: "Soumm", artist: "Tonelada Elétrica", src: musicSrc("Soumm.mp3") },
  { title: "Swamp Shuffle Trance", artist: "Tonelada Elétrica", src: musicSrc("Swamp Shuffle Trance.mp3") },
  { title: "Tempo Espaço", artist: "Tonelada Elétrica", src: musicSrc("Tempo Espaço -Tonelada Elétrica.mp3") },
  { title: "Tirando Onda na Contra Mão", artist: "Tonelada Elétrica", src: musicSrc("Tirando Onda na Contra mão.mp3") },
  { title: "Um Risco no Tempo", artist: "Tonelada Elétrica", src: musicSrc("Um Risco no tempo.mp3") },
  { title: "Uma Tonelada", artist: "Tonelada Elétrica", src: musicSrc("Uma Tonelada.mp3") },
];

function shuffleTracks(tracks: Track[]): Track[] {
  const arr = [...tracks];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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
  // Ordem aleatória a cada carga do site
  const [tracks] = useState<Track[]>(() => shuffleTracks(CATALOG));
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
    setCurrentIndex((i) => (i + 1) % tracks.length);
  }, [tracks.length]);
  const prev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);
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
    tracks,
    currentIndex,
    current: tracks[currentIndex],
    isPlaying,
    togglePlay,
    next,
    prev,
    selectIndex,
    audioRef,
    analyser,
    ensureAudioGraph,
  }), [tracks, currentIndex, isPlaying, togglePlay, next, prev, selectIndex, analyser, ensureAudioGraph]);

  return (
    <RadioContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={tracks[currentIndex]?.src}
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

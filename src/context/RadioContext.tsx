import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";

export type Track = {
  id: string;
  title: string;
  artist: string;
  src: string;
  filename: string;
};

const musicSrc = (filename: string) =>
  `${import.meta.env.BASE_URL}music/${encodeURIComponent(filename)}`;

const track = (filename: string, title: string, artist = "Tonelada Elétrica"): Track => ({
  id: filename,
  filename,
  title,
  artist,
  src: musicSrc(filename),
});

// Catálogo oficial em /public/music (mesma origem = sem CORS).
const CATALOG: Track[] = [
  track("A Cidade Pulsa no Escuro.mp3", "A Cidade Pulsa no Escuro"),
  track("alucinação and Correntes.mp3", "Alucinação and Correntes"),
  track("alucinacao.mp3", "Alucinação"),
  track("Alucinacao_cover_2025.mp3", "Alucinação (Cover 2025)"),
  track("alucination back free.mp3", "Alucination Back Free"),
  track("Atak_2026_Extend_1.mp3", "Atak 2026 (Extend)"),
  track("Ataque  - Tonelada Elétrica V1.mp3", "Ataque — Tonelada Elétrica V1"),
  track("Ataque_Tonelada_Onbeat_1.mp3", "Ataque Tonelada (Onbeat)"),
  track("Ataque-Tonelada V3.mp3", "Ataque-Tonelada V3"),
  track("da Garagem.mp3", "Da Garagem"),
  track("faca seu site com Magic Page.mp3", "Faça seu site com Magic Page"),
  track("instrumental manguebeat.mp3", "Instrumental Manguebeat"),
  track("Meu_Violao.mp3", "Meu Violão"),
  track("Mina Gasolina- Tonelada Elétrica Cover  2026.mp3", "Mina Gasolina (Cover 2026)"),
  track("Na_Brisa_do_Pensamento.mp3", "Na Brisa do Pensamento"),
  track("No compasso da onda.mp3", "No Compasso da Onda"),
  track("Outros Tempos.mp3", "Outros Tempos"),
  track("Rolling Thunder Vol2.mp3", "Rolling Thunder Vol. 2"),
  track("Ruas Vazias (Cover).mp3", "Ruas Vazias (Cover)"),
  track("Ruas_Cover.mp3", "Ruas (Cover)"),
  track("Sem_Regras.mp3", "Sem Regras"),
  track("Sinta o Groove.mp3", "Sinta o Groove"),
  track("Sirenes do Mangue (Cover).mp3", "Sirenes do Mangue (Cover)"),
  track("Som Reagge v1 instrumental.mp3", "Som Reggae v1 (Instrumental)"),
  track("Somos Contra - Sistema Nervoso Versão Cover 2026.mp3", "Somos Contra (Cover 2026)"),
  track("Soumm.mp3", "Soumm"),
  track("Swamp Shuffle Trance.mp3", "Swamp Shuffle Trance"),
  track("Tempo Espaço -Tonelada Elétrica.mp3", "Tempo Espaço"),
  track("Tirando Onda na Contra mão.mp3", "Tirando Onda na Contra Mão"),
  track("Um Risco no tempo.mp3", "Um Risco no Tempo"),
  track("Uma Tonelada.mp3", "Uma Tonelada"),
];

const SELECTION_STORAGE_KEY = "tonelada-selection";

function shuffleTracks(tracks: Track[]): Track[] {
  const arr = [...tracks];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function readSelectionIds(): string[] {
  try {
    const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

type RadioContextValue = {
  tracks: Track[];
  catalog: Track[];
  currentIndex: number;
  current: Track;
  isPlaying: boolean;
  radioOn: boolean;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  selectIndex: (i: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  analyser: AnalyserNode | null;
  ensureAudioGraph: () => void;
  selectionIds: string[];
  selectionTracks: Track[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
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
  const [radioOn, setRadioOn] = useState(false);
  const [selectionIds, setSelectionIds] = useState<string[]>(() => readSelectionIds());
  const playAfterChangeRef = useRef(false);
  const radioOnRef = useRef(false);

  useEffect(() => {
    radioOnRef.current = radioOn;
  }, [radioOn]);

  useEffect(() => {
    localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selectionIds));
  }, [selectionIds]);

  const ensureAudioGraph = useCallback(() => {
    if (!audioRef.current) return;
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(audioRef.current);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.58;
      an.minDecibels = -88;
      an.maxDecibels = -12;
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
      setRadioOn(true);
      radioOnRef.current = true;
      a.play().then(() => setIsPlaying(true)).catch(() => {
        setIsPlaying(false);
        setRadioOn(false);
        radioOnRef.current = false;
      });
    } else {
      // Só para quando o usuário pausa explicitamente
      setRadioOn(false);
      radioOnRef.current = false;
      a.pause();
      setIsPlaying(false);
    }
  }, [ensureAudioGraph]);

  const next = useCallback(() => {
    if (radioOnRef.current) playAfterChangeRef.current = true;
    setCurrentIndex((i) => (i + 1) % tracks.length);
  }, [tracks.length]);

  const prev = useCallback(() => {
    if (radioOnRef.current) playAfterChangeRef.current = true;
    setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);

  const selectIndex = useCallback((i: number) => {
    // Escolher faixa liga o modo rádio e toca
    setRadioOn(true);
    radioOnRef.current = true;
    playAfterChangeRef.current = true;
    setCurrentIndex(i);
  }, []);

  // Troca de faixa: mantém rádio contínua se estiver ligada
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const shouldPlay = radioOnRef.current || playAfterChangeRef.current;
    playAfterChangeRef.current = false;
    a.load();
    if (shouldPlay) {
      ensureAudioGraph();
      a.play().then(() => setIsPlaying(true)).catch(() => {
        setIsPlaying(false);
        setRadioOn(false);
        radioOnRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const isFavorite = useCallback(
    (id: string) => selectionIds.includes(id),
    [selectionIds],
  );

  const toggleFavorite = useCallback((id: string) => {
    setSelectionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const selectionTracks = useMemo(
    () => CATALOG.filter((item) => selectionIds.includes(item.id)),
    [selectionIds],
  );

  const value = useMemo<RadioContextValue>(() => ({
    tracks,
    catalog: CATALOG,
    currentIndex,
    current: tracks[currentIndex],
    isPlaying,
    radioOn,
    togglePlay,
    next,
    prev,
    selectIndex,
    audioRef,
    analyser,
    ensureAudioGraph,
    selectionIds,
    selectionTracks,
    isFavorite,
    toggleFavorite,
  }), [
    tracks,
    currentIndex,
    isPlaying,
    radioOn,
    togglePlay,
    next,
    prev,
    selectIndex,
    analyser,
    ensureAudioGraph,
    selectionIds,
    selectionTracks,
    isFavorite,
    toggleFavorite,
  ]);

  return (
    <RadioContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={tracks[currentIndex]?.src}
        crossOrigin="anonymous"
        preload="metadata"
        onEnded={() => {
          // Rádio contínua: avança e segue tocando até o usuário pausar
          if (radioOnRef.current) {
            playAfterChangeRef.current = true;
            setCurrentIndex((i) => (i + 1) % tracks.length);
          } else {
            setIsPlaying(false);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          // Ignora pause transitório ao trocar faixa no modo rádio
          if (!radioOnRef.current) setIsPlaying(false);
        }}
      />
    </RadioContext.Provider>
  );
};

export const useRadio = () => {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used within RadioProvider");
  return ctx;
};

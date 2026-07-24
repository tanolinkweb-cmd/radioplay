import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { DEFAULT_COVER, resolveTrackCover } from "@/lib/coverArt";

export type Track = {
  id: string;
  title: string;
  artist: string;
  src: string;
  filename: string;
  /** Número fixo na setlist (ordem alfabética). */
  number: number;
};

const musicSrc = (filename: string) =>
  `${import.meta.env.BASE_URL}music/${encodeURIComponent(filename)}`;

const track = (filename: string, title: string, artist = "Tonelada Elétrica"): Omit<Track, "number"> => ({
  id: filename,
  filename,
  title,
  artist,
  src: musicSrc(filename),
});

// Catálogo base — numeração e ordem vêm da ordenação alfabética abaixo
const CATALOG_RAW: Omit<Track, "number">[] = [
  track("A Cidade Pulsa no Escuro.mp3", "A Cidade Pulsa no Escuro"),
  track("Atak_2026_Extend_1.mp3", "Atak 2026 (Extend)"),
  track("Ataque  - Tonelada Elétrica V1.mp3", "Ataque — Tonelada Elétrica V1"),
  track("Follow the Sound Instrumental.mp3", "Follow the Sound (Instrumental)"),
  track("Little Girl - Tonelada Eletrica.mp3", "Little Girl"),
  track("Meu_Violao.mp3", "Meu Violão"),
  track("Mina Gasolina - Sistema Nervoso.mp3", "Mina Gasolina — Sistema Nervoso"),
  track("Murmur of Brasswood.mp3", "Murmur of Brasswood"),
  track("No compasso da onda.mp3", "No Compasso da Onda"),
  track("Rolling Groove.mp3", "Rolling Groove"),
  track("Rolling Thunder Vol2.mp3", "Rolling Thunder Vol. 2"),
  track("Ruas Vazias (Cover).mp3", "Ruas Vazias (Cover)"),
  track("Sinta o Groove.mp3", "Sinta o Groove"),
  track("Som Reagge v1 instrumental.mp3", "Som Reggae v1 (Instrumental)"),
  track("Sweet guitar.mp3", "Sweet Guitar"),
  track("Tempo Espaço -Tonelada Elétrica.mp3", "Tempo Espaço"),
  track("Uma Tonelada.mp3", "Uma Tonelada"),
  track("Which Sheila.mp3", "Which Sheila"),
];

/** Sempre A→Z; novas faixas entram na posição alfabética e ganham número estável. */
const CATALOG: Track[] = [...CATALOG_RAW]
  .sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }))
  .map((item, index) => ({ ...item, number: index + 1 }));

const SELECTION_STORAGE_KEY = "tonelada-selection";

function randomStartIndex(length: number) {
  if (length <= 0) return 0;
  return Math.floor(Math.random() * length);
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
  covers: Record<string, string>;
  getCover: (id: string) => string;
};

const RadioContext = createContext<RadioContextValue | null>(null);

export const RadioProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [tracks] = useState<Track[]>(CATALOG);
  const [currentIndex, setCurrentIndex] = useState(() => randomStartIndex(CATALOG.length));
  const [isPlaying, setIsPlaying] = useState(false);
  const [radioOn, setRadioOn] = useState(false);
  const [selectionIds, setSelectionIds] = useState<string[]>(() => readSelectionIds());
  const [covers, setCovers] = useState<Record<string, string>>({});
  const playAfterChangeRef = useRef(false);
  const radioOnRef = useRef(false);

  useEffect(() => {
    radioOnRef.current = radioOn;
  }, [radioOn]);

  useEffect(() => {
    localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selectionIds));
  }, [selectionIds]);

  // Extrai capas ID3 (ou usa default) para todas as faixas
  useEffect(() => {
    let cancelled = false;
    CATALOG.forEach(async (item) => {
      const cover = await resolveTrackCover(item.src);
      if (cancelled) return;
      setCovers((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: cover }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const getCover = useCallback(
    (id: string) => covers[id] || DEFAULT_COVER,
    [covers],
  );

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
    setRadioOn(true);
    radioOnRef.current = true;
    playAfterChangeRef.current = true;
    setCurrentIndex(i);
  }, []);

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
    covers,
    getCover,
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
    covers,
    getCover,
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
          if (radioOnRef.current) {
            playAfterChangeRef.current = true;
            setCurrentIndex((i) => (i + 1) % tracks.length);
          } else {
            setIsPlaying(false);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
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

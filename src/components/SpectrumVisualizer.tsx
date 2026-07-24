import { useEffect, useRef } from "react";
import { useRadio } from "@/context/RadioContext";

export type VisualizationMode =
  | "bars"
  | "waves"
  | "circles"
  | "ovals"
  | "particles"
  | "neon";

interface Props {
  className?: string;
  intensity?: number;
  mode?: VisualizationMode;
}

type Particle = {
  angle: number;
  distance: number;
  speed: number;
  size: number;
  hue: number;
};

const CYAN = "0, 229, 255";
const MAGENTA = "255, 0, 170";

const SpectrumVisualizer = ({ className, intensity = 1, mode = "bars" }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const { analyser, isPlaying } = useRadio();
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frequencyData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const timeData = analyser ? new Uint8Array(analyser.fftSize) : null;
    const particles = createParticles(100);
    let bassBaseline = 0;
    let beatPulse = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 1 || h < 1) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      phaseRef.current += isPlaying ? 0.018 : 0.008;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      const frequency = readFrequency(analyser, frequencyData, phaseRef.current, isPlaying);
      const waveform = readWaveform(analyser, timeData, phaseRef.current, isPlaying);
      const bass = average(frequency, 0, 18);
      bassBaseline += (bass - bassBaseline) * (bass > bassBaseline ? 0.08 : 0.025);
      const transient = Math.max(0, bass - bassBaseline);
      beatPulse = isPlaying
        ? Math.max(beatPulse * 0.82, Math.min(1, transient * 4.5 + bass * 0.18))
        : beatPulse * 0.88;

      switch (mode) {
        case "waves":
          drawWaves(ctx, w, h, waveform, frequency, intensity, beatPulse);
          break;
        case "circles":
          drawCircles(ctx, w, h, frequency, phaseRef.current, intensity, beatPulse);
          break;
        case "ovals":
          drawOvals(ctx, w, h, frequency, phaseRef.current, intensity, beatPulse);
          break;
        case "particles":
          drawParticles(ctx, w, h, particles, frequency, phaseRef.current, isPlaying, intensity, beatPulse);
          break;
        case "neon":
          drawNeonHaze(ctx, w, h, frequency, phaseRef.current, intensity, beatPulse);
          break;
        default:
          drawBars(ctx, w, h, frequency, intensity, beatPulse);
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isPlaying, intensity, mode]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
};

function readFrequency(
  analyser: AnalyserNode | null,
  target: Uint8Array | null,
  phase: number,
  isPlaying: boolean,
) {
  const values = new Array<number>(128);
  if (analyser && target) {
    analyser.getByteFrequencyData(target);
    for (let i = 0; i < values.length; i++) {
      const normalized = target[Math.min(i, target.length - 1)] / 255;
      const live = Math.min(1, Math.pow(normalized, 0.72) * (i < 24 ? 1.38 : 1.18));
      const idle = 0.08 + ((Math.sin(phase * 3 + i * 0.28) + 1) / 2) * 0.06;
      values[i] = isPlaying ? live : Math.max(live * 0.35, idle);
    }
    return values;
  }

  for (let i = 0; i < values.length; i++) {
    values[i] = 0.08 + ((Math.sin(phase * 3 + i * 0.28) + 1) / 2) * 0.1;
  }
  return values;
}

function readWaveform(
  analyser: AnalyserNode | null,
  target: Uint8Array | null,
  phase: number,
  isPlaying: boolean,
) {
  const values = new Array<number>(128);
  if (analyser && target && isPlaying) {
    analyser.getByteTimeDomainData(target);
    const step = target.length / values.length;
    for (let i = 0; i < values.length; i++) {
      values[i] = Math.max(-1, Math.min(1, ((target[Math.floor(i * step)] - 128) / 128) * 1.3));
    }
    return values;
  }

  for (let i = 0; i < values.length; i++) {
    values[i] = Math.sin(i * 0.2 + phase * 4) * 0.12;
  }
  return values;
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: number[],
  intensity: number,
  beat: number,
) {
  const barCount = 72;
  const gap = 3;
  const barWidth = Math.max(1, (w - gap * (barCount - 1)) / barCount);

  for (let i = 0; i < barCount; i++) {
    const bassWeight = 1 - i / barCount;
    const value = data[Math.floor((i / barCount) * data.length)] * intensity * (1 + beat * bassWeight * 0.62);
    const barH = Math.max(4, value * h * 0.95);
    const x = i * (barWidth + gap);
    const y = (h - barH) / 2;
    const t = i / barCount;
    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, `rgba(${Math.round(t * 255)},${255 - Math.round(t * 255)},${Math.round(255 - t * 75)},0.95)`);
    grad.addColorStop(1, `rgba(255,0,${Math.round(255 - t * 100)},0.95)`);
    ctx.shadowColor = i % 2 === 0 ? `rgba(${CYAN}, 0.7)` : `rgba(${MAGENTA}, 0.7)`;
    ctx.shadowBlur = 12;
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barWidth, barH, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(x, h / 2 + barH / 2 + 4, barWidth, Math.min(20, barH * 0.4));
    ctx.globalAlpha = 1;
  }
}

function drawWaves(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  waveform: number[],
  frequency: number[],
  intensity: number,
  beat: number,
) {
  const energy = average(frequency, 0, 36);
  const colors = [CYAN, MAGENTA, "151, 71, 255", CYAN];
  for (let line = 0; line < 4; line++) {
    ctx.beginPath();
    for (let i = 0; i < waveform.length; i++) {
      const x = (i / (waveform.length - 1)) * w;
      const offset = Math.sin(i * 0.1 + line * 1.7) * energy * (25 + beat * 22);
      const y = h / 2 + waveform[i] * h * (0.24 + line * 0.035) * intensity * (1 + beat * 0.5) + offset;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${colors[line]}, ${0.9 - line * 0.14})`;
    ctx.lineWidth = 2.8 - line * 0.4;
    ctx.shadowColor = `rgba(${colors[line]}, 0.85)`;
    ctx.shadowBlur = 18;
    ctx.stroke();
  }
}

function drawCircles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: number[],
  phase: number,
  intensity: number,
  beat: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const bass = average(data, 0, 16);
  const maxRadius = Math.min(w, h) * 0.42;

  for (let ring = 0; ring < 8; ring++) {
    const localEnergy = average(data, ring * 5, ring * 5 + 12);
    const pulse = Math.sin(phase * 4 - ring * 0.55) * 8;
    const radius = 35 + ring * (maxRadius / 9) + pulse + localEnergy * 80 * intensity + bass * 30 + beat * (62 - ring * 3);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(8, radius), 0, Math.PI * 2);
    const color = ring % 2 === 0 ? CYAN : MAGENTA;
    ctx.strokeStyle = `rgba(${color}, ${0.72 - ring * 0.055})`;
    ctx.lineWidth = 1.5 + localEnergy * 4;
    ctx.shadowColor = `rgba(${color}, 0.8)`;
    ctx.shadowBlur = 18;
    ctx.stroke();
  }
}

function drawOvals(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: number[],
  phase: number,
  intensity: number,
  beat: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const max = Math.min(w, h);

  for (let ring = 0; ring < 10; ring++) {
    const energy = average(data, ring * 6, ring * 6 + 14);
    const base = 28 + ring * max * 0.038;
    const rotation = phase * (ring % 2 === 0 ? 0.25 : -0.18) + ring * 0.13;
    const radiusX = base * (1.45 + energy * intensity + beat * 0.32);
    const radiusY = base * (0.48 + energy * 0.75 * intensity + beat * 0.18);
    ctx.beginPath();
    ctx.ellipse(cx, cy, radiusX, radiusY, rotation, 0, Math.PI * 2);
    const color = ring % 3 === 0 ? MAGENTA : CYAN;
    ctx.strokeStyle = `rgba(${color}, ${0.76 - ring * 0.052})`;
    ctx.lineWidth = 1.2 + energy * 3;
    ctx.shadowColor = `rgba(${color}, 0.75)`;
    ctx.shadowBlur = 14;
    ctx.stroke();
  }
}

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * Math.PI * 2 + Math.random() * 0.2,
    distance: Math.random(),
    speed: 0.0015 + Math.random() * 0.004,
    size: 1 + Math.random() * 2.5,
    hue: Math.random() > 0.5 ? 187 : 320,
  }));
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  particles: Particle[],
  data: number[],
  phase: number,
  isPlaying: boolean,
  intensity: number,
  beat: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const maxDistance = Math.hypot(w, h) * 0.55;
  const bass = average(data, 0, 18);

  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    const energy = data[i % data.length];
    particle.distance += particle.speed * (isPlaying ? 1 + bass * 8 + beat * 7 : 0.3);
    particle.angle += 0.0015 + energy * 0.005;
    if (particle.distance > 1) {
      particle.distance = Math.random() * 0.08;
      particle.angle = Math.random() * Math.PI * 2;
    }
    const burst = particle.distance * maxDistance * (0.35 + bass * intensity + beat * 0.3);
    const wobble = Math.sin(phase * 5 + i) * energy * 24;
    const x = cx + Math.cos(particle.angle) * (burst + wobble);
    const y = cy + Math.sin(particle.angle) * (burst + wobble);
    const radius = particle.size + energy * 7 * intensity;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${particle.hue}, 100%, 58%, ${0.3 + energy * 0.7})`;
    ctx.shadowColor = `hsla(${particle.hue}, 100%, 55%, 0.9)`;
    ctx.shadowBlur = 10 + energy * 22;
    ctx.fill();
  }
}

function drawNeonHaze(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: number[],
  phase: number,
  intensity: number,
  beat: number,
) {
  const bass = average(data, 0, 16);
  const mid = average(data, 16, 48);
  const high = average(data, 48, 90);
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const blobs = [
    { x: cx + Math.sin(phase * 0.7) * w * 0.18, y: cy + Math.cos(phase * 0.55) * h * 0.12, color: CYAN, energy: bass },
    { x: cx + Math.cos(phase * 0.5) * w * 0.22, y: cy + Math.sin(phase * 0.65) * h * 0.16, color: MAGENTA, energy: mid },
    { x: cx + Math.sin(phase * 0.9 + 1.2) * w * 0.14, y: cy - Math.cos(phase * 0.4) * h * 0.2, color: "151, 71, 255", energy: high },
    { x: cx - Math.cos(phase * 0.35) * w * 0.2, y: cy + Math.sin(phase * 0.8) * h * 0.1, color: CYAN, energy: (bass + mid) / 2 },
  ];

  for (const blob of blobs) {
    const radius = (Math.min(w, h) * 0.22 + blob.energy * Math.min(w, h) * 0.38 * intensity) * (1 + beat * 0.35);
    const glow = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, radius);
    glow.addColorStop(0, `rgba(${blob.color}, ${0.45 + blob.energy * 0.4 + beat * 0.2})`);
    glow.addColorStop(0.45, `rgba(${blob.color}, ${0.18 + blob.energy * 0.22})`);
    glow.addColorStop(1, `rgba(${blob.color}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Véu esfumaçado horizontal reagindo ao mid
  for (let i = 0; i < 5; i++) {
    const y = h * (0.2 + i * 0.15) + Math.sin(phase * 1.2 + i) * (8 + mid * 18);
    const band = ctx.createLinearGradient(0, y - 24, 0, y + 24);
    const color = i % 2 === 0 ? CYAN : MAGENTA;
    band.addColorStop(0, `rgba(${color}, 0)`);
    band.addColorStop(0.5, `rgba(${color}, ${0.08 + mid * 0.2 + beat * 0.1})`);
    band.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = band;
    ctx.fillRect(0, y - 28, w, 56);
  }

  ctx.restore();

  // Soft blur-like overlay via semi-transparent wash
  ctx.fillStyle = `rgba(8, 4, 16, ${0.12 - beat * 0.04})`;
  ctx.fillRect(0, 0, w, h);
}

function average(values: number[], start: number, end: number) {
  const safeEnd = Math.min(end, values.length);
  let total = 0;
  for (let i = start; i < safeEnd; i++) total += values[i];
  return total / Math.max(1, safeEnd - start);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export default SpectrumVisualizer;

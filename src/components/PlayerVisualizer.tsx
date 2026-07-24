import { useEffect, useRef } from "react";
import { useRadio } from "@/context/RadioContext";

const CYAN = "0, 229, 255";
const MAGENTA = "255, 0, 170";

/** Visualizador compacto para o floating player (espectro + onda). */
const PlayerVisualizer = ({ className = "" }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const { analyser, isPlaying } = useRadio();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const timeData = analyser ? new Uint8Array(analyser.fftSize) : null;
    let phase = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: w, clientHeight: h } = canvas;
      if (w < 1 || h < 1) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 1 || h < 1) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      phase += isPlaying ? 0.04 : 0.012;
      ctx.clearRect(0, 0, w, h);

      const bars = 48;
      const values = new Array<number>(bars).fill(0);

      if (analyser && freqData && isPlaying) {
        analyser.getByteFrequencyData(freqData);
        const usable = Math.min(freqData.length, Math.floor(freqData.length * 0.55));
        for (let i = 0; i < bars; i++) {
          const t = i / (bars - 1);
          const idx = Math.floor(t * t * (usable - 1));
          values[i] = freqData[idx] / 255;
        }
      } else {
        for (let i = 0; i < bars; i++) {
          values[i] = 0.08 + Math.sin(phase + i * 0.35) * 0.04;
        }
      }

      const gap = 1.5;
      const barW = (w - gap * (bars - 1)) / bars;
      const baseY = h * 0.92;

      for (let i = 0; i < bars; i++) {
        const energy = Math.pow(values[i], 0.85);
        const barH = Math.max(2, energy * h * 0.88);
        const x = i * (barW + gap);
        const y = baseY - barH;
        const grad = ctx.createLinearGradient(x, y, x, baseY);
        grad.addColorStop(0, `rgba(${MAGENTA}, ${0.15 + energy * 0.75})`);
        grad.addColorStop(1, `rgba(${CYAN}, ${0.1 + energy * 0.55})`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, Math.max(1, barW), barH);
      }

      // Forma de onda suave por cima das barras
      ctx.beginPath();
      if (analyser && timeData && isPlaying) {
        analyser.getByteTimeDomainData(timeData);
        const step = Math.max(1, Math.floor(timeData.length / Math.max(64, w)));
        let started = false;
        for (let i = 0; i < timeData.length; i += step) {
          const x = (i / timeData.length) * w;
          const amp = (timeData[i] - 128) / 128;
          const y = h * 0.42 + amp * h * 0.28;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      } else {
        for (let x = 0; x <= w; x += 4) {
          const y = h * 0.42 + Math.sin(x * 0.04 + phase) * 3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = `rgba(${CYAN}, ${isPlaying ? 0.55 : 0.2})`;
      ctx.lineWidth = 1.25;
      ctx.shadowColor = `rgba(${CYAN}, 0.5)`;
      ctx.shadowBlur = isPlaying ? 8 : 0;
      ctx.stroke();
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isPlaying]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
};

export default PlayerVisualizer;

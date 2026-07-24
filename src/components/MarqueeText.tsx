import { useEffect, useRef, useState } from "react";

type MarqueeTextProps = {
  text: string;
  className?: string;
};

/** Rola o texto em loop contínuo quando não cabe; caso contrário fica estático. */
const MarqueeText = ({ text, className = "" }: MarqueeTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const check = () => {
      // Garante medição após layout/fonte
      const overflow = measure.scrollWidth > container.clientWidth + 1;
      setOverflows(overflow);
    };

    check();
    const raf = requestAnimationFrame(check);
    const fontsReady = document.fonts?.ready?.then(check);

    const observer = new ResizeObserver(check);
    observer.observe(container);
    window.addEventListener("resize", check);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", check);
      void fontsReady;
    };
  }, [text]);

  // Duração proporcional ao tamanho do título (loop contínuo)
  const durationSec = Math.max(8, Math.min(28, text.length * 0.45));

  return (
    <div ref={containerRef} className="relative w-full min-w-0 overflow-hidden">
      <span
        ref={measureRef}
        aria-hidden="true"
        className={`pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap ${className}`}
      >
        {text}
      </span>

      {overflows ? (
        <div className="player-marquee-track" title={text} aria-label={text}>
          <span
            className={`player-marquee-content whitespace-nowrap ${className}`}
            style={{ animationDuration: `${durationSec}s` }}
          >
            <span className="inline-block pr-10">{text}</span>
            <span className="inline-block pr-10" aria-hidden="true">
              {text}
            </span>
          </span>
        </div>
      ) : (
        <span className={`block whitespace-nowrap ${className}`}>{text}</span>
      )}
    </div>
  );
};

export default MarqueeText;

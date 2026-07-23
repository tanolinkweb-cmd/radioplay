import { useEffect, useRef, useState } from "react";

type MarqueeTextProps = {
  text: string;
  className?: string;
};

/** Rola o texto só quando ele não cabe no espaço disponível. */
const MarqueeText = ({ text, className = "" }: MarqueeTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const check = () => {
      setOverflows(measure.scrollWidth > container.clientWidth + 2);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(container);
    window.addEventListener("resize", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [text]);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 overflow-hidden">
      {/* Medidor invisível do texto completo */}
      <span
        ref={measureRef}
        aria-hidden="true"
        className={`pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap ${className}`}
      >
        {text}
      </span>

      {overflows ? (
        <div className="player-marquee-track" aria-label={text}>
          <span className={`player-marquee-content whitespace-nowrap ${className}`}>
            <span>{text}</span>
            <span className="inline-block px-8" aria-hidden="true">
              {text}
            </span>
          </span>
        </div>
      ) : (
        <span className={`block truncate ${className}`}>{text}</span>
      )}
    </div>
  );
};

export default MarqueeText;

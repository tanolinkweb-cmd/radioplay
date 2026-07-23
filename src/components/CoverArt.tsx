import { DEFAULT_COVER, DEFAULT_COVER_SM } from "@/lib/coverArt";

type CoverArtProps = {
  src?: string;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "h-9 w-9",
  md: "h-11 w-11 sm:h-12 sm:w-12",
  lg: "h-14 w-14",
};

const CoverArt = ({ src, alt, className = "", size = "md" }: CoverArtProps) => {
  const fallback = size === "sm" ? DEFAULT_COVER_SM : DEFAULT_COVER;

  return (
    <img
      src={src || fallback}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`${sizeClass[size]} shrink-0 rounded-lg border border-neon-cyan/25 object-cover shadow-[0_0_16px_hsl(var(--neon-magenta)/0.2)] ${className}`}
      onError={(event) => {
        const img = event.currentTarget;
        if (img.src !== fallback) img.src = fallback;
      }}
    />
  );
};

export default CoverArt;

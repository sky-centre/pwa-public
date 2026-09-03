import Image from "next/image";

export function Avatar({
  src,
  alt,
  online,
  size = 96,
}: {
  src: string | null;
  alt: string;
  online?: boolean;
  size?: number;
}) {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <div className="h-full w-full overflow-hidden rounded-full border-2 border-haze/60 bg-void-raised shadow-glow">
        {src ? (
          <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-ink-muted">
            {alt.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-void ${
            online ? "bg-signal-approved" : "bg-void-line"
          }`}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}

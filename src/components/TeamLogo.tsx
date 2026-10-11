import { useState } from "react";

interface TeamLogoProps {
  name: string;
  short: string;
  imageId?: number;
  size?: "sm" | "md";
}

export function TeamLogo({ name, short, imageId, size = "md" }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  const dimension = size === "sm" ? "size-10" : "size-12";
  const imageUrl = imageId
    ? `https://static.cricbuzz.com/a/img/v1/${size === "sm" ? "64x64" : "96x96"}/i1/c${imageId}/team-logo.jpg`
    : null;

  return (
    <div
      aria-label={`${name} logo`}
      className={`flex ${dimension} shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-sm font-bold text-primary ring-1 ring-primary/30`}
    >
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={`${name} logo`}
          className="size-full object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        short.slice(0, 3)
      )}
    </div>
  );
}

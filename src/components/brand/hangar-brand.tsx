type HangarBrandVariant = "lockup" | "signature" | "app-icon";

interface HangarBrandProps {
  variant?: HangarBrandVariant;
  alt?: string;
  className?: string;
}

const brandAssets = {
  lockup: {
    ink: "/brand/hangar-lockup-ink-v2.png",
    reversed: "/brand/hangar-lockup-reversed-v2.png",
    aspect: "aspect-[439/200]",
  },
  signature: {
    ink: "/brand/hangar-signature-ink-v2.png",
    reversed: "/brand/hangar-signature-reversed-v2.png",
    aspect: "aspect-[233/52]",
  },
} as const;

export function HangarBrand({
  variant = "lockup",
  alt = "The Hangar",
  className = "",
}: HangarBrandProps) {
  if (variant === "app-icon") {
    return (
      <img
        src="/brand/hangar-app-icon-v2.svg"
        alt={alt}
        aria-hidden={alt ? undefined : true}
        className={`object-contain ${className}`}
      />
    );
  }

  const asset = brandAssets[variant];

  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`relative inline-block shrink-0 ${asset.aspect} ${className}`}
    >
      <img
        src={asset.ink}
        alt=""
        aria-hidden="true"
        className="hangar-brand-light absolute inset-0 size-full object-contain"
      />
      <img
        src={asset.reversed}
        alt=""
        aria-hidden="true"
        className="hangar-brand-dark absolute inset-0 size-full object-contain"
      />
    </span>
  );
}

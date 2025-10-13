import React from "react";

type Props = {
  size?: number;          // ancho/alto en px
  showName?: boolean;     // mostrar nombre a la derecha
  className?: string;
};

const envLogo = import.meta.env.VITE_BRAND_LOGO_URL as string | undefined;
const envName = (import.meta.env.VITE_BRAND_NAME as string | undefined) ?? "Sistema Hostales";
const envPrimary = (import.meta.env.VITE_BRAND_PRIMARY as string | undefined) ?? "#2563eb";

function getStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function BrandLogo({ size = 40, showName = true, className = "" }: Props) {
  // Preferencia: localStorage (setup rápido) > env > fallback
  const storedLogo = getStored("brand.logoDataUrl");
  const storedName = getStored("brand.name") ?? undefined;
  const storedPrimary = getStored("brand.primary") ?? undefined;

  const name = storedName || envName;
  const primary = storedPrimary || envPrimary;
  const logoUrl = storedLogo || envLogo || "";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          className="rounded-xl ring-1 ring-black/5 object-contain bg-white/0"
          style={{ width: size, height: size }}
        />
      ) : (
        <FallbackGlyph size={size} primary={primary} />
      )}

      {showName && (
        <div className="leading-tight">
          <div className="text-base font-semibold text-white">{name}</div>
          <div className="text-xs text-white/70">Gestión ágil para hostales</div>
        </div>
      )}
    </div>
  );
}

function FallbackGlyph({ size, primary }: { size: number; primary: string }) {
  // Logotipo SVG minimal con gradiente
  const radius = 12;
  const s = size;
  return (
    <div
      className="rounded-xl ring-1 ring-white/20 overflow-hidden"
      style={{ width: s, height: s, background: "transparent" }}
      aria-hidden
    >
      <svg width={s} height={s} viewBox="0 0 48 48">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="48" height="48" rx={radius} fill="url(#g)" />
        {/* “H” estilizada */}
        <rect x="14" y="12" width="6" height="24" rx="2" fill="white" opacity="0.95" />
        <rect x="28" y="12" width="6" height="24" rx="2" fill="white" opacity="0.95" />
        <rect x="18" y="22" width="12" height="4" rx="2" fill="white" opacity="0.95" />
      </svg>
    </div>
  );
}
